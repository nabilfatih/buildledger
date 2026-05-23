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

export class MeetingNotFound extends Schema.TaggedError<MeetingNotFound>()(
  "MeetingNotFound",
  {
    meetingId: GenericId.GenericId("meetings"),
    message: Schema.String,
  }
) {}

export class ReviewItemNotFound extends Schema.TaggedError<ReviewItemNotFound>()(
  "ReviewItemNotFound",
  {
    itemId: GenericId.GenericId("minuteItems"),
    message: Schema.String,
  }
) {}

export class InvalidMeetingState extends Schema.TaggedError<InvalidMeetingState>()(
  "InvalidMeetingState",
  {
    meetingId: GenericId.GenericId("meetings"),
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
    resourceType: Schema.Literal("meeting", "report"),
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
  MeetingNotFound,
  ReviewItemNotFound,
  InvalidMeetingState,
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
    error instanceof MeetingNotFound ||
    error instanceof ReviewItemNotFound ||
    error instanceof InvalidMeetingState ||
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
