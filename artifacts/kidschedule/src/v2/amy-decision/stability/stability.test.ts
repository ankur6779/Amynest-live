import { afterEach, describe, expect, it, vi } from "vitest";
import { isV2FlagEnabled } from "@/lib/feature-flags";
import { resolveAmyContext, type AmyContext } from "@/v2/amy-context";
import {
  clearAmyMemoryForTests,
  createEmptyAmyMemory,
  type AmyMemoryDocument,
  type AmyMemoryMutable,
} from "@/v2/amy-memory";
import { computeContextVersion } from "@/v2/amy-memory/context-version";
import {
  AMY_EXPERIENCE,
  createAmyDecision,
  type AmyDecisionPolicy,
  MVP_SPEECH_WEDGE_POLICY,
} from "../index";
import {
  compareStabilityAxes,
  compareStableDecisions,
  computeStabilityFingerprint,
  computeStabilityTokenForDecision,
  explainDecisionReplacement,
  isAmyDecisionStabilityEnabled,
  stabilizeAmyDecision,
  validateDecisionStability,
} from "./index";

function freezeDoc(doc: AmyMemoryMutable): AmyMemoryDocument {
  doc.contextVersion = computeContextVersion(doc as AmyMemoryDocument);
  return Object.freeze(
    JSON.parse(JSON.stringify(doc)),
  ) as AmyMemoryDocument;
}

function contextFrom(
  mutate?: (doc: AmyMemoryMutable) => void,
  now = new Date(2026, 7, 2, 12, 0, 0),
): AmyContext {
  const doc = createEmptyAmyMemory({ guestId: "stab-guest-1" });
  mutate?.(doc);
  return resolveAmyContext(freezeDoc(doc), { now });
}

const FIXED_NOW = new Date(2026, 7, 2, 12, 0, 0);

function localDateKey(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function withPrevFp(ctx: AmyContext) {
  return {
    now: FIXED_NOW,
    previousStabilityFingerprint: computeStabilityFingerprint(ctx),
  };
}

describe("Decision Stability Engine (Sprint A4 review)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearAmyMemoryForTests();
    localStorage.clear();
  });

  it("feature flag defaults OFF", () => {
    expect(isV2FlagEnabled("amy_decision_stability_v2")).toBe(false);
    expect(isAmyDecisionStabilityEnabled()).toBe(false);
  });

  it("no previous → NEW with stabilityToken + reason codes", () => {
    const ctx = contextFrom((d) => {
      d.challenge.worryId = "behavior";
    });
    const current = createAmyDecision(ctx, { now: FIXED_NOW });
    const stable = stabilizeAmyDecision({ context: ctx, currentDecision: current });
    expect(stable.stabilityState).toBe("NEW");
    expect(stable.changeReason).toBe("NO_PREVIOUS");
    expect(stable.stabilityReasonCodes).toContain("NO_PREVIOUS");
    expect(stable.stabilityToken).toMatch(/^stabtok_v1_/);
    expect(stable.previousDecisionId).toBeNull();
    expect(validateDecisionStability(stable).ok).toBe(true);
  });

  it("same context → UNCHANGED only when all axes match", () => {
    const ctx = contextFrom((d) => {
      d.challenge.worryId = "behavior";
    });
    const previous = createAmyDecision(ctx, { now: FIXED_NOW });
    const current = createAmyDecision(ctx, { now: FIXED_NOW });
    const fp = computeStabilityFingerprint(ctx);
    const token = computeStabilityTokenForDecision(previous, fp);

    const axes = compareStabilityAxes({
      previousDecision: previous,
      currentDecision: current,
      currentFingerprint: fp,
      previousStabilityFingerprint: fp,
    });
    expect(axes.allAxesSame).toBe(true);
    expect(axes.fingerprintSame).toBe(true);
    expect(axes.policyVersionSame).toBe(true);
    expect(axes.primarySame).toBe(true);
    expect(axes.secondarySame).toBe(true);
    expect(axes.passiveSame).toBe(true);
    expect(axes.outcomeSame).toBe(true);

    const stable = stabilizeAmyDecision(
      { context: ctx, currentDecision: current, previousDecision: previous },
      {
        now: FIXED_NOW,
        previousStabilityFingerprint: fp,
        previousStabilityToken: token,
      },
    );
    expect(stable.stabilityState).toBe("UNCHANGED");
    expect(stable.decision.decisionId).toBe(previous.decisionId);
    expect(stable.stabilityToken).toBe(token);
    expect(stable.stabilityReasonCodes).toContain("AXES_UNCHANGED");
    expect(stable.changeReason).toBe("AXES_UNCHANGED");
  });

  it("outcome equality alone (missing fingerprint) → REPLACED", () => {
    const ctx = contextFrom((d) => {
      d.challenge.worryId = "behavior";
    });
    const previous = createAmyDecision(ctx, { now: FIXED_NOW });
    const current = createAmyDecision(ctx, { now: FIXED_NOW });
    const axes = compareStabilityAxes({
      previousDecision: previous,
      currentDecision: current,
      currentFingerprint: computeStabilityFingerprint(ctx),
      previousStabilityFingerprint: null,
    });
    expect(axes.outcomeSame).toBe(true);
    expect(axes.fingerprintMissing).toBe(true);
    expect(axes.allAxesSame).toBe(false);

    const stable = stabilizeAmyDecision({
      context: ctx,
      currentDecision: current,
      previousDecision: previous,
    });
    expect(stable.stabilityState).toBe("REPLACED");
    expect(stable.stabilityReasonCodes).toContain("FINGERPRINT_MISSING");
  });

  it("refresh with stored fingerprint → UNCHANGED", () => {
    const ctx = contextFrom((d) => {
      d.challenge.worryId = "behavior";
    });
    const first = stabilizeAmyDecision({
      context: ctx,
      currentDecision: createAmyDecision(ctx, { now: FIXED_NOW }),
    });
    const refreshed = createAmyDecision(ctx, { now: FIXED_NOW });
    const stable = stabilizeAmyDecision(
      {
        context: ctx,
        currentDecision: refreshed,
        previousDecision: first.decision,
      },
      {
        now: FIXED_NOW,
        previousStabilityFingerprint: first.stabilityFingerprint,
        previousStabilityToken: first.stabilityToken,
      },
    );
    expect(stable.stabilityState).toBe("UNCHANGED");
    expect(stable.stabilityToken).toBe(first.stabilityToken);
    expect(stable.decision).toEqual(first.decision);
  });

  it("reload with stored fingerprint → UNCHANGED", () => {
    const ctx = contextFrom();
    const previous = createAmyDecision(ctx, { now: FIXED_NOW });
    const fp = computeStabilityFingerprint(ctx);
    const later = new Date(FIXED_NOW.getTime() + 60_000);
    const reloaded = createAmyDecision(ctx, { now: later });
    const stable = stabilizeAmyDecision(
      {
        context: ctx,
        currentDecision: reloaded,
        previousDecision: previous,
      },
      {
        now: later,
        previousStabilityFingerprint: fp,
      },
    );
    expect(stable.stabilityState).toBe("UNCHANGED");
  });

  it("mission complete → REPLACED + MISSION_COMPLETED reason code", () => {
    const day = localDateKey(FIXED_NOW);
    const beforeCtx = contextFrom((d) => {
      d.challenge.worryId = "behavior";
    });
    const previous = createAmyDecision(beforeCtx, { now: FIXED_NOW });

    const afterCtx = contextFrom((d) => {
      d.challenge.worryId = "behavior";
      d.mission.missionId = "speech_name_three";
      d.mission.dateKey = day;
      d.mission.completedAt = FIXED_NOW.toISOString();
      d.speech.todayMissionStatus = "completed";
      d.coach.status = "prepared";
      d.coach.prepared = {
        goalId: "toddler-tantrums",
        goalTitle: "Toddler Tantrums",
        categoryId: "toddler-behavior",
        worryId: "behavior",
        challengeLabel: "Behaviour",
        preparedAt: FIXED_NOW.toISOString(),
        gateDismissed: false,
      };
    });
    const current = createAmyDecision(afterCtx, { now: FIXED_NOW });
    const stable = stabilizeAmyDecision(
      {
        context: afterCtx,
        currentDecision: current,
        previousDecision: previous,
      },
      {
        now: FIXED_NOW,
        previousStabilityFingerprint: computeStabilityFingerprint(beforeCtx),
      },
    );
    expect(stable.stabilityState).toBe("REPLACED");
    expect(stable.changeReason).toBe("MISSION_COMPLETED");
    expect(stable.stabilityReasonCodes).toContain("MISSION_COMPLETED");
    expect(stable.stabilityReasonCodes).toContain("PRIMARY_CHANGED");
    expect(stable.stabilityToken).toMatch(/^stabtok_v1_/);
    expect(stable.stabilityToken).not.toBe(
      computeStabilityTokenForDecision(
        previous,
        computeStabilityFingerprint(beforeCtx),
      ),
    );
  });

  it("coach started with outcome change → REPLACED + COACH_STARTED", () => {
    const day = localDateKey(FIXED_NOW);
    const beforeCtx = contextFrom((d) => {
      d.mission.missionId = "m1";
      d.mission.dateKey = day;
      d.mission.completedAt = FIXED_NOW.toISOString();
      d.challenge.worryId = null;
    });
    const previous = createAmyDecision(beforeCtx, { now: FIXED_NOW });
    expect(previous.primaryExperience.experienceId).toBe(AMY_EXPERIENCE.ASK_AMY);

    const afterCtx = contextFrom((d) => {
      d.mission.missionId = "m1";
      d.mission.dateKey = day;
      d.mission.completedAt = FIXED_NOW.toISOString();
      d.challenge.worryId = "behavior";
      d.coach.status = "active";
      d.coach.sessionId = "sess-2";
      d.coach.goalId = "toddler-tantrums";
    });
    const current = createAmyDecision(afterCtx, { now: FIXED_NOW });
    expect(current.primaryExperience.experienceId).toBe(AMY_EXPERIENCE.AMY_COACH);

    const stable = stabilizeAmyDecision(
      {
        context: afterCtx,
        currentDecision: current,
        previousDecision: previous,
      },
      withPrevFp(beforeCtx),
    );
    expect(stable.stabilityState).toBe("REPLACED");
    expect(stable.stabilityReasonCodes).toContain("COACH_STARTED");
    expect(["COACH_STARTED", "CHALLENGE_CHANGED", "PRIMARY_CHANGED"]).toContain(
      stable.changeReason,
    );
  });

  it("policy version change → REPLACED + POLICY_UPDATED", () => {
    const ctx = contextFrom((d) => {
      d.challenge.worryId = "behavior";
    });
    const previous = createAmyDecision(ctx, { now: FIXED_NOW });
    const altPolicy: AmyDecisionPolicy = {
      ...MVP_SPEECH_WEDGE_POLICY,
      policyVersion: "mvp_speech_wedge.v1-test",
    };
    const current = createAmyDecision(ctx, { now: FIXED_NOW, policy: altPolicy });
    const stable = stabilizeAmyDecision(
      {
        context: ctx,
        currentDecision: current,
        previousDecision: previous,
      },
      withPrevFp(ctx),
    );
    expect(stable.stabilityState).toBe("REPLACED");
    expect(stable.changeReason).toBe("POLICY_UPDATED");
    expect(stable.stabilityReasonCodes).toContain("POLICY_UPDATED");
    expect(stable.policyVersion).toBe("mvp_speech_wedge.v1-test");
  });

  it("guest / signed-in / speech / premium / unknown capability", () => {
    const guestCtx = contextFrom();
    const guestFp = computeStabilityFingerprint(guestCtx);
    const guestPrev = createAmyDecision(guestCtx, { now: FIXED_NOW });
    const guestCur = createAmyDecision(guestCtx, { now: FIXED_NOW });
    expect(
      stabilizeAmyDecision(
        {
          context: guestCtx,
          currentDecision: guestCur,
          previousDecision: guestPrev,
        },
        { previousStabilityFingerprint: guestFp },
      ).stabilityState,
    ).toBe("UNCHANGED");

    const signedCtx = contextFrom((d) => {
      d.identity.mode = "signed_in";
      d.identity.userId = "u1";
    });
    const signedFp = computeStabilityFingerprint(signedCtx);
    const signedPrev = createAmyDecision(signedCtx, { now: FIXED_NOW });
    const signedCur = createAmyDecision(signedCtx, { now: FIXED_NOW });
    expect(
      stabilizeAmyDecision(
        {
          context: signedCtx,
          currentDecision: signedCur,
          previousDecision: signedPrev,
        },
        { previousStabilityFingerprint: signedFp },
      ).stabilityState,
    ).toBe("UNCHANGED");

    const speechCtx = contextFrom((d) => {
      d.challenge.worryId = "speech_talking";
    });
    const speechFp = computeStabilityFingerprint(speechCtx);
    const speechPrev = createAmyDecision(speechCtx, { now: FIXED_NOW });
    const speechCur = createAmyDecision(speechCtx, { now: FIXED_NOW });
    expect(
      stabilizeAmyDecision(
        {
          context: speechCtx,
          currentDecision: speechCur,
          previousDecision: speechPrev,
        },
        { previousStabilityFingerprint: speechFp },
      ).stabilityState,
    ).toBe("UNCHANGED");

    expect(signedCtx.capabilities.premiumUnlocked).toBe(false);
    expect(guestCtx.capabilities.premiumEligible).toBe(false);
    expect(createAmyDecision(guestCtx, { now: FIXED_NOW }).reasonCodes).toContain(
      "PREMIUM_LOCKED",
    );

    // Unknown capability: fingerprint unchanged (not in meaningful payload) → UNCHANGED
    const weird = {
      ...guestCtx,
      capabilities: {
        ...guestCtx.capabilities,
        futureModuleReady: true,
      },
    } as typeof guestCtx;
    const weirdDecision = createAmyDecision(weird, { now: FIXED_NOW });
    const stableWeird = stabilizeAmyDecision(
      {
        context: weird,
        currentDecision: weirdDecision,
        previousDecision: guestPrev,
      },
      { previousStabilityFingerprint: guestFp },
    );
    expect(stableWeird.stabilityState).toBe("UNCHANGED");
    expect(weirdDecision.reasonCodes).toContain("UNKNOWN_CAPABILITY");
  });

  it("EXPIRED when previousExpiresAt in the past", () => {
    const ctx = contextFrom();
    const previous = createAmyDecision(ctx, { now: FIXED_NOW });
    const current = createAmyDecision(ctx, { now: FIXED_NOW });
    const stable = stabilizeAmyDecision(
      { context: ctx, currentDecision: current, previousDecision: previous },
      {
        now: FIXED_NOW,
        previousExpiresAt: new Date(FIXED_NOW.getTime() - 1000).toISOString(),
        previousStabilityFingerprint: computeStabilityFingerprint(ctx),
      },
    );
    expect(stable.stabilityState).toBe("EXPIRED");
    expect(stable.stabilityReasonCodes).toContain("EXPIRED");
    expect(stable.stabilityToken).toMatch(/^stabtok_v1_/);
  });

  it("INVALIDATED when current decision fails validation", () => {
    const ctx = contextFrom();
    const previous = createAmyDecision(ctx, { now: FIXED_NOW });
    const broken = {
      ...previous,
      decisionId: "",
      primaryExperience: { ...previous.primaryExperience, experienceId: "nope" },
    };
    const stable = stabilizeAmyDecision({
      context: ctx,
      // @ts-expect-error intentional invalid candidate
      currentDecision: broken,
      previousDecision: previous,
    });
    expect(stable.stabilityState).toBe("INVALIDATED");
    expect(stable.changeReason).toBe("DECISION_INVALID");
    expect(stable.stabilityReasonCodes).toContain("DECISION_INVALID");
  });

  it("explainDecisionReplacement reports all axes", () => {
    const ctx = contextFrom((d) => {
      d.challenge.worryId = "behavior";
    });
    const previous = createAmyDecision(ctx, { now: FIXED_NOW });
    const current = createAmyDecision(ctx, { now: FIXED_NOW });
    const fp = computeStabilityFingerprint(ctx);
    const explanation = explainDecisionReplacement(
      {
        context: ctx,
        currentDecision: current,
        previousDecision: previous,
      },
      { previousStabilityFingerprint: fp },
    );
    expect(explanation.replaced).toBe(false);
    expect(explanation.allAxesSame).toBe(true);
    expect(explanation.outcomeChanged).toBe(false);
    expect(explanation.fingerprintChanged).toBe(false);
    expect(explanation.stabilityToken).toMatch(/^stabtok_v1_/);
    expect(explanation.stabilityReasonCodes).toContain("AXES_UNCHANGED");

    const a = stabilizeAmyDecision(
      { context: ctx, currentDecision: current, previousDecision: previous },
      { previousStabilityFingerprint: fp },
    );
    const b = stabilizeAmyDecision(
      { context: ctx, currentDecision: current, previousDecision: previous },
      { previousStabilityFingerprint: fp },
    );
    expect(compareStableDecisions(a, b)).toEqual([]);
  });

  it("deep frozen StableDecisionResult", () => {
    const ctx = contextFrom();
    const current = createAmyDecision(ctx, { now: FIXED_NOW });
    const stable = stabilizeAmyDecision({ context: ctx, currentDecision: current });
    expect(Object.isFrozen(stable)).toBe(true);
    expect(Object.isFrozen(stable.stabilityReasonCodes)).toBe(true);
    expect(() => {
      (stable as { stabilityState: string }).stabilityState = "REPLACED";
    }).toThrow();
  });
});
