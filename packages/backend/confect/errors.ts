import { GenericId } from "@confect/core";
import { Schema } from "effect";

export class Forbidden extends Schema.TaggedError<Forbidden>()("Forbidden", {
  message: Schema.String,
}) {}

export class ProjectNotFound extends Schema.TaggedError<ProjectNotFound>()(
  "ProjectNotFound",
  {
    projectId: GenericId.GenericId("projects"),
    message: Schema.String,
  }
) {}

export class ProtocolNotFound extends Schema.TaggedError<ProtocolNotFound>()(
  "ProtocolNotFound",
  {
    protocolId: GenericId.GenericId("protocols"),
    message: Schema.String,
  }
) {}

export class SourceDocumentNotFound extends Schema.TaggedError<SourceDocumentNotFound>()(
  "SourceDocumentNotFound",
  {
    documentId: GenericId.GenericId("sourceDocuments"),
    message: Schema.String,
  }
) {}

export class InvalidDocumentUpload extends Schema.TaggedError<InvalidDocumentUpload>()(
  "InvalidDocumentUpload",
  {
    message: Schema.String,
  }
) {}

export class ReviewItemNotFound extends Schema.TaggedError<ReviewItemNotFound>()(
  "ReviewItemNotFound",
  {
    itemId: GenericId.GenericId("protocolItems"),
    message: Schema.String,
  }
) {}

export class ProjectRecordNotFound extends Schema.TaggedError<ProjectRecordNotFound>()(
  "ProjectRecordNotFound",
  {
    recordId: GenericId.GenericId("projectRecords"),
    message: Schema.String,
  }
) {}

export class InvestigationNotFound extends Schema.TaggedError<InvestigationNotFound>()(
  "InvestigationNotFound",
  {
    investigationId: GenericId.GenericId("investigations"),
    message: Schema.String,
  }
) {}

export class ReportNotFound extends Schema.TaggedError<ReportNotFound>()(
  "ReportNotFound",
  {
    reportId: GenericId.GenericId("reports"),
    message: Schema.String,
  }
) {}

export class InvalidProtocolState extends Schema.TaggedError<InvalidProtocolState>()(
  "InvalidProtocolState",
  {
    protocolId: GenericId.GenericId("protocols"),
    message: Schema.String,
  }
) {}

export class ShareLinkExpired extends Schema.TaggedError<ShareLinkExpired>()(
  "ShareLinkExpired",
  {
    message: Schema.String,
  }
) {}

export class ShareTargetNotFound extends Schema.TaggedError<ShareTargetNotFound>()(
  "ShareTargetNotFound",
  {
    message: Schema.String,
    resourceId: Schema.String,
    resourceType: Schema.Literal("protocol", "report", "ledger", "logbook"),
  }
) {}

export class InvalidShareTarget extends Schema.TaggedError<InvalidShareTarget>()(
  "InvalidShareTarget",
  {
    message: Schema.String,
  }
) {}

export class InternalFailure extends Schema.TaggedError<InternalFailure>()(
  "InternalFailure",
  {
    message: Schema.String,
    reason: Schema.optional(Schema.String),
  }
) {}

export const AppError = Schema.Union(
  Forbidden,
  ProjectNotFound,
  ProtocolNotFound,
  SourceDocumentNotFound,
  InvalidDocumentUpload,
  ReviewItemNotFound,
  ProjectRecordNotFound,
  InvestigationNotFound,
  ReportNotFound,
  InvalidProtocolState,
  ShareLinkExpired,
  ShareTargetNotFound,
  InvalidShareTarget,
  InternalFailure
);
export type AppError = Schema.Schema.Type<typeof AppError>;

/** Checks whether an unknown value can be inspected by property name. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Reads a tagged Effect/Confect error name without using unsafe casts. */
function taggedReason(error: unknown) {
  if (!isRecord(error)) {
    return;
  }

  const tag = error._tag;
  return typeof tag === "string" ? tag : undefined;
}

/** Picks a safe user-facing message from unknown failure values. */
function errorMessage(error: unknown) {
  if (!isRecord(error)) {
    return "BuildLedger operation failed.";
  }

  const message = error.message;
  return typeof message === "string"
    ? message
    : "BuildLedger operation failed.";
}

/** Normalizes all backend boundary failures into typed app errors. */
export function normalizeAppError(error: unknown): AppError {
  if (
    error instanceof Forbidden ||
    error instanceof ProjectNotFound ||
    error instanceof ProtocolNotFound ||
    error instanceof SourceDocumentNotFound ||
    error instanceof InvalidDocumentUpload ||
    error instanceof ReviewItemNotFound ||
    error instanceof ProjectRecordNotFound ||
    error instanceof InvestigationNotFound ||
    error instanceof ReportNotFound ||
    error instanceof InvalidProtocolState ||
    error instanceof ShareLinkExpired ||
    error instanceof ShareTargetNotFound ||
    error instanceof InvalidShareTarget ||
    error instanceof InternalFailure
  ) {
    return error;
  }

  if (taggedReason(error) === "NoUserIdentityFoundError") {
    return new Forbidden({
      message: "Sign in before accessing BuildLedger.",
    });
  }

  return new InternalFailure({
    message: errorMessage(error),
    reason: taggedReason(error),
  });
}
