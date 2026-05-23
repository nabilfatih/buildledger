import { FunctionImpl, GroupImpl } from "@confect/server";
import api from "@repo/backend/confect/_generated/api";
import { DatabaseReader } from "@repo/backend/confect/_generated/services";
import { asAppError, ensureProjectAccess } from "@repo/backend/confect/helpers";
import { Effect, Layer } from "effect";

const maxPublishedMeetings = 25;
const maxDerivedRows = 100;

/** Counts citations from the persisted minute-item citation payload. */
export function countCitations(citationsJson: string) {
  try {
    const citations = JSON.parse(citationsJson);
    return Array.isArray(citations) ? citations.length : 0;
  } catch {
    return 0;
  }
}

/** Sorts newest ledger rows first and keeps the response bounded. */
export function sortLedgerRows<
  const Row extends { readonly createdAt: number },
>(rows: readonly Row[]) {
  return [...rows].sort((left, right) => right.createdAt - left.createdAt);
}

/** Returns project ledger rows derived from published meetings and memory tables. */
const listByProject = FunctionImpl.make(
  api,
  "ledger",
  "listByProject",
  ({ projectId }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const reader = yield* DatabaseReader;

        const meetings = yield* reader
          .table("meetings")
          .index(
            "by_projectId_and_status",
            (q) => q.eq("projectId", projectId).eq("status", "published"),
            "desc"
          )
          .take(maxPublishedMeetings);
        const meetingById = new Map(
          meetings.map((meeting) => [meeting._id, meeting])
        );

        const meetingItems = yield* Effect.all(
          meetings.map((meeting) =>
            reader
              .table("minuteItems")
              .index("by_meetingId", (q) => q.eq("meetingId", meeting._id))
              .collect()
          )
        );
        const actions = yield* reader
          .table("actionItems")
          .index("by_projectId", (q) => q.eq("projectId", projectId), "desc")
          .take(maxDerivedRows);
        const decisions = yield* reader
          .table("decisions")
          .index("by_projectId", (q) => q.eq("projectId", projectId), "desc")
          .take(maxDerivedRows);
        const risks = yield* reader
          .table("risks")
          .index("by_projectId", (q) => q.eq("projectId", projectId), "desc")
          .take(maxDerivedRows);

        const discussionRows = meetingItems.flat().flatMap((item) => {
          if (!(item.kind === "discussion" || item.kind === "question")) {
            return [];
          }

          const meeting = meetingById.get(item.meetingId);

          if (!meeting) {
            return [];
          }

          return [
            {
              id: item._id,
              kind: item.kind,
              title: item.title,
              body: item.body,
              meetingId: item.meetingId,
              meetingTitle: meeting.title,
              meetingDate: meeting.meetingDate,
              ownerName: item.ownerName,
              dueDate: item.dueDate,
              severity: item.severity,
              status: "recorded" as const,
              citationCount: countCitations(item.citationsJson),
              createdAt: item.createdAt,
            },
          ];
        });
        const actionRows = actions.flatMap((action) => {
          const meeting = meetingById.get(action.meetingId);

          if (!meeting) {
            return [];
          }

          return [
            {
              id: action._id,
              kind: "action" as const,
              title: action.title,
              meetingId: action.meetingId,
              meetingTitle: meeting.title,
              meetingDate: meeting.meetingDate,
              ownerName: action.ownerName,
              dueDate: action.dueDate,
              status: action.status,
              citationCount: 0,
              createdAt: action.createdAt,
            },
          ];
        });
        const decisionRows = decisions.flatMap((decision) => {
          const meeting = meetingById.get(decision.meetingId);

          if (!meeting) {
            return [];
          }

          return [
            {
              id: decision._id,
              kind: "decision" as const,
              title: decision.title,
              body: decision.body,
              meetingId: decision.meetingId,
              meetingTitle: meeting.title,
              meetingDate: decision.decidedAt,
              status: "recorded" as const,
              citationCount: 0,
              createdAt: decision.createdAt,
            },
          ];
        });
        const riskRows = risks.flatMap((risk) => {
          const meeting = meetingById.get(risk.meetingId);

          if (!meeting) {
            return [];
          }

          return [
            {
              id: risk._id,
              kind: "risk" as const,
              title: risk.title,
              body: risk.body,
              meetingId: risk.meetingId,
              meetingTitle: meeting.title,
              meetingDate: meeting.meetingDate,
              severity: risk.severity,
              status: risk.status,
              citationCount: 0,
              createdAt: risk.createdAt,
            },
          ];
        });

        return sortLedgerRows([
          ...discussionRows,
          ...actionRows,
          ...decisionRows,
          ...riskRows,
        ]).slice(0, maxDerivedRows);
      })
    )
);

export const ledger = GroupImpl.make(api, "ledger").pipe(
  Layer.provide(listByProject)
);
