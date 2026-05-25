import type { GenericId } from "convex/values";

export type ShareTarget = "protocol" | "report" | "ledger" | "logbook";

/** Builds the exact share mutation input for the selected resource type. */
export function shareArgs(
  target: ShareTarget,
  ids: {
    readonly projectId: GenericId<"projects">;
    readonly protocolId: GenericId<"protocols"> | null;
    readonly reportId: GenericId<"reports"> | null;
  }
) {
  if (target === "protocol" && ids.protocolId) {
    return {
      projectId: ids.projectId,
      protocolId: ids.protocolId,
    };
  }

  if (target === "report" && ids.reportId) {
    return {
      projectId: ids.projectId,
      reportId: ids.reportId,
    };
  }

  if (target === "logbook") {
    return {
      logbookView: true,
      projectId: ids.projectId,
    };
  }

  return {
    ledgerView: true,
    projectId: ids.projectId,
  };
}

/** Labels share results by resource instead of exposing raw token context. */
export function shareLabelForTarget(target: ShareTarget) {
  if (target === "protocol") {
    return "Protocol Share Link";
  }

  if (target === "report") {
    return "Report Share Link";
  }

  if (target === "logbook") {
    return "Logbook Share Link";
  }

  return "Ledger Share Link";
}
