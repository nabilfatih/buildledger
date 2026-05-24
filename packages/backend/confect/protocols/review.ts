import { FunctionImpl } from "@confect/server";
import api from "@repo/backend/confect/_generated/api";
import {
  DatabaseReader,
  DatabaseWriter,
} from "@repo/backend/confect/_generated/services";
import {
  InvalidProtocolState,
  ProtocolNotFound,
  ReviewItemNotFound,
} from "@repo/backend/confect/errors";
import { asAppError, ensureProjectAccess } from "@repo/backend/confect/helpers";
import { Effect } from "effect";

import {
  canSaveProtocolInput,
  maxAiRunEventsPerRun,
  maxAiRuns,
  maxProtocolItems,
  maxProtocolSections,
  maxProtocolSources,
  reviewItemPatch,
} from "./helpers";

/** Lists recent protocols for a project the user can access. */
export const listByProject = FunctionImpl.make(
  api,
  "protocols",
  "listByProject",
  ({ projectId }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const reader = yield* DatabaseReader;

        return yield* reader
          .table("protocols")
          .index("by_projectId", (q) => q.eq("projectId", projectId), "desc")
          .take(50);
      })
    )
);

/** Creates a draft protocol inside an accessible project. */
export const createDraft = FunctionImpl.make(
  api,
  "protocols",
  "createDraft",
  ({
    projectId,
    title,
    protocolNumber,
    protocolType,
    protocolDate,
    location,
    agenda,
    distributionList,
  }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const writer = yield* DatabaseWriter;
        const timestamp = Date.now();

        return yield* writer.table("protocols").insert({
          projectId,
          title,
          protocolNumber,
          protocolType,
          protocolDate,
          location,
          agenda,
          distributionList,
          status: "draft",
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      })
    )
);

/** Saves the current notes or transcript input for a protocol draft. */
export const saveSource = FunctionImpl.make(
  api,
  "protocols",
  "saveSource",
  ({ protocolId, kind, text }) =>
    asAppError(
      Effect.gen(function* () {
        const reader = yield* DatabaseReader;
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

        if (!canSaveProtocolInput(protocol.status)) {
          return yield* Effect.fail(
            new InvalidProtocolState({
              protocolId,
              message: "Protocol input can only be edited before generation.",
            })
          );
        }

        const existingInputs = yield* reader
          .table("protocolSources")
          .index(
            "by_protocolId_and_kind",
            (q) => q.eq("protocolId", protocolId).eq("kind", kind),
            "desc"
          )
          .take(50);
        const writer = yield* DatabaseWriter;
        const [currentInput, ...staleInputs] = existingInputs;

        if (!currentInput) {
          return yield* writer.table("protocolSources").insert({
            protocolId,
            kind,
            text: text.trim(),
            createdAt: Date.now(),
          });
        }

        yield* writer.table("protocolSources").patch(currentInput._id, {
          text: text.trim(),
          createdAt: Date.now(),
        });
        yield* Effect.all(
          staleInputs.map((input) =>
            writer.table("protocolSources").delete(input._id)
          )
        );

        return currentInput._id;
      })
    )
);

/** Returns the editable protocol review state and AI event timeline. */
export const getReviewState = FunctionImpl.make(
  api,
  "protocols",
  "getReviewState",
  ({ protocolId }) =>
    asAppError(
      Effect.gen(function* () {
        const reader = yield* DatabaseReader;
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

        const sources = yield* reader
          .table("protocolSources")
          .index("by_protocolId", (q) => q.eq("protocolId", protocolId))
          .take(maxProtocolSources);
        const sections = yield* reader
          .table("protocolSections")
          .index("by_protocolId", (q) => q.eq("protocolId", protocolId))
          .take(maxProtocolSections);
        const items = yield* reader
          .table("protocolItems")
          .index("by_protocolId", (q) => q.eq("protocolId", protocolId))
          .take(maxProtocolItems);
        const aiRuns = yield* reader
          .table("aiRuns")
          .index("by_protocolId", (q) => q.eq("protocolId", protocolId), "desc")
          .take(maxAiRuns);
        const nestedEvents = yield* Effect.all(
          aiRuns.map((run) =>
            reader
              .table("aiRunEvents")
              .index("by_aiRunId", (q) => q.eq("aiRunId", run._id))
              .take(maxAiRunEventsPerRun)
          )
        );

        return {
          protocol,
          sources,
          sections,
          items,
          aiRuns,
          aiRunEvents: nestedEvents.flat(),
        };
      })
    )
);

/** Updates one generated review item before the protocol is published. */
export const updateReview = FunctionImpl.make(
  api,
  "protocols",
  "updateReview",
  ({
    itemId,
    kind,
    title,
    body,
    bauteil,
    objectName,
    discipline,
    responsibleParty,
    dueDate,
    severity,
    status,
  }) =>
    asAppError(
      Effect.gen(function* () {
        const reader = yield* DatabaseReader;
        const item = yield* reader
          .table("protocolItems")
          .get(itemId)
          .pipe(
            Effect.mapError(
              () =>
                new ReviewItemNotFound({
                  itemId,
                  message: "Review item not found.",
                })
            )
          );
        const protocol = yield* reader
          .table("protocols")
          .get(item.protocolId)
          .pipe(
            Effect.mapError(
              () =>
                new ProtocolNotFound({
                  protocolId: item.protocolId,
                  message: "Protocol not found.",
                })
            )
          );

        yield* ensureProjectAccess(protocol.projectId);

        if (protocol.status !== "review") {
          return yield* Effect.fail(
            new InvalidProtocolState({
              protocolId: protocol._id,
              message: "Review items can only be edited before publishing.",
            })
          );
        }

        const patch = reviewItemPatch({
          kind,
          title,
          body,
          bauteil,
          objectName,
          discipline,
          responsibleParty,
          dueDate,
          severity,
          status,
        });

        if (patch.title.length === 0 || patch.body.length === 0) {
          return yield* Effect.fail(
            new InvalidProtocolState({
              protocolId: protocol._id,
              message: "Review items need a title and body.",
            })
          );
        }

        const writer = yield* DatabaseWriter;
        yield* writer.table("protocolItems").patch(itemId, patch);

        return null;
      })
    )
);

/** Returns a published protocol shape for print and read-only sharing. */
export const getPrintView = FunctionImpl.make(
  api,
  "protocols",
  "getPrintView",
  ({ protocolId }) =>
    asAppError(
      Effect.gen(function* () {
        const reader = yield* DatabaseReader;
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

        const sections = yield* reader
          .table("protocolSections")
          .index("by_protocolId", (q) => q.eq("protocolId", protocolId))
          .take(maxProtocolSections);
        const items = yield* reader
          .table("protocolItems")
          .index("by_protocolId", (q) => q.eq("protocolId", protocolId))
          .take(maxProtocolItems);

        return { protocol, sections, items };
      })
    )
);
