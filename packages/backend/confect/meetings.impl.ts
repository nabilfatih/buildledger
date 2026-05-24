import { GroupImpl } from "@confect/server";
import api from "@repo/backend/confect/_generated/api";
import {
  failGeneration,
  finishGeneration,
  startGeneration,
} from "@repo/backend/confect/meetings/generation";
import { publishMinutes } from "@repo/backend/confect/meetings/publish";
import {
  createDraft,
  getReviewState,
  listByProject,
  saveInput,
  updateReviewItem,
} from "@repo/backend/confect/meetings/review";
import { Layer } from "effect";

export const meetings = GroupImpl.make(api, "meetings").pipe(
  Layer.provide(listByProject),
  Layer.provide(createDraft),
  Layer.provide(saveInput),
  Layer.provide(startGeneration),
  Layer.provide(finishGeneration),
  Layer.provide(failGeneration),
  Layer.provide(getReviewState),
  Layer.provide(updateReviewItem),
  Layer.provide(publishMinutes)
);
