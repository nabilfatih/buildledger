import { FunctionImpl, GroupImpl } from "@confect/server";
import { ProjectInvestigationService } from "@repo/ai/services";
import api from "@repo/backend/confect/_generated/api";
import refs from "@repo/backend/confect/_generated/refs";
import {
  ActionRunner,
  DatabaseReader,
  DatabaseWriter,
  MutationRunner,
  QueryRunner,
} from "@repo/backend/confect/_generated/services";
import { InvestigationNotFound } from "@repo/backend/confect/errors";
import { asAppError, ensureProjectAccess } from "@repo/backend/confect/helpers";
import { Effect, Layer } from "effect";

/** Runs an AI Detective investigation from published project memory. */
const run = FunctionImpl.make(
  api,
  "investigations",
  "run",
  ({ projectId, question }) =>
    asAppError(
      Effect.gen(function* () {
        const runAction = yield* ActionRunner;
        const runMutation = yield* MutationRunner;
        const runQuery = yield* QueryRunner;
        const settings = yield* runAction(
          refs.internal.aiSettings.resolveRuntime,
          {}
        );
        yield* runQuery(refs.public.projects.get, { projectId });
        const chunks = yield* runQuery(refs.public.memory.chunksByProject, {
          projectId,
        });
        const investigation = yield* ProjectInvestigationService.run({
          question,
          chunks: chunks.map((chunk) => ({
            chunkId: chunk._id,
            chronologyDate: chunk.chronologyDate,
            sourceTitle: chunk.sourceType,
            text: chunk.text,
          })),
          settings,
        }).pipe(Effect.provide(ProjectInvestigationService.Default));

        return yield* runMutation(refs.internal.investigations.saveResult, {
          projectId,
          question,
          investigation,
        });
      })
    )
);

/** Persists a completed AI Detective result inside a mutation transaction. */
const saveResult = FunctionImpl.make(
  api,
  "investigations",
  "saveResult",
  ({ projectId, question, investigation }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const writer = yield* DatabaseWriter;

        return yield* writer.table("investigations").insert({
          projectId,
          question,
          detectedRisk: investigation.detectedRisk,
          likelyCause: investigation.likelyCause,
          impactedObjectsJson: JSON.stringify(investigation.impactedObjects),
          impactedTradesJson: JSON.stringify(investigation.impactedTrades),
          relatedRecordsJson: JSON.stringify(investigation.relatedRecords),
          recommendedActionsJson: JSON.stringify(
            investigation.recommendedActions
          ),
          citationsJson: JSON.stringify(investigation.citations),
          createdAt: Date.now(),
        });
      })
    )
);

/** Lists recent AI Detective investigations for one accessible project. */
const listByProject = FunctionImpl.make(
  api,
  "investigations",
  "listByProject",
  ({ projectId }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const reader = yield* DatabaseReader;

        return yield* reader
          .table("investigations")
          .index("by_projectId", (q) => q.eq("projectId", projectId), "desc")
          .take(20);
      })
    )
);

/** Loads one AI Detective investigation after checking project access. */
const get = FunctionImpl.make(
  api,
  "investigations",
  "get",
  ({ investigationId }) =>
    asAppError(
      Effect.gen(function* () {
        const reader = yield* DatabaseReader;
        const investigation = yield* reader
          .table("investigations")
          .get(investigationId)
          .pipe(
            Effect.mapError(
              () =>
                new InvestigationNotFound({
                  investigationId,
                  message: "Investigation not found.",
                })
            )
          );

        yield* ensureProjectAccess(investigation.projectId);

        return investigation;
      })
    )
);

export const investigations = GroupImpl.make(api, "investigations").pipe(
  Layer.provide(run),
  Layer.provide(saveResult),
  Layer.provide(listByProject),
  Layer.provide(get)
);
