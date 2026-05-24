import { FunctionImpl, GroupImpl } from "@confect/server";
import type { MemoryChunk, ProjectReport } from "@repo/ai/schemas";
import api from "@repo/backend/confect/_generated/api";
import {
  DatabaseReader,
  DatabaseWriter,
} from "@repo/backend/confect/_generated/services";
import { asAppError, ensureProjectAccess } from "@repo/backend/confect/helpers";
import type { GenericId } from "convex/values";
import { Effect, Layer } from "effect";

type ProjectId = GenericId<"projects">;

/** Loads report-ready memory chunks for an accessible project and period. */
const getReportChunks = Effect.fn("reports.getReportChunks")(function* (input: {
  readonly projectId: ProjectId;
  readonly periodStart: string;
  readonly periodEnd: string;
}) {
  const reader = yield* DatabaseReader;
  const chunks = yield* reader
    .table("memoryChunks")
    .index(
      "by_projectId_and_chronologyDate",
      (q) =>
        q
          .eq("projectId", input.projectId)
          .gte("chronologyDate", input.periodStart)
          .lte("chronologyDate", input.periodEnd),
      "desc"
    )
    .take(50);

  return chunks.map((chunk) => ({
    chunkId: chunk._id,
    text: chunk.text,
    chronologyDate: chunk.chronologyDate,
    sourceTitle:
      chunk.sourceType === "meeting" ? "Published meeting" : "Published report",
  }));
});

/** Inserts a report record from the stable AI report contract. */
const insertReport = Effect.fn("reports.insertReport")(function* (input: {
  readonly projectId: ProjectId;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly report: ProjectReport;
}) {
  const writer = yield* DatabaseWriter;
  const timestamp = Date.now();

  return yield* writer.table("reports").insert({
    projectId: input.projectId,
    title: input.report.title,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    body: [
      input.report.summary,
      input.report.actionSummary,
      input.report.riskSummary,
      input.report.decisionSummary,
    ].join("\n\n"),
    status: "draft",
    createdAt: timestamp,
    updatedAt: timestamp,
  });
});

/** Lists generated report drafts and published reports for a project. */
const listByProject = FunctionImpl.make(
  api,
  "reports",
  "listByProject",
  ({ projectId }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const reader = yield* DatabaseReader;

        return yield* reader
          .table("reports")
          .index("by_projectId", (q) => q.eq("projectId", projectId), "desc")
          .take(50);
      })
    )
);

/** Returns the exact report-generation input for the action boundary. */
const getWeeklyDraftInput = FunctionImpl.make(
  api,
  "reports",
  "getWeeklyDraftInput",
  ({ projectId, periodEnd, periodStart }) =>
    asAppError(
      Effect.gen(function* () {
        const project = yield* ensureProjectAccess(projectId);
        const chunks: readonly MemoryChunk[] = yield* getReportChunks({
          projectId,
          periodStart,
          periodEnd,
        });

        return {
          projectName: project.name,
          periodLabel: `${periodStart} to ${periodEnd}`,
          chunks,
        };
      })
    )
);

/** Saves a generated report draft after access has been verified. */
const saveWeeklyDraft = FunctionImpl.make(
  api,
  "reports",
  "saveWeeklyDraft",
  ({ projectId, periodEnd, periodStart, report }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);

        return yield* insertReport({
          projectId,
          periodStart,
          periodEnd,
          report,
        });
      })
    )
);

export const reports = GroupImpl.make(api, "reports").pipe(
  Layer.provide(listByProject),
  Layer.provide(getWeeklyDraftInput),
  Layer.provide(saveWeeklyDraft)
);
