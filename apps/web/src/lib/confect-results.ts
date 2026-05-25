import type { useQuery } from "@confect/react";
import type refs from "@repo/backend/confect/_generated/refs";
import type { api } from "@repo/backend/convex/_generated/api";
import type { usePaginatedQuery } from "convex/react";

export type ProjectsResult = ReturnType<
  typeof usePaginatedQuery<typeof api.projects.listForCurrentUser>
>;

export type ProtocolsResult = ReturnType<
  typeof useQuery<typeof refs.public.protocols.listByProject>
>;

export type RecordsResult = ReturnType<
  typeof useQuery<typeof refs.public.records.listByProject>
>;

export type DocumentsResult = ReturnType<
  typeof useQuery<typeof refs.public.documents.listByProject>
>;

export type LogbookResult = ReturnType<
  typeof useQuery<typeof refs.public.logbook.listByProject>
>;

export type ProtocolReviewResult = ReturnType<
  typeof useQuery<typeof refs.public.protocols.getReviewState>
>;
