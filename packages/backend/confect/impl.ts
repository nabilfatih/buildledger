import { Impl } from "@confect/server";
import { Layer } from "effect";

import api from "./_generated/api";
import { ai } from "./ai.impl";
import { meetings } from "./meetings.impl";
import { memory } from "./memory.impl";
import { projects } from "./projects.impl";
import { reports } from "./reports.impl";
import { shares } from "./shares.impl";

export default Impl.make(api).pipe(
  Layer.provide(ai),
  Layer.provide(projects),
  Layer.provide(meetings),
  Layer.provide(memory),
  Layer.provide(reports),
  Layer.provide(shares),
  Impl.finalize
);
