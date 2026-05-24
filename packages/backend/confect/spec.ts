import { Spec } from "@confect/core";
import { ai } from "@repo/backend/confect/ai.spec";
import { aiSettings } from "@repo/backend/confect/ai-settings.spec";
import { documents } from "@repo/backend/confect/documents.spec";
import { investigations } from "@repo/backend/confect/investigations.spec";
import { memory } from "@repo/backend/confect/memory.spec";
import { projects } from "@repo/backend/confect/projects.spec";
import { protocols } from "@repo/backend/confect/protocols.spec";
import { records } from "@repo/backend/confect/records.spec";
import { reports } from "@repo/backend/confect/reports.spec";
import { shares } from "@repo/backend/confect/shares.spec";
import { taxonomy } from "@repo/backend/confect/taxonomy.spec";

export default Spec.make()
  .add(ai)
  .add(aiSettings)
  .add(projects)
  .add(protocols)
  .add(records)
  .add(taxonomy)
  .add(documents)
  .add(investigations)
  .add(memory)
  .add(reports)
  .add(shares);
