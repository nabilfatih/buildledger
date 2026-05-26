import { useQuery } from "@confect/react";
import refs from "@repo/backend/confect/_generated/refs";
import { api } from "@repo/backend/convex/_generated/api";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@repo/design-system/components/ui/sidebar";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { createFileRoute } from "@tanstack/react-router";
import { usePaginatedQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { useState } from "react";
import type { WorkspaceSection } from "@/components/app/section";
import { AuthGate } from "@/components/auth/gate";
import { DocumentsPanel } from "@/components/documents/panel";
import { ProjectIntelligencePanel } from "@/components/intelligence/panel";
import { ProjectLedgerTable } from "@/components/ledger/table";
import { LogbookPanel } from "@/components/logbook/panel";
import { ProtocolWorkspace } from "@/components/protocol/workspace";
import { ProjectRail } from "@/components/rail/rail";
import { ReportsPanel } from "@/components/reports/panel";

const projectPageSize = 8;
const protocolPageSize = 20;
const protocolBackedSections = new Set([
  "protocols",
  "documents",
  "intelligence",
  "reports",
]);

export const Route = createFileRoute("/")({
  component: BuildLedgerHome,
});

/** Renders the BuildLedger app shell around project memory workflows. */
function BuildLedgerHome() {
  return (
    <AuthGate>
      <BuildLedgerWorkspace />
    </AuthGate>
  );
}

/** Renders the authenticated project memory workspace. */
function BuildLedgerWorkspace() {
  const [selectedProjectId, setSelectedProjectId] =
    useState<GenericId<"projects"> | null>(null);
  const [selectedProtocolId, setSelectedProtocolId] =
    useState<GenericId<"protocols"> | null>(null);
  const [activeSection, setActiveSection] =
    useState<WorkspaceSection>("protocols");

  const projects = usePaginatedQuery(
    api.projects.listForCurrentUser,
    {},
    { initialNumItems: projectPageSize }
  );
  const projectItems = projects.results;
  const activeProjectId = selectedProjectId ?? projectItems[0]?._id ?? null;
  const activeProject = projectItems.find(
    (project) => project._id === activeProjectId
  );
  const shouldLoadProtocols =
    Boolean(activeProjectId) && protocolBackedSections.has(activeSection);
  const protocols = useQuery(
    refs.public.protocols.listByProject,
    shouldLoadProtocols && activeProjectId
      ? {
          paginationOpts: { cursor: null, numItems: protocolPageSize },
          projectId: activeProjectId,
        }
      : "skip"
  );
  const protocolItems =
    protocols._tag === "Success" ? protocols.value.page : [];
  const activeProtocolId = selectedProtocolId ?? protocolItems[0]?._id ?? null;
  const activeProtocol = protocolItems.find(
    (protocol) => protocol._id === activeProtocolId
  );
  const hasPublishedProtocol = protocolItems.some(
    (protocol) => protocol.status === "published"
  );
  const review = useQuery(
    refs.public.protocols.getReviewState,
    activeSection === "protocols" && activeProtocolId
      ? { protocolId: activeProtocolId }
      : "skip"
  );

  /** Selects a project and clears the protocol selected from the previous one. */
  function handleSelectProject(projectId: GenericId<"projects"> | null) {
    setSelectedProjectId(projectId);
    setSelectedProtocolId(null);
  }

  const workspaceSection = {
    documents: (
      <DocumentsPanel
        activeProtocolStatus={activeProtocol?.status}
        selectedProjectId={activeProjectId}
        selectedProtocolId={activeProtocolId}
      />
    ),
    intelligence: (
      <ProjectIntelligencePanel
        canUseProjectMemory={hasPublishedProtocol}
        selectedProjectId={activeProjectId}
        selectedProtocolId={activeProtocolId}
      />
    ),
    ledger: <ProjectLedgerTable selectedProjectId={activeProjectId} />,
    logbook: <LogbookPanel selectedProjectId={activeProjectId} />,
    protocols: (
      <ProtocolWorkspace
        protocols={protocols}
        review={review}
        selectedProjectId={activeProjectId}
        selectedProtocolId={activeProtocolId}
        setSelectedProtocolId={setSelectedProtocolId}
      />
    ),
    reports: (
      <ReportsPanel
        canUseProjectMemory={hasPublishedProtocol}
        selectedProjectId={activeProjectId}
      />
    ),
  }[activeSection];

  return (
    <SidebarProvider>
      <ProjectRail
        activeSection={activeSection}
        projects={projects}
        selectedProjectId={activeProjectId}
        setActiveSection={setActiveSection}
        setSelectedProjectId={handleSelectProject}
      />
      <SidebarInset className="min-w-0 overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 border-border border-b bg-background">
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-3">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              {projects.status === "LoadingFirstPage" ? (
                <Skeleton className="h-8 w-56" />
              ) : (
                <div className="min-w-0">
                  <h1 className="truncate font-heading text-base">
                    {activeProject?.name ?? "Select a Project"}
                  </h1>
                </div>
              )}
            </div>
            {activeProject ? (
              <Badge className="max-w-40 truncate" variant="outline">
                {activeProject.code}
              </Badge>
            ) : null}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto grid w-full min-w-0 max-w-[112rem] gap-4 p-4 md:p-5">
            {workspaceSection}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
