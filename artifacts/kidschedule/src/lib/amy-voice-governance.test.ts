import { describe, expect, it, beforeEach } from "vitest";
import {
  EXPERIMENT_PROMOTION_RULES,
  evaluateExperimentGovernanceFromResults,
  getAmyVoiceGovernanceSnapshot,
  getExperimentAuditLog,
  getPromotedExperimentVariants,
  resetAmyVoiceGovernanceForTests,
} from "./amy-voice-governance";
import {
  getAmyVoiceExperimentSnapshot,
  recordAmyVoiceExperimentOutcome,
  resetAmyVoiceExperimentsForTests,
  setAmyVoiceExperimentAssignmentForTests,
} from "./amy-voice-experiments";

describe("amy-voice-governance", () => {
  beforeEach(() => {
    resetAmyVoiceGovernanceForTests();
    resetAmyVoiceExperimentsForTests();
    setAmyVoiceExperimentAssignmentForTests({
      encouragement_frequency: "frequent",
      pacing: "control",
      instruction_style: "control",
    });
  });

  it("does not promote without sustained windows and sample size", () => {
    const assignment = {
      encouragement_frequency: "frequent" as const,
      pacing: "control" as const,
      instruction_style: "control" as const,
    };

    recordAmyVoiceExperimentOutcome(assignment, {
      replayCount: 1,
      durationMs: 2000,
      fallback: false,
    });
    evaluateExperimentGovernanceFromResults(getAmyVoiceExperimentSnapshot().results);

    expect(getPromotedExperimentVariants().encouragement_frequency).toBeUndefined();
    expect(getExperimentAuditLog().some((entry) => entry.decision === "promoted")).toBe(false);
  });

  it("promotes only after sustained >8% improvement with sufficient samples", () => {
    const assignment = {
      encouragement_frequency: "frequent" as const,
      pacing: "control" as const,
      instruction_style: "control" as const,
    };

    const seedMetrics = (variant: "control" | "frequent", replay: number, fallback: boolean) => {
      for (let i = 0; i < EXPERIMENT_PROMOTION_RULES.minSamplePerWindow; i++) {
        setAmyVoiceExperimentAssignmentForTests({
          ...assignment,
          encouragement_frequency: variant,
        });
        recordAmyVoiceExperimentOutcome(
          { ...assignment, encouragement_frequency: variant },
          { replayCount: replay, durationMs: 2500, fallback },
        );
      }
    };

    for (let window = 0; window < EXPERIMENT_PROMOTION_RULES.sustainedWindows; window++) {
      seedMetrics("control", 3, true);
      seedMetrics("frequent", 1, false);
      evaluateExperimentGovernanceFromResults(getAmyVoiceExperimentSnapshot().results);
    }

    expect(getPromotedExperimentVariants().encouragement_frequency).toBe("frequent");
    const audit = getExperimentAuditLog();
    expect(audit.some((entry) => entry.decision === "promoted")).toBe(true);
    expect(getAmyVoiceGovernanceSnapshot().promotionRules.minImprovementRatio).toBe(0.08);
  });

  it("records rejected audits when improvement is below threshold", () => {
    const assignment = {
      encouragement_frequency: "sparse" as const,
      pacing: "control" as const,
      instruction_style: "control" as const,
    };

    for (let window = 0; window < EXPERIMENT_PROMOTION_RULES.sustainedWindows; window++) {
      for (let i = 0; i < EXPERIMENT_PROMOTION_RULES.minSamplePerWindow; i++) {
        setAmyVoiceExperimentAssignmentForTests({ ...assignment, encouragement_frequency: "control" });
        recordAmyVoiceExperimentOutcome(
          { ...assignment, encouragement_frequency: "control" },
          { replayCount: 2, durationMs: 2500, fallback: false },
        );
        setAmyVoiceExperimentAssignmentForTests({ ...assignment, encouragement_frequency: "sparse" });
        recordAmyVoiceExperimentOutcome(
          { ...assignment, encouragement_frequency: "sparse" },
          { replayCount: 2, durationMs: 2500, fallback: false },
        );
      }
      evaluateExperimentGovernanceFromResults(getAmyVoiceExperimentSnapshot().results);
    }

    expect(getPromotedExperimentVariants().encouragement_frequency).not.toBe("sparse");
    expect(getExperimentAuditLog().some((entry) => entry.decision === "rejected")).toBe(true);
  });
});
