import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { AppError } from "@repo/backend/confect/errors";
import { Schema } from "effect";

export const LedgerRow = Schema.Struct({
  id: Schema.String,
  kind: Schema.Literal("discussion", "decision", "action", "risk", "question"),
  title: Schema.String,
  body: Schema.optional(Schema.String),
  meetingId: GenericId.GenericId("meetings"),
  meetingTitle: Schema.String,
  meetingDate: Schema.String,
  ownerName: Schema.optional(Schema.String),
  dueDate: Schema.optional(Schema.String),
  severity: Schema.optional(Schema.Literal("low", "medium", "high")),
  status: Schema.Literal("open", "blocked", "done", "recorded"),
  citationCount: Schema.Number,
  createdAt: Schema.Number,
});

export const ledger = GroupSpec.make("ledger").addFunction(
  FunctionSpec.publicQuery({
    name: "listByProject",
    args: Schema.Struct({ projectId: GenericId.GenericId("projects") }),
    returns: Schema.Array(LedgerRow),
    error: AppError,
  })
);
