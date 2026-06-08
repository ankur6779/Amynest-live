import { describe, expect, it } from "vitest";
import {
  pickWeightedTalkingAmyReaction,
  reactionPoolSize,
  TALKING_AMY_REACTION_POOLS,
} from "./talking-amy-reaction-pools";
import { TALKING_AMY_COLLECTIBLE_IDS } from "./talking-amy-modes";

describe("talking-amy-reaction-pools", () => {
  it("provides at least 20 reactions per collectible mode", () => {
    for (const id of TALKING_AMY_COLLECTIBLE_IDS) {
      expect(reactionPoolSize(id)).toBeGreaterThanOrEqual(20);
      expect(TALKING_AMY_REACTION_POOLS[id]?.length).toBeGreaterThanOrEqual(20);
    }
  });

  it("avoids immediate repeats when possible", () => {
    const first = pickWeightedTalkingAmyReaction("frog");
    let repeated = 0;
    for (let i = 0; i < 30; i++) {
      if (pickWeightedTalkingAmyReaction("frog") === first) repeated += 1;
    }
    expect(repeated).toBeLessThan(30);
  });
});
