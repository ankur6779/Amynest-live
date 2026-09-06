/**
 * Regression: completeLearningActivity must not persist enrichSectionProgress.
 *
 * enrich overlays Smart Study adaptive currentLevel (1–6) and rolling
 * accuracyRecent (≤20) onto Learning Progress section level/counters.
 * Applying that overlay before UPDATE permanently regressed math/phonics
 * progress and derived mastery unlocks.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const serviceSrc = readFileSync(
  join(here, "../learningProgressService.ts"),
  "utf8",
);

describe("learningProgressService section enrich write guard", () => {
  it("completeLearningActivity does not call enrichSectionProgress before persist", () => {
    const start = serviceSrc.indexOf("export async function completeLearningActivity");
    assert.ok(start >= 0, "completeLearningActivity export missing");
    const nextExport = serviceSrc.indexOf("\nexport async function", start + 1);
    const body = serviceSrc.slice(start, nextExport > start ? nextExport : undefined);
    assert.doesNotMatch(
      body,
      /enrichSectionProgress\s*\(/,
      "completeLearningActivity must not call enrichSectionProgress before writing — that permanently regresses stored levels",
    );
  });

  it("enrichSectionProgress merges study overlays monotonically (Math.max)", () => {
    const start = serviceSrc.indexOf("async function enrichSectionProgress");
    assert.ok(start >= 0);
    const end = serviceSrc.indexOf("\nexport async function getLearningProgressStatus");
    const body = serviceSrc.slice(start, end > start ? end : undefined);
    assert.match(body, /Math\.max\(prev\?\.level/);
    assert.match(body, /Math\.max\(prev\?\.activitiesCompleted/);
    assert.match(body, /lastActivityId: prev\?\.lastActivityId/);
    assert.doesNotMatch(
      body,
      /activitiesCompleted:\s*attempts\.length/,
      "must not blind-replace activitiesCompleted with rolling window length",
    );
    assert.doesNotMatch(
      body,
      /level:\s*r\.currentLevel/,
      "must not blind-replace section level with Smart Study currentLevel",
    );
  });

  it("getLearningProgressStatus still enriches on read for display", () => {
    const start = serviceSrc.indexOf("export async function getLearningProgressStatus");
    const nextExport = serviceSrc.indexOf("\nexport async function completeLearningActivity");
    const body = serviceSrc.slice(start, nextExport > start ? nextExport : undefined);
    assert.match(body, /enrichSectionProgress/);
  });
});
