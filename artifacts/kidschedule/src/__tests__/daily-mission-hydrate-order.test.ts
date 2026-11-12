import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Static contract: DailyMissionPanel must await hydrate before virgin mission
 * persist. Fire-and-forget hydrate previously raced a today virgin write that
 * LWW-wiped completed missions synced from other devices.
 */
describe("DailyMissionPanel hydrate-before-persist contract", () => {
  const src = readFileSync(
    resolve(__dirname, "../components/phonics-v2/DailyMissionPanel.tsx"),
    "utf8",
  );

  it("awaits hydratePhonicsV3Progress before bootstrap persist", () => {
    expect(src).toMatch(/await\s+hydratePhonicsV3Progress\s*\(/);
    const awaitIdx = src.indexOf("await hydratePhonicsV3Progress");
    const persistIdx = src.indexOf("persistPhonicsV3Mission(childId, built)");
    expect(awaitIdx).toBeGreaterThan(-1);
    expect(persistIdx).toBeGreaterThan(awaitIdx);
  });

  it("does not fire-and-forget hydrate on mount", () => {
    expect(src).not.toMatch(
      /void\s+hydratePhonicsV3Progress\s*\([^)]*\)\s*\.catch/,
    );
  });
});
