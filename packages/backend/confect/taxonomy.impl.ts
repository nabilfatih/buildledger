import { FunctionImpl, GroupImpl } from "@confect/server";
import api from "@repo/backend/confect/_generated/api";
import {
  DatabaseReader,
  DatabaseWriter,
} from "@repo/backend/confect/_generated/services";
import { InternalFailure } from "@repo/backend/confect/errors";
import { asAppError, ensureProjectAccess } from "@repo/backend/confect/helpers";
import { Effect, Layer } from "effect";

/** Lists active taxonomy labels for one accessible project. */
const listByProject = FunctionImpl.make(
  api,
  "taxonomy",
  "listByProject",
  ({ projectId }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const reader = yield* DatabaseReader;

        return yield* reader
          .table("projectTaxonomy")
          .index(
            "by_projectId_and_status",
            (q) => q.eq("projectId", projectId).eq("status", "active"),
            "desc"
          )
          .take(200);
      })
    )
);

/** Creates or refreshes one taxonomy label for a project. */
const upsert = FunctionImpl.make(
  api,
  "taxonomy",
  "upsert",
  ({ projectId, kind, label }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const reader = yield* DatabaseReader;
        const normalizedLabel = label.trim();
        const lowercaseLabel = normalizedLabel.toLowerCase();
        const currentItems = yield* reader
          .table("projectTaxonomy")
          .index("by_projectId_and_kind_and_normalizedLabel", (q) =>
            q
              .eq("projectId", projectId)
              .eq("kind", kind)
              .eq("normalizedLabel", lowercaseLabel)
          )
          .take(1);
        const current = currentItems.at(0);
        const writer = yield* DatabaseWriter;
        const timestamp = Date.now();

        if (current) {
          yield* writer.table("projectTaxonomy").patch(current._id, {
            archivedAt: undefined,
            label: normalizedLabel,
            normalizedLabel: lowercaseLabel,
            status: "active",
            updatedAt: timestamp,
          });
          return current._id;
        }

        return yield* writer.table("projectTaxonomy").insert({
          projectId,
          kind,
          label: normalizedLabel,
          normalizedLabel: lowercaseLabel,
          status: "active",
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      })
    )
);

/** Archives one taxonomy label after checking its project membership. */
const archive = FunctionImpl.make(
  api,
  "taxonomy",
  "archive",
  ({ taxonomyId }) =>
    asAppError(
      Effect.gen(function* () {
        const reader = yield* DatabaseReader;
        const taxonomy = yield* reader
          .table("projectTaxonomy")
          .get(taxonomyId)
          .pipe(
            Effect.mapError(
              () =>
                new InternalFailure({
                  message: "Project taxonomy not found.",
                })
            )
          );

        yield* ensureProjectAccess(taxonomy.projectId);

        const writer = yield* DatabaseWriter;
        yield* writer.table("projectTaxonomy").patch(taxonomyId, {
          archivedAt: Date.now(),
          status: "archived",
          updatedAt: Date.now(),
        });

        return null;
      })
    )
);

export const taxonomy = GroupImpl.make(api, "taxonomy").pipe(
  Layer.provide(listByProject),
  Layer.provide(upsert),
  Layer.provide(archive)
);
