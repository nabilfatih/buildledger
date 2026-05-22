import { Config, Effect } from "effect";

import {
  AiGenerationFailed,
  EmptyMeetingInput,
  type MemoryChunk,
  type MinutesDraft,
  type ProjectAnswer,
  type ProjectReport,
} from "./schemas";

const modelConfig = Config.string("AI_MODEL").pipe(
  Config.withDefault("open-source-demo-model")
);

const SENTENCE_BOUNDARY_REGEX = /[.!?]\s/;

/** Extracts a compact lead sentence for deterministic demo output. */
function firstSentence(text: string) {
  const [sentence] = text.split(SENTENCE_BOUNDARY_REGEX);
  return sentence?.trim() || text.trim();
}

/** Creates a source citation that points back to the meeting input chunk. */
function makeCitation(text: string) {
  return {
    chunkId: "input-1",
    quote: firstSentence(text).slice(0, 180),
  };
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
}) {
  const [chunk] = input.chunks;

  if (!chunk) {
    return yield* Effect.fail(
      new AiGenerationFailed({
        message: "No project memory was available for this question.",
      })
    );
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
  }) {
    const [chunk] = input.chunks;

    if (!chunk) {
      return yield* Effect.fail(
        new AiGenerationFailed({
          message: "Cannot generate a report without project memory.",
        })
      );
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
    effect: Effect.gen(function* () {
      const model = yield* modelConfig;

      const extract = Effect.fn("MinutesExtractionService.extract")(
        function* (input: { readonly title: string; readonly text: string }) {
          const text = input.text.trim();

          if (text.length === 0) {
            return yield* Effect.fail(
              new EmptyMeetingInput({
                message: "Meeting input must include notes or a transcript.",
              })
            );
          }

          yield* Effect.log("Generating minutes draft", {
            model,
            title: input.title,
          });

          const draft: MinutesDraft = {
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
                ],
              },
            ],
          };

          return draft;
        }
      );

      return { extract };
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
