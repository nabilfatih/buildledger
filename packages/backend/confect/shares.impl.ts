import { GenericId } from "@confect/core";
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
import { Effect, Layer, Schema } from "effect";
import { nanoid } from "nanoid";

const maxSharedProtocolSections = 20;
const maxSharedProtocolItems = 100;
const maxSharedRecords = 100;
const maxSharedLogbookEvents = 100;
const ProtocolResourceId = GenericId.GenericId("protocols");
const ReportResourceId = GenericId.GenericId("reports");

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

/** Validates a stored protocol resource id before direct document lookup. */
const decodeProtocolResourceId = Effect.fn("shares.decodeProtocolResourceId")(
  function* (resourceId: string) {
    return yield* Schema.decodeUnknown(ProtocolResourceId)(resourceId).pipe(
      Effect.mapError(
        () =>
          new ShareTargetNotFound({
            message: "Share target was not found.",
            resourceId,
            resourceType: "protocol",
          })
      )
    );
  }
);

/** Validates a stored report resource id before direct document lookup. */
const decodeReportResourceId = Effect.fn("shares.decodeReportResourceId")(
  function* (resourceId: string) {
    return yield* Schema.decodeUnknown(ReportResourceId)(resourceId).pipe(
      Effect.mapError(
        () =>
          new ShareTargetNotFound({
            message: "Share target was not found.",
            resourceId,
            resourceType: "report",
          })
      )
    );
  }
);

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
        const selectedTargetCount = [
          input.protocolId !== undefined,
          input.reportId !== undefined,
          input.ledgerView === true,
          input.logbookView === true,
        ].filter(Boolean).length;

        if (selectedTargetCount !== 1) {
          return yield* Effect.fail(
            new InvalidShareTarget({
              message: "Choose exactly one share target.",
            })
          );
        }

        if (input.protocolId !== undefined) {
          const protocol = yield* reader
            .table("protocols")
            .get(input.protocolId);

          if (protocol.projectId !== input.projectId) {
            return yield* Effect.fail(
              new ShareTargetNotFound({
                message: "Share target does not belong to this project.",
                resourceId: input.protocolId,
                resourceType: "protocol",
              })
            );
          }

          const token = nanoid(32);
          const tokenHash = yield* hashShareToken(token);
          const shareLinkId = yield* writer.table("shareLinks").insert({
            projectId: input.projectId,
            resourceId: input.protocolId,
            resourceType: "protocol",
            tokenHash,
            createdAt: Date.now(),
          });
          const shareLink = yield* reader.table("shareLinks").get(shareLinkId);

          return { shareLink, token };
        }

        if (input.ledgerView) {
          const token = nanoid(32);
          const tokenHash = yield* hashShareToken(token);
          const shareLinkId = yield* writer.table("shareLinks").insert({
            projectId: input.projectId,
            resourceId: input.projectId,
            resourceType: "ledger",
            tokenHash,
            createdAt: Date.now(),
          });
          const shareLink = yield* reader.table("shareLinks").get(shareLinkId);

          return { shareLink, token };
        }

        if (input.logbookView) {
          const token = nanoid(32);
          const tokenHash = yield* hashShareToken(token);
          const shareLinkId = yield* writer.table("shareLinks").insert({
            projectId: input.projectId,
            resourceId: input.projectId,
            resourceType: "logbook",
            tokenHash,
            createdAt: Date.now(),
          });
          const shareLink = yield* reader.table("shareLinks").get(shareLinkId);

          return { shareLink, token };
        }

        if (input.reportId === undefined) {
          return yield* Effect.fail(
            new InvalidShareTarget({
              message: "Choose a report to share.",
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

        if (shareLink.resourceType === "protocol") {
          const protocolId = yield* decodeProtocolResourceId(
            shareLink.resourceId
          );
          const protocol = yield* reader
            .table("protocols")
            .get(protocolId)
            .pipe(
              Effect.mapError(
                () =>
                  new ShareTargetNotFound({
                    message: "Share target was not found.",
                    resourceId: shareLink.resourceId,
                    resourceType: "protocol",
                  })
              )
            );

          if (protocol.projectId !== project._id) {
            return yield* Effect.fail(
              new ShareTargetNotFound({
                message: "Share target does not belong to this project.",
                resourceId: shareLink.resourceId,
                resourceType: "protocol",
              })
            );
          }

          const sections = yield* reader
            .table("protocolSections")
            .index("by_protocolId", (q) => q.eq("protocolId", protocol._id))
            .take(maxSharedProtocolSections);
          const items = yield* reader
            .table("protocolItems")
            .index("by_protocolId", (q) => q.eq("protocolId", protocol._id))
            .take(maxSharedProtocolItems);

          return {
            resourceType: "protocol",
            projectName: project.name,
            projectCode: project.code,
            protocol,
            sections,
            items,
          };
        }

        if (shareLink.resourceType === "ledger") {
          const records = yield* reader
            .table("projectRecords")
            .index(
              "by_projectId",
              (q) => q.eq("projectId", shareLink.projectId),
              "desc"
            )
            .take(maxSharedRecords);

          return {
            resourceType: "ledger",
            projectName: project.name,
            projectCode: project.code,
            records,
          };
        }

        if (shareLink.resourceType === "logbook") {
          const events = yield* reader
            .table("logbookEvents")
            .index(
              "by_projectId",
              (q) => q.eq("projectId", shareLink.projectId),
              "desc"
            )
            .take(maxSharedLogbookEvents);

          return {
            resourceType: "logbook",
            projectName: project.name,
            projectCode: project.code,
            events,
          };
        }

        const reportId = yield* decodeReportResourceId(shareLink.resourceId);
        const report = yield* reader
          .table("reports")
          .get(reportId)
          .pipe(
            Effect.mapError(
              () =>
                new ShareTargetNotFound({
                  message: "Share target was not found.",
                  resourceId: shareLink.resourceId,
                  resourceType: "report",
                })
            )
          );

        if (report.projectId !== project._id) {
          return yield* Effect.fail(
            new ShareTargetNotFound({
              message: "Share target does not belong to this project.",
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
  Layer.provide(resolvePublicResource)
);
