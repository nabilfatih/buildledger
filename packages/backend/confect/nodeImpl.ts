// biome-ignore-all lint/style/useFilenamingConvention: Confect looks for this node entrypoint by name.
import { Impl } from "@confect/server";

import nodeApi from "./_generated/nodeApi";

export default Impl.make(nodeApi).pipe(Impl.finalize);
