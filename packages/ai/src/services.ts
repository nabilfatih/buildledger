import {
  decodeProjectAnswer,
  decodeProjectInvestigation,
  decodeProjectReport,
  decodeProtocolDraft,
  readEnvAiRuntimeSettings,
  runOpenRouterJson,
} from "@repo/ai/runtime";
import {
  AiGenerationFailed,
  type AiRuntimeSettings,
  EmptyProtocolSource,
  type MemoryChunk,
  type ProjectAnswer,
  type ProjectInvestigation,
  type ProjectReport,
  type ProtocolDraft,
} from "@repo/ai/schemas";
import { Effect } from "effect";

const sentenceBoundaryRegex = /[.!?]\s/;

/** Extracts a compact lead sentence for deterministic demo output. */
function firstSentence(text: string) {
  const [sentence] = text.split(sentenceBoundaryRegex);
  return sentence?.trim() || text.trim();
}

/** Creates a source citation that points back to the protocol source chunk. */
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

/** Generates deterministic protocol records when no user or environment key exists. */
function makeDemoProtocolDraft(input: {
  readonly title: string;
  readonly text: string;
}) {
  const text = input.text.trim();

  return {
    summary: firstSentence(text),
    sections: [
      {
        title: "Protocol Summary",
        body: text,
        items: [
          {
            kind: "discussion",
            title: input.title,
            body: firstSentence(text),
            component: "General",
            objectName: "Project",
            trade: "Coordination",
            status: "recorded",
            citations: [makeCitation(text)],
          },
          {
            kind: "decision",
            title: "Sequencing update accepted",
            body: "The site team accepted the revised crane window and sequencing update.",
            component: "Envelope",
            objectName: "Crane window",
            trade: "Site logistics",
            status: "recorded",
            citations: [makeCitation(text)],
          },
          {
            kind: "task",
            title: "Resolve inspection blocker",
            body: "Coordinate inspection timing so drywall crews can proceed.",
            component: "Interior",
            objectName: "Drywall",
            trade: "Drywall",
            responsibleParty: "Site team",
            dueDate: new Date().toISOString().slice(0, 10),
            status: "open",
            citations: [makeCitation(text)],
          },
          {
            kind: "risk",
            title: "Drywall sequence delay",
            body: "Drywall crews remain blocked if inspection timing slips.",
            component: "Interior",
            objectName: "Drywall",
            trade: "Drywall",
            severity: "high",
            status: "open",
            citations: [makeCitation(text)],
          },
        ],
      },
    ],
  } satisfies ProtocolDraft;
}

/** Splits published protocol text into citation-preserving memory chunks. */
const chunkProtocolMemory = Effect.fn("MemoryChunkingService.chunk")(
  function* (input: {
    readonly sourceTitle: string;
    readonly chronologyDate: string;
    readonly text: string;
  }) {
    const text = input.text.trim();

    if (text.length === 0) {
      return yield* Effect.fail(
        new EmptyProtocolSource({
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
      actionSummary: "Review open task records from published protocols.",
      riskSummary: "Review risk records created during protocol publication.",
      decisionSummary:
        "Review decision records created during protocol publication.",
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

/** Investigates project memory for likely root causes and recommended actions. */
const runProjectInvestigation = Effect.fn("ProjectInvestigationService.run")(
  function* (input: {
    readonly question: string;
    readonly chunks: readonly MemoryChunk[];
    readonly settings?: AiRuntimeSettings;
  }) {
    const [chunk] = input.chunks;

    if (!chunk) {
      return yield* Effect.fail(
        new AiGenerationFailed({
          message: "Cannot investigate without project memory.",
        })
      );
    }

    const settings = yield* readEnvAiRuntimeSettings(input.settings);

    if (settings.provider === "openrouter") {
      const payload = yield* runOpenRouterJson({
        settings,
        system:
          "You are an AI detective for construction projects. Return only JSON matching { detectedRisk: string, likelyCause: string, impactedObjects: string[], impactedTrades: string[], relatedRecords: string[], recommendedActions: string[], citations: [{ chunkId: string, quote: string }] }.",
        user: `Investigation question: ${input.question}\n\nMemory:\n${formatMemoryChunks(input.chunks)}`,
      });

      return yield* decodeProjectInvestigation(payload);
    }

    const investigation: ProjectInvestigation = {
      detectedRisk: "Schedule risk from unresolved coordination blockers",
      likelyCause: firstSentence(chunk.text),
      impactedObjects: ["Drywall", "Crane window"],
      impactedTrades: ["Site logistics", "Drywall"],
      relatedRecords: [chunk.chunkId],
      recommendedActions: [
        "Confirm inspection timing",
        "Assign an owner for the blocking task",
        "Publish the revised sequence to external stakeholders",
      ],
      citations: [
        {
          chunkId: chunk.chunkId,
          quote: firstSentence(chunk.text).slice(0, 180),
        },
      ],
    };

    return investigation;
  }
);

export class ProtocolExtractionService extends Effect.Service<ProtocolExtractionService>()(
  "ProtocolExtractionService",
  {
    accessors: true,
    effect: Effect.succeed({
      extract: Effect.fn("ProtocolExtractionService.extract")(
        function* (input: {
          readonly title: string;
          readonly text: string;
          readonly settings?: AiRuntimeSettings;
        }) {
          const text = input.text.trim();

          if (text.length === 0) {
            return yield* Effect.fail(
              new EmptyProtocolSource({
                message: "Protocol source must include notes or a transcript.",
              })
            );
          }

          const settings = yield* readEnvAiRuntimeSettings(input.settings);

          if (settings.provider === "openrouter") {
            const payload = yield* runOpenRouterJson({
              settings,
              system:
                "You convert construction protocol notes and transcripts into structured Construction Protocol records. Return only JSON that matches { summary: string, sections: [{ title: string, body: string, items: [{ kind: 'agenda' | 'discussion' | 'change' | 'task' | 'information' | 'concern' | 'obstruction' | 'decision' | 'risk' | 'question', title: string, body: string, component?: string, objectName?: string, trade?: string, responsibleParty?: string, dueDate?: string, severity?: 'low' | 'medium' | 'high', status?: 'open' | 'in_progress' | 'blocked' | 'resolved' | 'recorded', citations: [{ chunkId: string, quote: string }] }] }] }. Use chunkId 'input-1' for citations.",
              user: `Protocol title: ${input.title}\n\nSources:\n${text}`,
            });

            return yield* decodeProtocolDraft(payload);
          }

          return makeDemoProtocolDraft({ title: input.title, text });
        }
      ),
    }),
  }
) {}

export class MemoryChunkingService extends Effect.Service<MemoryChunkingService>()(
  "MemoryChunkingService",
  {
    accessors: true,
    effect: Effect.succeed({ chunk: chunkProtocolMemory }),
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

export class ProjectInvestigationService extends Effect.Service<ProjectInvestigationService>()(
  "ProjectInvestigationService",
  {
    accessors: true,
    effect: Effect.succeed({ run: runProjectInvestigation }),
  }
) {}
