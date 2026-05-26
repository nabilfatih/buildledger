import { FunctionImpl, GroupImpl } from "@confect/server";
import type { MemoryChunk, ProjectReport } from "@repo/ai/schemas";
import { ReportGenerationService } from "@repo/ai/services";
import api from "@repo/backend/confect/_generated/api";
import refs from "@repo/backend/confect/_generated/refs";
import {
  ActionRunner,
  DatabaseReader,
  DatabaseWriter,
  MutationRunner,
  QueryRunner,
} from "@repo/backend/confect/_generated/services";
import { ReportNotFound } from "@repo/backend/confect/errors";
import { asAppError, ensureProjectAccess } from "@repo/backend/confect/helpers";
import { zeroEmbedding } from "@repo/backend/confect/protocols/helpers";
import type { GenericId } from "convex/values";
import { format, parseISO } from "date-fns";
import { Effect, Layer } from "effect";

type ProjectId = GenericId<"projects">;
type ReportStatus = "draft" | "published";

/** Formats report periods for user-facing report prose. */
function formatReportPeriod(start: string, end: string) {
  return `${format(parseISO(start), "MMMM d, yyyy")} to ${format(parseISO(end), "MMMM d, yyyy")}`;
}

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
      "by_projectId_and_sourceType_and_chronologyDate",
      (q) =>
        q
          .eq("projectId", input.projectId)
          .eq("sourceType", "protocol")
          .gte("chronologyDate", input.periodStart)
          .lte("chronologyDate", input.periodEnd),
      "desc"
    )
    .take(50);

  return chunks.map((chunk) => ({
    chunkId: chunk._id,
    text: chunk.text,
    chronologyDate: chunk.chronologyDate,
    sourceTitle: "Published protocol",
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

/** Generates a report draft from published protocol memory. */
const generate = FunctionImpl.make(
  api,
  "reports",
  "generate",
  ({ projectId, periodEnd, periodStart }) =>
    asAppError(
      Effect.gen(function* () {
        const runAction = yield* ActionRunner;
        const runQuery = yield* QueryRunner;
        const runMutation = yield* MutationRunner;
        const settings = yield* runAction(
          refs.internal.aiSettings.resolveRuntime,
          {}
        );
        const input = yield* runQuery(
          refs.internal.reports.getWeeklyDraftInput,
          {
            periodEnd,
            periodStart,
            projectId,
          }
        );
        const report = yield* ReportGenerationService.generate({
          projectName: input.projectName,
          periodLabel: input.periodLabel,
          chunks: input.chunks,
          settings,
        }).pipe(Effect.provide(ReportGenerationService.Default));

        return yield* runMutation(refs.internal.reports.saveWeeklyDraft, {
          periodEnd,
          periodStart,
          projectId,
          report,
        });
      })
    )
);

/** Lists generated report drafts and published reports for a project. */
const listByProject = FunctionImpl.make(
  api,
  "reports",
  "listByProject",
  ({ filters, paginationOpts, projectId }) =>
    asAppError(
      Effect.gen(function* () {
        yield* ensureProjectAccess(projectId);
        const reader = yield* DatabaseReader;
        const reportFilters = normalizeReportFilters(filters);
        const page = yield* (() => {
          if (reportFilters.status) {
            const status = reportFilters.status;
            return reader
              .table("reports")
              .index(
                "by_projectId_and_status",
                (q) => q.eq("projectId", projectId).eq("status", status),
                "desc"
              )
              .paginate(paginationOpts);
          }

          return reader
            .table("reports")
            .index("by_projectId", (q) => q.eq("projectId", projectId), "desc")
            .paginate(paginationOpts);
        })();

        return {
          ...page,
          page: page.page.flatMap((report) =>
            matchesReportFilters(report, reportFilters) ? [report] : []
          ),
        };
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
          periodLabel: formatReportPeriod(periodStart, periodEnd),
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

/** Publishes a report and makes it available to project memory exactly once. */
const publish = FunctionImpl.make(api, "reports", "publish", ({ reportId }) =>
  asAppError(
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;
      const report = yield* reader
        .table("reports")
        .get(reportId)
        .pipe(
          Effect.mapError(
            () =>
              new ReportNotFound({
                reportId,
                message: "Report not found.",
              })
          )
        );

      yield* ensureProjectAccess(report.projectId);

      if (report.status === "published") {
        return null;
      }

      const writer = yield* DatabaseWriter;
      const timestamp = Date.now();

      yield* writer.table("reports").patch(reportId, {
        status: "published",
        updatedAt: timestamp,
      });
      yield* writer.table("memoryChunks").insert({
        projectId: report.projectId,
        sourceType: "report",
        sourceId: reportId,
        text: `${report.title}\n\n${report.body}`,
        chronologyDate: report.periodEnd,
        embedding: zeroEmbedding,
        metadataJson: JSON.stringify({ sourceTitle: report.title }),
        createdAt: timestamp,
      });

      return null;
    })
  )
);

export const reports = GroupImpl.make(api, "reports").pipe(
  Layer.provide(generate),
  Layer.provide(listByProject),
  Layer.provide(getWeeklyDraftInput),
  Layer.provide(saveWeeklyDraft),
  Layer.provide(publish)
);

/** Normalizes report list filters before selecting an index. */
function normalizeReportFilters(
  filters:
    | {
        readonly search?: string | undefined;
        readonly status?: string | undefined;
      }
    | undefined
) {
  return {
    search: optionalText(filters?.search)?.toLowerCase(),
    status: reportStatus(filters?.status),
  };
}

/** Keeps report status filters inside the report lifecycle states. */
function reportStatus(value: string | undefined): ReportStatus | undefined {
  switch (optionalText(value)) {
    case "draft":
      return "draft";
    case "published":
      return "published";
    default:
      return;
  }
}

/** Applies search filters after the indexed report page is loaded. */
function matchesReportFilters(
  report: {
    readonly body: string;
    readonly periodEnd: string;
    readonly periodStart: string;
    readonly status: string;
    readonly title: string;
  },
  filters: ReturnType<typeof normalizeReportFilters>
) {
  if (filters.status && report.status !== filters.status) {
    return false;
  }

  if (!filters.search) {
    return true;
  }

  return [
    report.title,
    report.body,
    report.status,
    report.periodStart,
    report.periodEnd,
  ]
    .join(" ")
    .toLowerCase()
    .includes(filters.search);
}

/** Normalizes optional text filters. */
function optionalText(value: string | undefined) {
  const text = value?.trim();
  return text && text.length > 0 ? text : undefined;
}
