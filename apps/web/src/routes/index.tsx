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

import { MeetingWorkspace } from "@/components/meeting-workspace";
import { ProjectIntelligencePanel } from "@/components/project-intelligence-panel";
import { ProjectLedgerTable } from "@/components/project-ledger-table";
import { ProjectRail } from "@/components/project-rail";

const projectPageSize = 8;

export const Route = createFileRoute("/")({
  component: BuildLedgerHome,
});

/** Renders the BuildLedger app shell around project memory workflows. */
function BuildLedgerHome() {
  const [selectedProjectId, setSelectedProjectId] =
    useState<GenericId<"projects"> | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] =
    useState<GenericId<"meetings"> | null>(null);

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
  const meetings = useQuery(
    refs.public.meetings.listByProject,
    activeProjectId ? { projectId: activeProjectId } : "skip"
  );
  const ledger = useQuery(
    refs.public.ledger.listByProject,
    activeProjectId ? { projectId: activeProjectId } : "skip"
  );
  const meetingItems = meetings._tag === "Success" ? meetings.value : [];
  const activeMeetingId = selectedMeetingId ?? meetingItems[0]?._id ?? null;
  const hasPublishedMeeting = meetingItems.some(
    (meeting) => meeting.status === "published"
  );
  const review = useQuery(
    refs.public.meetings.getReviewState,
    activeMeetingId ? { meetingId: activeMeetingId } : "skip"
  );
  const workspaceKey = `${activeProjectId ?? "project:none"}:${activeMeetingId ?? "meeting:none"}`;

  /** Selects a project and clears the meeting selected from the previous one. */
  function handleSelectProject(projectId: GenericId<"projects"> | null) {
    setSelectedProjectId(projectId);
    setSelectedMeetingId(null);
  }

  return (
    <SidebarProvider>
      <ProjectRail
        projects={projects}
        selectedProjectId={activeProjectId}
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
          <div className="grid min-w-0 gap-4 p-4 md:p-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="grid min-w-0 content-start gap-4">
              <ProjectLedgerTable ledger={ledger} />
              <MeetingWorkspace
                key={workspaceKey}
                meetings={meetings}
                review={review}
                selectedMeetingId={activeMeetingId}
                selectedProjectId={activeProjectId}
                setSelectedMeetingId={setSelectedMeetingId}
              />
            </section>
            <aside className="min-w-0 self-start 2xl:sticky 2xl:top-4">
              <ProjectIntelligencePanel
                canUseProjectMemory={hasPublishedMeeting}
                key={workspaceKey}
                selectedMeetingId={activeMeetingId}
                selectedProjectId={activeProjectId}
              />
            </aside>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
