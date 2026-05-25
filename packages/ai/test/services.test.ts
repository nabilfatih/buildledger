import {
  demoAiRuntimeSettings,
  resolveAiRuntimeSettings,
  toPublicAiSettings,
} from "@repo/ai/runtime";
import {
  MemoryChunkingService,
  ProjectQuestionAnsweringService,
  ProtocolExtractionService,
  ReportGenerationService,
} from "@repo/ai/services";
import { expectDefined } from "@repo/testing";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

const liveServices = Layer.mergeAll(
  ProtocolExtractionService.Default,
  MemoryChunkingService.Default,
  ProjectQuestionAnsweringService.Default,
  ReportGenerationService.Default
);

describe("AI services", () => {
  it("creates a cited protocol draft from source text", async () => {
    const result = await Effect.runPromise(
      ProtocolExtractionService.extract({
        title: "Weekly site coordination",
        text: "Concrete pour is delayed by two days. The site manager will update the schedule.",
        settings: demoAiRuntimeSettings,
      }).pipe(Effect.provide(liveServices))
    );

    const section = expectDefined(result.sections[0]);
    const item = expectDefined(section.items[0]);
    const citation = expectDefined(item.citations[0]);

    expect(citation.chunkId).toBe("input-1");
    expect(item.trade).toBe("Coordination");
  });

  it("rejects empty protocol source input", async () => {
    const result = await Effect.runPromiseExit(
      ProtocolExtractionService.extract({
        title: "Empty protocol",
        text: " ",
        settings: demoAiRuntimeSettings,
      }).pipe(Effect.provide(liveServices))
    );

    expect(result._tag).toBe("Failure");
  });

  it("answers with citations from project memory", async () => {
    const program = Effect.gen(function* () {
      const chunks = yield* MemoryChunkingService.chunk({
        sourceTitle: "Weekly site coordination",
        chronologyDate: "2026-05-22",
        text: "Facade delivery moved to Friday. Crane access remains the critical dependency.",
      });

      return yield* ProjectQuestionAnsweringService.answer({
        question: "What changed about facade delivery?",
        chunks,
        settings: demoAiRuntimeSettings,
      });
    }).pipe(Effect.provide(liveServices));

    const result = await Effect.runPromise(program);

    expect(result.citations).toHaveLength(1);
  });

  it("uses the deterministic demo provider when no key exists", async () => {
    const settings = await Effect.runPromise(
      resolveAiRuntimeSettings({
        envProvider: "openrouter",
        envApiKey: "",
        envModel: "openai/gpt-5-mini",
      })
    );

    expect(settings.provider).toBe("demo");
    expect(settings.source).toBe("demo");
  });

  it("selects OpenRouter from environment settings", async () => {
    const settings = await Effect.runPromise(
      resolveAiRuntimeSettings({
        envProvider: "openrouter",
        envApiKey: "sk-or-example",
        envModel: "openai/gpt-5",
      })
    );

    expect(settings.provider).toBe("openrouter");
    expect(settings.source).toBe("environment");
    expect(settings.model).toBe("openai/gpt-5");
    expect("keyLast4" in settings ? settings.keyLast4 : null).toBe("mple");
  });

  it("lets a saved user key override the environment key", async () => {
    const settings = await Effect.runPromise(
      resolveAiRuntimeSettings({
        userSettings: {
          provider: "openrouter",
          source: "user",
          model: "anthropic/claude-sonnet-4.5",
          apiKey: "sk-user-value",
          keyLast4: "alue",
        },
        envProvider: "openrouter",
        envApiKey: "sk-env-value",
        envModel: "openai/gpt-5",
      })
    );

    expect(settings.source).toBe("user");
    expect(settings.model).toBe("anthropic/claude-sonnet-4.5");
    expect("keyLast4" in settings ? settings.keyLast4 : null).toBe("alue");
  });

  it("ignores an empty saved key and falls back safely", async () => {
    const settings = await Effect.runPromise(
      resolveAiRuntimeSettings({
        userSettings: {
          provider: "openrouter",
          source: "user",
          model: "openai/gpt-5-mini",
          apiKey: "",
          keyLast4: "",
        },
        envProvider: "demo",
        envApiKey: "",
        envModel: "openai/gpt-5-mini",
      })
    );

    expect(settings.source).toBe("demo");
  });

  it("never exposes raw keys in public AI settings", () => {
    const publicSettings = toPublicAiSettings({
      provider: "openrouter",
      source: "user",
      model: "openai/gpt-5-mini",
      apiKey: "sk-user-value",
      keyLast4: "alue",
    });

    expect(publicSettings).not.toHaveProperty("apiKey");
    expect(publicSettings).toMatchObject({ keyLast4: "alue" });
  });
});
