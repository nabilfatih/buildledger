import {
  DatabaseReader,
  DatabaseWriter,
} from "@repo/backend/confect/_generated/services";
import type { GenericId } from "convex/values";
import { Effect } from "effect";

/** Keeps the newest protocol source of a kind and removes stale duplicates. */
export const upsertProtocolSource = Effect.fn("protocols.upsertProtocolSource")(
  function* (input: {
    readonly protocolId: GenericId<"protocols">;
    readonly kind: "notes" | "transcript" | "document";
    readonly text: string;
    readonly fileName?: string | undefined;
    readonly storageId?: GenericId<"_storage"> | undefined;
  }) {
    const reader = yield* DatabaseReader;
    const existingInputs = yield* reader
      .table("protocolSources")
      .index(
        "by_protocolId_and_kind",
        (q) => q.eq("protocolId", input.protocolId).eq("kind", input.kind),
        "desc"
      )
      .take(50);
    const writer = yield* DatabaseWriter;
    const timestamp = Date.now();
    const [currentInput, ...staleInputs] = existingInputs;
    const patch = {
      text: input.text.trim(),
      fileName: input.fileName,
      storageId: input.storageId,
      createdAt: timestamp,
    };

    if (!currentInput) {
      return yield* writer.table("protocolSources").insert({
        protocolId: input.protocolId,
        kind: input.kind,
        ...patch,
      });
    }

    yield* writer.table("protocolSources").patch(currentInput._id, patch);
    yield* Effect.all(
      staleInputs.map((source) =>
        writer.table("protocolSources").delete(source._id)
      )
    );

    return currentInput._id;
  }
);
