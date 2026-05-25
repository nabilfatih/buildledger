import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { AppError } from "@repo/backend/confect/errors";
import {
  LogbookEvents,
  ProjectRecords,
  ProtocolItems,
  ProtocolParticipants,
  ProtocolSections,
  Protocols,
  Reports,
  ShareLinks,
} from "@repo/backend/confect/tables/core";
import { Schema } from "effect";

export const CreateReadOnlyLinkArgs = Schema.Struct({
  projectId: GenericId.GenericId("projects"),
  protocolId: Schema.optional(GenericId.GenericId("protocols")),
  reportId: Schema.optional(GenericId.GenericId("reports")),
  ledgerView: Schema.optional(Schema.Boolean),
  logbookView: Schema.optional(Schema.Boolean),
});

export const SharedProtocolResource = Schema.Struct({
  resourceType: Schema.Literal("protocol"),
  projectName: Schema.String,
  projectCode: Schema.String,
  protocol: Protocols.Doc,
  participants: Schema.Array(ProtocolParticipants.Doc),
  sections: Schema.Array(ProtocolSections.Doc),
  items: Schema.Array(ProtocolItems.Doc),
});

export const SharedReportResource = Schema.Struct({
  resourceType: Schema.Literal("report"),
  projectName: Schema.String,
  projectCode: Schema.String,
  report: Reports.Doc,
});

export const SharedLedgerResource = Schema.Struct({
  resourceType: Schema.Literal("ledger"),
  projectName: Schema.String,
  projectCode: Schema.String,
  records: Schema.Array(ProjectRecords.Doc),
});

export const SharedLogbookResource = Schema.Struct({
  resourceType: Schema.Literal("logbook"),
  projectName: Schema.String,
  projectCode: Schema.String,
  events: Schema.Array(LogbookEvents.Doc),
});

export const SharedResource = Schema.Union(
  SharedProtocolResource,
  SharedReportResource,
  SharedLedgerResource,
  SharedLogbookResource
);

export const shares = GroupSpec.make("shares")
  .addFunction(
    FunctionSpec.publicMutation({
      name: "createReadOnlyLink",
      args: CreateReadOnlyLinkArgs,
      returns: Schema.Struct({
        shareLink: ShareLinks.Doc,
        token: Schema.String,
      }),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicQuery({
      name: "resolve",
      args: Schema.Struct({ token: Schema.String }),
      returns: SharedResource,
      error: AppError,
    })
  );
