import { beforeEach, describe, expect, it } from "vitest";
import {
  loadReflectionStore,
  saveReflectionEntry,
} from "./reflection-store";

describe("reflection-store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists saved entries across reload (load)", () => {
    const first = saveReflectionEntry({
      profileId: "p1",
      snapshotVersion: "ss_1",
      promptId: "prompt_a",
      body: "A quiet note",
    });
    expect(first.milestoneEmitted).toBe(true);
    expect(first.milestoneId).toBe("reflection_milestone_1");

    const reloaded = loadReflectionStore("p1");
    expect(reloaded.entries).toHaveLength(1);
    expect(reloaded.entries[0]?.body).toBe("A quiet note");
    expect(reloaded.entries[0]?.snapshotVersion).toBe("ss_1");
    expect(reloaded.emittedMilestones).toContain("reflection_milestone_1");
  });

  it("links entries to snapshotVersion without mutating snapshots", () => {
    saveReflectionEntry({
      profileId: "p1",
      snapshotVersion: "ss_old",
      promptId: "prompt_a",
      body: "Old sky note",
    });
    saveReflectionEntry({
      profileId: "p1",
      snapshotVersion: "ss_new",
      promptId: "prompt_b",
      body: "New sky note",
    });
    const state = loadReflectionStore("p1");
    expect(state.entries.map((e) => e.snapshotVersion)).toEqual(["ss_old", "ss_new"]);
  });

  it("milestone emission is idempotent across repeated saves at same count path", () => {
    for (let i = 0; i < 5; i++) {
      saveReflectionEntry({
        profileId: "p1",
        snapshotVersion: "ss_1",
        promptId: "prompt_a",
        body: `Note ${i + 1}`,
      });
    }
    const state = loadReflectionStore("p1");
    expect(state.emittedMilestones).toEqual([
      "reflection_milestone_1",
      "reflection_milestone_5",
    ]);
    // Replay path: already recorded — evaluate via another load
    expect(
      state.emittedMilestones.filter((m) => m === "reflection_milestone_5"),
    ).toHaveLength(1);
  });
});
