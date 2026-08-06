import { afterEach, describe, expect, it, vi } from "vitest";
import { v2BooleanFlagEnvKey, isV2FlagEnabled } from "@/lib/feature-flags";
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
  AMY_HERO_PRIORITY_ORDER,
  AMY_REASON,
  MVP_SPEECH_WEDGE_POLICY,
  compareAmyDecisions,
  createAmyDecision,
  createAmyDecisionWithTrace,
  diffDecisionReasons,
  isAmyDecisionEngineEnabled,
  validateAmyDecision,
  validateAmyDecisionPolicy,
  type AmyDecisionPolicy,
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
  const doc = createEmptyAmyMemory({ guestId: "dec-guest-1" });
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

describe("Amy Decision Engine (Sprint A3)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearAmyMemoryForTests();
    localStorage.clear();
  });

  it("feature flag defaults OFF — engine unused by production gate", () => {
    expect(isV2FlagEnabled("amy_decision_engine_v2")).toBe(false);
    expect(isAmyDecisionEngineEnabled()).toBe(false);
  });

  it("same Context → same Decision (deterministic)", () => {
    const ctx = contextFrom((d) => {
      d.challenge.worryId = "behavior";
    });
    const a = createAmyDecision(ctx, { now: FIXED_NOW });
    const b = createAmyDecision(ctx, { now: FIXED_NOW });
    expect(a).toEqual(b);
    expect(a.decisionId).toBe(b.decisionId);
    expect(validateAmyDecision(a).ok).toBe(true);
  });

  it("deep readonly — consumers cannot mutate Decision", () => {
    const d = createAmyDecision(contextFrom(), { now: FIXED_NOW });
    expect(Object.isFrozen(d)).toBe(true);
    expect(Object.isFrozen(d.reasonCodes)).toBe(true);
    expect(() => {
      (d as { confidence: string }).confidence = "LOW";
    }).toThrow();
  });

  it("mission incomplete → Speech Mission primary (frozen policy)", () => {
    const ctx = contextFrom((d) => {
      d.challenge.worryId = "behavior";
    });
    expect(ctx.capabilities.hasCompletedMissionToday).toBe(false);
    const d = createAmyDecision(ctx, { now: FIXED_NOW });
    expect(d.primaryExperience.experienceId).toBe(AMY_EXPERIENCE.SPEECH_MISSION);
    expect(d.reasonCodes).toContain(AMY_REASON.MISSION_INCOMPLETE);
    expect(d.reasonCodes).toContain(AMY_REASON.SPEECH_PRIORITY);
    expect(d.confidence).toBe("HIGH");
    expect(AMY_HERO_PRIORITY_ORDER[0]).toBe(AMY_EXPERIENCE.SPEECH_MISSION);
  });

  it("mission complete → Decision updates away from Speech primary when Coach prepared", () => {
    const day = localDateKey(FIXED_NOW);
    const before = createAmyDecision(
      contextFrom((d) => {
        d.challenge.worryId = "behavior";
      }),
      { now: FIXED_NOW },
    );
    expect(before.primaryExperience.experienceId).toBe(
      AMY_EXPERIENCE.SPEECH_MISSION,
    );

    const after = createAmyDecision(
      contextFrom((d) => {
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
      }),
      { now: FIXED_NOW },
    );
    expect(after.primaryExperience.experienceId).toBe(AMY_EXPERIENCE.AMY_COACH);
    expect(after.secondaryExperience?.experienceId).toBe(AMY_EXPERIENCE.ASK_AMY);
    expect(after.passiveExperience?.experienceId).toBe(AMY_EXPERIENCE.FOR_CHILD);
    expect(after.reasonCodes).toContain(AMY_REASON.MISSION_COMPLETE);
    expect(after.reasonCodes).toContain(AMY_REASON.COACH_PREPARED);
    const reasonDiff = diffDecisionReasons(before, after);
    expect(reasonDiff.added).toContain(AMY_REASON.MISSION_COMPLETE);
    expect(reasonDiff.removed).toContain(AMY_REASON.MISSION_INCOMPLETE);
  });

  it("coach prepared ordering — Coach → Ask Amy → For Child", () => {
    const day = localDateKey(FIXED_NOW);
    const d = createAmyDecision(
      contextFrom((d) => {
        d.mission.missionId = "m1";
        d.mission.dateKey = day;
        d.mission.completedAt = FIXED_NOW.toISOString();
        d.coach.status = "prepared";
        d.coach.prepared = {
          goalId: "improve-sleep-patterns",
          goalTitle: "Sleep",
          categoryId: "sleep",
          worryId: "sleep",
          challengeLabel: "Sleep",
          preparedAt: FIXED_NOW.toISOString(),
          gateDismissed: true,
        };
        d.challenge.worryId = "sleep";
      }),
      { now: FIXED_NOW },
    );
    expect(d.primaryExperience.experienceId).toBe(AMY_EXPERIENCE.AMY_COACH);
    expect(d.secondaryExperience?.experienceId).toBe(AMY_EXPERIENCE.ASK_AMY);
    expect(d.passiveExperience?.experienceId).toBe(AMY_EXPERIENCE.FOR_CHILD);
    expect(d.recommendedFeatureIds).toContain("amy_coach");
    expect(d.recommendedRouteIds).toContain("/amy-coach");
  });

  it("changed challenge → expected Decision diff", () => {
    const day = localDateKey(FIXED_NOW);
    const sleep = createAmyDecision(
      contextFrom((d) => {
        d.mission.missionId = "m1";
        d.mission.dateKey = day;
        d.mission.completedAt = FIXED_NOW.toISOString();
        d.challenge.worryId = "sleep";
      }),
      { now: FIXED_NOW },
    );
    const none = createAmyDecision(
      contextFrom((d) => {
        d.mission.missionId = "m1";
        d.mission.dateKey = day;
        d.mission.completedAt = FIXED_NOW.toISOString();
        d.challenge.worryId = null;
      }),
      { now: FIXED_NOW },
    );
    expect(sleep.primaryExperience.experienceId).toBe(AMY_EXPERIENCE.AMY_COACH);
    expect(none.primaryExperience.experienceId).toBe(AMY_EXPERIENCE.ASK_AMY);
    expect(none.reasonCodes).toContain(AMY_REASON.NO_CHALLENGE);
    const diff = compareAmyDecisions(sleep, none);
    expect(
      diff.some((e) => e.path.includes("primaryExperience")),
    ).toBe(true);
  });

  it("guest vs signed-in reason codes", () => {
    const guest = createAmyDecision(contextFrom(), { now: FIXED_NOW });
    expect(guest.reasonCodes).toContain(AMY_REASON.GUEST_USER);

    const signedIn = createAmyDecision(
      contextFrom((d) => {
        d.identity.mode = "signed_in";
        d.identity.userId = "u1";
      }),
      { now: FIXED_NOW },
    );
    expect(signedIn.reasonCodes).toContain(AMY_REASON.SIGNED_IN);
    expect(signedIn.reasonCodes).not.toContain(AMY_REASON.GUEST_USER);
  });

  it("speech concern + mission open keeps Speech primary", () => {
    const d = createAmyDecision(
      contextFrom((d) => {
        d.challenge.worryId = "speech_talking";
      }),
      { now: FIXED_NOW },
    );
    expect(d.primaryExperience.experienceId).toBe(AMY_EXPERIENCE.SPEECH_MISSION);
    expect(d.reasonCodes).toContain(AMY_REASON.SPEECH_CONCERN);
  });

  it("premium flags emit reason codes without changing Hero while locked", () => {
    // Context currently resolves premium* as false — assert locked code.
    const d = createAmyDecision(contextFrom(), { now: FIXED_NOW });
    expect(d.reasonCodes).toContain(AMY_REASON.PREMIUM_LOCKED);
    expect(d.primaryExperience.experienceId).toBe(AMY_EXPERIENCE.SPEECH_MISSION);
  });

  it("contains zero UI / navigation / AI fields", () => {
    const d = createAmyDecision(contextFrom(), { now: FIXED_NOW });
    const json = JSON.stringify(d);
    expect(json).not.toMatch(/button|href|label|prompt|openai|react/i);
    expect("heroCard" in d).toBe(false);
    expect(validateAmyDecision(d).ok).toBe(true);
  });

  it("flag can be enabled in env without wiring shells", () => {
    vi.stubEnv(v2BooleanFlagEnvKey("amy_decision_engine_v2"), "1");
    expect(isAmyDecisionEngineEnabled()).toBe(true);
  });

  it("uses AmyDecisionPolicy object — heroPriority is policy, not engine hardcode", () => {
    expect(MVP_SPEECH_WEDGE_POLICY).toMatchObject({
      policyId: "mvp_speech_wedge",
      policyVersion: "mvp_speech_wedge.v1",
    });
    expect(MVP_SPEECH_WEDGE_POLICY.heroPriority).toEqual(AMY_HERO_PRIORITY_ORDER);
    expect(MVP_SPEECH_WEDGE_POLICY.reasonWeights.MISSION_INCOMPLETE).toBeGreaterThan(
      0,
    );
    const d = createAmyDecision(contextFrom(), {
      now: FIXED_NOW,
      policy: MVP_SPEECH_WEDGE_POLICY,
    });
    expect(d.policyId).toBe("mvp_speech_wedge");
    expect(d.policyVersion).toBe("mvp_speech_wedge.v1");
  });

  it("validateAmyDecisionPolicy catches duplicates / missing hero / invalid ids", () => {
    expect(validateAmyDecisionPolicy(MVP_SPEECH_WEDGE_POLICY).ok).toBe(true);

    const bad: AmyDecisionPolicy = {
      ...MVP_SPEECH_WEDGE_POLICY,
      heroPriority: [
        AMY_EXPERIENCE.SPEECH_MISSION,
        AMY_EXPERIENCE.SPEECH_MISSION,
      ],
      secondaryPriority: [AMY_EXPERIENCE.SPEECH_MISSION],
    };
    const result = validateAmyDecisionPolicy(bad);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => /duplicate/i.test(i.message))).toBe(true);

    const emptyHero = validateAmyDecisionPolicy({
      ...MVP_SPEECH_WEDGE_POLICY,
      heroPriority: [],
    });
    expect(emptyHero.ok).toBe(false);

    const invalidId = validateAmyDecisionPolicy({
      ...MVP_SPEECH_WEDGE_POLICY,
      heroPriority: ["not_a_real_experience" as never],
    });
    expect(invalidId.ok).toBe(false);
  });

  it("developer Decision Trace is machine-readable and separate from Decision", () => {
    const { decision, trace } = createAmyDecisionWithTrace(contextFrom(), {
      now: FIXED_NOW,
    });
    expect(decision.primaryExperience.experienceId).toBe(
      AMY_EXPERIENCE.SPEECH_MISSION,
    );
    expect(trace?.kind).toBe("amy_decision_trace.v1");
    expect(trace?.steps.length).toBeGreaterThan(0);
    expect(trace?.slotResolution.primary).toBe(AMY_EXPERIENCE.SPEECH_MISSION);
    expect(JSON.stringify(decision)).not.toContain("amy_decision_trace");
  });

  it("UNKNOWN_CAPABILITY is deterministic and non-fatal", () => {
    const ctx = contextFrom();
    const weird = {
      ...ctx,
      capabilities: {
        ...ctx.capabilities,
        futureModuleReady: true,
      },
    } as typeof ctx;
    const d = createAmyDecision(weird, { now: FIXED_NOW });
    expect(d.reasonCodes).toContain(AMY_REASON.UNKNOWN_CAPABILITY);
    expect(d.primaryExperience.experienceId).toBe(AMY_EXPERIENCE.SPEECH_MISSION);
    expect(validateAmyDecision(d).ok).toBe(true);
  });
});
