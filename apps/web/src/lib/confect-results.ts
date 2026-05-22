import type { useQuery } from "@confect/react";
import type refs from "@repo/backend/confect/_generated/refs";

export type ProjectsResult = ReturnType<
  typeof useQuery<typeof refs.public.projects.listForCurrentUser>
>;

export type MeetingsResult = ReturnType<
  typeof useQuery<typeof refs.public.meetings.listByProject>
>;

export type MemoryResult = ReturnType<
  typeof useQuery<typeof refs.public.memory.timelineByProject>
>;

export type ReviewResult = ReturnType<
  typeof useQuery<typeof refs.public.meetings.getReviewState>
>;
