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
  stabilizeAmyDecision,
  computeStabilityFingerprint,
} from "../index";
import {
  AMY_DECISION_HISTORY_VERSION,
  appendDecisionHistory,
  clearDecisionHistory,
  compareHistory,
  createEmptyDecisionHistoryDocument,
  createMemoryHistoryAdapter,
  currentHistoryPointer,
  exportDecisionHistory,
  findCurrentHistory,
  findHistoryByDecision,
  getCurrentDecisionHistory,
  getCurrentHistoryPointer,
  getDecisionHistory,
  isAmyDecisionHistoryEnabled,
  recordDecisionHistory,
  setDefaultHistoryAdapterForTests,
  upgradeHistoryDocument,
  validateDecisionHistory,
  verifyHistoryHash,
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
  const doc = createEmptyAmyMemory({ guestId: "hist-guest-1" });
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

function stableNew(ctx: AmyContext = contextFrom()) {
  const decision = createAmyDecision(ctx, { now: FIXED_NOW });
  return stabilizeAmyDecision(
    { context: ctx, currentDecision: decision },
    { now: FIXED_NOW },
  );
}

describe("Decision History Engine (Sprint A5)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearAmyMemoryForTests();
    setDefaultHistoryAdapterForTests(null);
    localStorage.clear();
  });

  it("feature flag defaults OFF", () => {
    expect(isV2FlagEnabled("amy_decision_history_v2")).toBe(false);
    expect(isAmyDecisionHistoryEnabled()).toBe(false);
  });

  it("NEW recorded — append only", () => {
    const stable = stableNew();
    expect(stable.stabilityState).toBe("NEW");
    const result = recordDecisionHistory(stable, null, { now: FIXED_NOW });
    expect(result.recorded).toBe(true);
    expect(result.record?.outcomeState).toBe("NEW");
    expect(result.document.records).toHaveLength(1);
    expect(result.document.currentHistoryId).toBe(result.record?.historyId);
    expect(result.record?.historyHash).toMatch(/^histhash_v1_/);
    expect(verifyHistoryHash(result.record!)).toBe(true);
    expect(validateDecisionHistory(result.document).ok).toBe(true);
    expect(validateDecisionHistory(result.record!).ok).toBe(true);
  });

  it("historyHash detects corruption", () => {
    const result = recordDecisionHistory(stableNew(), null, { now: FIXED_NOW });
    const tampered = {
      ...result.record!,
      decisionId: "tampered-id",
      // keep stale hash
      historyHash: result.record!.historyHash,
    };
    expect(verifyHistoryHash(tampered)).toBe(false);
    expect(validateDecisionHistory(tampered).ok).toBe(false);
    expect(
      validateDecisionHistory(tampered).issues.some((i) =>
        /integrity hash mismatch/i.test(i.message),
      ),
    ).toBe(true);
  });

  it("currentHistoryPointer is fast tip lookup (dev only)", () => {
    const result = recordDecisionHistory(stableNew(), null, { now: FIXED_NOW });
    const pointer = currentHistoryPointer(result.document);
    expect(pointer).not.toBeNull();
    expect(pointer?.historyId).toBe(result.record?.historyId);
    expect(pointer?.stabilityToken).toBe(result.record?.stabilityToken);
    expect(pointer?.historyHash).toBe(result.record?.historyHash);
    expect(pointer?.documentUpdatedAt).toBe(result.document.updatedAt);

    const mem = createMemoryHistoryAdapter(result.document);
    setDefaultHistoryAdapterForTests(mem);
    expect(getCurrentHistoryPointer()?.historyId).toBe(result.record?.historyId);
    expect(currentHistoryPointer(createEmptyDecisionHistoryDocument())).toBeNull();
  });

  it("UNCHANGED ignored", () => {
    const ctx = contextFrom((d) => {
      d.challenge.worryId = "behavior";
    });
    const first = stabilizeAmyDecision(
      {
        context: ctx,
        currentDecision: createAmyDecision(ctx, { now: FIXED_NOW }),
      },
      { now: FIXED_NOW },
    );
    const doc1 = recordDecisionHistory(first, null, { now: FIXED_NOW }).document;

    const unchanged = stabilizeAmyDecision(
      {
        context: ctx,
        currentDecision: createAmyDecision(ctx, { now: FIXED_NOW }),
        previousDecision: first.decision,
      },
      {
        now: FIXED_NOW,
        previousStabilityFingerprint: first.stabilityFingerprint,
        previousStabilityToken: first.stabilityToken,
      },
    );
    expect(unchanged.stabilityState).toBe("UNCHANGED");

    const result = recordDecisionHistory(unchanged, doc1, { now: FIXED_NOW });
    expect(result.recorded).toBe(false);
    expect(result.skipReason).toBe("UNCHANGED");
    expect(result.document.records).toHaveLength(1);
    expect(compareHistory(doc1, result.document)).toEqual([]);
  });

  it("REPLACED recorded with chain links", () => {
    const day = localDateKey(FIXED_NOW);
    const beforeCtx = contextFrom((d) => {
      d.challenge.worryId = "behavior";
    });
    const firstStable = stabilizeAmyDecision(
      {
        context: beforeCtx,
        currentDecision: createAmyDecision(beforeCtx, { now: FIXED_NOW }),
      },
      { now: FIXED_NOW },
    );
    const doc1 = recordDecisionHistory(firstStable, null, {
      now: FIXED_NOW,
    }).document;
    const tip1 = findCurrentHistory(doc1)!;

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
    const later = new Date(FIXED_NOW.getTime() + 60_000);
    const replaced = stabilizeAmyDecision(
      {
        context: afterCtx,
        currentDecision: createAmyDecision(afterCtx, { now: later }),
        previousDecision: firstStable.decision,
      },
      {
        now: later,
        previousStabilityFingerprint: computeStabilityFingerprint(beforeCtx),
        previousStabilityToken: firstStable.stabilityToken,
      },
    );
    expect(replaced.stabilityState).toBe("REPLACED");

    const result = recordDecisionHistory(replaced, doc1, { now: later });
    expect(result.recorded).toBe(true);
    expect(result.document.records).toHaveLength(2);
    expect(result.record?.outcomeState).toBe("REPLACED");
    expect(result.record?.previousHistoryId).toBe(tip1.historyId);

    const oldInNewDoc = result.document.records[0]!;
    expect(oldInNewDoc.replacedByHistoryId).toBe(result.record?.historyId);
    // Original tip object remains immutable / not mutated in place
    expect(tip1.replacedByHistoryId).toBeNull();
    expect(Object.isFrozen(result.record)).toBe(true);
    expect(Object.isFrozen(result.document.records)).toBe(true);
  });

  it("EXPIRED recorded", () => {
    const ctx = contextFrom();
    const first = stabilizeAmyDecision(
      {
        context: ctx,
        currentDecision: createAmyDecision(ctx, { now: FIXED_NOW }),
      },
      { now: FIXED_NOW },
    );
    const doc1 = recordDecisionHistory(first, null, { now: FIXED_NOW }).document;

    const later = new Date(FIXED_NOW.getTime() + 120_000);
    const expired = stabilizeAmyDecision(
      {
        context: ctx,
        currentDecision: createAmyDecision(ctx, { now: later }),
        previousDecision: first.decision,
      },
      {
        now: later,
        previousExpiresAt: new Date(later.getTime() - 1000).toISOString(),
        previousStabilityFingerprint: first.stabilityFingerprint,
      },
    );
    expect(expired.stabilityState).toBe("EXPIRED");
    // New token after expire rebind
    const result = recordDecisionHistory(expired, doc1, { now: later });
    expect(result.recorded).toBe(true);
    expect(result.record?.outcomeState).toBe("EXPIRED");
  });

  it("INVALIDATED recorded", () => {
    const ctx = contextFrom();
    const previous = createAmyDecision(ctx, { now: FIXED_NOW });
    const broken = {
      ...previous,
      decisionId: "",
      primaryExperience: { ...previous.primaryExperience, experienceId: "nope" },
    };
    const invalidated = stabilizeAmyDecision({
      context: ctx,
      // @ts-expect-error intentional invalid candidate
      currentDecision: broken,
      previousDecision: previous,
    });
    expect(invalidated.stabilityState).toBe("INVALIDATED");

    const result = recordDecisionHistory(invalidated, null, { now: FIXED_NOW });
    expect(result.recorded).toBe(true);
    expect(result.record?.outcomeState).toBe("INVALIDATED");
  });

  it("duplicate stabilityToken at tip prevented", () => {
    const stable = stableNew();
    const first = recordDecisionHistory(stable, null, { now: FIXED_NOW });
    const dup = recordDecisionHistory(stable, first.document, {
      now: new Date(FIXED_NOW.getTime() + 1000),
    });
    expect(dup.recorded).toBe(false);
    expect(dup.skipReason).toBe("DUPLICATE_TOKEN");
    expect(dup.document.records).toHaveLength(1);
  });

  it("findCurrentHistory / findHistoryByDecision", () => {
    const ctx = contextFrom();
    const a = recordDecisionHistory(stableNew(ctx), null, { now: FIXED_NOW });
    const altPolicy: AmyDecisionPolicy = {
      ...MVP_SPEECH_WEDGE_POLICY,
      policyVersion: "mvp_speech_wedge.v1-hist",
    };
    const later = new Date(FIXED_NOW.getTime() + 60_000);
    const replacedStable = stabilizeAmyDecision(
      {
        context: ctx,
        currentDecision: createAmyDecision(ctx, {
          now: later,
          policy: altPolicy,
        }),
        previousDecision: a.record ? createAmyDecision(ctx, { now: FIXED_NOW }) : null,
      },
      {
        now: later,
        previousStabilityFingerprint: computeStabilityFingerprint(ctx),
      },
    );
    // Ensure REPLACED path
    expect(replacedStable.stabilityState).toBe("REPLACED");
    const b = recordDecisionHistory(replacedStable, a.document, { now: later });
    expect(findCurrentHistory(b.document)?.historyId).toBe(b.record?.historyId);
    expect(findHistoryByDecision(b.document, b.record!.decisionId).length).toBeGreaterThan(0);
  });

  it("readonly records — mutation throws", () => {
    const result = recordDecisionHistory(stableNew(), null, { now: FIXED_NOW });
    expect(Object.isFrozen(result.record)).toBe(true);
    expect(() => {
      (result.record as { outcomeState: string }).outcomeState = "REPLACED";
    }).toThrow();
  });

  it("schema migration via upgradeHistoryDocument", () => {
    const empty = upgradeHistoryDocument(null, FIXED_NOW);
    expect(empty?.schemaVersion).toBe(AMY_DECISION_HISTORY_VERSION);
    expect(empty?.records).toHaveLength(0);

    const legacy = {
      schemaVersion: "amy_decision_history.v1",
      records: [],
      currentHistoryId: null,
      updatedAt: FIXED_NOW.toISOString(),
    };
    const upgraded = upgradeHistoryDocument(legacy, FIXED_NOW);
    expect(upgraded?.schemaVersion).toBe(AMY_DECISION_HISTORY_VERSION);

    expect(upgradeHistoryDocument({ schemaVersion: "other.v1" })).toBeNull();
    expect(createEmptyDecisionHistoryDocument(FIXED_NOW).records).toEqual([]);
  });

  it("local/memory adapter survives restart + helpers", () => {
    const mem = createMemoryHistoryAdapter();
    setDefaultHistoryAdapterForTests(mem);

    const result = appendDecisionHistory(stableNew(), { now: FIXED_NOW });
    expect(result.recorded).toBe(true);
    expect(getDecisionHistory().records).toHaveLength(1);
    expect(getCurrentDecisionHistory()?.historyId).toBe(result.record?.historyId);

    // Simulate restart — new adapter instance reading same in-memory doc via set
    const exported = exportDecisionHistory();
    expect(exported.document.records).toHaveLength(1);

    const restored = createMemoryHistoryAdapter(
      upgradeHistoryDocument(JSON.parse(JSON.stringify(exported.document))),
    );
    expect(restored.readDocument().records).toHaveLength(1);
    expect(restored.readDocument().records[0]?.primaryExperience.experienceId).toBe(
      AMY_EXPERIENCE.SPEECH_MISSION,
    );

    clearDecisionHistory();
    expect(getDecisionHistory().records).toHaveLength(0);
  });

  it("history never accepts raw AmyDecision — needs StableDecisionResult shape", () => {
    const ctx = contextFrom();
    const decision = createAmyDecision(ctx, { now: FIXED_NOW });
    const result = recordDecisionHistory(
      // @ts-expect-error raw decision is not StableDecisionResult
      decision,
      null,
      { now: FIXED_NOW },
    );
    expect(result.recorded).toBe(false);
    expect(result.skipReason).toBe("INVALID_STABLE");
  });
});
