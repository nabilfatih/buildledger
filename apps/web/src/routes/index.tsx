"use client";

import { useQuery } from "@confect/react";
import refs from "@repo/backend/confect/_generated/refs";
import {
  Alert,
  AlertDescription,
  Frame,
  FrameHeader,
  FramePanel,
} from "@repo/design-system";
import { createFileRoute } from "@tanstack/react-router";
import type { GenericId } from "convex/values";
import { useState } from "react";

import { AiSettingsSheet } from "@/components/ai-settings-sheet";
import { DashboardSummary } from "@/components/dashboard-summary";
import { MeetingWorkspace } from "@/components/meeting-workspace";
import { ProjectIntelligencePanel } from "@/components/project-intelligence-panel";
import { ProjectRail } from "@/components/project-rail";

export const Route = createFileRoute("/")({
  component: BuildLedgerHome,
});

/** Renders the realtime project, meeting, and memory workspace. */
function BuildLedgerHome() {
  const [selectedProjectId, setSelectedProjectId] =
    useState<GenericId<"projects"> | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] =
    useState<GenericId<"meetings"> | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const projects = useQuery(refs.public.projects.listForCurrentUser, {});
  const projectItems = projects._tag === "Success" ? projects.value : [];
  const activeProjectId = selectedProjectId ?? projectItems[0]?._id ?? null;
  const meetings = useQuery(
    refs.public.meetings.listByProject,
    activeProjectId ? { projectId: activeProjectId } : "skip"
  );
  const memory = useQuery(
    refs.public.memory.timelineByProject,
    activeProjectId ? { projectId: activeProjectId } : "skip"
  );
  const meetingItems = meetings._tag === "Success" ? meetings.value : [];
  const activeMeetingId = selectedMeetingId ?? meetingItems[0]?._id ?? null;
  const review = useQuery(
    refs.public.meetings.getReviewState,
    activeMeetingId ? { meetingId: activeMeetingId } : "skip"
  );
  const workspaceKey = `${activeProjectId ?? "project:none"}:${activeMeetingId ?? "meeting:none"}`;

  /** Selects a project and clears any meeting selected from a previous project. */
  function handleSelectProject(projectId: GenericId<"projects"> | null) {
    setSelectedProjectId(projectId);
    setSelectedMeetingId(null);
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="border-border border-b bg-background/95">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-4 py-3 md:px-5">
          <div>
            <p className="font-medium text-muted-foreground text-xs">
              Open-source construction meeting OS
            </p>
            <h1 className="font-heading text-xl">BuildLedger</h1>
          </div>
          <AiSettingsSheet />
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1600px] gap-4 px-4 py-4 md:px-5 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
        <ProjectRail
          projects={projects}
          selectedProjectId={activeProjectId}
          setNotice={setNotice}
          setSelectedProjectId={handleSelectProject}
        />

        <Frame className="min-w-0 self-start">
          {notice ? (
            <FrameHeader className="pb-0">
              <Alert variant="warning">
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            </FrameHeader>
          ) : null}
          <FramePanel className="min-w-0 p-4 md:p-5">
            <MeetingWorkspace
              key={workspaceKey}
              meetings={meetings}
              review={review}
              selectedMeetingId={activeMeetingId}
              selectedProjectId={activeProjectId}
              setNotice={setNotice}
              setSelectedMeetingId={setSelectedMeetingId}
            />
          </FramePanel>
        </Frame>

        <aside className="grid min-w-0 gap-4 self-start">
          <DashboardSummary memory={memory} />
          <ProjectIntelligencePanel
            key={workspaceKey}
            selectedMeetingId={activeMeetingId}
            selectedProjectId={activeProjectId}
            setNotice={setNotice}
          />
        </aside>
      </div>
    </main>
  );
}
