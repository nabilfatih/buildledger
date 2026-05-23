import type { useQuery } from "@confect/react";
import type refs from "@repo/backend/confect/_generated/refs";

export type ProjectsResult = ReturnType<
  typeof useQuery<typeof refs.public.projects.listForCurrentUser>
>;

export type MeetingsResult = ReturnType<
  typeof useQuery<typeof refs.public.meetings.listByProject>
>;

export type LedgerResult = ReturnType<
  typeof useQuery<typeof refs.public.ledger.listByProject>
>;

export type ReviewResult = ReturnType<
  typeof useQuery<typeof refs.public.meetings.getReviewState>
>;
