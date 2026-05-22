import { GenericId } from "@confect/core";
import { Table } from "@confect/server";
import { OpenRouterModel } from "@repo/ai/schemas";
import { Schema } from "effect";

const Timestamp = Schema.Number;
const OptionalString = Schema.optional(Schema.String);

export const Organizations = Table.make(
  "organizations",
  Schema.Struct({
    name: Schema.String,
    slug: Schema.String,
    createdByToken: Schema.String,
    createdAt: Timestamp,
  })
).index("by_createdByToken", ["createdByToken", "createdAt"]);

export const OrganizationMembers = Table.make(
  "organizationMembers",
  Schema.Struct({
    organizationId: GenericId.GenericId("organizations"),
    userToken: Schema.String,
    role: Schema.Literal("owner", "admin", "member"),
    createdAt: Timestamp,
  })
)
  .index("by_organizationId", ["organizationId", "createdAt"])
  .index("by_userToken", ["userToken", "createdAt"]);

export const Projects = Table.make(
  "projects",
  Schema.Struct({
    organizationId: GenericId.GenericId("organizations"),
    name: Schema.String,
    code: Schema.String,
    description: OptionalString,
    status: Schema.Literal("active", "archived"),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
)
  .index("by_organizationId", ["organizationId", "createdAt"])
  .index("by_organizationId_and_status", [
    "organizationId",
    "status",
    "createdAt",
  ]);

export const ProjectMembers = Table.make(
  "projectMembers",
  Schema.Struct({
    projectId: GenericId.GenericId("projects"),
    userToken: Schema.String,
    role: Schema.Literal("manager", "editor", "viewer"),
    createdAt: Timestamp,
  })
)
  .index("by_projectId", ["projectId", "createdAt"])
  .index("by_userToken", ["userToken", "createdAt"])
  .index("by_projectId_and_userToken", ["projectId", "userToken"]);

export const AiProviderSettings = Table.make(
  "aiProviderSettings",
  Schema.Struct({
    userToken: Schema.String,
    provider: Schema.Literal("openrouter"),
    model: OpenRouterModel,
    encryptedApiKey: Schema.String,
    encryptionIv: Schema.String,
    keyLast4: Schema.String,
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
).index("by_userToken", ["userToken", "updatedAt"]);

export const Meetings = Table.make(
  "meetings",
  Schema.Struct({
    projectId: GenericId.GenericId("projects"),
    title: Schema.String,
    meetingType: Schema.String,
    meetingDate: Schema.String,
    agenda: OptionalString,
    status: Schema.Literal(
      "draft",
      "processing",
      "review",
      "published",
      "failed"
    ),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
)
  .index("by_projectId", ["projectId", "createdAt"])
  .index("by_projectId_and_status", ["projectId", "status", "createdAt"]);

export const MeetingAttendees = Table.make(
  "meetingAttendees",
  Schema.Struct({
    meetingId: GenericId.GenericId("meetings"),
    name: Schema.String,
    company: OptionalString,
    role: OptionalString,
    email: OptionalString,
    createdAt: Timestamp,
  })
).index("by_meetingId", ["meetingId", "createdAt"]);

export const MeetingInputs = Table.make(
  "meetingInputs",
  Schema.Struct({
    meetingId: GenericId.GenericId("meetings"),
    kind: Schema.Literal("notes", "transcript", "file"),
    text: OptionalString,
    storageId: Schema.optional(GenericId.GenericId("_storage")),
    createdAt: Timestamp,
  })
).index("by_meetingId", ["meetingId", "createdAt"]);

export const MinuteSections = Table.make(
  "minuteSections",
  Schema.Struct({
    meetingId: GenericId.GenericId("meetings"),
    title: Schema.String,
    body: Schema.String,
    order: Schema.Number,
    createdAt: Timestamp,
  })
).index("by_meetingId", ["meetingId", "order"]);

export const MinuteItems = Table.make(
  "minuteItems",
  Schema.Struct({
    meetingId: GenericId.GenericId("meetings"),
    sectionId: GenericId.GenericId("minuteSections"),
    kind: Schema.Literal(
      "discussion",
      "decision",
      "action",
      "risk",
      "question"
    ),
    title: Schema.String,
    body: Schema.String,
    status: Schema.optional(Schema.String),
    ownerName: OptionalString,
    dueDate: OptionalString,
    severity: Schema.optional(Schema.Literal("low", "medium", "high")),
    citationsJson: Schema.String,
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
)
  .index("by_meetingId", ["meetingId", "createdAt"])
  .index("by_sectionId", ["sectionId", "createdAt"]);

export const ActionItems = Table.make(
  "actionItems",
  Schema.Struct({
    projectId: GenericId.GenericId("projects"),
    meetingId: GenericId.GenericId("meetings"),
    title: Schema.String,
    ownerName: OptionalString,
    dueDate: OptionalString,
    status: Schema.Literal("open", "blocked", "done"),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
)
  .index("by_projectId", ["projectId", "createdAt"])
  .index("by_projectId_and_status", ["projectId", "status", "createdAt"]);

export const Decisions = Table.make(
  "decisions",
  Schema.Struct({
    projectId: GenericId.GenericId("projects"),
    meetingId: GenericId.GenericId("meetings"),
    title: Schema.String,
    body: Schema.String,
    decidedAt: Schema.String,
    createdAt: Timestamp,
  })
).index("by_projectId", ["projectId", "createdAt"]);

export const Risks = Table.make(
  "risks",
  Schema.Struct({
    projectId: GenericId.GenericId("projects"),
    meetingId: GenericId.GenericId("meetings"),
    title: Schema.String,
    body: Schema.String,
    severity: Schema.Literal("low", "medium", "high"),
    status: Schema.Literal("open", "blocked", "done"),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
)
  .index("by_projectId", ["projectId", "createdAt"])
  .index("by_projectId_and_status", ["projectId", "status", "createdAt"]);

export const MemoryChunks = Table.make(
  "memoryChunks",
  Schema.Struct({
    projectId: GenericId.GenericId("projects"),
    sourceType: Schema.Literal("meeting", "report"),
    sourceId: Schema.String,
    text: Schema.String,
    chronologyDate: Schema.String,
    embedding: Schema.Array(Schema.Number),
    metadataJson: Schema.String,
    createdAt: Timestamp,
  })
)
  .index("by_projectId", ["projectId", "createdAt"])
  .index("by_projectId_and_chronologyDate", ["projectId", "chronologyDate"])
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1536,
    filterFields: ["projectId"],
  });

export const AiRuns = Table.make(
  "aiRuns",
  Schema.Struct({
    projectId: GenericId.GenericId("projects"),
    meetingId: Schema.optional(GenericId.GenericId("meetings")),
    kind: Schema.String,
    status: Schema.Literal("queued", "running", "succeeded", "failed"),
    error: OptionalString,
    startedAt: Timestamp,
    finishedAt: Schema.optional(Timestamp),
  })
)
  .index("by_projectId", ["projectId", "startedAt"])
  .index("by_meetingId", ["meetingId", "startedAt"]);

export const AiRunEvents = Table.make(
  "aiRunEvents",
  Schema.Struct({
    aiRunId: GenericId.GenericId("aiRuns"),
    order: Schema.Number,
    kind: Schema.String,
    message: Schema.String,
    payloadJson: OptionalString,
    createdAt: Timestamp,
  })
).index("by_aiRunId", ["aiRunId", "order"]);

export const Reports = Table.make(
  "reports",
  Schema.Struct({
    projectId: GenericId.GenericId("projects"),
    title: Schema.String,
    periodStart: Schema.String,
    periodEnd: Schema.String,
    body: Schema.String,
    status: Schema.Literal("draft", "published"),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
).index("by_projectId", ["projectId", "createdAt"]);

export const ShareLinks = Table.make(
  "shareLinks",
  Schema.Struct({
    projectId: GenericId.GenericId("projects"),
    resourceType: Schema.Literal("meeting", "report"),
    resourceId: Schema.String,
    tokenHash: Schema.String,
    expiresAt: Schema.optional(Timestamp),
    revokedAt: Schema.optional(Timestamp),
    createdAt: Timestamp,
  })
)
  .index("by_projectId", ["projectId", "createdAt"])
  .index("by_tokenHash", ["tokenHash", "createdAt"]);
