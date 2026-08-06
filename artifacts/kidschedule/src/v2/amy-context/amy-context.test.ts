import { afterEach, describe, expect, it } from "vitest";
import {
  AMY_MEMORY_SCHEMA_VERSION,
  clearAmyMemoryForTests,
  createEmptyAmyMemory,
  ensureAmyMemory,
  updateAmyMemory,
  type AmyMemoryDocument,
  type AmyMemoryMutable,
} from "@/v2/amy-memory";
import { computeContextVersion } from "@/v2/amy-memory/context-version";
import {
  compareAmyContexts,
  getAmyContextSnapshot,
  resolveAmyContext,
  validateAmyContext,
} from "./index";
import { freezeDeep } from "./freeze";

function finalize(doc: AmyMemoryMutable): AmyMemoryDocument {
  doc.contextVersion = computeContextVersion(doc as AmyMemoryDocument);
  return freezeDeep(JSON.parse(JSON.stringify(doc)) as AmyMemoryDocument);
}

function memoryFixture(
  mutate?: (doc: AmyMemoryMutable) => void,
): AmyMemoryDocument {
  const doc = createEmptyAmyMemory({ guestId: "guest-ctx-1" });
  mutate?.(doc);
  return finalize(doc);
}

/** Local noon — avoids UTC/local dateKey flake. */
const FIXED_NOW = new Date(2026, 7, 2, 12, 0, 0);

function localDateKey(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

describe("Amy Context resolver (Sprint A2)", () => {
  afterEach(() => {
    clearAmyMemoryForTests();
    localStorage.clear();
  });

  it("is deterministic — same Memory → same Context (ignoring generatedAt)", () => {
    const memory = memoryFixture((d) => {
      d.child.displayName = "Asha";
      d.challenge.worryId = "behavior";
    });
    const a = resolveAmyContext(memory, { now: FIXED_NOW });
    const b = resolveAmyContext(memory, { now: FIXED_NOW });
    expect(a).toEqual(b);
    expect(validateAmyContext(a).ok).toBe(true);
  });

  it("produces deep readonly output", () => {
    const ctx = resolveAmyContext(memoryFixture(), { now: FIXED_NOW });
    expect(Object.isFrozen(ctx)).toBe(true);
    expect(Object.isFrozen(ctx.capabilities)).toBe(true);
    expect(() => {
      (ctx.capabilities as { isGuest: boolean }).isGuest = false;
    }).toThrow();
  });

  it("resolves guest identity and capabilities", () => {
    const ctx = resolveAmyContext(memoryFixture(), { now: FIXED_NOW });
    expect(ctx.identity.mode).toBe("guest");
    expect(ctx.capabilities.isGuest).toBe(true);
    expect(ctx.capabilities.isSignedIn).toBe(false);
    expect(ctx.meta.resolverVersion).toBe("amy_context.v1");
    expect(ctx.meta.memoryVersion).toBe(AMY_MEMORY_SCHEMA_VERSION);
    expect(ctx.meta.contextVersion).toBe(ctx.memory.memoryContextVersion);
  });

  it("resolves signed-in identity", () => {
    const memory = memoryFixture((d) => {
      d.identity.mode = "signed_in";
      d.identity.userId = "user-9";
      d.child.childId = "child-1";
    });
    const ctx = resolveAmyContext(memory, { now: FIXED_NOW });
    expect(ctx.capabilities.isSignedIn).toBe(true);
    expect(ctx.capabilities.isGuest).toBe(false);
    expect(ctx.identity.userId).toBe("user-9");
    expect(ctx.child.childId).toBe("child-1");
  });

  it("resolves prepared coach + hasPreparedPlan / hasCoachJourney", () => {
    const memory = memoryFixture((d) => {
      d.coach.status = "prepared";
      d.coach.prepared = {
        goalId: "toddler-tantrums",
        goalTitle: "Toddler Tantrums",
        categoryId: "toddler-behavior",
        worryId: "behavior",
        challengeLabel: "Behaviour",
        preparedAt: "2026-08-01T00:00:00.000Z",
        gateDismissed: false,
      };
      d.coach.goalId = "toddler-tantrums";
    });
    const ctx = resolveAmyContext(memory, { now: FIXED_NOW });
    expect(ctx.capabilities.hasPreparedPlan).toBe(true);
    expect(ctx.capabilities.hasCoachJourney).toBe(true);
    expect(ctx.journey.preparedGoalId).toBe("toddler-tantrums");
    expect(ctx.coach.prepared?.goalId).toBe("toddler-tantrums");
  });

  it("resolves completed mission today", () => {
    const day = localDateKey(FIXED_NOW);
    const memory = memoryFixture((d) => {
      d.mission.missionId = "speech_name_three";
      d.mission.dateKey = day;
      d.mission.completedAt = FIXED_NOW.toISOString();
      d.speech.todayMissionStatus = "completed";
    });
    const ctx = resolveAmyContext(memory, { now: FIXED_NOW });
    expect(ctx.capabilities.hasCompletedMissionToday).toBe(true);

    const yesterday = resolveAmyContext(memory, {
      now: new Date(2026, 7, 1, 12, 0, 0),
    });
    expect(yesterday.capabilities.hasCompletedMissionToday).toBe(false);
  });

  it("resolves speech concern from worryId only", () => {
    const speech = resolveAmyContext(
      memoryFixture((d) => {
        d.challenge.worryId = "speech_talking";
      }),
      { now: FIXED_NOW },
    );
    expect(speech.capabilities.hasSpeechConcern).toBe(true);

    const behavior = resolveAmyContext(
      memoryFixture((d) => {
        d.challenge.worryId = "behavior";
      }),
      { now: FIXED_NOW },
    );
    expect(behavior.capabilities.hasSpeechConcern).toBe(false);
  });

  it("ignores merge audit for capabilities — only exposes audit in memory metadata", () => {
    const memory = memoryFixture((d) => {
      d.identity.mode = "guest";
      d.merge.guestId = "guest-ctx-1";
      d.merge.accountId = "user-should-not-flip-signed-in";
      d.merge.mergeVersion = 3;
      d.merge.mergeReason = "soft_save_claim";
      d.merge.lastMergedAt = "2026-08-02T08:00:00.000Z";
    });
    const ctx = resolveAmyContext(memory, { now: FIXED_NOW });
    expect(ctx.capabilities.isSignedIn).toBe(false);
    expect(ctx.capabilities.isGuest).toBe(true);
    expect(ctx.memory.merge.accountId).toBe("user-should-not-flip-signed-in");
    expect(ctx.memory.merge.mergeVersion).toBe(3);
  });

  it("changed Memory → expected Context diff", () => {
    const beforeMem = memoryFixture((d) => {
      d.child.displayName = "Before";
      d.challenge.worryId = "sleep";
    });
    const afterMem = memoryFixture((d) => {
      d.child.displayName = "After";
      d.challenge.worryId = "behavior";
      d.coach.status = "prepared";
      d.coach.prepared = {
        goalId: "manage-tantrums",
        goalTitle: "Manage Tantrums",
        categoryId: "behavior",
        worryId: "behavior",
        challengeLabel: "Behaviour",
        preparedAt: "2026-08-02T00:00:00.000Z",
        gateDismissed: true,
      };
    });
    const before = resolveAmyContext(beforeMem, { now: FIXED_NOW });
    const after = resolveAmyContext(afterMem, { now: FIXED_NOW });
    const diff = compareAmyContexts(before, after);
    const paths = diff.map((d) => d.path);
    expect(paths.some((p) => p.includes("child.displayName"))).toBe(true);
    expect(paths.some((p) => p.includes("challenge.worryId"))).toBe(true);
    expect(paths.some((p) => p.includes("capabilities.hasPreparedPlan"))).toBe(
      true,
    );
  });

  it("schema migration compatibility — accepts current Memory schemaVersion", () => {
    const memory = memoryFixture();
    expect(memory.schemaVersion).toBe(2);
    const ctx = resolveAmyContext(memory, { now: FIXED_NOW });
    expect(ctx.meta.memoryVersion).toBe(2);
    expect(ctx.meta.policyCompatibility).toContain("amy_decision.v1");
    expect(validateAmyContext(ctx).ok).toBe(true);
  });

  it("contains zero shell / Hero / visibility fields", () => {
    const ctx = resolveAmyContext(memoryFixture(), { now: FIXED_NOW });
    expect("today" in ctx).toBe(false);
    expect("askAmy" in ctx).toBe(false);
    expect("forChild" in ctx).toBe(false);
    expect("hero" in ctx).toBe(false);
    expect("visibility" in ctx).toBe(false);
    expect(JSON.stringify(ctx).toLowerCase()).not.toContain("primaryexperience");
  });

  it("getAmyContextSnapshot returns null without Memory and resolves with Memory", () => {
    expect(getAmyContextSnapshot({ now: FIXED_NOW })).toBeNull();
    ensureAmyMemory();
    updateAmyMemory(
      { child: { displayName: "Snap" } },
      { source: "test" },
    );
    const snap = getAmyContextSnapshot({ now: FIXED_NOW });
    expect(snap?.child.displayName).toBe("Snap");
  });

  it("premium capabilities stay false until Memory carries premium facts", () => {
    const ctx = resolveAmyContext(memoryFixture(), { now: FIXED_NOW });
    expect(ctx.capabilities.premiumEligible).toBe(false);
    expect(ctx.capabilities.premiumUnlocked).toBe(false);
  });
});
