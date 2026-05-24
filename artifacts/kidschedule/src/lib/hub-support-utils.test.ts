import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isPtmSeason,
  orderEmotionalCards,
  sortSupportTileIds,
} from "./hub-support-utils";

describe("hub-support-utils", () => {
  it("detects PTM season Sep–Nov", () => {
    assert.equal(isPtmSeason(new Date("2026-10-15")), true);
    assert.equal(isPtmSeason(new Date("2026-01-15")), false);
  });

  it("prioritises overwhelmed when mood is low", () => {
    assert.equal(orderEmotionalCards("low")[0], "overwhelmed");
  });

  it("sorts support tiles with PTM first during season", () => {
    const ids = ["life-skills", "articles", "ptm-prep", "emotional"];
    const sorted = sortSupportTileIds(ids, { ptmSeason: true });
    assert.deepEqual(sorted.slice(0, 3), ["articles", "emotional", "ptm-prep"]);
  });
});
