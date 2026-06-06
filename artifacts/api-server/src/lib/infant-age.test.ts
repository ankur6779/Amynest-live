import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  INFANT_MAX_AGE_MONTHS,
  isInfantAgeMonths,
  parseChildAgeMonthsFromBody,
  parseChildIdFromBody,
  totalAgeMonths,
} from "./infant-age.ts";

describe("infant-age", () => {
  it("classifies under-24-month ages as infant", () => {
    assert.equal(isInfantAgeMonths(0), true);
    assert.equal(isInfantAgeMonths(6), true);
    assert.equal(isInfantAgeMonths(23), true);
    assert.equal(isInfantAgeMonths(24), false);
    assert.equal(INFANT_MAX_AGE_MONTHS, 24);
  });

  it("totals years and month parts", () => {
    assert.equal(totalAgeMonths(1, 6), 18);
    assert.equal(totalAgeMonths(0, 8), 8);
  });

  it("parses childAgeMonths from request body", () => {
    assert.equal(parseChildAgeMonthsFromBody({ childAgeMonths: 9 }), 9);
    assert.equal(parseChildAgeMonthsFromBody({ childAge: 1 }), 12);
    assert.equal(parseChildAgeMonthsFromBody({}), null);
  });

  it("parses childId from request body for DB-backed quota routing", () => {
    assert.equal(parseChildIdFromBody({ childId: 7 }), 7);
    assert.equal(parseChildIdFromBody({ childAgeMonths: 48 }), null);
  });
});
