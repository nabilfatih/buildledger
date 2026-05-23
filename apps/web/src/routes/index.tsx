"use client";

import { useQuery } from "@confect/react";
import refs from "@repo/backend/confect/_generated/refs";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@repo/design-system/components/ui/sidebar";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { createFileRoute } from "@tanstack/react-router";
import type { GenericId } from "convex/values";
import { useState } from "react";

import { MeetingWorkspace } from "@/components/meeting-workspace";
import { ProjectIntelligencePanel } from "@/components/project-intelligence-panel";
import { ProjectLedgerTable } from "@/components/project-ledger-table";
import { ProjectRail } from "@/components/project-rail";

export const Route = createFileRoute("/")({
  component: BuildLedgerHome,
});

/** Renders the BuildLedger app shell around project memory workflows. */
function BuildLedgerHome() {
  const [selectedProjectId, setSelectedProjectId] =
    useState<GenericId<"projects"> | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] =
    useState<GenericId<"meetings"> | null>(null);

  const projects = useQuery(refs.public.projects.listForCurrentUser, {});
  const projectItems = projects._tag === "Success" ? projects.value : [];
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
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 border-border border-b bg-background/95 px-4 py-3 backdrop-blur md:px-5">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger />
              <div className="min-w-0">
                <p className="font-medium text-muted-foreground text-xs">
                  Project Memory Workspace
                </p>
                {projects._tag === "Success" ? (
                  <h1 className="truncate font-heading text-lg">
                    {activeProject?.name ?? "Select a Project"}
                  </h1>
                ) : (
                  <Skeleton className="mt-1 h-6 w-48" />
                )}
              </div>
            </div>
            {activeProject ? (
              <Badge className="max-w-40 truncate" variant="outline">
                {activeProject.code}
              </Badge>
            ) : null}
          </div>
        </header>

        <main className="grid min-w-0 gap-4 p-4 md:p-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
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
          <aside className="min-w-0 self-start 2xl:sticky 2xl:top-20">
            <ProjectIntelligencePanel
              canUseProjectMemory={hasPublishedMeeting}
              key={workspaceKey}
              selectedMeetingId={activeMeetingId}
              selectedProjectId={activeProjectId}
            />
          </aside>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
