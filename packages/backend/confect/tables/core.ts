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

export const Protocols = Table.make(
  "protocols",
  Schema.Struct({
    projectId: GenericId.GenericId("projects"),
    title: Schema.String,
    protocolNumber: Schema.String,
    protocolType: Schema.String,
    protocolDate: Schema.String,
    location: OptionalString,
    agenda: OptionalString,
    distributionList: OptionalString,
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

export const ProjectParticipants = Table.make(
  "projectParticipants",
  Schema.Struct({
    projectId: GenericId.GenericId("projects"),
    name: Schema.String,
    company: OptionalString,
    role: OptionalString,
    email: OptionalString,
    createdAt: Timestamp,
  })
)
  .index("by_projectId", ["projectId", "createdAt"])
  .index("by_projectId_and_email", ["projectId", "email"]);

export const ProtocolSources = Table.make(
  "protocolSources",
  Schema.Struct({
    protocolId: GenericId.GenericId("protocols"),
    kind: Schema.Literal("notes", "transcript", "file", "document"),
    text: OptionalString,
    storageId: Schema.optional(GenericId.GenericId("_storage")),
    fileName: OptionalString,
    createdAt: Timestamp,
  })
)
  .index("by_protocolId", ["protocolId", "createdAt"])
  .index("by_protocolId_and_kind", ["protocolId", "kind", "createdAt"]);

export const ProtocolSections = Table.make(
  "protocolSections",
  Schema.Struct({
    protocolId: GenericId.GenericId("protocols"),
    title: Schema.String,
    body: Schema.String,
    order: Schema.Number,
    createdAt: Timestamp,
  })
).index("by_protocolId", ["protocolId", "order"]);

export const ProtocolItems = Table.make(
  "protocolItems",
  Schema.Struct({
    protocolId: GenericId.GenericId("protocols"),
    sectionId: GenericId.GenericId("protocolSections"),
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
    bauteil: OptionalString,
    objectName: OptionalString,
    discipline: OptionalString,
    responsibleParty: OptionalString,
    dueDate: OptionalString,
    severity: Schema.optional(Schema.Literal("low", "medium", "high")),
    status: Schema.Literal(
      "open",
      "in_progress",
      "blocked",
      "resolved",
      "recorded"
    ),
    citationsJson: Schema.String,
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
)
  .index("by_protocolId", ["protocolId", "createdAt"])
  .index("by_sectionId", ["sectionId", "createdAt"]);

export const ProjectRecords = Table.make(
  "projectRecords",
  Schema.Struct({
    projectId: GenericId.GenericId("projects"),
    protocolId: GenericId.GenericId("protocols"),
    protocolItemId: GenericId.GenericId("protocolItems"),
    recordNumber: Schema.String,
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
    bauteil: OptionalString,
    objectName: OptionalString,
    discipline: OptionalString,
    responsibleParty: OptionalString,
    dueDate: OptionalString,
    severity: Schema.optional(Schema.Literal("low", "medium", "high")),
    status: Schema.Literal(
      "open",
      "in_progress",
      "blocked",
      "resolved",
      "recorded"
    ),
    citationCount: Schema.Number,
    sourceProtocolTitle: Schema.String,
    sourceProtocolDate: Schema.String,
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
)
  .index("by_projectId", ["projectId", "createdAt"])
  .index("by_projectId_and_kind", ["projectId", "kind", "createdAt"])
  .index("by_projectId_and_status", ["projectId", "status", "createdAt"])
  .index("by_projectId_and_bauteil", ["projectId", "bauteil", "createdAt"])
  .index("by_projectId_and_objectName", [
    "projectId",
    "objectName",
    "createdAt",
  ])
  .index("by_projectId_and_discipline", [
    "projectId",
    "discipline",
    "createdAt",
  ])
  .index("by_projectId_and_responsibleParty", [
    "projectId",
    "responsibleParty",
    "createdAt",
  ])
  .index("by_protocolId", ["protocolId", "createdAt"]);

export const ProjectTaxonomy = Table.make(
  "projectTaxonomy",
  Schema.Struct({
    projectId: GenericId.GenericId("projects"),
    kind: Schema.Literal("bauteil", "object", "discipline"),
    label: Schema.String,
    archivedAt: Schema.optional(Timestamp),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
)
  .index("by_projectId", ["projectId", "createdAt"])
  .index("by_projectId_and_kind", ["projectId", "kind", "createdAt"]);

export const LogbookEvents = Table.make(
  "logbookEvents",
  Schema.Struct({
    projectId: GenericId.GenericId("projects"),
    protocolId: GenericId.GenericId("protocols"),
    recordId: GenericId.GenericId("projectRecords"),
    eventType: Schema.Literal(
      "protocol_published",
      "record_created",
      "status_changed",
      "risk_detected"
    ),
    title: Schema.String,
    body: Schema.String,
    bauteil: OptionalString,
    objectName: OptionalString,
    discipline: OptionalString,
    responsibleParty: OptionalString,
    chronologyDate: Schema.String,
    createdAt: Timestamp,
  })
)
  .index("by_projectId", ["projectId", "createdAt"])
  .index("by_projectId_and_chronologyDate", ["projectId", "chronologyDate"])
  .index("by_projectId_and_objectName", [
    "projectId",
    "objectName",
    "createdAt",
  ])
  .index("by_projectId_and_discipline", [
    "projectId",
    "discipline",
    "createdAt",
  ])
  .index("by_protocolId", ["protocolId", "createdAt"]);

export const SourceDocuments = Table.make(
  "sourceDocuments",
  Schema.Struct({
    projectId: GenericId.GenericId("projects"),
    protocolId: Schema.optional(GenericId.GenericId("protocols")),
    fileName: Schema.String,
    mimeType: OptionalString,
    storageId: GenericId.GenericId("_storage"),
    extractedText: OptionalString,
    status: Schema.Literal("uploaded", "extracted", "failed"),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
)
  .index("by_projectId", ["projectId", "createdAt"])
  .index("by_protocolId", ["protocolId", "createdAt"]);

export const Investigations = Table.make(
  "investigations",
  Schema.Struct({
    projectId: GenericId.GenericId("projects"),
    question: Schema.String,
    detectedRisk: Schema.String,
    likelyCause: Schema.String,
    impactedObjectsJson: Schema.String,
    impactedDisciplinesJson: Schema.String,
    relatedRecordsJson: Schema.String,
    recommendedActionsJson: Schema.String,
    citationsJson: Schema.String,
    createdAt: Timestamp,
  })
).index("by_projectId", ["projectId", "createdAt"]);

export const MemoryChunks = Table.make(
  "memoryChunks",
  Schema.Struct({
    projectId: GenericId.GenericId("projects"),
    sourceType: Schema.Literal("protocol", "report"),
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
    protocolId: Schema.optional(GenericId.GenericId("protocols")),
    kind: Schema.String,
    status: Schema.Literal("queued", "running", "succeeded", "failed"),
    error: OptionalString,
    startedAt: Timestamp,
    finishedAt: Schema.optional(Timestamp),
  })
)
  .index("by_projectId", ["projectId", "startedAt"])
  .index("by_protocolId", ["protocolId", "startedAt"]);

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
    resourceType: Schema.Literal("protocol", "report", "ledger", "logbook"),
    resourceId: Schema.String,
    tokenHash: Schema.String,
    expiresAt: Schema.optional(Timestamp),
    revokedAt: Schema.optional(Timestamp),
    createdAt: Timestamp,
  })
)
  .index("by_projectId", ["projectId", "createdAt"])
  .index("by_tokenHash", ["tokenHash", "createdAt"]);
