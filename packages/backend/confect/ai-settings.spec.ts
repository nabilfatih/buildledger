import { FunctionSpec, GroupSpec } from "@confect/core";
import {
  AiPublicSettings,
  AiRuntimeSettings,
  OpenRouterModel,
} from "@repo/ai/schemas";
import { AppError } from "@repo/backend/confect/errors";
import { Schema } from "effect";

export const aiSettings = GroupSpec.make("aiSettings")
  .addFunction(
    FunctionSpec.publicQuery({
      name: "getCurrent",
      args: Schema.Struct({}),
      returns: AiPublicSettings,
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicAction({
      name: "saveOpenRouterKey",
      args: Schema.Struct({
        apiKey: Schema.String,
        model: OpenRouterModel,
      }),
      returns: AiPublicSettings,
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "clearCurrent",
      args: Schema.Struct({}),
      returns: AiPublicSettings,
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.internalQuery({
      name: "getSavedRuntimeInput",
      args: Schema.Struct({ userToken: Schema.String }),
      returns: Schema.NullOr(
        Schema.Struct({
          encryptedApiKey: Schema.String,
          encryptionIv: Schema.String,
          keyLast4: Schema.String,
          model: OpenRouterModel,
        })
      ),
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.internalMutation({
      name: "storeOpenRouterKey",
      args: Schema.Struct({
        encryptedApiKey: Schema.String,
        encryptionIv: Schema.String,
        keyLast4: Schema.String,
        model: OpenRouterModel,
        userToken: Schema.String,
      }),
      returns: AiPublicSettings,
      error: AppError,
    })
  )
  .addFunction(
    FunctionSpec.internalAction({
      name: "resolveRuntime",
      args: Schema.Struct({}),
      returns: AiRuntimeSettings,
      error: AppError,
    })
  );
