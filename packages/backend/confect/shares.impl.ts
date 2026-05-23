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

/** Resolves and validates a public share token. */
const getShareLinkByToken = Effect.fn("shares.getShareLinkByToken")(function* (
  token: string
) {
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
  ({ token }) => asAppError(getShareLinkByToken(token))
);

/** Resolves a public share link into a safe read-only resource payload. */
const resolvePublicResource = FunctionImpl.make(
  api,
  "shares",
  "resolvePublicResource",
  ({ token }) =>
    asAppError(
      Effect.gen(function* () {
        const reader = yield* DatabaseReader;
        const shareLink = yield* getShareLinkByToken(token);
        const project = yield* reader
          .table("projects")
          .get(shareLink.projectId);

        if (shareLink.resourceType === "meeting") {
          const meetings = yield* reader
            .table("meetings")
            .index("by_projectId", (q) => q.eq("projectId", project._id))
            .take(100);
          const meeting = meetings.find(
            (candidate) => candidate._id === shareLink.resourceId
          );

          if (!meeting) {
            return yield* Effect.fail(
              new ShareTargetNotFound({
                message: "Share target was not found.",
                resourceId: shareLink.resourceId,
                resourceType: "meeting",
              })
            );
          }

          const inputs = yield* reader
            .table("meetingInputs")
            .index("by_meetingId", (q) => q.eq("meetingId", meeting._id))
            .collect();
          const sections = yield* reader
            .table("minuteSections")
            .index("by_meetingId", (q) => q.eq("meetingId", meeting._id))
            .collect();
          const items = yield* reader
            .table("minuteItems")
            .index("by_meetingId", (q) => q.eq("meetingId", meeting._id))
            .collect();

          return {
            resourceType: "meeting",
            projectName: project.name,
            projectCode: project.code,
            meeting,
            inputs,
            sections,
            items,
          };
        }

        const reports = yield* reader
          .table("reports")
          .index("by_projectId", (q) => q.eq("projectId", project._id))
          .take(50);
        const report = reports.find(
          (candidate) => candidate._id === shareLink.resourceId
        );

        if (!report) {
          return yield* Effect.fail(
            new ShareTargetNotFound({
              message: "Share target was not found.",
              resourceId: shareLink.resourceId,
              resourceType: "report",
            })
          );
        }

        return {
          resourceType: "report",
          projectName: project.name,
          projectCode: project.code,
          report,
        };
      })
    )
);

export const shares = GroupImpl.make(api, "shares").pipe(
  Layer.provide(createReadOnlyLink),
  Layer.provide(resolvePublicToken),
  Layer.provide(resolvePublicResource)
);
