import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { AppError } from "@repo/backend/confect/errors";
import {
  MeetingInputs,
  Meetings,
  MinuteItems,
  MinuteSections,
  Reports,
  ShareLinks,
} from "@repo/backend/confect/tables/core";
import { Schema } from "effect";

export const CreateReadOnlyLinkArgs = Schema.Struct({
  projectId: GenericId.GenericId("projects"),
  meetingId: Schema.optional(GenericId.GenericId("meetings")),
  reportId: Schema.optional(GenericId.GenericId("reports")),
});

export const SharedMeetingResource = Schema.Struct({
  resourceType: Schema.Literal("meeting"),
  projectName: Schema.String,
  projectCode: Schema.String,
  meeting: Meetings.Doc,
  inputs: Schema.Array(MeetingInputs.Doc),
  sections: Schema.Array(MinuteSections.Doc),
  items: Schema.Array(MinuteItems.Doc),
});

export const SharedReportResource = Schema.Struct({
  resourceType: Schema.Literal("report"),
  projectName: Schema.String,
  projectCode: Schema.String,
  report: Reports.Doc,
});

export const SharedResource = Schema.Union(
  SharedMeetingResource,
  SharedReportResource
);

export const shares = GroupSpec.make("shares")
  .addFunction(
    FunctionSpec.publicMutation({
      name: "createReadOnlyLink",
      args: CreateReadOnlyLinkArgs,
      returns: Schema.Struct({
        shareLink: ShareLinks.Doc,
        token: Schema.String,
      }),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicQuery({
      name: "resolvePublicResource",
      args: Schema.Struct({ token: Schema.String }),
      returns: SharedResource,
      error: AppError,
    })
  );
