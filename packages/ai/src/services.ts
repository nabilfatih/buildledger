import {
  AiGenerationFailed,
  type AiRuntimeSettings,
  defaultOpenRouterModel,
  EmptyMeetingInput,
  type MemoryChunk,
  MinutesDraft,
  type MinutesDraft as MinutesDraftValue,
  type ProjectAnswer,
  ProjectAnswer as ProjectAnswerSchema,
  type ProjectReport,
  ProjectReport as ProjectReportSchema,
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
const sentenceBoundaryRegex = /[.!?]\s/;
const openingJsonFenceRegex = /^```(?:json)?\s*/i;
const closingJsonFenceRegex = /\s*```$/i;

export const demoAiRuntimeSettings = {
  provider: "demo",
  source: "demo",
  model: defaultOpenRouterModel,
} as const satisfies AiRuntimeSettings;

/** Extracts a compact lead sentence for deterministic demo output. */
function firstSentence(text: string) {
  const [sentence] = text.split(sentenceBoundaryRegex);
  return sentence?.trim() || text.trim();
}

/** Creates a source citation that points back to the meeting input chunk. */
function makeCitation(text: string) {
  return {
    chunkId: "input-1",
    quote: firstSentence(text).slice(0, 180),
  };
}

/** Formats project memory for a compact LLM prompt. */
function formatMemoryChunks(chunks: readonly MemoryChunk[]) {
  return chunks
    .map(
      (chunk) =>
        `- ${chunk.sourceTitle} (${chunk.chronologyDate}) [${chunk.chunkId}]: ${chunk.text}`
    )
    .join("\n");
}

/** Reads a supported provider literal or falls back to the demo provider. */
function normalizeAiProvider(value: string) {
  if (value === "openrouter") {
    return value;
  }

  return "demo";
}

/** Reads Convex-compatible environment values without blocking mutations. */
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
  const userKey = input.userSettings?.apiKey?.trim();

  if (input.userSettings?.provider === "openrouter" && userKey) {
    return Effect.succeed(input.userSettings);
  }

  const envProvider = normalizeAiProvider(input.envProvider);
  const envModel = normalizeOpenRouterModel(input.envModel);
  const envKey = input.envApiKey.trim();

  if (envProvider === "openrouter" && envKey) {
    const settings = {
      provider: "openrouter",
      source: "environment",
      model: envModel,
      apiKey: envKey,
      keyLast4: envKey.slice(-4),
    } satisfies AiRuntimeSettings;

    return Effect.succeed(settings);
  }

  return Effect.succeed(demoAiRuntimeSettings);
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
function parseJsonPayload(text: string): unknown {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(openingJsonFenceRegex, "")
    .replace(closingJsonFenceRegex, "");
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("The model response did not contain a JSON object.");
  }

  return JSON.parse(withoutFence.slice(start, end + 1));
}

/** Runs a non-streaming OpenRouter prompt and returns decoded JSON text. */
const runOpenRouterJson = Effect.fn("ai.runOpenRouterJson")(function* (input: {
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

  return yield* Effect.try({
    try: () => parseJsonPayload(text),
    catch: (error) =>
      new AiGenerationFailed({
        message: "OpenRouter returned invalid JSON.",
        cause: String(error),
      }),
  });
});

/** Decodes a model payload into the stable minutes draft contract. */
const decodeMinutesDraft = Effect.fn("ai.decodeMinutesDraft")(function* (
  payload: unknown
) {
  return yield* Schema.decodeUnknown(MinutesDraft)(payload).pipe(
    Effect.mapError(
      (error) =>
        new AiGenerationFailed({
          message: "OpenRouter returned an invalid minutes draft.",
          cause: String(error),
        })
    )
  );
});

/** Decodes a model payload into the stable project answer contract. */
const decodeProjectAnswer = Effect.fn("ai.decodeProjectAnswer")(function* (
  payload: unknown
) {
  return yield* Schema.decodeUnknown(ProjectAnswerSchema)(payload).pipe(
    Effect.mapError(
      (error) =>
        new AiGenerationFailed({
          message: "OpenRouter returned an invalid project answer.",
          cause: String(error),
        })
    )
  );
});

/** Decodes a model payload into the stable project report contract. */
const decodeProjectReport = Effect.fn("ai.decodeProjectReport")(function* (
  payload: unknown
) {
  return yield* Schema.decodeUnknown(ProjectReportSchema)(payload).pipe(
    Effect.mapError(
      (error) =>
        new AiGenerationFailed({
          message: "OpenRouter returned an invalid project report.",
          cause: String(error),
        })
    )
  );
});

/** Generates deterministic minutes when no user or environment key exists. */
function makeDemoMinutesDraft(input: {
  readonly title: string;
  readonly text: string;
}) {
  const text = input.text.trim();

  return {
    summary: firstSentence(text),
    sections: [
      {
        title: "Meeting Summary",
        body: text,
        items: [
          {
            kind: "discussion",
            title: input.title,
            body: firstSentence(text),
            citations: [makeCitation(text)],
          },
          {
            kind: "decision",
            title: "Sequencing update accepted",
            body: "The site team accepted the revised crane window and sequencing update.",
            citations: [makeCitation(text)],
          },
          {
            kind: "action",
            title: "Resolve inspection blocker",
            body: "Coordinate inspection timing so drywall crews can proceed.",
            ownerName: "Site team",
            dueDate: new Date().toISOString().slice(0, 10),
            citations: [makeCitation(text)],
          },
          {
            kind: "risk",
            title: "Drywall sequence delay",
            body: "Drywall crews remain blocked if inspection timing slips.",
            severity: "high",
            citations: [makeCitation(text)],
          },
        ],
      },
    ],
  } satisfies MinutesDraftValue;
}

/** Splits published meeting text into citation-preserving memory chunks. */
const chunkMeetingMemory = Effect.fn("MemoryChunkingService.chunk")(
  function* (input: {
    readonly sourceTitle: string;
    readonly chronologyDate: string;
    readonly text: string;
  }) {
    const text = input.text.trim();

    if (text.length === 0) {
      return yield* Effect.fail(
        new EmptyMeetingInput({
          message: "Cannot create memory chunks from empty text.",
        })
      );
    }

    const chunks: readonly MemoryChunk[] = [
      {
        chunkId: "input-1",
        text,
        chronologyDate: input.chronologyDate,
        sourceTitle: input.sourceTitle,
      },
    ];

    return chunks;
  }
);

/** Answers a project question from project memory with citations. */
const answerProjectQuestion = Effect.fn(
  "ProjectQuestionAnsweringService.answer"
)(function* (input: {
  readonly question: string;
  readonly chunks: readonly MemoryChunk[];
  readonly settings?: AiRuntimeSettings;
}) {
  const [chunk] = input.chunks;

  if (!chunk) {
    return yield* Effect.fail(
      new AiGenerationFailed({
        message: "No project memory was available for this question.",
      })
    );
  }

  const settings = yield* readEnvAiRuntimeSettings(input.settings);

  if (settings.provider === "openrouter") {
    const payload = yield* runOpenRouterJson({
      settings,
      system:
        "You answer construction project questions from cited memory. Return only JSON that matches { answer: string, citations: [{ chunkId: string, quote: string }] }.",
      user: `Question: ${input.question}\n\nMemory:\n${formatMemoryChunks(input.chunks)}`,
    });

    return yield* decodeProjectAnswer(payload);
  }

  const answer: ProjectAnswer = {
    answer: `${firstSentence(chunk.text)}.`,
    citations: [
      {
        chunkId: chunk.chunkId,
        quote: firstSentence(chunk.text).slice(0, 180),
      },
    ],
  };

  return answer;
});

/** Builds a weekly report from selected project memory chunks. */
const generateProjectReport = Effect.fn("ReportGenerationService.generate")(
  function* (input: {
    readonly projectName: string;
    readonly periodLabel: string;
    readonly chunks: readonly MemoryChunk[];
    readonly settings?: AiRuntimeSettings;
  }) {
    const [chunk] = input.chunks;

    if (!chunk) {
      return yield* Effect.fail(
        new AiGenerationFailed({
          message: "Cannot generate a report without project memory.",
        })
      );
    }

    const settings = yield* readEnvAiRuntimeSettings(input.settings);

    if (settings.provider === "openrouter") {
      const payload = yield* runOpenRouterJson({
        settings,
        system:
          "You write concise construction weekly reports from cited memory. Return only JSON that matches { title: string, summary: string, actionSummary: string, riskSummary: string, decisionSummary: string, citations: [{ chunkId: string, quote: string }] }.",
        user: `Project: ${input.projectName}\nPeriod: ${input.periodLabel}\n\nMemory:\n${formatMemoryChunks(input.chunks)}`,
      });

      return yield* decodeProjectReport(payload);
    }

    const report: ProjectReport = {
      title: `${input.projectName} weekly report`,
      summary: `Report for ${input.periodLabel}: ${firstSentence(chunk.text)}.`,
      actionSummary: "Review open action items from published minutes.",
      riskSummary: "Review risk items created during meeting publication.",
      decisionSummary: "Review decisions created during meeting publication.",
      citations: [
        {
          chunkId: chunk.chunkId,
          quote: firstSentence(chunk.text).slice(0, 180),
        },
      ],
    };

    return report;
  }
);

export class MinutesExtractionService extends Effect.Service<MinutesExtractionService>()(
  "MinutesExtractionService",
  {
    accessors: true,
    effect: Effect.succeed({
      extract: Effect.fn("MinutesExtractionService.extract")(function* (input: {
        readonly title: string;
        readonly text: string;
        readonly settings?: AiRuntimeSettings;
      }) {
        const text = input.text.trim();

        if (text.length === 0) {
          return yield* Effect.fail(
            new EmptyMeetingInput({
              message: "Meeting input must include notes or a transcript.",
            })
          );
        }

        const settings = yield* readEnvAiRuntimeSettings(input.settings);

        if (settings.provider === "openrouter") {
          const payload = yield* runOpenRouterJson({
            settings,
            system:
              "You convert construction meeting notes into structured minutes. Return only JSON that matches { summary: string, sections: [{ title: string, body: string, items: [{ kind: 'discussion' | 'decision' | 'action' | 'risk' | 'question', title: string, body: string, ownerName?: string, dueDate?: string, severity?: 'low' | 'medium' | 'high', citations: [{ chunkId: string, quote: string }] }] }] }. Use chunkId 'input-1' for citations.",
            user: `Meeting title: ${input.title}\n\nNotes:\n${text}`,
          });

          return yield* decodeMinutesDraft(payload);
        }

        return makeDemoMinutesDraft({ title: input.title, text });
      }),
    }),
  }
) {}

export class MemoryChunkingService extends Effect.Service<MemoryChunkingService>()(
  "MemoryChunkingService",
  {
    accessors: true,
    effect: Effect.succeed({ chunk: chunkMeetingMemory }),
  }
) {}

export class ProjectQuestionAnsweringService extends Effect.Service<ProjectQuestionAnsweringService>()(
  "ProjectQuestionAnsweringService",
  {
    accessors: true,
    effect: Effect.succeed({ answer: answerProjectQuestion }),
  }
) {}

export class ReportGenerationService extends Effect.Service<ReportGenerationService>()(
  "ReportGenerationService",
  {
    accessors: true,
    effect: Effect.succeed({ generate: generateProjectReport }),
  }
) {}
