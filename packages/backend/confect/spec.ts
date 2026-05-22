import { Spec } from "@confect/core";

import { ai } from "./ai.spec";
import { meetings } from "./meetings.spec";
import { memory } from "./memory.spec";
import { projects } from "./projects.spec";
import { reports } from "./reports.spec";
import { shares } from "./shares.spec";

export default Spec.make()
  .add(ai)
  .add(projects)
  .add(meetings)
  .add(memory)
  .add(reports)
  .add(shares);
