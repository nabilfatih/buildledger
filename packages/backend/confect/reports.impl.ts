import { FunctionImpl, GroupImpl } from "@confect/server";
import { ReportGenerationService } from "@repo/ai/services";
import { Effect, Layer } from "effect";

import api from "./_generated/api";
import { DatabaseReader, DatabaseWriter } from "./_generated/services";
import { asAppError, ensureProjectAccess } from "./helpers";

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

/** Creates a weekly report draft from memory chunks inside the selected range. */
const createWeeklyDraft = FunctionImpl.make(
  api,
  "reports",
  "createWeeklyDraft",
  ({ projectId, periodStart, periodEnd }) =>
    asAppError(
      Effect.gen(function* () {
        const project = yield* ensureProjectAccess(projectId);
        const reader = yield* DatabaseReader;
        const writer = yield* DatabaseWriter;

        const chunks = yield* reader
          .table("memoryChunks")
          .index(
            "by_projectId_and_chronologyDate",
            (q) =>
              q
                .eq("projectId", projectId)
                .gte("chronologyDate", periodStart)
                .lte("chronologyDate", periodEnd),
            "desc"
          )
          .take(50);

        const reportChunks = chunks.map((chunk) => ({
          chunkId: chunk._id,
          text: chunk.text,
          chronologyDate: chunk.chronologyDate,
          sourceTitle:
            chunk.sourceType === "meeting"
              ? "Published meeting"
              : "Published report",
        }));

        const report = yield* ReportGenerationService.generate({
          projectName: project.name,
          periodLabel: `${periodStart} to ${periodEnd}`,
          chunks: reportChunks,
        }).pipe(Effect.provide(ReportGenerationService.Default));

        const timestamp = Date.now();

        return yield* writer.table("reports").insert({
          projectId,
          title: report.title,
          periodStart,
          periodEnd,
          body: [
            report.summary,
            report.actionSummary,
            report.riskSummary,
            report.decisionSummary,
          ].join("\n\n"),
          status: "draft",
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      })
    )
);

export const reports = GroupImpl.make(api, "reports").pipe(
  Layer.provide(listByProject),
  Layer.provide(createWeeklyDraft)
);
