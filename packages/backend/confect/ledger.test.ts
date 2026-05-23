import { describe, expect, it } from "vitest";

import { countCitations, sortLedgerRows } from "./ledger.impl";

describe("ledger helpers", () => {
  it("counts persisted minute citations", () => {
    expect(countCitations("[]")).toBe(0);
    expect(countCitations('[{"source":"notes"},{"source":"transcript"}]')).toBe(
      2
    );
  });

  it("treats invalid citation payloads as empty", () => {
    expect(countCitations("not json")).toBe(0);
    expect(countCitations('{"source":"notes"}')).toBe(0);
  });

  it("sorts ledger rows newest first without mutating the input", () => {
    const rows = [
      { id: "old", createdAt: 1 },
      { id: "new", createdAt: 3 },
      { id: "middle", createdAt: 2 },
    ];

    expect(sortLedgerRows(rows).map((row) => row.id)).toEqual([
      "new",
      "middle",
      "old",
    ]);
    expect(rows.map((row) => row.id)).toEqual(["old", "new", "middle"]);
  });
});
