import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { MinutesDraft } from "@repo/ai/schemas";
import { AppError } from "@repo/backend/confect/errors";
import {
  AiRunEvents,
  AiRuns,
  MeetingInputs,
  Meetings,
  MinuteItems,
  MinuteSections,
} from "@repo/backend/confect/tables/core";
import { Schema } from "effect";

export const meetings = GroupSpec.make("meetings")
  .addFunction(
    FunctionSpec.publicQuery({
      name: "listByProject",
      args: Schema.Struct({ projectId: GenericId.GenericId("projects") }),
      returns: Schema.Array(Meetings.Doc),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "createDraft",
      args: Schema.Struct({
        projectId: GenericId.GenericId("projects"),
        title: Schema.String,
        meetingType: Schema.String,
        meetingDate: Schema.String,
        agenda: Schema.optional(Schema.String),
      }),
      returns: GenericId.GenericId("meetings"),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "saveInput",
      args: Schema.Struct({
        meetingId: GenericId.GenericId("meetings"),
        kind: Schema.Literal("notes", "transcript"),
        text: Schema.String,
      }),
      returns: GenericId.GenericId("meetingInputs"),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "updateReviewItem",
      args: Schema.Struct({
        itemId: GenericId.GenericId("minuteItems"),
        kind: Schema.Literal(
          "discussion",
          "decision",
          "action",
          "risk",
          "question"
        ),
        title: Schema.String,
        body: Schema.String,
        ownerName: Schema.optional(Schema.String),
        dueDate: Schema.optional(Schema.String),
        severity: Schema.optional(Schema.Literal("low", "medium", "high")),
      }),
      returns: Schema.Null,
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "startGeneration",
      args: Schema.Struct({ meetingId: GenericId.GenericId("meetings") }),
      returns: GenericId.GenericId("aiRuns"),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "finishGeneration",
      args: Schema.Struct({
        meetingId: GenericId.GenericId("meetings"),
        aiRunId: GenericId.GenericId("aiRuns"),
        draft: MinutesDraft,
      }),
      returns: Schema.Null,
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "failGeneration",
      args: Schema.Struct({
        meetingId: GenericId.GenericId("meetings"),
        aiRunId: GenericId.GenericId("aiRuns"),
        message: Schema.String,
      }),
      returns: Schema.Null,
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicQuery({
      name: "getReviewState",
      args: Schema.Struct({ meetingId: GenericId.GenericId("meetings") }),
      returns: Schema.Struct({
        meeting: Meetings.Doc,
        inputs: Schema.Array(MeetingInputs.Doc),
        sections: Schema.Array(MinuteSections.Doc),
        items: Schema.Array(MinuteItems.Doc),
        aiRuns: Schema.Array(AiRuns.Doc),
        aiRunEvents: Schema.Array(AiRunEvents.Doc),
      }),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "publishMinutes",
      args: Schema.Struct({ meetingId: GenericId.GenericId("meetings") }),
      returns: Schema.Null,
      error: AppError,
    })
  );
