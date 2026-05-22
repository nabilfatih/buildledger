import { Impl } from "@confect/server";
import api from "@repo/backend/confect/_generated/api";
import { ai } from "@repo/backend/confect/ai.impl";
import { meetings } from "@repo/backend/confect/meetings.impl";
import { memory } from "@repo/backend/confect/memory.impl";
import { projects } from "@repo/backend/confect/projects.impl";
import { reports } from "@repo/backend/confect/reports.impl";
import { shares } from "@repo/backend/confect/shares.impl";
import { Layer } from "effect";

export default Impl.make(api).pipe(
  Layer.provide(ai),
  Layer.provide(projects),
  Layer.provide(meetings),
  Layer.provide(memory),
  Layer.provide(reports),
  Layer.provide(shares),
  Impl.finalize
);
