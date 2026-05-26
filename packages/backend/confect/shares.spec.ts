import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { AppError } from "@repo/backend/confect/errors";
import { Schema } from "effect";

const SharedRecordKind = Schema.Literal(
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
);
const SharedRecordStatus = Schema.Literal(
  "open",
  "in_progress",
  "blocked",
  "resolved",
  "recorded"
);
const SharedResourceType = Schema.Literal(
  "protocol",
  "report",
  "ledger",
  "logbook"
);

export const CreateReadOnlyLinkArgs = Schema.Struct({
  projectId: GenericId.GenericId("projects"),
  protocolId: Schema.optional(GenericId.GenericId("protocols")),
  reportId: Schema.optional(GenericId.GenericId("reports")),
  ledgerView: Schema.optional(Schema.Boolean),
  logbookView: Schema.optional(Schema.Boolean),
});

export const SharedProtocol = Schema.Struct({
  title: Schema.String,
  protocolNumber: Schema.String,
  protocolType: Schema.String,
  protocolDate: Schema.String,
});

export const SharedParticipant = Schema.Struct({
  kind: Schema.Literal("attendee", "distribution"),
  name: Schema.String,
  company: Schema.optional(Schema.String),
  role: Schema.optional(Schema.String),
});

export const SharedSection = Schema.Struct({
  title: Schema.String,
  body: Schema.String,
});

export const SharedProtocolItem = Schema.Struct({
  kind: SharedRecordKind,
  title: Schema.String,
  body: Schema.String,
});

export const SharedProjectRecord = Schema.Struct({
  kind: SharedRecordKind,
  title: Schema.String,
  body: Schema.String,
  sourceProtocolTitle: Schema.String,
  sourceProtocolDate: Schema.String,
  status: SharedRecordStatus,
});

export const SharedLogbookEvent = Schema.Struct({
  eventType: Schema.Literal(
    "protocol_published",
    "record_created",
    "status_changed",
    "assignment_changed",
    "risk_detected"
  ),
  title: Schema.String,
  body: Schema.String,
  chronologyDate: Schema.String,
});

export const SharedReport = Schema.Struct({
  title: Schema.String,
  body: Schema.String,
  periodStart: Schema.String,
  periodEnd: Schema.String,
  status: Schema.Literal("draft", "published"),
});

export const SharedProtocolResource = Schema.Struct({
  resourceType: Schema.Literal("protocol"),
  projectName: Schema.String,
  projectCode: Schema.String,
  protocol: SharedProtocol,
  participants: Schema.Array(SharedParticipant),
  sections: Schema.Array(SharedSection),
  items: Schema.Array(SharedProtocolItem),
});

export const SharedReportResource = Schema.Struct({
  resourceType: Schema.Literal("report"),
  projectName: Schema.String,
  projectCode: Schema.String,
  report: SharedReport,
});

export const SharedLedgerResource = Schema.Struct({
  resourceType: Schema.Literal("ledger"),
  projectName: Schema.String,
  projectCode: Schema.String,
  records: Schema.Array(SharedProjectRecord),
});

export const SharedLogbookResource = Schema.Struct({
  resourceType: Schema.Literal("logbook"),
  projectName: Schema.String,
  projectCode: Schema.String,
  events: Schema.Array(SharedLogbookEvent),
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
        resourceType: SharedResourceType,
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
