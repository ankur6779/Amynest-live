import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isClickbaitTitle, refineTitleSet } from "./title-generator.js";

describe("title generator", () => {
  it("produces primary, 5 alternates, short, high CTR, and search titles", () => {
    const titles = refineTitleSet(
      {
        primary: "Gentle Discipline Tips | AmyNest AI",
        alternates: ["A", "B", "C", "D", "E"],
        short: "Gentle Discipline",
        highCtr: "Shocking Discipline Trick!!!",
        searchOptimized: "Gentle Discipline Tips for Parents | AmyNest",
      },
      "Gentle Discipline",
    );
    assert.equal(titles.alternates.length, 5);
    assert.equal(isClickbaitTitle(titles.highCtr), false);
    assert.match(titles.searchOptimized, /AmyNest|Parents/i);
  });
});
