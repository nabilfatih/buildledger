import {
  decodeMinutesDraft,
  decodeProjectAnswer,
  decodeProjectReport,
  readEnvAiRuntimeSettings,
  runOpenRouterJson,
} from "@repo/ai/runtime";
import {
  AiGenerationFailed,
  type AiRuntimeSettings,
  EmptyMeetingInput,
  type MemoryChunk,
  type MinutesDraft as MinutesDraftValue,
  type ProjectAnswer,
  type ProjectReport,
} from "@repo/ai/schemas";
import { Effect } from "effect";

const sentenceBoundaryRegex = /[.!?]\s/;

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
