import { Schema } from "effect";

export const defaultOpenRouterModel = "openai/gpt-5-mini";

export const openRouterModelOptions = [
  "openai/gpt-5-mini",
  "openai/gpt-5",
  "openai/gpt-5.1",
  "anthropic/claude-sonnet-4.5",
  "google/gemini-2.5-flash",
  "openrouter/auto",
] as const;

export const OpenRouterModel = Schema.Literal(...openRouterModelOptions);
export type OpenRouterModel = Schema.Schema.Type<typeof OpenRouterModel>;

export const AiProvider = Schema.Literal("demo", "openrouter");
export type AiProvider = Schema.Schema.Type<typeof AiProvider>;

export const AiSettingsSource = Schema.Literal("demo", "environment", "user");
export type AiSettingsSource = Schema.Schema.Type<typeof AiSettingsSource>;

export const AiRuntimeSettings = Schema.Struct({
  provider: AiProvider,
  source: AiSettingsSource,
  model: OpenRouterModel,
  apiKey: Schema.optional(Schema.String),
  keyLast4: Schema.optional(Schema.String),
});
export type AiRuntimeSettings = Schema.Schema.Type<typeof AiRuntimeSettings>;

export const AiPublicSettings = Schema.Struct({
  provider: AiProvider,
  source: AiSettingsSource,
  model: OpenRouterModel,
  hasKey: Schema.Boolean,
  keyLast4: Schema.optional(Schema.String),
});
export type AiPublicSettings = Schema.Schema.Type<typeof AiPublicSettings>;

export const ProjectRecordType = Schema.Literal(
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
export type ProjectRecordType = Schema.Schema.Type<typeof ProjectRecordType>;

export const RiskSeverity = Schema.Literal("low", "medium", "high");
export type RiskSeverity = Schema.Schema.Type<typeof RiskSeverity>;

export const ProjectRecordStatus = Schema.Literal(
  "open",
  "in_progress",
  "blocked",
  "resolved",
  "recorded"
);
export type ProjectRecordStatus = Schema.Schema.Type<
  typeof ProjectRecordStatus
>;

export const Citation = Schema.Struct({
  chunkId: Schema.String,
  quote: Schema.String,
});
export type Citation = Schema.Schema.Type<typeof Citation>;

export const ProtocolItem = Schema.Struct({
  kind: ProjectRecordType,
  title: Schema.String,
  body: Schema.String,
  component: Schema.optional(Schema.String),
  objectName: Schema.optional(Schema.String),
  trade: Schema.optional(Schema.String),
  responsibleParty: Schema.optional(Schema.String),
  dueDate: Schema.optional(Schema.String),
  severity: Schema.optional(RiskSeverity),
  status: Schema.optional(ProjectRecordStatus),
  citations: Schema.Array(Citation),
});
export type ProtocolItem = Schema.Schema.Type<typeof ProtocolItem>;

export const ProtocolSection = Schema.Struct({
  title: Schema.String,
  body: Schema.String,
  items: Schema.Array(ProtocolItem),
});
export type ProtocolSection = Schema.Schema.Type<typeof ProtocolSection>;

export const ProtocolDraft = Schema.Struct({
  summary: Schema.String,
  sections: Schema.Array(ProtocolSection),
});
export type ProtocolDraft = Schema.Schema.Type<typeof ProtocolDraft>;

export const MemoryChunk = Schema.Struct({
  chunkId: Schema.String,
  text: Schema.String,
  chronologyDate: Schema.String,
  sourceTitle: Schema.String,
});
export type MemoryChunk = Schema.Schema.Type<typeof MemoryChunk>;

export const ProjectAnswer = Schema.Struct({
  answer: Schema.String,
  citations: Schema.Array(Citation),
});
export type ProjectAnswer = Schema.Schema.Type<typeof ProjectAnswer>;

export const ProjectReport = Schema.Struct({
  title: Schema.String,
  summary: Schema.String,
  actionSummary: Schema.String,
  riskSummary: Schema.String,
  decisionSummary: Schema.String,
  citations: Schema.Array(Citation),
});
export type ProjectReport = Schema.Schema.Type<typeof ProjectReport>;

export const ProjectInvestigation = Schema.Struct({
  detectedRisk: Schema.String,
  likelyCause: Schema.String,
  impactedObjects: Schema.Array(Schema.String),
  impactedTrades: Schema.Array(Schema.String),
  relatedRecords: Schema.Array(Schema.String),
  recommendedActions: Schema.Array(Schema.String),
  citations: Schema.Array(Citation),
});
export type ProjectInvestigation = Schema.Schema.Type<
  typeof ProjectInvestigation
>;

export class AiGenerationFailed extends Schema.TaggedError<AiGenerationFailed>()(
  "AiGenerationFailed",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.String),
  }
) {}

export class EmptyProtocolSource extends Schema.TaggedError<EmptyProtocolSource>()(
  "EmptyProtocolSource",
  {
    message: Schema.String,
  }
) {}
