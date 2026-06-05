import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateEvidenceStrength,
  memoryClaimForStrength,
} from "./routine-evidence-strength.js";
import { buildParentIntelligenceAdaptations } from "./routine-parent-intelligence.js";

// P0-4: "Amy remembers" may only appear when real completion outcomes exist.
// Without completed-activity history the surface must stay "still learning".

describe("memory claim honesty (P0-4)", () => {
  it("never reaches a 'remembers' claim without completion outcomes", () => {
    // Plenty of saved plans, but ZERO completed activities (outcome logging off).
    const strength = calculateEvidenceStrength({
      childId: "child-1",
      memory: {
        snapshotCount: 8,
        completedActivityKeys: [],
        completionRate: 0,
        recentDayKeys: [["a1"], ["b1"], ["c1"]],
      },
    });
    assert.equal(strength, "LOW");

    const claim = memoryClaimForStrength(strength);
    assert.ok(claim != null);
    assert.doesNotMatch(claim!, /remembers/i);
    assert.match(claim!, /learning/i);
  });

  it("HIGH 'remembers' claim requires substantial completion history", () => {
    const strength = calculateEvidenceStrength({
      childId: "child-1",
      memory: {
        snapshotCount: 6,
        completedActivityKeys: Array.from({ length: 14 }, (_, i) => `k${i}`),
        completionRate: 0.5,
        recentDayKeys: [["a1"], ["b1"], ["c1"]],
      },
    });
    assert.equal(strength, "HIGH");
    assert.match(memoryClaimForStrength(strength)!, /remembers/i);
  });

  it("emits 'still learning' (never 'remembers') with no outcome history", () => {
    const lines = buildParentIntelligenceAdaptations({
      reverted: false,
      childId: "child-1",
      intelligenceTier: "baseline",
    });
    assert.ok(
      lines.some((l) => /learning/i.test(l)),
      `expected a learning line, got: ${lines.join(" | ")}`,
    );
    assert.equal(
      lines.some((l) => /remembers/i.test(l)),
      false,
      `must not claim memory without outcomes, got: ${lines.join(" | ")}`,
    );
  });
});
