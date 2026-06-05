import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildGenerationTransparencyMessage,
  calculateEvidenceStrength,
  continuityClaimForEvidence,
  hasContinuityEvidence,
  memoryClaimForStrength,
} from "./routine-evidence-strength.js";

describe("calculateEvidenceStrength", () => {
  it("returns NONE without childId", () => {
    assert.equal(calculateEvidenceStrength({}), "NONE");
  });

  it("returns LOW with snapshots only", () => {
    assert.equal(
      calculateEvidenceStrength({
        childId: "c1",
        memory: { snapshotCount: 1, completedActivityKeys: [], completionRate: 0, recentDayKeys: [[]] },
      }),
      "LOW",
    );
  });

  it("returns HIGH only with snapshots and completions", () => {
    const strength = calculateEvidenceStrength({
      childId: "c1",
      memory: {
        snapshotCount: 6,
        completedActivityKeys: Array.from({ length: 15 }, (_, i) => `act-${i}`),
        completionRate: 0.5,
        recentDayKeys: [["a"], ["b"], ["c"]],
      },
    });
    assert.equal(strength, "HIGH");
  });
});

describe("continuity and memory claims", () => {
  it("uses learning copy when continuity evidence is weak", () => {
    const claim = continuityClaimForEvidence({ childId: "c1", memory: { snapshotCount: 1, completedActivityKeys: [], completionRate: 0, recentDayKeys: [[]] } });
    assert.match(claim, /still learning/i);
  });

  it("does not emit remembers claim for NONE", () => {
    assert.equal(memoryClaimForStrength("NONE"), null);
  });

  it("maps generation transparency messages", () => {
    assert.match(buildGenerationTransparencyMessage("fallback"), /simplified/i);
    assert.match(buildGenerationTransparencyMessage("ai"), /personalized/i);
  });
});

describe("hasContinuityEvidence", () => {
  it("requires completions not just snapshots", () => {
    assert.equal(
      hasContinuityEvidence({
        childId: "c1",
        memory: {
          snapshotCount: 5,
          completedActivityKeys: [],
          completionRate: 0,
          recentDayKeys: [[], []],
        },
      }),
      false,
    );
  });
});
