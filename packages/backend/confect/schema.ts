import { DatabaseSchema } from "@confect/server";

import {
  ActionItems,
  AiProviderSettings,
  AiRunEvents,
  AiRuns,
  Decisions,
  MeetingAttendees,
  MeetingInputs,
  Meetings,
  MemoryChunks,
  MinuteItems,
  MinuteSections,
  OrganizationMembers,
  Organizations,
  ProjectMembers,
  Projects,
  Reports,
  Risks,
  ShareLinks,
} from "@repo/backend/confect/tables/core";

export default DatabaseSchema.make()
  .addTable(Organizations)
  .addTable(OrganizationMembers)
  .addTable(Projects)
  .addTable(ProjectMembers)
  .addTable(AiProviderSettings)
  .addTable(Meetings)
  .addTable(MeetingAttendees)
  .addTable(MeetingInputs)
  .addTable(MinuteSections)
  .addTable(MinuteItems)
  .addTable(ActionItems)
  .addTable(Decisions)
  .addTable(Risks)
  .addTable(MemoryChunks)
  .addTable(AiRuns)
  .addTable(AiRunEvents)
  .addTable(Reports)
  .addTable(ShareLinks);
