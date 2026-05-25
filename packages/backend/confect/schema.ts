import { DatabaseSchema } from "@confect/server";

import {
  AiProviderSettings,
  AiRunEvents,
  AiRuns,
  Investigations,
  LogbookEvents,
  MemoryChunks,
  OrganizationMembers,
  Organizations,
  ProjectMembers,
  ProjectParticipants,
  ProjectRecords,
  Projects,
  ProjectTaxonomy,
  ProtocolItems,
  ProtocolParticipants,
  ProtocolSections,
  ProtocolSources,
  Protocols,
  Reports,
  ShareLinks,
  SourceDocuments,
} from "@repo/backend/confect/tables/core";

export default DatabaseSchema.make()
  .addTable(Organizations)
  .addTable(OrganizationMembers)
  .addTable(Projects)
  .addTable(ProjectMembers)
  .addTable(AiProviderSettings)
  .addTable(Protocols)
  .addTable(ProtocolParticipants)
  .addTable(ProtocolSources)
  .addTable(ProtocolSections)
  .addTable(ProtocolItems)
  .addTable(ProjectRecords)
  .addTable(ProjectTaxonomy)
  .addTable(ProjectParticipants)
  .addTable(LogbookEvents)
  .addTable(SourceDocuments)
  .addTable(Investigations)
  .addTable(MemoryChunks)
  .addTable(AiRuns)
  .addTable(AiRunEvents)
  .addTable(Reports)
  .addTable(ShareLinks);
