import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { Schema } from "effect";

import { AppError } from "./errors";
import { ShareLinks } from "./tables/core";

export const CreateReadOnlyLinkArgs = Schema.Struct({
  projectId: GenericId.GenericId("projects"),
  meetingId: Schema.optional(GenericId.GenericId("meetings")),
  reportId: Schema.optional(GenericId.GenericId("reports")),
});

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
    FunctionSpec.publicMutation({
      name: "resolvePublicToken",
      args: Schema.Struct({ token: Schema.String }),
      returns: ShareLinks.Doc,
      error: AppError,
    })
  );
