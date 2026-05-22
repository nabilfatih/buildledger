import { FunctionImpl, GroupImpl } from "@confect/server";
import api from "@repo/backend/confect/_generated/api";
import {
  DatabaseReader,
  DatabaseWriter,
} from "@repo/backend/confect/_generated/services";
import {
  InternalFailure,
  InvalidShareTarget,
  ShareLinkExpired,
  ShareTargetNotFound,
} from "@repo/backend/confect/errors";
import { asAppError, ensureProjectAccess } from "@repo/backend/confect/helpers";
import { Effect, Layer } from "effect";
import { nanoid } from "nanoid";

/** Encodes bytes as lowercase hex for stable token lookup. */
function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

/** Hashes a share token before it is persisted. */
const hashShareToken = Effect.fn("shares.hashShareToken")(function* (
  token: string
) {
  const payload = new TextEncoder().encode(`buildledger-share:${token}`);
  const digest = yield* Effect.tryPromise({
    try: () => crypto.subtle.digest("SHA-256", payload),
    catch: () =>
      new InternalFailure({
        message: "Unable to secure the share token.",
      }),
  });

  return bytesToHex(new Uint8Array(digest));
});

/** Creates a revocable read-only share link for a project resource. */
const createReadOnlyLink = FunctionImpl.make(
  api,
  "shares",
  "createReadOnlyLink",
  (input) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(input.projectId);
        const reader = yield* DatabaseReader;
        const writer = yield* DatabaseWriter;

        if (input.meetingId !== undefined) {
          if (input.reportId !== undefined) {
            return yield* Effect.fail(
              new InvalidShareTarget({
                message: "Share one meeting or one report, not both.",
              })
            );
          }

          const meeting = yield* reader.table("meetings").get(input.meetingId);

          if (meeting.projectId !== input.projectId) {
            return yield* Effect.fail(
              new ShareTargetNotFound({
                message: "Share target does not belong to this project.",
                resourceId: input.meetingId,
                resourceType: "meeting",
              })
            );
          }

          const token = nanoid(32);
          const tokenHash = yield* hashShareToken(token);
          const shareLinkId = yield* writer.table("shareLinks").insert({
            projectId: input.projectId,
            resourceId: input.meetingId,
            resourceType: "meeting",
            tokenHash,
            createdAt: Date.now(),
          });
          const shareLink = yield* reader.table("shareLinks").get(shareLinkId);

          return { shareLink, token };
        }

        if (input.reportId === undefined) {
          return yield* Effect.fail(
            new InvalidShareTarget({
              message: "Choose a meeting or report to share.",
            })
          );
        }

        const report = yield* reader.table("reports").get(input.reportId);

        if (report.projectId !== input.projectId) {
          return yield* Effect.fail(
            new ShareTargetNotFound({
              message: "Share target does not belong to this project.",
              resourceId: input.reportId,
              resourceType: "report",
            })
          );
        }

        const token = nanoid(32);
        const tokenHash = yield* hashShareToken(token);
        const shareLinkId = yield* writer.table("shareLinks").insert({
          projectId: input.projectId,
          resourceId: input.reportId,
          resourceType: "report",
          tokenHash,
          createdAt: Date.now(),
        });
        const shareLink = yield* reader.table("shareLinks").get(shareLinkId);

        return { shareLink, token };
      })
    )
);

/** Resolves a public token without requiring a signed-in user. */
const resolvePublicToken = FunctionImpl.make(
  api,
  "shares",
  "resolvePublicToken",
  ({ token }) =>
    asAppError(
      Effect.gen(function* () {
        const reader = yield* DatabaseReader;
        const tokenHash = yield* hashShareToken(token);
        const shareLinkOption = yield* reader
          .table("shareLinks")
          .index("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
          .first();

        if (shareLinkOption._tag === "None") {
          return yield* Effect.fail(
            new ShareLinkExpired({
              message: "This share link is not valid.",
            })
          );
        }

        if (shareLinkOption.value.revokedAt) {
          return yield* Effect.fail(
            new ShareLinkExpired({
              message: "This share link has been revoked.",
            })
          );
        }

        if (
          shareLinkOption.value.expiresAt &&
          shareLinkOption.value.expiresAt < Date.now()
        ) {
          return yield* Effect.fail(
            new ShareLinkExpired({
              message: "This share link has expired.",
            })
          );
        }

        return shareLinkOption.value;
      })
    )
);

export const shares = GroupImpl.make(api, "shares").pipe(
  Layer.provide(createReadOnlyLink),
  Layer.provide(resolvePublicToken)
);
