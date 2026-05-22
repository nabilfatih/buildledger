import { FunctionImpl, GroupImpl } from "@confect/server";
import {
  MinutesExtractionService,
  ProjectQuestionAnsweringService,
  ReportGenerationService,
} from "@repo/ai/services";
import api from "@repo/backend/confect/_generated/api";
import refs from "@repo/backend/confect/_generated/refs";
import {
  ActionRunner,
  MutationRunner,
  QueryRunner,
} from "@repo/backend/confect/_generated/services";
import { asAppError } from "@repo/backend/confect/helpers";
import { Effect, Layer } from "effect";

/** Picks a stable message from unknown action failures. */
function failureMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = error.message;
    return typeof message === "string" ? message : "AI generation failed.";
  }

  return "AI generation failed.";
}

/** Runs the minutes generation flow from the action boundary. */
const generateMinutes = FunctionImpl.make(
  api,
  "ai",
  "generateMinutes",
  ({ meetingId }) =>
    asAppError(
      Effect.gen(function* () {
        const runMutation = yield* MutationRunner;
        const runQuery = yield* QueryRunner;
        const runAction = yield* ActionRunner;
        const aiRunId = yield* runMutation(
          refs.public.meetings.startGeneration,
          {
            meetingId,
          }
        );
        const result = yield* Effect.gen(function* () {
          const review = yield* runQuery(refs.public.meetings.getReviewState, {
            meetingId,
          });
          const text = review.inputs
            .map((input) => input.text ?? "")
            .join("\n\n")
            .trim();
          const settings = yield* runAction(
            refs.internal.aiSettings.resolveRuntime,
            {}
          );
          const draft = yield* MinutesExtractionService.extract({
            title: review.meeting.title,
            text,
            settings,
          }).pipe(Effect.provide(MinutesExtractionService.Default));

          yield* runMutation(refs.public.meetings.finishGeneration, {
            meetingId,
            aiRunId,
            draft,
          });
        }).pipe(Effect.either);

        if (result._tag === "Left") {
          yield* runMutation(refs.public.meetings.failGeneration, {
            meetingId,
            aiRunId,
            message: failureMessage(result.left),
          });

          return yield* Effect.fail(result.left);
        }

        return aiRunId;
      })
    )
);

/** Answers a project question from persisted project memory chunks. */
const answerProjectQuestion = FunctionImpl.make(
  api,
  "ai",
  "answerProjectQuestion",
  ({ projectId, question }) =>
    asAppError(
      Effect.gen(function* () {
        const runAction = yield* ActionRunner;
        const runQuery = yield* QueryRunner;
        const settings = yield* runAction(
          refs.internal.aiSettings.resolveRuntime,
          {}
        );
        const chunks = yield* runQuery(refs.public.memory.chunksByProject, {
          projectId,
        });
        const answer = yield* ProjectQuestionAnsweringService.answer({
          question,
          chunks: chunks.map((chunk) => ({
            chunkId: chunk._id,
            chronologyDate: chunk.chronologyDate,
            sourceTitle: chunk.sourceType,
            text: chunk.text,
          })),
          settings,
        }).pipe(Effect.provide(ProjectQuestionAnsweringService.Default));

        return {
          answer: answer.answer,
          citationsJson: JSON.stringify(answer.citations),
        };
      })
    )
);

/** Creates a weekly report draft from project memory. */
const generateProjectReport = FunctionImpl.make(
  api,
  "ai",
  "generateProjectReport",
  ({ projectId, periodEnd, periodStart }) =>
    asAppError(
      Effect.gen(function* () {
        const runAction = yield* ActionRunner;
        const runQuery = yield* QueryRunner;
        const runMutation = yield* MutationRunner;
        const settings = yield* runAction(
          refs.internal.aiSettings.resolveRuntime,
          {}
        );
        const input = yield* runQuery(refs.public.reports.getWeeklyDraftInput, {
          periodEnd,
          periodStart,
          projectId,
        });
        const report = yield* ReportGenerationService.generate({
          projectName: input.projectName,
          periodLabel: input.periodLabel,
          chunks: input.chunks,
          settings,
        }).pipe(Effect.provide(ReportGenerationService.Default));

        return yield* runMutation(refs.public.reports.saveWeeklyDraft, {
          periodEnd,
          periodStart,
          projectId,
          report,
        });
      })
    )
);

export const ai = GroupImpl.make(api, "ai").pipe(
  Layer.provide(generateMinutes),
  Layer.provide(answerProjectQuestion),
  Layer.provide(generateProjectReport)
);
