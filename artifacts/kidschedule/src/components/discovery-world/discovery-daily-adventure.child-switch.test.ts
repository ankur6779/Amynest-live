/**
 * Discovery daily adventure wrong-child keying — sibling switches on live
 * world pages must reload before writing the active child's daily key.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Discovery daily adventure child-switch keying", () => {
  it("discovery-world-live remounts DiscoveryWorldExperience per child id", () => {
    const src = readFileSync(
      resolve(__dirname, "../../pages/discovery-world-live.tsx"),
      "utf8",
    );
    expect(src).toMatch(/<DiscoveryWorldExperience\s+[^>]*key=\{activeChild\.id\}/);
  });

  it("useDiscoveryDailyAdventure reloads progress when childId changes", () => {
    const src = readFileSync(
      resolve(__dirname, "./discovery-daily-adventure.tsx"),
      "utf8",
    );
    expect(src).toMatch(/loadDailyAdventureProgress\(/);
    expect(src).toMatch(/\}, \[childId, config\.worldId, config\.manifest\.items\]\)/);
  });
});
