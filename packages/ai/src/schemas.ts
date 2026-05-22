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

export const MinuteItemKind = Schema.Literal(
  "discussion",
  "decision",
  "action",
  "risk",
  "question"
);
export type MinuteItemKind = Schema.Schema.Type<typeof MinuteItemKind>;

export const RiskSeverity = Schema.Literal("low", "medium", "high");
export type RiskSeverity = Schema.Schema.Type<typeof RiskSeverity>;

export const Citation = Schema.Struct({
  chunkId: Schema.String,
  quote: Schema.String,
});
export type Citation = Schema.Schema.Type<typeof Citation>;

export const MinuteItem = Schema.Struct({
  kind: MinuteItemKind,
  title: Schema.String,
  body: Schema.String,
  ownerName: Schema.optional(Schema.String),
  dueDate: Schema.optional(Schema.String),
  severity: Schema.optional(RiskSeverity),
  citations: Schema.Array(Citation),
});
export type MinuteItem = Schema.Schema.Type<typeof MinuteItem>;

export const MinuteSection = Schema.Struct({
  title: Schema.String,
  body: Schema.String,
  items: Schema.Array(MinuteItem),
});
export type MinuteSection = Schema.Schema.Type<typeof MinuteSection>;

export const MinutesDraft = Schema.Struct({
  summary: Schema.String,
  sections: Schema.Array(MinuteSection),
});
export type MinutesDraft = Schema.Schema.Type<typeof MinutesDraft>;

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

export class AiGenerationFailed extends Schema.TaggedError<AiGenerationFailed>()(
  "AiGenerationFailed",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.String),
  }
) {}

export class EmptyMeetingInput extends Schema.TaggedError<EmptyMeetingInput>()(
  "EmptyMeetingInput",
  {
    message: Schema.String,
  }
) {}
