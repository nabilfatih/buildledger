"use client";

import { useQuery } from "@confect/react";
import refs from "@repo/backend/confect/_generated/refs";
import { Badge, Button } from "@repo/design-system";
import { createFileRoute } from "@tanstack/react-router";
import type { GenericId } from "convex/values";
import { RadioTower } from "lucide-react";
import { useState } from "react";

import { DashboardSummary } from "@/components/dashboard-summary";
import { MeetingWorkspace } from "@/components/meeting-workspace";
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
  const selectedMeetingIsVisible = meetingItems.some(
    (meeting) => meeting._id === selectedMeetingId
  );
  const activeMeetingId = selectedMeetingIsVisible
    ? selectedMeetingId
    : (meetingItems[0]?._id ?? null);
  const review = useQuery(
    refs.public.meetings.getReviewState,
    activeMeetingId ? { meetingId: activeMeetingId } : "skip"
  );

  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="border-border border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="font-medium text-muted-foreground text-sm">
              Open-source construction meeting OS
            </p>
            <h1 className="font-heading text-2xl">BuildLedger</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success">
              <RadioTower /> Convex realtime
            </Badge>
            <Button variant="outline">Sign in</Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[320px_1fr]">
        <ProjectRail
          notice={notice}
          projects={projects}
          selectedProjectId={activeProjectId}
          setNotice={setNotice}
          setSelectedProjectId={setSelectedProjectId}
        />
        <section className="flex min-w-0 flex-col gap-6">
          <DashboardSummary memory={memory} />
          <MeetingWorkspace
            meetings={meetings}
            review={review}
            selectedMeetingId={activeMeetingId}
            selectedProjectId={activeProjectId}
            setNotice={setNotice}
            setSelectedMeetingId={setSelectedMeetingId}
          />
        </section>
      </div>
    </main>
  );
}
