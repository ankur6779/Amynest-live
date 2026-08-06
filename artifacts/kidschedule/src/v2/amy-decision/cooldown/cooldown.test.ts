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
  createEmptyDecisionHistoryDocument,
  recordDecisionHistory,
  stabilizeAmyDecision,
} from "../index";
import {
  AMY_DECISION_COOLDOWN_VERSION,
  clearCooldown,
  compareCooldownResults,
  cooldownFactsFromContext,
  createEmptyCooldownDocument,
  createMemoryCooldownAdapter,
  evaluateDecisionCooldown,
  expireCooldown,
  getActiveCooldowns,
  getCooldownSnapshot,
  hasActiveCooldown,
  isAmyDecisionCooldownEnabled,
  localDateKeyFromDate,
  recordCooldownDismissal,
  setDefaultCooldownAdapterForTests,
  upgradeCooldownDocument,
  validateDecisionCooldown,
  type DecisionCooldownFacts,
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
  const doc = createEmptyAmyMemory({ guestId: "cd-guest-1" });
  mutate?.(doc);
  return resolveAmyContext(freezeDoc(doc), { now });
}

const FIXED_NOW = new Date(2026, 7, 2, 12, 0, 0);

function facts(
  overrides: Partial<DecisionCooldownFacts> = {},
): DecisionCooldownFacts {
  return Object.freeze({
    localDateKey: localDateKeyFromDate(FIXED_NOW),
    challengeKey: "behavior",
    missionKey: "m1|2026-08-02|",
    coachStatus: "prepared",
    ...overrides,
  });
}

function stablePrimary() {
  const ctx = contextFrom((d) => {
    d.challenge.worryId = "behavior";
  });
  const decision = createAmyDecision(ctx, { now: FIXED_NOW });
  return {
    ctx,
    stable: stabilizeAmyDecision(
      { context: ctx, currentDecision: decision },
      { now: FIXED_NOW },
    ),
  };
}

describe("Decision Cooldown Engine (Sprint A6)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearAmyMemoryForTests();
    setDefaultCooldownAdapterForTests(null);
    localStorage.clear();
  });

  it("feature flag defaults OFF", () => {
    expect(isV2FlagEnabled("amy_decision_cooldown_v2")).toBe(false);
    expect(isAmyDecisionCooldownEnabled()).toBe(false);
  });

  it("dismiss once → ACTIVE", () => {
    const { stable } = stablePrimary();
    const f = facts();
    const dismissed = recordCooldownDismissal(
      {
        experienceId: AMY_EXPERIENCE.SPEECH_MISSION,
        policy: "UNTIL_END_OF_DAY",
        facts: f,
        store: createEmptyCooldownDocument(FIXED_NOW),
      },
      { now: FIXED_NOW },
    );
    expect(dismissed.duplicate).toBe(false);
    expect(dismissed.result.cooldownState).toBe("ACTIVE");
    expect(dismissed.result.eligibleAgain).toBe(false);
    expect(dismissed.result.dismissCount).toBe(1);
    expect(dismissed.entry.expiresAt).toBeTruthy();
    expect(validateDecisionCooldown(dismissed.result).ok).toBe(true);
    expect(validateDecisionCooldown(dismissed.store).ok).toBe(true);

    const evaluated = evaluateDecisionCooldown(
      {
        stable,
        history: createEmptyDecisionHistoryDocument(FIXED_NOW),
        store: dismissed.store,
        facts: f,
      },
      { now: FIXED_NOW },
    );
    expect(evaluated.cooldownState).toBe("ACTIVE");
    expect(evaluated.experienceId).toBe(AMY_EXPERIENCE.SPEECH_MISSION);
  });

  it("dismiss twice → dismissCount increments (stable duplicate)", () => {
    const f = facts();
    const first = recordCooldownDismissal(
      {
        experienceId: AMY_EXPERIENCE.SPEECH_MISSION,
        policy: "UNTIL_TOMORROW",
        facts: f,
        store: createEmptyCooldownDocument(FIXED_NOW),
      },
      { now: FIXED_NOW },
    );
    const second = recordCooldownDismissal(
      {
        experienceId: AMY_EXPERIENCE.SPEECH_MISSION,
        policy: "UNTIL_TOMORROW",
        facts: f,
        store: first.store,
      },
      { now: new Date(FIXED_NOW.getTime() + 60_000) },
    );
    expect(second.duplicate).toBe(true);
    expect(second.result.dismissCount).toBe(2);
    expect(second.entry.startedAt).toBe(first.entry.startedAt);
    expect(second.result.cooldownReason).toBe("DUPLICATE_DISMISSAL");
    expect(second.result.cooldownState).toBe("ACTIVE");
  });

  it("challenge change → expires challenge policy", () => {
    const { stable } = stablePrimary();
    const f = facts({ challengeKey: "behavior" });
    const dismissed = recordCooldownDismissal(
      {
        experienceId: AMY_EXPERIENCE.AMY_COACH,
        policy: "UNTIL_CHALLENGE_CHANGES",
        facts: f,
        store: createEmptyCooldownDocument(FIXED_NOW),
      },
      { now: FIXED_NOW },
    );
    expect(dismissed.result.cooldownState).toBe("ACTIVE");

    const after = evaluateDecisionCooldown(
      {
        stable,
        history: null,
        store: dismissed.store,
        facts: facts({ challengeKey: "sleep" }),
      },
      {
        now: FIXED_NOW,
        experienceId: AMY_EXPERIENCE.AMY_COACH,
      },
    );
    expect(after.cooldownState).toBe("EXPIRED");
    expect(after.eligibleAgain).toBe(true);
    expect(after.cooldownReason).toBe("CHALLENGE_CHANGED");
  });

  it("mission change → policy respected", () => {
    const { stable } = stablePrimary();
    const dismissed = recordCooldownDismissal(
      {
        experienceId: AMY_EXPERIENCE.SPEECH_MISSION,
        policy: "UNTIL_MISSION_CHANGES",
        facts: facts({ missionKey: "m1|2026-08-02|" }),
        store: createEmptyCooldownDocument(FIXED_NOW),
      },
      { now: FIXED_NOW },
    );
    const same = evaluateDecisionCooldown(
      {
        stable,
        history: null,
        store: dismissed.store,
        facts: facts({ missionKey: "m1|2026-08-02|" }),
      },
      { now: FIXED_NOW },
    );
    expect(same.cooldownState).toBe("ACTIVE");

    const changed = evaluateDecisionCooldown(
      {
        stable,
        history: null,
        store: dismissed.store,
        facts: facts({
          missionKey: "m1|2026-08-02|completed",
        }),
      },
      { now: FIXED_NOW },
    );
    expect(changed.cooldownState).toBe("EXPIRED");
    expect(changed.cooldownReason).toBe("MISSION_CHANGED");
    expect(changed.eligibleAgain).toBe(true);
  });

  it("permanent hide → never expires by time or facts", () => {
    const { stable } = stablePrimary();
    const dismissed = recordCooldownDismissal(
      {
        experienceId: AMY_EXPERIENCE.ASK_AMY,
        policy: "PERMANENT_HIDE",
        facts: facts(),
        store: createEmptyCooldownDocument(FIXED_NOW),
      },
      { now: FIXED_NOW },
    );
    expect(dismissed.result.cooldownState).toBe("PERMANENT");
    expect(dismissed.result.eligibleAgain).toBe(false);
    expect(dismissed.entry.expiresAt).toBeNull();

    const later = new Date(FIXED_NOW.getTime() + 86400_000 * 30);
    const still = evaluateDecisionCooldown(
      {
        stable,
        history: null,
        store: dismissed.store,
        facts: facts({
          challengeKey: "other",
          missionKey: "other",
          coachStatus: "completed",
          localDateKey: localDateKeyFromDate(later),
        }),
      },
      { now: later, experienceId: AMY_EXPERIENCE.ASK_AMY },
    );
    expect(still.cooldownState).toBe("PERMANENT");
    expect(still.eligibleAgain).toBe(false);

    const expireAttempt = expireCooldown(
      AMY_EXPERIENCE.ASK_AMY,
      dismissed.store,
      facts(),
      { now: later },
    );
    expect(expireAttempt.expired).toBe(false);

    const cleared = clearCooldown(dismissed.store, {
      experienceId: AMY_EXPERIENCE.ASK_AMY,
      clearPermanent: true,
      now: later,
    });
    expect(cleared.cleared).toBe(true);
  });

  it("expired time cooldown → eligibleAgain true", () => {
    const { stable } = stablePrimary();
    const dismissed = recordCooldownDismissal(
      {
        experienceId: AMY_EXPERIENCE.SPEECH_MISSION,
        policy: "UNTIL_END_OF_DAY",
        facts: facts(),
        store: createEmptyCooldownDocument(FIXED_NOW),
      },
      { now: FIXED_NOW },
    );
    const nextDay = new Date(2026, 7, 3, 1, 0, 0);
    const result = evaluateDecisionCooldown(
      {
        stable,
        history: null,
        store: dismissed.store,
        facts: facts({ localDateKey: localDateKeyFromDate(nextDay) }),
      },
      { now: nextDay },
    );
    expect(result.cooldownState).toBe("EXPIRED");
    expect(result.eligibleAgain).toBe(true);
    expect(result.cooldownReason).toBe("TIME_ELAPSED");
  });

  it("coach completed policy expires", () => {
    const { stable } = stablePrimary();
    const dismissed = recordCooldownDismissal(
      {
        experienceId: AMY_EXPERIENCE.AMY_COACH,
        policy: "UNTIL_COACH_COMPLETES",
        facts: facts({ coachStatus: "active" }),
        store: createEmptyCooldownDocument(FIXED_NOW),
      },
      { now: FIXED_NOW },
    );
    const done = evaluateDecisionCooldown(
      {
        stable,
        history: null,
        store: dismissed.store,
        facts: facts({ coachStatus: "completed" }),
      },
      { now: FIXED_NOW, experienceId: AMY_EXPERIENCE.AMY_COACH },
    );
    expect(done.cooldownState).toBe("EXPIRED");
    expect(done.cooldownReason).toBe("COACH_COMPLETED");
  });

  it("no store entry → NONE / eligible", () => {
    const { stable } = stablePrimary();
    const result = evaluateDecisionCooldown(
      {
        stable,
        history: null,
        store: createEmptyCooldownDocument(FIXED_NOW),
        facts: facts(),
      },
      { now: FIXED_NOW },
    );
    expect(result.cooldownState).toBe("NONE");
    expect(result.eligibleAgain).toBe(true);
    expect(result.cooldownReason).toBe("NO_COOLDOWN");
  });

  it("migration + readonly snapshot helpers", () => {
    const upgraded = upgradeCooldownDocument(null, FIXED_NOW);
    expect(upgraded?.schemaVersion).toBe(AMY_DECISION_COOLDOWN_VERSION);

    const legacy = {
      schemaVersion: "amy_decision_cooldown.v1",
      entries: [
        {
          experienceId: AMY_EXPERIENCE.SPEECH_MISSION,
          cooldownPolicy: "UNTIL_END_OF_DAY",
          startedAt: FIXED_NOW.toISOString(),
          expiresAt: null,
          dismissCount: 1,
          boundChallengeKey: "behavior",
          boundMissionKey: null,
          boundCoachStatus: null,
          cooldownReason: "DISMISSED",
          cooldownVersion: "amy_decision_cooldown.v1",
        },
      ],
      updatedAt: FIXED_NOW.toISOString(),
    };
    const migrated = upgradeCooldownDocument(legacy, FIXED_NOW);
    expect(migrated?.entries).toHaveLength(1);
    expect(upgradeCooldownDocument({ schemaVersion: "other.v1" })).toBeNull();

    const mem = createMemoryCooldownAdapter();
    setDefaultCooldownAdapterForTests(mem);
    const dismissed = recordCooldownDismissal(
      {
        experienceId: AMY_EXPERIENCE.SPEECH_MISSION,
        policy: "UNTIL_END_OF_DAY",
        facts: facts(),
        store: createEmptyCooldownDocument(FIXED_NOW),
      },
      { now: FIXED_NOW },
    );
    mem.writeDocument(dismissed.store);
    const snap = getCooldownSnapshot();
    expect(Object.isFrozen(snap)).toBe(true);
    expect(hasActiveCooldown(AMY_EXPERIENCE.SPEECH_MISSION, facts(), {
      now: FIXED_NOW,
    })).toBe(true);
    expect(getActiveCooldowns(facts(), { now: FIXED_NOW })).toHaveLength(1);
  });

  it("does not mutate Decision or History", () => {
    const { ctx, stable } = stablePrimary();
    const historyBefore = recordDecisionHistory(stable, null, {
      now: FIXED_NOW,
    });
    const historyDoc = historyBefore.document;
    const decisionId = stable.decision.decisionId;

    const dismissed = recordCooldownDismissal(
      {
        experienceId: stable.decision.primaryExperience.experienceId,
        policy: "UNTIL_END_OF_DAY",
        facts: cooldownFactsFromContext(ctx, FIXED_NOW),
        store: createEmptyCooldownDocument(FIXED_NOW),
      },
      { now: FIXED_NOW },
    );

    expect(stable.decision.decisionId).toBe(decisionId);
    expect(historyDoc.records).toHaveLength(1);
    expect(historyDoc.currentHistoryId).toBe(historyBefore.record?.historyId);
    expect(dismissed.store.entries).toHaveLength(1);

    const a = evaluateDecisionCooldown(
      {
        stable,
        history: historyDoc,
        store: dismissed.store,
        facts: cooldownFactsFromContext(ctx, FIXED_NOW),
      },
      { now: FIXED_NOW },
    );
    const b = evaluateDecisionCooldown(
      {
        stable,
        history: historyDoc,
        store: dismissed.store,
        facts: cooldownFactsFromContext(ctx, FIXED_NOW),
      },
      { now: FIXED_NOW },
    );
    expect(compareCooldownResults(a, b)).toEqual([]);
    expect(Object.isFrozen(a)).toBe(true);
  });
});
