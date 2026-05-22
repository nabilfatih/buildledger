import { expectDefined } from "@repo/testing";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import {
  MemoryChunkingService,
  MinutesExtractionService,
  ProjectQuestionAnsweringService,
  ReportGenerationService,
} from "../src/services";

const liveServices = Layer.mergeAll(
  MinutesExtractionService.Default,
  MemoryChunkingService.Default,
  ProjectQuestionAnsweringService.Default,
  ReportGenerationService.Default
);

describe("AI services", () => {
  it("creates a cited minutes draft from meeting text", async () => {
    const result = await Effect.runPromise(
      MinutesExtractionService.extract({
        title: "Weekly site coordination",
        text: "Concrete pour is delayed by two days. The site manager will update the schedule.",
      }).pipe(Effect.provide(liveServices))
    );

    const section = expectDefined(result.sections[0]);
    const item = expectDefined(section.items[0]);
    const citation = expectDefined(item.citations[0]);

    expect(citation.chunkId).toBe("input-1");
  });

  it("rejects empty meeting input", async () => {
    const result = await Effect.runPromiseExit(
      MinutesExtractionService.extract({
        title: "Empty meeting",
        text: " ",
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
      });
    }).pipe(Effect.provide(liveServices));

    const result = await Effect.runPromise(program);

    expect(result.citations).toHaveLength(1);
  });
});
