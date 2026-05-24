import { Impl } from "@confect/server";
import api from "@repo/backend/confect/_generated/api";
import { ai } from "@repo/backend/confect/ai.impl";
import { aiSettings } from "@repo/backend/confect/ai-settings.impl";
import { documents } from "@repo/backend/confect/documents.impl";
import { investigations } from "@repo/backend/confect/investigations.impl";
import { memory } from "@repo/backend/confect/memory.impl";
import { projects } from "@repo/backend/confect/projects.impl";
import { protocols } from "@repo/backend/confect/protocols.impl";
import { records } from "@repo/backend/confect/records.impl";
import { reports } from "@repo/backend/confect/reports.impl";
import { shares } from "@repo/backend/confect/shares.impl";
import { taxonomy } from "@repo/backend/confect/taxonomy.impl";
import { Layer } from "effect";

export default Impl.make(api).pipe(
  Layer.provide(ai),
  Layer.provide(aiSettings),
  Layer.provide(projects),
  Layer.provide(protocols),
  Layer.provide(records),
  Layer.provide(taxonomy),
  Layer.provide(documents),
  Layer.provide(investigations),
  Layer.provide(memory),
  Layer.provide(reports),
  Layer.provide(shares),
  Impl.finalize
);
