import { FunctionImpl, GroupImpl } from "@confect/server";
import type { AiRuntimeSettings } from "@repo/ai/schemas";
import {
  readEnvAiRuntimeSettings,
  toPublicAiSettings,
} from "@repo/ai/services";
import api from "@repo/backend/confect/_generated/api";
import refs from "@repo/backend/confect/_generated/refs";
import {
  DatabaseReader,
  DatabaseWriter,
  MutationRunner,
  QueryRunner,
} from "@repo/backend/confect/_generated/services";
import { Forbidden, InternalFailure } from "@repo/backend/confect/errors";
import {
  asAppError,
  getOptionalUserToken,
  getUserToken,
} from "@repo/backend/confect/helpers";
import { Config, Effect, Layer, Option } from "effect";

const secretKeyConfig = Config.string("BUILDLEDGER_SECRET_KEY").pipe(
  Config.withDefault("")
);

/** Encodes short encrypted payloads as base64 for Convex storage. */
function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

/** Decodes short encrypted payloads from base64 storage. */
function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

/** Hashes the configured secret into an AES-GCM key. */
const deriveEncryptionKey = Effect.fn("aiSettings.deriveEncryptionKey")(
  function* () {
    const secret = yield* secretKeyConfig;

    if (secret.trim().length < 32) {
      return yield* Effect.fail(
        new Forbidden({
          message:
            "Set BUILDLEDGER_SECRET_KEY to at least 32 characters before saving AI keys.",
        })
      );
    }

    const digest = yield* Effect.tryPromise({
      try: () =>
        crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)),
      catch: () =>
        new InternalFailure({
          message: "Unable to prepare AI key encryption.",
        }),
    });

    return yield* Effect.tryPromise({
      try: () =>
        crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
          "encrypt",
          "decrypt",
        ]),
      catch: () =>
        new InternalFailure({
          message: "Unable to initialize AI key encryption.",
        }),
    });
  }
);

/** Encrypts an OpenRouter key before it reaches database storage. */
const encryptApiKey = Effect.fn("aiSettings.encryptApiKey")(function* (
  apiKey: string
) {
  const key = yield* deriveEncryptionKey();
  const encryptionIv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = yield* Effect.tryPromise({
    try: () =>
      crypto.subtle.encrypt(
        { name: "AES-GCM", iv: encryptionIv },
        key,
        new TextEncoder().encode(apiKey)
      ),
    catch: () =>
      new InternalFailure({
        message: "Unable to encrypt the AI key.",
      }),
  });

  return {
    encryptedApiKey: bytesToBase64(new Uint8Array(encrypted)),
    encryptionIv: bytesToBase64(encryptionIv),
  };
});

/** Decrypts a saved OpenRouter key only inside the backend runtime. */
const decryptApiKey = Effect.fn("aiSettings.decryptApiKey")(function* (input: {
  readonly encryptedApiKey: string;
  readonly encryptionIv: string;
}) {
  const key = yield* deriveEncryptionKey();
  const decrypted = yield* Effect.tryPromise({
    try: () =>
      crypto.subtle.decrypt(
        { name: "AES-GCM", iv: base64ToBytes(input.encryptionIv) },
        key,
        base64ToBytes(input.encryptedApiKey)
      ),
    catch: () =>
      new InternalFailure({
        message: "Unable to decrypt the saved AI key.",
      }),
  });

  return new TextDecoder().decode(decrypted);
});

/** Loads the latest saved AI settings row for a user token. */
const getSavedSettings = Effect.fn("aiSettings.getSavedSettings")(function* (
  userToken: string
) {
  const reader = yield* DatabaseReader;
  const result = yield* reader
    .table("aiProviderSettings")
    .index("by_userToken", (q) => q.eq("userToken", userToken), "desc")
    .first();

  return Option.match(result, {
    onNone: () => null,
    onSome: (settings) => settings,
  });
});

/** Returns the active provider state without raw key material. */
const getCurrent = FunctionImpl.make(api, "aiSettings", "getCurrent", () =>
  asAppError(
    Effect.gen(function* () {
      const userToken = yield* getOptionalUserToken();

      if (userToken) {
        const savedSettings = yield* getSavedSettings(userToken);

        if (savedSettings?.encryptedApiKey) {
          return {
            provider: "openrouter" as const,
            source: "user" as const,
            model: savedSettings.model,
            hasKey: true,
            keyLast4: savedSettings.keyLast4,
          };
        }
      }

      const settings = yield* readEnvAiRuntimeSettings(null);
      return toPublicAiSettings(settings);
    })
  )
);

/** Loads encrypted user settings for trusted internal action callers. */
const getSavedRuntimeInput = FunctionImpl.make(
  api,
  "aiSettings",
  "getSavedRuntimeInput",
  ({ userToken }) =>
    asAppError(
      Effect.gen(function* () {
        const settings = yield* getSavedSettings(userToken);

        if (!(settings?.encryptedApiKey && settings.encryptionIv)) {
          return null;
        }

        return {
          encryptedApiKey: settings.encryptedApiKey,
          encryptionIv: settings.encryptionIv,
          keyLast4: settings.keyLast4,
          model: settings.model,
        };
      })
    )
);

/** Stores encrypted OpenRouter key material for a user token. */
const storeOpenRouterKey = FunctionImpl.make(
  api,
  "aiSettings",
  "storeOpenRouterKey",
  ({ encryptedApiKey, encryptionIv, keyLast4, model, userToken }) =>
    asAppError(
      Effect.gen(function* () {
        const writer = yield* DatabaseWriter;
        const savedSettings = yield* getSavedSettings(userToken);
        const timestamp = Date.now();
        const payload = {
          encryptedApiKey,
          encryptionIv,
          keyLast4,
          model,
          provider: "openrouter" as const,
          updatedAt: timestamp,
          userToken,
        };

        if (savedSettings) {
          yield* writer.table("aiProviderSettings").patch(savedSettings._id, {
            ...payload,
          });
        } else {
          yield* writer.table("aiProviderSettings").insert({
            ...payload,
            createdAt: timestamp,
          });
        }

        return {
          provider: "openrouter" as const,
          source: "user" as const,
          model,
          hasKey: true,
          keyLast4,
        };
      })
    )
);

/** Returns raw runtime settings to trusted internal action callers only. */
const resolveRuntime = FunctionImpl.make(
  api,
  "aiSettings",
  "resolveRuntime",
  () =>
    asAppError(
      Effect.gen(function* () {
        const runQuery = yield* QueryRunner;
        const userToken = yield* getOptionalUserToken();

        if (!userToken) {
          return yield* readEnvAiRuntimeSettings(null);
        }

        const savedSettings = yield* runQuery(
          refs.internal.aiSettings.getSavedRuntimeInput,
          { userToken }
        );

        if (!savedSettings) {
          return yield* readEnvAiRuntimeSettings(null);
        }

        const apiKey = yield* decryptApiKey({
          encryptedApiKey: savedSettings.encryptedApiKey,
          encryptionIv: savedSettings.encryptionIv,
        });
        const runtimeSettings = {
          provider: "openrouter",
          source: "user",
          model: savedSettings.model,
          apiKey,
          keyLast4: savedSettings.keyLast4,
        } satisfies AiRuntimeSettings;

        return yield* readEnvAiRuntimeSettings(runtimeSettings);
      })
    )
);

/** Saves an encrypted OpenRouter key for the current user. */
const saveOpenRouterKey = FunctionImpl.make(
  api,
  "aiSettings",
  "saveOpenRouterKey",
  ({ apiKey, model }) =>
    asAppError(
      Effect.gen(function* () {
        const userToken = yield* getUserToken();
        const trimmedApiKey = apiKey.trim();
        const runMutation = yield* MutationRunner;

        if (!trimmedApiKey) {
          return yield* runMutation(refs.public.aiSettings.clearCurrent, {});
        }

        const encrypted = yield* encryptApiKey(trimmedApiKey);
        return yield* runMutation(refs.internal.aiSettings.storeOpenRouterKey, {
          encryptedApiKey: encrypted.encryptedApiKey,
          encryptionIv: encrypted.encryptionIv,
          keyLast4: trimmedApiKey.slice(-4),
          model,
          userToken,
        });
      })
    )
);

/** Clears the saved user key and returns the fallback provider state. */
const clearCurrent = FunctionImpl.make(api, "aiSettings", "clearCurrent", () =>
  asAppError(
    Effect.gen(function* () {
      const userToken = yield* getUserToken();
      return yield* clearSavedKey(userToken);
    })
  )
);

/** Removes encrypted key material from the saved settings row. */
const clearSavedKey = Effect.fn("aiSettings.clearSavedKey")(function* (
  userToken: string
) {
  const writer = yield* DatabaseWriter;
  const savedSettings = yield* getSavedSettings(userToken);

  if (savedSettings) {
    yield* writer.table("aiProviderSettings").patch(savedSettings._id, {
      encryptedApiKey: "",
      encryptionIv: "",
      keyLast4: "",
      updatedAt: Date.now(),
    });
  }

  const settings = yield* readEnvAiRuntimeSettings(null);
  return toPublicAiSettings(settings);
});

export const aiSettings = GroupImpl.make(api, "aiSettings").pipe(
  Layer.provide(getCurrent),
  Layer.provide(getSavedRuntimeInput),
  Layer.provide(storeOpenRouterKey),
  Layer.provide(saveOpenRouterKey),
  Layer.provide(clearCurrent),
  Layer.provide(resolveRuntime)
);
