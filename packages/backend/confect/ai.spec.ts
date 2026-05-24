import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { AppError } from "@repo/backend/confect/errors";
import { Schema } from "effect";

export const ai = GroupSpec.make("ai")
  .addFunction(
    FunctionSpec.publicAction({
      name: "answerProjectQuestion",
      args: Schema.Struct({
        projectId: GenericId.GenericId("projects"),
        question: Schema.String,
      }),
      returns: Schema.Struct({
        answer: Schema.String,
        citationsJson: Schema.String,
      }),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicAction({
      name: "generateProjectReport",
      args: Schema.Struct({
        projectId: GenericId.GenericId("projects"),
        periodEnd: Schema.String,
        periodStart: Schema.String,
      }),
      returns: GenericId.GenericId("reports"),
      error: AppError,
    })
  );
