import { describe, expect, it } from "vitest";
import {
  GUIDANCE_STREAM_LANES,
  GUIDANCE_STREAM_TILE_ID,
  guidanceLanesForContext,
  isGuidanceLivingV1Enabled,
  pickAmySuggestsSentence,
  pickGuidanceSacredSentence,
  recommendGuidanceAction,
} from "./living-room";

describe("guidance living-room", () => {
  it("orders one continuous stream — not a peer catalogue", () => {
    expect(GUIDANCE_STREAM_LANES.map((l) => l.id)).toEqual([
      "daily-tips",
      "new-parent-tips",
      "amy-suggests",
      "articles",
    ]);
  });

  it("recommends today's sacred sentence", () => {
    const r = recommendGuidanceAction();
    expect(r.id).toBe("sentence");
    expect(r.title).toBe("Today's sentence");
  });

  it("picks a sacred sentence from tip corpus", () => {
    const tip = pickGuidanceSacredSentence("toddler");
    expect(tip.id).toBeTruthy();
    expect(tip.en.length).toBeGreaterThan(8);
  });

  it("picks Amy Suggests without rewriting infant engines", () => {
    const tip = pickAmySuggestsSentence("infant");
    expect(tip.en.length).toBeGreaterThan(8);
  });

  it("hides new-parent lane when not applicable", () => {
    const lanes = guidanceLanesForContext({
      isInfant: false,
      showNewParent: false,
    });
    expect(lanes.map((l) => l.id)).not.toContain("new-parent-tips");
    expect(lanes.map((l) => l.id)).toContain("amy-suggests");
  });

  it("living flag defaults ON", () => {
    expect(isGuidanceLivingV1Enabled()).toBe(true);
  });

  it("exposes stable stream tile id", () => {
    expect(GUIDANCE_STREAM_TILE_ID).toBe("__guidance_stream__");
  });
});
