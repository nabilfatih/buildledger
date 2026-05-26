import { GenericId } from "@confect/core";
import { Table } from "@confect/server";
import { OpenRouterModel } from "@repo/ai/schemas";
import { Schema } from "effect";

const Timestamp = Schema.Number;
const OptionalString = Schema.optional(Schema.String);
const ProjectStatus = Schema.Literal("active", "archived");

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
    status: ProjectStatus,
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
    role: Schema.Literal("owner", "manager", "editor", "commenter", "viewer"),
    projectStatus: ProjectStatus,
    createdAt: Timestamp,
  })
)
  .index("by_projectId", ["projectId", "createdAt"])
  .index("by_userToken", ["userToken", "createdAt"])
  .index("by_projectId_and_projectStatus", [
    "projectId",
    "projectStatus",
    "createdAt",
  ])
  .index("by_userToken_and_projectStatus", [
    "userToken",
    "projectStatus",
    "createdAt",
  ])
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
  .index("by_projectId_and_protocolDate", ["projectId", "protocolDate"])
  .index("by_projectId_and_status", ["projectId", "status", "createdAt"]);

export const ProtocolParticipants = Table.make(
  "protocolParticipants",
  Schema.Struct({
    protocolId: GenericId.GenericId("protocols"),
    projectId: GenericId.GenericId("projects"),
    kind: Schema.Literal("attendee", "distribution"),
    name: Schema.String,
    company: OptionalString,
    role: OptionalString,
    email: OptionalString,
    createdAt: Timestamp,
  })
)
  .index("by_protocolId", ["protocolId", "createdAt"])
  .index("by_protocolId_and_kind", ["protocolId", "kind", "createdAt"])
  .index("by_projectId", ["projectId", "createdAt"])
  .index("by_projectId_and_email", ["projectId", "email"]);

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
    component: OptionalString,
    objectName: OptionalString,
    trade: OptionalString,
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
    component: OptionalString,
    objectName: OptionalString,
    trade: OptionalString,
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
    searchText: Schema.String,
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
)
  .index("by_projectId", ["projectId", "createdAt"])
  .index("by_projectId_and_sourceProtocolDate", [
    "projectId",
    "sourceProtocolDate",
  ])
  .index("by_projectId_and_kind", ["projectId", "kind", "createdAt"])
  .index("by_projectId_and_kind_and_sourceProtocolDate", [
    "projectId",
    "kind",
    "sourceProtocolDate",
  ])
  .index("by_projectId_and_status", ["projectId", "status", "createdAt"])
  .index("by_projectId_and_status_and_sourceProtocolDate", [
    "projectId",
    "status",
    "sourceProtocolDate",
  ])
  .index("by_projectId_and_component", ["projectId", "component", "createdAt"])
  .index("by_projectId_and_objectName", [
    "projectId",
    "objectName",
    "createdAt",
  ])
  .index("by_projectId_and_trade", ["projectId", "trade", "createdAt"])
  .index("by_projectId_and_trade_and_sourceProtocolDate", [
    "projectId",
    "trade",
    "sourceProtocolDate",
  ])
  .index("by_projectId_and_responsibleParty", [
    "projectId",
    "responsibleParty",
    "createdAt",
  ])
  .index("by_projectId_and_responsibleParty_and_status", [
    "projectId",
    "responsibleParty",
    "status",
    "createdAt",
  ])
  .index("by_projectId_and_responsibleParty_and_sourceProtocolDate", [
    "projectId",
    "responsibleParty",
    "sourceProtocolDate",
  ])
  .index(
    "by_projectId_and_responsibleParty_and_status_and_sourceProtocolDate",
    ["projectId", "responsibleParty", "status", "sourceProtocolDate"]
  )
  .index("by_projectId_and_severity_and_sourceProtocolDate", [
    "projectId",
    "severity",
    "sourceProtocolDate",
  ])
  .index("by_protocolId", ["protocolId", "createdAt"])
  .searchIndex("by_projectId_and_searchText", {
    searchField: "searchText",
    filterFields: ["projectId"],
  });

export const ProjectTaxonomy = Table.make(
  "projectTaxonomy",
  Schema.Struct({
    projectId: GenericId.GenericId("projects"),
    kind: Schema.Literal("component", "object", "trade"),
    label: Schema.String,
    normalizedLabel: Schema.String,
    status: ProjectStatus,
    archivedAt: Schema.optional(Timestamp),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
)
  .index("by_projectId", ["projectId", "createdAt"])
  .index("by_projectId_and_kind", ["projectId", "kind", "createdAt"])
  .index("by_projectId_and_status", ["projectId", "status", "createdAt"])
  .index("by_projectId_and_kind_and_normalizedLabel", [
    "projectId",
    "kind",
    "normalizedLabel",
  ]);

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
      "assignment_changed",
      "risk_detected"
    ),
    title: Schema.String,
    body: Schema.String,
    component: OptionalString,
    objectName: OptionalString,
    trade: OptionalString,
    responsibleParty: OptionalString,
    chronologyDate: Schema.String,
    searchText: Schema.String,
    createdAt: Timestamp,
  })
)
  .index("by_projectId", ["projectId", "createdAt"])
  .index("by_projectId_and_chronologyDate", ["projectId", "chronologyDate"])
  .index("by_projectId_and_component", ["projectId", "component", "createdAt"])
  .index("by_projectId_and_component_and_chronologyDate", [
    "projectId",
    "component",
    "chronologyDate",
  ])
  .index("by_projectId_and_objectName", [
    "projectId",
    "objectName",
    "createdAt",
  ])
  .index("by_projectId_and_objectName_and_chronologyDate", [
    "projectId",
    "objectName",
    "chronologyDate",
  ])
  .index("by_projectId_and_trade", ["projectId", "trade", "createdAt"])
  .index("by_projectId_and_trade_and_chronologyDate", [
    "projectId",
    "trade",
    "chronologyDate",
  ])
  .index("by_projectId_and_eventType", ["projectId", "eventType", "createdAt"])
  .index("by_projectId_and_eventType_and_chronologyDate", [
    "projectId",
    "eventType",
    "chronologyDate",
  ])
  .index("by_projectId_and_protocolId", [
    "projectId",
    "protocolId",
    "createdAt",
  ])
  .index("by_projectId_and_protocolId_and_chronologyDate", [
    "projectId",
    "protocolId",
    "chronologyDate",
  ])
  .index("by_projectId_and_responsibleParty", [
    "projectId",
    "responsibleParty",
    "createdAt",
  ])
  .index("by_projectId_and_responsibleParty_and_chronologyDate", [
    "projectId",
    "responsibleParty",
    "chronologyDate",
  ])
  .index("by_recordId", ["recordId", "createdAt"])
  .index("by_protocolId", ["protocolId", "createdAt"])
  .searchIndex("by_projectId_and_searchText", {
    searchField: "searchText",
    filterFields: ["projectId"],
  });

export const SourceDocuments = Table.make(
  "sourceDocuments",
  Schema.Struct({
    projectId: GenericId.GenericId("projects"),
    protocolId: Schema.optional(GenericId.GenericId("protocols")),
    fileName: Schema.String,
    mimeType: OptionalString,
    storageId: Schema.optional(GenericId.GenericId("_storage")),
    extractedText: OptionalString,
    status: Schema.Literal("uploaded", "extracted", "attached", "failed"),
    searchText: Schema.String,
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
)
  .index("by_projectId", ["projectId", "createdAt"])
  .index("by_projectId_and_updatedAt", ["projectId", "updatedAt"])
  .index("by_projectId_and_status", ["projectId", "status", "createdAt"])
  .index("by_projectId_and_status_and_updatedAt", [
    "projectId",
    "status",
    "updatedAt",
  ])
  .index("by_projectId_and_protocolId_and_updatedAt", [
    "projectId",
    "protocolId",
    "updatedAt",
  ])
  .index("by_protocolId", ["protocolId", "createdAt"])
  .searchIndex("by_projectId_and_searchText", {
    searchField: "searchText",
    filterFields: ["projectId"],
  });

export const Investigations = Table.make(
  "investigations",
  Schema.Struct({
    projectId: GenericId.GenericId("projects"),
    question: Schema.String,
    detectedRisk: Schema.String,
    likelyCause: Schema.String,
    impactedObjectsJson: Schema.String,
    impactedTradesJson: Schema.optional(Schema.String),
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
  .index("by_projectId_and_sourceId", ["projectId", "sourceId", "createdAt"])
  .index("by_projectId_and_chronologyDate", ["projectId", "chronologyDate"])
  .index("by_projectId_and_sourceType_and_chronologyDate", [
    "projectId",
    "sourceType",
    "chronologyDate",
  ])
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
    searchText: Schema.String,
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
)
  .index("by_projectId", ["projectId", "createdAt"])
  .index("by_projectId_and_updatedAt", ["projectId", "updatedAt"])
  .index("by_projectId_and_status", ["projectId", "status", "createdAt"])
  .index("by_projectId_and_status_and_updatedAt", [
    "projectId",
    "status",
    "updatedAt",
  ])
  .searchIndex("by_projectId_and_searchText", {
    searchField: "searchText",
    filterFields: ["projectId"],
  });

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
