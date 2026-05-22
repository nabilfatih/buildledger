import { Spec } from "@confect/core";

import { ai } from "@repo/backend/confect/ai.spec";
import { meetings } from "@repo/backend/confect/meetings.spec";
import { memory } from "@repo/backend/confect/memory.spec";
import { projects } from "@repo/backend/confect/projects.spec";
import { reports } from "@repo/backend/confect/reports.spec";
import { shares } from "@repo/backend/confect/shares.spec";

export default Spec.make()
  .add(ai)
  .add(projects)
  .add(meetings)
  .add(memory)
  .add(reports)
  .add(shares);
