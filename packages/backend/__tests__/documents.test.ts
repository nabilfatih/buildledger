import { convexTest } from "convex-test";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

declare global {
  interface ImportMeta {
    glob(pattern: string): Record<string, () => Promise<unknown>>;
  }
}

const modules = import.meta.glob("../convex/**/*.*s");

process.env.BUILDLEDGER_AUTH_REQUIRED = "disabled";

describe("documents", () => {
  it(
    "uses canonical status indexes for attached source documents",
    () =>
      Effect.runPromise(
        Effect.gen(function* () {
          const t = convexTest({ modules, schema });
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
              agenda: "Inspection blockers.",
              attendees: [],
              distribution: [],
              location: "Site office",
              projectId,
              protocolDate: "2026-05-25",
              protocolNumber: "P-001",
              protocolType: "Coordination",
              title: "Procurement readiness",
            })
          );
          const documentId = yield* Effect.promise(() =>
            t.mutation(api.documents.saveSourceDocument, {
              extractedText: "Inspection blocker source text.",
              fileName: "inspection.txt",
              mimeType: "text/plain",
              projectId,
            })
          );

          yield* Effect.promise(() =>
            t.mutation(api.documents.attachToProtocol, {
              documentId,
              protocolId,
            })
          );

          const attached = yield* Effect.promise(() =>
            t.query(api.documents.listByProject, {
              filters: { status: "attached" },
              paginationOpts: { cursor: null, numItems: 10 },
              projectId,
            })
          );
          const extracted = yield* Effect.promise(() =>
            t.query(api.documents.listByProject, {
              filters: { status: "extracted" },
              paginationOpts: { cursor: null, numItems: 10 },
              projectId,
            })
          );
          const search = yield* Effect.promise(() =>
            t.query(api.documents.listByProject, {
              filters: { search: "inspection blocker" },
              paginationOpts: { cursor: null, numItems: 10 },
              projectId,
            })
          );

          expect(attached.page.map((document) => document._id)).toEqual([
            documentId,
          ]);
          expect(attached.page[0]?.status).toBe("attached");
          expect(extracted.page).toHaveLength(0);
          expect(search.page.map((document) => document._id)).toEqual([
            documentId,
          ]);
        })
      ),
    10_000
  );
});
