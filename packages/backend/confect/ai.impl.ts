import { FunctionImpl, GroupImpl } from "@confect/server";
import { ProjectQuestionAnsweringService } from "@repo/ai/services";
import api from "@repo/backend/confect/_generated/api";
import refs from "@repo/backend/confect/_generated/refs";
import {
  ActionRunner,
  QueryRunner,
} from "@repo/backend/confect/_generated/services";
import { asAppError } from "@repo/backend/confect/helpers";
import { Effect, Layer } from "effect";

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

export const ai = GroupImpl.make(api, "ai").pipe(
  Layer.provide(answerProjectQuestion)
);
