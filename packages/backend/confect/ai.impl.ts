import { FunctionImpl, GroupImpl } from "@confect/server";
import { ProjectQuestionAnsweringService } from "@repo/ai/services";
import { Effect, Layer } from "effect";

import api from "./_generated/api";
import refs from "./_generated/refs";
import { MutationRunner, QueryRunner } from "./_generated/services";
import { asAppError } from "./helpers";

/** Runs the minutes generation mutation from the action boundary. */
const generateMinutes = FunctionImpl.make(
  api,
  "ai",
  "generateMinutes",
  ({ meetingId }) =>
    asAppError(
      Effect.gen(function* () {
        const runMutation = yield* MutationRunner;
        return yield* runMutation(refs.public.meetings.startGeneration, {
          meetingId,
        });
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
        const runQuery = yield* QueryRunner;
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
        const runMutation = yield* MutationRunner;
        return yield* runMutation(refs.public.reports.createWeeklyDraft, {
          periodEnd,
          periodStart,
          projectId,
        });
      })
    )
);

export const ai = GroupImpl.make(api, "ai").pipe(
  Layer.provide(generateMinutes),
  Layer.provide(answerProjectQuestion),
  Layer.provide(generateProjectReport)
);
