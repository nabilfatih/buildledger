import { GroupImpl } from "@confect/server";
import api from "@repo/backend/confect/_generated/api";
import {
  failGeneration,
  finishGeneration,
  generate,
  startGeneration,
} from "@repo/backend/confect/protocols/generation";
import { publish } from "@repo/backend/confect/protocols/publish";
import {
  createDraft,
  getPrintView,
  getReviewState,
  listByProject,
  saveSource,
  updateReview,
} from "@repo/backend/confect/protocols/review";
import { Layer } from "effect";

export const protocols = GroupImpl.make(api, "protocols").pipe(
  Layer.provide(listByProject),
  Layer.provide(createDraft),
  Layer.provide(saveSource),
  Layer.provide(generate),
  Layer.provide(startGeneration),
  Layer.provide(finishGeneration),
  Layer.provide(failGeneration),
  Layer.provide(getReviewState),
  Layer.provide(updateReview),
  Layer.provide(publish),
  Layer.provide(getPrintView)
);
