import { describe, it, expect } from "vitest";
import {
  isPtmSeason,
  orderEmotionalCards,
  sortSupportTileIds,
} from "./hub-support-utils";

describe("hub-support-utils", () => {
  it("detects PTM season Sep–Nov", () => {
    expect(isPtmSeason(new Date("2026-10-15"))).toBe(true);
    expect(isPtmSeason(new Date("2026-01-15"))).toBe(false);
  });

  it("prioritises overwhelmed when mood is low", () => {
    expect(orderEmotionalCards("low")[0]).toBe("overwhelmed");
  });

  it("sorts support tiles with PTM first during season", () => {
    const ids = ["life-skills", "articles", "ptm-prep", "emotional"];
    const sorted = sortSupportTileIds(ids, { ptmSeason: true });
    expect(sorted.slice(0, 3)).toEqual(["articles", "emotional", "ptm-prep"]);
  });
});
