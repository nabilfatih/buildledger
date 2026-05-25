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
  SourceDocumentNotFound,
} from "@repo/backend/confect/errors";
import { asAppError, ensureProjectAccess } from "@repo/backend/confect/helpers";
import { Effect } from "effect";

import {
  canSaveProtocolInput,
  maxAiRunEventsPerRun,
  maxAiRuns,
  maxProtocolItems,
  maxProtocolParticipants,
  maxProtocolSections,
  maxProtocolSources,
  reviewItemPatch,
} from "./helpers";
import { insertParticipants } from "./people";
import { upsertProtocolSource } from "./sources";

/** Lists recent protocols for a project the user can access. */
export const listByProject = FunctionImpl.make(
  api,
  "protocols",
  "listByProject",
  ({ paginationOpts, projectId }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const reader = yield* DatabaseReader;

        return yield* reader
          .table("protocols")
          .index("by_projectId", (q) => q.eq("projectId", projectId), "desc")
          .paginate(paginationOpts);
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
    attendees,
    distribution,
  }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const writer = yield* DatabaseWriter;
        const timestamp = Date.now();

        const protocolId = yield* writer.table("protocols").insert({
          projectId,
          title,
          protocolNumber,
          protocolType,
          protocolDate,
          location,
          agenda,
          status: "draft",
          createdAt: timestamp,
          updatedAt: timestamp,
        });

        yield* insertParticipants({
          protocolId,
          projectId,
          kind: "attendee",
          people: attendees,
        });
        yield* insertParticipants({
          protocolId,
          projectId,
          kind: "distribution",
          people: distribution,
        });

        return protocolId;
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

        return yield* upsertProtocolSource({
          protocolId,
          kind,
          text,
        });
      })
    )
);

/** Attaches an extracted source document to the active protocol draft. */
export const attachDocument = FunctionImpl.make(
  api,
  "protocols",
  "attachDocument",
  ({ protocolId, documentId }) =>
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
        const document = yield* reader
          .table("sourceDocuments")
          .get(documentId)
          .pipe(
            Effect.mapError(
              () =>
                new SourceDocumentNotFound({
                  documentId,
                  message: "Source document not found.",
                })
            )
          );

        yield* ensureProjectAccess(protocol.projectId);

        if (document.projectId !== protocol.projectId) {
          return yield* Effect.fail(
            new SourceDocumentNotFound({
              documentId,
              message: "Source document does not belong to this project.",
            })
          );
        }

        if (!canSaveProtocolInput(protocol.status)) {
          return yield* Effect.fail(
            new InvalidProtocolState({
              protocolId,
              message: "Documents can only be attached before generation.",
            })
          );
        }

        if (!document.extractedText?.trim()) {
          return yield* Effect.fail(
            new SourceDocumentNotFound({
              documentId,
              message: "Extract document text before attaching it.",
            })
          );
        }

        const writer = yield* DatabaseWriter;
        yield* writer.table("sourceDocuments").patch(documentId, {
          protocolId,
          updatedAt: Date.now(),
        });

        return yield* upsertProtocolSource({
          protocolId,
          kind: "document",
          text: document.extractedText,
          fileName: document.fileName,
          storageId: document.storageId,
        });
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

        const participants = yield* reader
          .table("protocolParticipants")
          .index("by_protocolId", (q) => q.eq("protocolId", protocolId))
          .take(maxProtocolParticipants);
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
          participants,
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
    trade,
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
          trade,
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

        const participants = yield* reader
          .table("protocolParticipants")
          .index("by_protocolId", (q) => q.eq("protocolId", protocolId))
          .take(maxProtocolParticipants);
        const sections = yield* reader
          .table("protocolSections")
          .index("by_protocolId", (q) => q.eq("protocolId", protocolId))
          .take(maxProtocolSections);
        const items = yield* reader
          .table("protocolItems")
          .index("by_protocolId", (q) => q.eq("protocolId", protocolId))
          .take(maxProtocolItems);

        return { protocol, participants, sections, items };
      })
    )
);
