import { beforeEach, describe, expect, it } from "vitest";
import {
  discoverTalkingAmyMode,
  getCollectionProgress,
  loadTalkingAmyCollection,
  recordTalkingAmyCollectionUse,
  TALKING_AMY_COLLECTION_TOTAL,
} from "./talking-amy-collection";

describe("talking-amy-collection", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts with chipmunk discovered", () => {
    const c = loadTalkingAmyCollection(1);
    expect(c.discoveredModeIds).toContain("chipmunk");
  });

  it("tracks mode uses and discovery", () => {
    let c = recordTalkingAmyCollectionUse(2, "ghost");
    expect(c.modeUseCounts.ghost).toBe(1);
    c = discoverTalkingAmyMode(2, "magic");
    expect(c.discoveredModeIds).toContain("magic");
    const progress = getCollectionProgress(c);
    expect(progress.total).toBe(TALKING_AMY_COLLECTION_TOTAL);
    expect(progress.unlocked).toBeGreaterThanOrEqual(2);
  });
});
