import { describe, expect, it } from "vitest";

import {
  canSaveMeetingInput,
  countDraftItems,
  currentMeetingInputs,
  draftFitsReviewBudget,
  reviewItemPatch,
} from "./meetings/helpers";

describe("meeting helpers", () => {
  it("keeps only the latest input for each editable kind", () => {
    const inputs = [
      { kind: "notes", text: "old notes", createdAt: 1 },
      { kind: "transcript", text: "transcript", createdAt: 2 },
      { kind: "notes", text: "new notes", createdAt: 3 },
      { kind: "file", createdAt: 4 },
    ] as const;

    expect(currentMeetingInputs(inputs)).toEqual([
      { kind: "transcript", text: "transcript", createdAt: 2 },
      { kind: "notes", text: "new notes", createdAt: 3 },
    ]);
  });

  it("only allows meeting input before generation", () => {
    expect(canSaveMeetingInput("draft")).toBe(true);
    expect(canSaveMeetingInput("failed")).toBe(true);
    expect(canSaveMeetingInput("processing")).toBe(false);
    expect(canSaveMeetingInput("review")).toBe(false);
    expect(canSaveMeetingInput("published")).toBe(false);
  });

  it("keeps action ownership fields and clears risk-only fields", () => {
    expect(
      reviewItemPatch({
        kind: "action",
        title: "  Resolve inspection blocker ",
        body: " Coordinate inspection timing. ",
        ownerName: " Site lead ",
        dueDate: " 2026-06-01 ",
        severity: "high",
      })
    ).toMatchObject({
      kind: "action",
      title: "Resolve inspection blocker",
      body: "Coordinate inspection timing.",
      status: "open",
      ownerName: "Site lead",
      dueDate: "2026-06-01",
      severity: undefined,
    });
  });

  it("keeps risk severity and clears action-only fields", () => {
    expect(
      reviewItemPatch({
        kind: "risk",
        title: " Drywall sequence delay ",
        body: " Inspection timing could slip. ",
        ownerName: " PM ",
        dueDate: " 2026-06-01 ",
      })
    ).toMatchObject({
      kind: "risk",
      title: "Drywall sequence delay",
      body: "Inspection timing could slip.",
      status: undefined,
      ownerName: undefined,
      dueDate: undefined,
      severity: "medium",
    });
  });

  it("keeps generated drafts inside the review transaction budget", () => {
    const draft = {
      summary: "Coordination notes",
      sections: [
        {
          title: "Site work",
          body: "Inspection timing is the key blocker.",
          items: [
            {
              kind: "action",
              title: "Resolve inspection blocker",
              body: "Coordinate inspection timing.",
              citations: [],
            },
          ],
        },
      ],
    } as const;

    expect(countDraftItems(draft)).toBe(1);
    expect(draftFitsReviewBudget(draft)).toBe(true);
  });
});
