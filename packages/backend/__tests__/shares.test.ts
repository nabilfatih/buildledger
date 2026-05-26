import { convexTest } from "convex-test";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { searchText } from "../confect/search";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

declare global {
  interface ImportMeta {
    glob(pattern: string): Record<string, () => Promise<unknown>>;
  }
}

const modules = import.meta.glob("../convex/**/*.*s");

process.env.BUILDLEDGER_AUTH_REQUIRED = "disabled";

/** Creates a realistic published protocol dataset for public share tests. */
const seedPublishedProtocol = Effect.fn("test.seedPublishedProtocol")(
  function* (t: ReturnType<typeof convexTest>) {
    const projectId = yield* Effect.promise(() =>
      t.mutation(api.projects.create, {
        code: "HT-01",
        description: "Construction protocol intelligence workspace.",
        name: "Harbor Tower",
        organizationName: "BuildLedger Test",
      })
    );

    const protocolId = yield* Effect.promise(() =>
      t.mutation(api.protocols.createDraft, {
        agenda: "Inspection blockers and sequencing risk.",
        attendees: [
          {
            company: "BuildLedger",
            email: "sam@example.com",
            name: "Sam Rivera",
            role: "Site manager",
          },
        ],
        distribution: [
          {
            company: "BuildLedger",
            email: "client@example.com",
            name: "Client Viewer",
            role: "Owner",
          },
        ],
        location: "Site office",
        projectId,
        protocolDate: "2026-05-25",
        protocolNumber: "P-001",
        protocolType: "Coordination",
        title: "Procurement readiness",
      })
    );

    const seededIds = yield* Effect.promise(() =>
      t.run((ctx) =>
        Effect.runPromise(
          Effect.gen(function* () {
            const timestamp = Date.now();
            const sectionId = yield* Effect.promise(() =>
              ctx.db.insert("protocolSections", {
                body: "Procurement and inspection readiness.",
                createdAt: timestamp,
                order: 1,
                protocolId,
                title: "Site coordination",
              })
            );
            const itemId = yield* Effect.promise(() =>
              ctx.db.insert("protocolItems", {
                body: "Coordinate inspection timing so drywall crews can proceed.",
                citationsJson: JSON.stringify([
                  { quote: "inspection timing", source: "Notes" },
                ]),
                component: "Interior",
                createdAt: timestamp,
                dueDate: "2026-05-30",
                kind: "task",
                objectName: "Drywall",
                protocolId,
                responsibleParty: "Site team",
                sectionId,
                severity: "medium",
                status: "open",
                title: "Resolve inspection blocker",
                trade: "Drywall",
                updatedAt: timestamp,
              })
            );
            const recordId = yield* Effect.promise(() =>
              ctx.db.insert("projectRecords", {
                body: "Coordinate inspection timing so drywall crews can proceed.",
                citationCount: 1,
                component: "Interior",
                createdAt: timestamp,
                dueDate: "2026-05-30",
                kind: "task",
                objectName: "Drywall",
                projectId,
                protocolId,
                protocolItemId: itemId,
                recordNumber: "P-001-1",
                responsibleParty: "Site team",
                severity: "medium",
                sourceProtocolDate: "2026-05-25",
                sourceProtocolTitle: "Procurement readiness",
                status: "open",
                searchText: searchText([
                  "P-001-1",
                  "task",
                  "Resolve inspection blocker",
                  "Coordinate inspection timing so drywall crews can proceed.",
                  "Interior",
                  "Drywall",
                  "Drywall",
                  "Site team",
                  "2026-05-30",
                  "medium",
                  "open",
                  "Procurement readiness",
                  "2026-05-25",
                ]),
                title: "Resolve inspection blocker",
                trade: "Drywall",
                updatedAt: timestamp,
              })
            );
            const reportId = yield* Effect.promise(() =>
              ctx.db.insert("reports", {
                body: "Inspection blocker remains the main coordination risk.",
                createdAt: timestamp,
                periodEnd: "2026-05-31",
                periodStart: "2026-05-25",
                projectId,
                status: "published",
                searchText: searchText([
                  "Weekly readiness report",
                  "Inspection blocker remains the main coordination risk.",
                  "published",
                  "2026-05-25",
                  "2026-05-31",
                ]),
                title: "Weekly readiness report",
                updatedAt: timestamp,
              })
            );

            yield* Effect.promise(() =>
              ctx.db.insert("logbookEvents", {
                body: "Task record created from the published protocol.",
                chronologyDate: "2026-05-25",
                component: "Interior",
                createdAt: timestamp,
                eventType: "record_created",
                objectName: "Drywall",
                projectId,
                protocolId,
                recordId,
                responsibleParty: "Site team",
                searchText: searchText([
                  "record created",
                  "Resolve inspection blocker",
                  "Task record created from the published protocol.",
                  "Interior",
                  "Drywall",
                  "Drywall",
                  "Site team",
                  "Procurement readiness",
                  "2026-05-25",
                ]),
                title: "Resolve inspection blocker",
                trade: "Drywall",
              })
            );

            yield* Effect.promise(() =>
              ctx.db.patch(protocolId, {
                status: "published",
                updatedAt: timestamp,
              })
            );

            return { projectId, protocolId, reportId };
          })
        )
      )
    );

    return seededIds;
  }
);

describe("shares", () => {
  it(
    "searches records, logbook events, and reports through Convex search indexes",
    () =>
      Effect.runPromise(
        Effect.gen(function* () {
          const t = convexTest({ modules, schema });
          const seeded = yield* seedPublishedProtocol(t);

          const records = yield* Effect.promise(() =>
            t.query(api.records.listByProject, {
              filters: { search: "inspection blocker" },
              paginationOpts: { cursor: null, numItems: 10 },
              projectId: seeded.projectId,
            })
          );
          const logbook = yield* Effect.promise(() =>
            t.query(api.logbook.listByProject, {
              filters: { search: "record created" },
              paginationOpts: { cursor: null, numItems: 10 },
              projectId: seeded.projectId,
            })
          );
          const reports = yield* Effect.promise(() =>
            t.query(api.reports.listByProject, {
              filters: { search: "coordination risk" },
              paginationOpts: { cursor: null, numItems: 10 },
              projectId: seeded.projectId,
            })
          );

          expect(records.page).toHaveLength(1);
          expect(logbook.page).toHaveLength(1);
          expect(reports.page).toHaveLength(1);
        })
      ),
    10_000
  );

  it("creates and resolves safe read-only resources", () =>
    Effect.runPromise(
      Effect.gen(function* () {
        const t = convexTest({ modules, schema });
        const seeded = yield* seedPublishedProtocol(t);
        const protocolLink = yield* Effect.promise(() =>
          t.mutation(api.shares.createReadOnlyLink, {
            projectId: seeded.projectId,
            protocolId: seeded.protocolId,
          })
        );
        const ledgerLink = yield* Effect.promise(() =>
          t.mutation(api.shares.createReadOnlyLink, {
            ledgerView: true,
            projectId: seeded.projectId,
          })
        );
        const logbookLink = yield* Effect.promise(() =>
          t.mutation(api.shares.createReadOnlyLink, {
            logbookView: true,
            projectId: seeded.projectId,
          })
        );
        const reportLink = yield* Effect.promise(() =>
          t.mutation(api.shares.createReadOnlyLink, {
            projectId: seeded.projectId,
            reportId: seeded.reportId,
          })
        );

        expect("shareLink" in protocolLink).toBe(false);
        expect(protocolLink.resourceType).toBe("protocol");
        expect(ledgerLink.resourceType).toBe("ledger");
        expect(logbookLink.resourceType).toBe("logbook");
        expect(reportLink.resourceType).toBe("report");

        const protocolShare = yield* Effect.promise(() =>
          t.query(api.shares.resolve, { token: protocolLink.token })
        );
        const ledgerShare = yield* Effect.promise(() =>
          t.query(api.shares.resolve, { token: ledgerLink.token })
        );
        const logbookShare = yield* Effect.promise(() =>
          t.query(api.shares.resolve, { token: logbookLink.token })
        );
        const reportShare = yield* Effect.promise(() =>
          t.query(api.shares.resolve, { token: reportLink.token })
        );

        expect(protocolShare.resourceType).toBe("protocol");
        if (protocolShare.resourceType !== "protocol") {
          return;
        }

        expect(protocolShare.protocol.title).toBe("Procurement readiness");
        expect(protocolShare.participants).toEqual([
          {
            company: "BuildLedger",
            kind: "attendee",
            name: "Sam Rivera",
            role: "Site manager",
          },
          {
            company: "BuildLedger",
            kind: "distribution",
            name: "Client Viewer",
            role: "Owner",
          },
        ]);

        expect(ledgerShare.resourceType).toBe("ledger");
        if (ledgerShare.resourceType !== "ledger") {
          return;
        }

        expect(ledgerShare.records).toHaveLength(1);
        const ledgerRecord = ledgerShare.records[0];
        expect(ledgerRecord).toBeDefined();
        if (!ledgerRecord) {
          return;
        }

        expect(ledgerRecord.title).toBe("Resolve inspection blocker");

        expect(logbookShare.resourceType).toBe("logbook");
        if (logbookShare.resourceType !== "logbook") {
          return;
        }

        expect(logbookShare.events).toHaveLength(1);
        const logbookEvent = logbookShare.events[0];
        expect(logbookEvent).toBeDefined();
        if (!logbookEvent) {
          return;
        }

        expect(logbookEvent.eventType).toBe("record_created");

        expect(reportShare.resourceType).toBe("report");
        if (reportShare.resourceType !== "report") {
          return;
        }

        expect(reportShare.report.title).toBe("Weekly readiness report");

        for (const payload of [
          protocolLink,
          protocolShare,
          ledgerShare,
          logbookShare,
          reportShare,
        ]) {
          const serialized = JSON.stringify(payload);
          expect(serialized).not.toContain("tokenHash");
          expect(serialized).not.toContain("_creationTime");
          expect(serialized).not.toContain('"_id"');
          expect(serialized).not.toContain("sam@example.com");
          expect(serialized).not.toContain("client@example.com");
        }
      })
    ));
});
