import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseRoutineListDate, routineMatchesListQuery } from "./list-routines-query.js";

describe("list routines date contract", () => {
  const stale = { childId: 1, date: "2026-08-09" };
  const today = { childId: 1, date: "2026-09-13" };
  const sibling = { childId: 2, date: "2026-09-13" };

  it("rejects a non-YYYY-MM-DD date filter", () => {
    assert.equal(parseRoutineListDate("13-09-2026"), undefined);
    assert.equal(parseRoutineListDate("2026-09-13"), "2026-09-13");
  });

  it("does not treat an older routine as the requested date", () => {
    assert.equal(routineMatchesListQuery(stale, { childId: 1, date: "2026-09-13" }), false);
    assert.equal(routineMatchesListQuery(today, { childId: 1, date: "2026-09-13" }), true);
  });

  it("rejects the right date on the wrong child", () => {
    assert.equal(routineMatchesListQuery(sibling, { childId: 1, date: "2026-09-13" }), false);
  });

  it("lists history when date is omitted", () => {
    assert.equal(routineMatchesListQuery(stale, { childId: 1 }), true);
    assert.equal(routineMatchesListQuery(today, { childId: 1 }), true);
  });
});
