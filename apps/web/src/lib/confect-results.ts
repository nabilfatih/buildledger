import type { useQuery } from "@confect/react";
import type refs from "@repo/backend/confect/_generated/refs";
import type { api } from "@repo/backend/convex/_generated/api";
import type { usePaginatedQuery } from "convex/react";

export type ProjectsResult = ReturnType<
  typeof usePaginatedQuery<typeof api.projects.listForCurrentUser>
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
