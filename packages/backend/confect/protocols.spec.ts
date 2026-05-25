import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { ProtocolDraft } from "@repo/ai/schemas";
import { AppError } from "@repo/backend/confect/errors";
import {
  AiRunEvents,
  AiRuns,
  ProtocolItems,
  ProtocolParticipants,
  ProtocolSections,
  ProtocolSources,
  Protocols,
} from "@repo/backend/confect/tables/core";
import { Schema } from "effect";

export const ProtocolPersonInput = Schema.Struct({
  name: Schema.String,
  company: Schema.optional(Schema.String),
  role: Schema.optional(Schema.String),
  email: Schema.optional(Schema.String),
});

const PaginationOpts = Schema.Struct({
  cursor: Schema.NullOr(Schema.String),
  endCursor: Schema.optional(Schema.NullOr(Schema.String)),
  id: Schema.optional(Schema.Number),
  maximumBytesRead: Schema.optional(Schema.Number),
  maximumRowsRead: Schema.optional(Schema.Number),
  numItems: Schema.Number,
});

const ProtocolsPage = Schema.mutable(
  Schema.Struct({
    continueCursor: Schema.String,
    isDone: Schema.Boolean,
    page: Schema.mutable(Schema.Array(Protocols.Doc)),
    pageStatus: Schema.optional(
      Schema.NullOr(Schema.Literal("SplitRecommended", "SplitRequired"))
    ),
    splitCursor: Schema.optional(Schema.NullOr(Schema.String)),
  })
);

export const protocols = GroupSpec.make("protocols")
  .addFunction(
    FunctionSpec.publicQuery({
      name: "listByProject",
      args: Schema.Struct({
        projectId: GenericId.GenericId("projects"),
        paginationOpts: PaginationOpts,
      }),
      returns: ProtocolsPage,
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "createDraft",
      args: Schema.Struct({
        projectId: GenericId.GenericId("projects"),
        title: Schema.String,
        protocolNumber: Schema.String,
        protocolType: Schema.String,
        protocolDate: Schema.String,
        location: Schema.optional(Schema.String),
        agenda: Schema.optional(Schema.String),
        attendees: Schema.Array(ProtocolPersonInput),
        distribution: Schema.Array(ProtocolPersonInput),
      }),
      returns: GenericId.GenericId("protocols"),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "saveSource",
      args: Schema.Struct({
        protocolId: GenericId.GenericId("protocols"),
        kind: Schema.Literal("notes", "transcript", "document"),
        text: Schema.String,
      }),
      returns: GenericId.GenericId("protocolSources"),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "attachDocument",
      args: Schema.Struct({
        protocolId: GenericId.GenericId("protocols"),
        documentId: GenericId.GenericId("sourceDocuments"),
      }),
      returns: GenericId.GenericId("protocolSources"),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "updateReview",
      args: Schema.Struct({
        itemId: GenericId.GenericId("protocolItems"),
        kind: Schema.Literal(
          "agenda",
          "discussion",
          "change",
          "task",
          "information",
          "concern",
          "obstruction",
          "decision",
          "risk",
          "question"
        ),
        title: Schema.String,
        body: Schema.String,
        component: Schema.optional(Schema.String),
        objectName: Schema.optional(Schema.String),
        trade: Schema.optional(Schema.String),
        responsibleParty: Schema.optional(Schema.String),
        dueDate: Schema.optional(Schema.String),
        severity: Schema.optional(Schema.Literal("low", "medium", "high")),
        status: Schema.Literal(
          "open",
          "in_progress",
          "blocked",
          "resolved",
          "recorded"
        ),
      }),
      returns: Schema.Null,
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.internalMutation({
      name: "startGeneration",
      args: Schema.Struct({ protocolId: GenericId.GenericId("protocols") }),
      returns: GenericId.GenericId("aiRuns"),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.internalMutation({
      name: "finishGeneration",
      args: Schema.Struct({
        protocolId: GenericId.GenericId("protocols"),
        aiRunId: GenericId.GenericId("aiRuns"),
        draft: ProtocolDraft,
      }),
      returns: Schema.Null,
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.internalMutation({
      name: "failGeneration",
      args: Schema.Struct({
        protocolId: GenericId.GenericId("protocols"),
        aiRunId: GenericId.GenericId("aiRuns"),
        message: Schema.String,
      }),
      returns: Schema.Null,
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicAction({
      name: "generate",
      args: Schema.Struct({ protocolId: GenericId.GenericId("protocols") }),
      returns: GenericId.GenericId("aiRuns"),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicQuery({
      name: "getReviewState",
      args: Schema.Struct({ protocolId: GenericId.GenericId("protocols") }),
      returns: Schema.Struct({
        protocol: Protocols.Doc,
        participants: Schema.Array(ProtocolParticipants.Doc),
        sources: Schema.Array(ProtocolSources.Doc),
        sections: Schema.Array(ProtocolSections.Doc),
        items: Schema.Array(ProtocolItems.Doc),
        aiRuns: Schema.Array(AiRuns.Doc),
        aiRunEvents: Schema.Array(AiRunEvents.Doc),
      }),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "publish",
      args: Schema.Struct({ protocolId: GenericId.GenericId("protocols") }),
      returns: Schema.Null,
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicQuery({
      name: "getPrintView",
      args: Schema.Struct({ protocolId: GenericId.GenericId("protocols") }),
      returns: Schema.Struct({
        protocol: Protocols.Doc,
        participants: Schema.Array(ProtocolParticipants.Doc),
        sections: Schema.Array(ProtocolSections.Doc),
        items: Schema.Array(ProtocolItems.Doc),
      }),
      error: AppError,
    })
  );
