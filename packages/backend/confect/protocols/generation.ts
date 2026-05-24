import { FunctionImpl } from "@confect/server";
import { ProtocolExtractionService } from "@repo/ai/services";
import api from "@repo/backend/confect/_generated/api";
import refs from "@repo/backend/confect/_generated/refs";
import {
  ActionRunner,
  DatabaseReader,
  DatabaseWriter,
  MutationRunner,
  QueryRunner,
} from "@repo/backend/confect/_generated/services";
import {
  InvalidProtocolState,
  ProtocolNotFound,
} from "@repo/backend/confect/errors";
import { asAppError, ensureProjectAccess } from "@repo/backend/confect/helpers";
import { Effect, Either } from "effect";

import {
  clearProtocolDraft,
  getProtocolInputText,
  insertProtocolDraft,
} from "./draft";
import { draftFitsReviewBudget } from "./helpers";

/** Picks a stable message from unknown action failures. */
function failureMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = error.message;
    return typeof message === "string"
      ? message
      : "Protocol generation failed.";
  }

  return "Protocol generation failed.";
}

/** Runs protocol generation from the public action boundary. */
export const generate = FunctionImpl.make(
  api,
  "protocols",
  "generate",
  ({ protocolId }) =>
    asAppError(
      Effect.gen(function* () {
        const runMutation = yield* MutationRunner;
        const runQuery = yield* QueryRunner;
        const runAction = yield* ActionRunner;
        const aiRunId = yield* runMutation(
          refs.internal.protocols.startGeneration,
          { protocolId }
        );
        const result = yield* Effect.gen(function* () {
          const review = yield* runQuery(refs.public.protocols.getReviewState, {
            protocolId,
          });
          const text = review.sources
            .map((source) => source.text ?? "")
            .join("\n\n")
            .trim();
          const settings = yield* runAction(
            refs.internal.aiSettings.resolveRuntime,
            {}
          );
          const draft = yield* ProtocolExtractionService.extract({
            title: review.protocol.title,
            text,
            settings,
          }).pipe(Effect.provide(ProtocolExtractionService.Default));

          yield* runMutation(refs.internal.protocols.finishGeneration, {
            protocolId,
            aiRunId,
            draft,
          });
        }).pipe(Effect.either);

        yield* Either.match(result, {
          onLeft: (error) =>
            Effect.gen(function* () {
              yield* runMutation(refs.internal.protocols.failGeneration, {
                protocolId,
                aiRunId,
                message: failureMessage(error),
              });

              return yield* Effect.fail(error);
            }),
          onRight: () => Effect.void,
        });

        return aiRunId;
      })
    )
);

/** Starts a protocol generation run after validating saved protocol sources. */
export const startGeneration = FunctionImpl.make(
  api,
  "protocols",
  "startGeneration",
  ({ protocolId }) =>
    asAppError(
      Effect.gen(function* () {
        const reader = yield* DatabaseReader;
        const writer = yield* DatabaseWriter;
        const timestamp = Date.now();

        const protocol = yield* reader
          .table("protocols")
          .get(protocolId)
          .pipe(
            Effect.mapError(
              () =>
                new ProtocolNotFound({
                  protocolId,
                  message: "Protocol not found.",
                })
            )
          );

        yield* ensureProjectAccess(protocol.projectId);

        const text = yield* getProtocolInputText(protocolId);

        if (text.length === 0) {
          return yield* Effect.fail(
            new InvalidProtocolState({
              protocolId,
              message: "Protocol sources must include notes or a transcript.",
            })
          );
        }

        if (protocol.status === "processing") {
          return yield* Effect.fail(
            new InvalidProtocolState({
              protocolId,
              message: "Protocol generation is already running.",
            })
          );
        }

        if (!(protocol.status === "draft" || protocol.status === "failed")) {
          return yield* Effect.fail(
            new InvalidProtocolState({
              protocolId,
              message: "Protocol can only be generated from draft sources.",
            })
          );
        }

        const aiRunId = yield* writer.table("aiRuns").insert({
          projectId: protocol.projectId,
          protocolId,
          kind: "generateProtocol",
          status: "running",
          startedAt: timestamp,
        });

        yield* writer.table("aiRunEvents").insert({
          aiRunId,
          order: 1,
          kind: "started",
          message: "Generating structured construction protocol.",
          createdAt: timestamp,
        });

        yield* writer.table("protocols").patch(protocolId, {
          status: "processing",
          updatedAt: timestamp,
        });

        return aiRunId;
      })
    )
);

/** Finishes a generation run with a persisted protocol draft. */
export const finishGeneration = FunctionImpl.make(
  api,
  "protocols",
  "finishGeneration",
  ({ aiRunId, draft, protocolId }) =>
    asAppError(
      Effect.gen(function* () {
        const reader = yield* DatabaseReader;
        const writer = yield* DatabaseWriter;
        const protocol = yield* reader
          .table("protocols")
          .get(protocolId)
          .pipe(
            Effect.mapError(
              () =>
                new ProtocolNotFound({
                  protocolId,
                  message: "Protocol not found.",
                })
            )
          );

        yield* ensureProjectAccess(protocol.projectId);
        if (protocol.status !== "processing") {
          return yield* Effect.fail(
            new InvalidProtocolState({
              protocolId,
              message: "Protocol generation is not active for this protocol.",
            })
          );
        }

        if (!draftFitsReviewBudget(draft)) {
          return yield* Effect.fail(
            new InvalidProtocolState({
              protocolId,
              message:
                "Generated protocol is too large to review in one protocol.",
            })
          );
        }

        yield* clearProtocolDraft(protocolId);
        yield* insertProtocolDraft({ protocolId, draft });

        yield* writer.table("protocols").patch(protocolId, {
          status: "review",
          updatedAt: Date.now(),
        });

        yield* writer.table("aiRunEvents").insert({
          aiRunId,
          order: 2,
          kind: "completed",
          message: "Protocol draft is ready for review.",
          createdAt: Date.now(),
        });

        yield* writer.table("aiRuns").patch(aiRunId, {
          status: "succeeded",
          finishedAt: Date.now(),
        });

        return null;
      })
    )
);

/** Marks a generation run as failed and returns the protocol to a retryable state. */
export const failGeneration = FunctionImpl.make(
  api,
  "protocols",
  "failGeneration",
  ({ aiRunId, protocolId, message }) =>
    asAppError(
      Effect.gen(function* () {
        const reader = yield* DatabaseReader;
        const writer = yield* DatabaseWriter;
        const protocol = yield* reader
          .table("protocols")
          .get(protocolId)
          .pipe(
            Effect.mapError(
              () =>
                new ProtocolNotFound({
                  protocolId,
                  message: "Protocol not found.",
                })
            )
          );

        yield* ensureProjectAccess(protocol.projectId);

        yield* writer.table("aiRunEvents").insert({
          aiRunId,
          order: 2,
          kind: "failed",
          message,
          createdAt: Date.now(),
        });

        yield* writer.table("aiRuns").patch(aiRunId, {
          status: "failed",
          error: message,
          finishedAt: Date.now(),
        });

        yield* writer.table("protocols").patch(protocolId, {
          status: "failed",
          updatedAt: Date.now(),
        });

        return null;
      })
    )
);
