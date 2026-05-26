import {
  AiGenerationFailed,
  type AiRuntimeSettings,
  defaultOpenRouterModel,
  ProjectAnswer,
  ProjectInvestigation,
  ProjectReport,
  ProtocolDraft,
} from "@repo/ai/schemas";
import { chat } from "@tanstack/ai";
import { createOpenRouterText } from "@tanstack/ai-openrouter";
import { Effect, Schema } from "effect";

declare const process:
  | {
      readonly env: Record<string, string | undefined>;
    }
  | undefined;

const envDefaults = {
  aiModel: defaultOpenRouterModel,
  aiProvider: "demo",
  openRouterKey: "",
} as const;
const openingJsonFenceRegex = /^```(?:json)?\s*/i;
const closingJsonFenceRegex = /\s*```$/i;

export const demoAiRuntimeSettings = {
  provider: "demo",
  source: "demo",
  model: defaultOpenRouterModel,
} as const satisfies AiRuntimeSettings;

/** Reads a supported provider literal or falls back to the demo provider. */
function normalizeAiProvider(value: string) {
  if (value === "openrouter") {
    return value;
  }

  return "demo";
}

/** Reads environment values without blocking Convex mutations. */
function readEnvValue(key: string, fallback: string) {
  if (typeof process === "undefined") {
    return fallback;
  }

  return process.env[key] ?? fallback;
}

/** Reads a supported OpenRouter model literal or falls back to the default. */
export function normalizeOpenRouterModel(value: string) {
  switch (value) {
    case "openai/gpt-5-mini":
    case "openai/gpt-5":
    case "openai/gpt-5.1":
    case "anthropic/claude-sonnet-4.5":
    case "google/gemini-2.5-flash":
    case "openrouter/auto":
      return value;
    default:
      return defaultOpenRouterModel;
  }
}

/** Resolves user, environment, and demo AI settings in precedence order. */
export function resolveAiRuntimeSettings(input: {
  readonly userSettings?: AiRuntimeSettings | null | undefined;
  readonly envProvider: string;
  readonly envApiKey: string;
  readonly envModel: string;
}) {
  return Effect.sync(() => {
    const userKey = input.userSettings?.apiKey?.trim();

    if (input.userSettings?.provider === "openrouter" && userKey) {
      return input.userSettings;
    }

    const envProvider = normalizeAiProvider(input.envProvider);
    const envModel = normalizeOpenRouterModel(input.envModel);
    const envKey = input.envApiKey.trim();

    if (envProvider === "openrouter" && envKey) {
      return {
        provider: "openrouter",
        source: "environment",
        model: envModel,
        apiKey: envKey,
        keyLast4: envKey.slice(-4),
      } satisfies AiRuntimeSettings;
    }

    return demoAiRuntimeSettings;
  });
}

/** Reads AI settings from Effect Config and applies provider precedence. */
export const readEnvAiRuntimeSettings = Effect.fn(
  "ai.readEnvAiRuntimeSettings"
)(function* (userSettings?: AiRuntimeSettings | null | undefined) {
  const envProvider = readEnvValue(
    "BUILDLEDGER_AI_PROVIDER",
    envDefaults.aiProvider
  );
  const envApiKey = readEnvValue(
    "OPENROUTER_API_KEY",
    envDefaults.openRouterKey
  );
  const envModel = readEnvValue("BUILDLEDGER_AI_MODEL", envDefaults.aiModel);

  return yield* resolveAiRuntimeSettings({
    userSettings,
    envProvider,
    envApiKey,
    envModel,
  });
});

/** Returns settings that are safe to expose to a browser client. */
export function toPublicAiSettings(settings: AiRuntimeSettings) {
  const publicSettings = {
    provider: settings.provider,
    source: settings.source,
    model: settings.model,
    hasKey: Boolean(settings.apiKey?.trim()),
  };

  if (settings.keyLast4) {
    return { ...publicSettings, keyLast4: settings.keyLast4 };
  }

  return publicSettings;
}

/** Parses the first JSON object in a model response. */
const parseJsonPayload = Effect.fn("ai.parseJsonPayload")(function* (
  text: string
) {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(openingJsonFenceRegex, "")
    .replace(closingJsonFenceRegex, "");
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return yield* Effect.fail(
      new AiGenerationFailed({
        message: "OpenRouter returned invalid JSON.",
        cause: "The model response did not contain a JSON object.",
      })
    );
  }

  return yield* Schema.decodeUnknown(Schema.parseJson())(
    withoutFence.slice(start, end + 1)
  ).pipe(
    Effect.mapError(
      (error) =>
        new AiGenerationFailed({
          message: "OpenRouter returned invalid JSON.",
          cause: String(error),
        })
    )
  );
});

/** Runs a non-streaming OpenRouter prompt and returns decoded JSON text. */
export const runOpenRouterJson = Effect.fn("ai.runOpenRouterJson")(
  function* (input: {
    readonly settings: AiRuntimeSettings;
    readonly system: string;
    readonly user: string;
  }) {
    const apiKey = input.settings.apiKey?.trim();

    if (input.settings.provider !== "openrouter" || !apiKey) {
      return yield* Effect.fail(
        new AiGenerationFailed({
          message: "OpenRouter requires an API key.",
        })
      );
    }

    const adapter = createOpenRouterText(input.settings.model, apiKey);
    const text = yield* Effect.tryPromise({
      try: () =>
        chat({
          adapter,
          messages: [{ role: "user", content: input.user }],
          systemPrompts: [input.system],
          stream: false,
        }),
      catch: (error) =>
        new AiGenerationFailed({
          message: "OpenRouter request failed.",
          cause: String(error),
        }),
    });

    return yield* parseJsonPayload(text);
  }
);

/** Decodes a model payload into the stable protocol draft contract. */
export const decodeProtocolDraft = Effect.fn("ai.decodeProtocolDraft")(
  function* (payload: unknown) {
    return yield* Schema.decodeUnknown(ProtocolDraft)(payload).pipe(
      Effect.mapError(
        (error) =>
          new AiGenerationFailed({
            message: "OpenRouter returned an invalid protocol draft.",
            cause: String(error),
          })
      )
    );
  }
);

/** Decodes a model payload into the stable project answer contract. */
export const decodeProjectAnswer = Effect.fn("ai.decodeProjectAnswer")(
  function* (payload: unknown) {
    return yield* Schema.decodeUnknown(ProjectAnswer)(payload).pipe(
      Effect.mapError(
        (error) =>
          new AiGenerationFailed({
            message: "OpenRouter returned an invalid project answer.",
            cause: String(error),
          })
      )
    );
  }
);

/** Decodes a model payload into the stable project report contract. */
export const decodeProjectReport = Effect.fn("ai.decodeProjectReport")(
  function* (payload: unknown) {
    return yield* Schema.decodeUnknown(ProjectReport)(payload).pipe(
      Effect.mapError(
        (error) =>
          new AiGenerationFailed({
            message: "OpenRouter returned an invalid project report.",
            cause: String(error),
          })
      )
    );
  }
);

/** Decodes a model payload into the stable project investigation contract. */
export const decodeProjectInvestigation = Effect.fn(
  "ai.decodeProjectInvestigation"
)(function* (payload: unknown) {
  return yield* Schema.decodeUnknown(ProjectInvestigation)(payload).pipe(
    Effect.mapError(
      (error) =>
        new AiGenerationFailed({
          message: "OpenRouter returned an invalid project investigation.",
          cause: String(error),
        })
    )
  );
});
