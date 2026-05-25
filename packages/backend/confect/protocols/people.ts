import { DatabaseWriter } from "@repo/backend/confect/_generated/services";
import type { GenericId } from "convex/values";
import { Effect } from "effect";

import { maxProtocolParticipants } from "./helpers";
import { optionalText } from "./text";

export interface ProtocolPerson {
  readonly company?: string | undefined;
  readonly email?: string | undefined;
  readonly name: string;
  readonly role?: string | undefined;
}

/** Inserts one normalized participant list for a protocol. */
export const insertParticipants = Effect.fn("protocols.insertParticipants")(
  function* (input: {
    readonly protocolId: GenericId<"protocols">;
    readonly projectId: GenericId<"projects">;
    readonly kind: "attendee" | "distribution";
    readonly people: readonly ProtocolPerson[];
  }) {
    const writer = yield* DatabaseWriter;
    const timestamp = Date.now();
    const validPeople = input.people
      .filter((person) => person.name.trim())
      .slice(0, maxProtocolParticipants);

    yield* Effect.all(
      validPeople.map((person) =>
        writer.table("protocolParticipants").insert({
          protocolId: input.protocolId,
          projectId: input.projectId,
          kind: input.kind,
          name: person.name.trim(),
          company: optionalText(person.company),
          role: optionalText(person.role),
          email: optionalText(person.email),
          createdAt: timestamp,
        })
      )
    );
  }
);
