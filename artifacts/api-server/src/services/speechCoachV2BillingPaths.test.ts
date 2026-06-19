import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const HEARTBEAT_TICK_SECONDS = 15;

/** Mirrors validateAndTouchSession tick math in speechCoachV2ActiveSessionService. */
function billTickSeconds(elapsedSinceLastSeen: number): number {
  return Math.min(
    HEARTBEAT_TICK_SECONDS,
    Math.max(elapsedSinceLastSeen, 1),
  );
}

function simulateBilling(events: Array<{ at: number }>): number {
  let lastSeenAt = 0;
  let billed = 0;
  for (const event of events) {
    billed += billTickSeconds(event.at - lastSeenAt);
    lastSeenAt = event.at;
  }
  return billed;
}

describe("Speech Coach V2 billing paths", () => {
  it("evaluate billing can charge an extra second when it races the heartbeat tick", () => {
    const heartbeatOnly = simulateBilling([{ at: 0 }, { at: 15 }, { at: 30 }]);
    const withEvaluate = simulateBilling([
      { at: 0 },
      { at: 5 },
      { at: 5 },
      { at: 15 },
      { at: 30 },
    ]);

    assert.ok(withEvaluate > heartbeatOnly);
    assert.equal(withEvaluate - heartbeatOnly, 1);
  });

  it("recordTurnEvaluation validates session without billing (assertActiveSessionForToken only)", () => {
    const servicePath = join(
      dirname(fileURLToPath(import.meta.url)),
      "speechCoachV2Service.ts",
    );
    const src = readFileSync(servicePath, "utf8");
    const evaluateBlock = src.slice(
      src.indexOf("export async function recordTurnEvaluation"),
      src.indexOf("async function updateStreak"),
    );

    assert.match(evaluateBlock, /assertActiveSessionForToken\(/);
    assert.doesNotMatch(evaluateBlock, /validateAndTouchSession\(/);
  });
});
