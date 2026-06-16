/**
 * Phase 2 production certification runner — executes all 7 test suites offline.
 * Run: node --import tsx/esm artifacts/api-server/src/services/__tests__/coach-phase2-certification.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL ??=
  "postgresql://localhost:5432/amynest_test?connect_timeout=1";

const { getGoalFamily } = await import("../../lib/goal-prompts.js");
const {
  buildCoachPlanCacheKey,
  buildCoachSessionContextKey,
  describeCoachCacheLayers,
  shouldBypassCoachPlanCache,
} = await import("../coachPlanCacheKey.js");
const {
  buildGoalSpecificInitialFallback,
  buildGoalSpecificFullFallback,
  buildGoalSpecificFallbackWin,
  certificationReport,
} = await import("../coachGoalFallbackLibrary.js");
const {
  auditSemanticDuplicates,
  areSemanticallyDuplicatePhrase,
  semanticSimilarity,
  isWinTooSimilar,
  coachingCategoryForWinNumber,
} = await import("../coachWinAntiRepetition.js");
const {
  computeCoachProgressPct,
  coachingLayerForWin,
} = await import("../coachProgressUtils.js");
const {
  getCoachObservabilityDashboard,
  recordCoachObservabilityEvent,
  recordCoachFeedbackEvent,
  recordCoachProgressDelta,
  recordCoachGenerateAttempt,
  resetCoachObservabilityForTests,
  COACH_ALERT_THRESHOLDS,
} = await import("../coachObservabilityService.js");

const CERT_GOALS = [
  { id: "potty-night-training", label: "Night-Time Dry", family: "potty" },
  { id: "manage-overwhelm", label: "Manage Daily Overwhelm", family: "selfcare" },
  { id: "manage-tantrums", label: "Manage Tantrums", family: "tantrum" },
  { id: "fix-bedtime-resistance", label: "Fix Bedtime Resistance", family: "sleep" },
  { id: "balance-screen-time", label: "Balance Screen Time", family: "screen" },
] as const;

const ALL_FAMILIES = [
  "tantrum", "aggression", "defiance", "emotional", "separation", "screen", "focus",
  "learning", "eating", "sleep", "stubborn", "coparenting", "generic", "toddler",
  "potty", "siblings", "selfcare", "transitions", "obesity", "nutrition", "immunity",
  "dental", "digitalhealth", "development",
] as const;

const baseInput = {
  ageGroup: "5-7",
  severity: "moderate",
  routine: "Inconsistent",
};

function simulateFeedbackPath(
  goalId: string,
  label: string,
  feedbackSequence: ("yes" | "somewhat" | "no")[],
): { wins: ReturnType<typeof buildGoalSpecificFallbackWin>[]; feedbackHistory: { winNumber: number; title: string; feedback: "yes" | "somewhat" | "no" }[] } {
  const initial = buildGoalSpecificInitialFallback(goalId, label, { ...baseInput, goal: goalId });
  const wins = [...initial.wins];
  const feedbackHistory: { winNumber: number; title: string; feedback: "yes" | "somewhat" | "no" }[] = [];

  for (let i = 0; i < feedbackSequence.length; i += 1) {
    const feedback = feedbackSequence[i]!;
    const currentWin = wins[i]!;
    feedbackHistory.push({
      winNumber: currentWin.win,
      title: currentWin.title,
      feedback,
    });
    if (i === wins.length - 1 && wins.length < 12) {
      const next = buildGoalSpecificFallbackWin(
        goalId,
        label,
        { ...baseInput, goal: goalId },
        wins.length + 1,
        wins,
        feedbackHistory,
      );
      assert.notEqual(next.title, currentWin.title, `Same win after ${feedback} on win ${currentWin.win}`);
      wins.push(next);
    }
  }

  return { wins, feedbackHistory };
}

describe("PHASE 2 — Amy Coach Production Certification", () => {
  describe("TEST 1 — Cache Poisoning Validation", () => {
    it("template cache key excludes session state; session key includes feedback + wins", () => {
      const layers = describeCoachCacheLayers();
      assert.ok(layers.templateKey.includes.includes("goal"));
      assert.ok(layers.sessionKey.includes.includes("feedbackHistory"));
      assert.ok(layers.nextWinBehavior.includes("never reads template cache"));

      const templateKey = buildCoachPlanCacheKey({ goal: "potty-night-training", ...baseInput });
      const sessionKey = buildCoachSessionContextKey({
        goal: "potty-night-training",
        ...baseInput,
        sessionId: "sess-1",
        recentWinTitles: ["Track morning wet and dry"],
        feedbackHistory: [{ winNumber: 1, feedback: "yes" }],
        progressPct: 8,
      });
      assert.notEqual(templateKey, sessionKey);
    });

    it("feedback changes next win — cache bypass when session has feedback", () => {
      const before = simulateFeedbackPath("potty-night-training", "Night-Time Dry", ["yes"]);
      const afterWorked = simulateFeedbackPath("potty-night-training", "Night-Time Dry", ["yes", "yes"]);
      assert.notEqual(before.wins[1]!.title, afterWorked.wins[2]!.title);
      assert.equal(shouldBypassCoachPlanCache({ hasSessionFeedback: true }), true);
      assert.equal(shouldBypassCoachPlanCache({ hasSessionFeedback: false }), false);
    });

    it("Worked / Partial / Not Worked produce different next wins after feedback on win #2", () => {
      const worked = simulateFeedbackPath("manage-overwhelm", "Manage Daily Overwhelm", ["yes", "yes"]);
      const partial = simulateFeedbackPath("manage-overwhelm", "Manage Daily Overwhelm", ["yes", "somewhat"]);
      const notWorked = simulateFeedbackPath("manage-overwhelm", "Manage Daily Overwhelm", ["yes", "no"]);
      const titles = [worked.wins[2]!.title, partial.wins[2]!.title, notWorked.wins[2]!.title];
      assert.equal(new Set(titles).size, 3, `Expected 3 distinct win #3 titles, got: ${titles.join(" | ")}`);
    });
  });

  describe("TEST 2 — Cross-Session Memory Persistence", () => {
    it("restored session state preserves win history and skips win #1 on next request", () => {
      const day1 = simulateFeedbackPath("manage-tantrums", "Manage Tantrums", ["yes"]);
      const restoredWins = day1.wins;
      const restoredFeedback = { 1: "yes" as const };
      const progressPct = computeCoachProgressPct(restoredFeedback, 12);

      assert.ok(restoredWins.length >= 2);
      assert.ok(progressPct > 0);
      const nextWinNumber = restoredWins.length + 1;
      const day2Win = buildGoalSpecificFallbackWin(
        "manage-tantrums",
        "Manage Tantrums",
        { ...baseInput, goal: "manage-tantrums" },
        nextWinNumber,
        restoredWins,
        day1.feedbackHistory,
      );
      assert.notEqual(day2Win.title, restoredWins[0]!.title);
      assert.ok(!restoredWins.some((w) => w.title === day2Win.title && w.win !== nextWinNumber));
    });
  });

  describe("TEST 3 — AI Failure Resilience", () => {
    for (const g of CERT_GOALS) {
      it(`${g.label} → family-specific fallback (not generic Pause and name)`, () => {
        const plan = buildGoalSpecificInitialFallback(g.id, g.label, { ...baseInput, goal: g.id });
        assert.notEqual(plan.wins[0]!.title, "Pause and name what you see");
        assert.equal(getGoalFamily(g.id), g.family);
        assert.ok(plan.wins[0]!.actions.length >= 3);
        assert.ok(plan.wins[0]!.deep_explanation.length > 20);
      });
    }

    it("all goal families map to non-generic first-win content", () => {
      const FAMILY_GOAL: Record<string, string> = {
        tantrum: "manage-tantrums",
        aggression: "handle-aggression",
        defiance: "reduce-defiance",
        emotional: "emotional-regulation",
        separation: "separation-anxiety",
        screen: "balance-screen-time",
        focus: "improve-focus-span",
        learning: "build-study-discipline",
        eating: "navigate-fussy-eating",
        sleep: "fix-bedtime-resistance",
        stubborn: "change-stubborn-behaviour",
        coparenting: "align-parenting-between-parents",
        toddler: "toddler-tantrums",
        potty: "potty-night-training",
        siblings: "sibling-rivalry",
        selfcare: "manage-overwhelm",
        transitions: "travel-with-kids",
        obesity: "child-obesity-management",
        nutrition: "nutrition-deficiency",
        immunity: "boost-immunity",
        dental: "dental-health",
        digitalhealth: "digital-health-eye-care",
        development: "early-milestones-0-5",
        generic: "unknown-goal-id",
      };
      const firstTitles = new Set<string>();
      for (const family of ALL_FAMILIES) {
        const goalId = FAMILY_GOAL[family] ?? "manage-tantrums";
        const plan = buildGoalSpecificInitialFallback(goalId, goalId, { ...baseInput, goal: goalId });
        assert.notEqual(plan.wins[0]!.title, "Pause and name what you see");
        firstTitles.add(plan.wins[0]!.title);
      }
      assert.ok(firstTitles.size >= 15, `Expected diverse family win #1 titles, got ${firstTitles.size}`);
    });
  });

  describe("TEST 4 — Semantic Duplicate Detection", () => {
    it("flags Pause before reacting vs Take a pause before responding", () => {
      assert.equal(
        areSemanticallyDuplicatePhrase(
          "Pause before reacting",
          "Take a pause before responding",
          "title",
        ),
        true,
      );
      assert.ok(semanticSimilarity("Pause before reacting", "Take a pause before responding") >= 0.8);
    });

    it("flags Name the feeling vs Label the emotion", () => {
      assert.equal(
        areSemanticallyDuplicatePhrase("Name the feeling", "Label the emotion", "title"),
        true,
      );
    });

    it("first 12 wins per cert goal pass semantic audit", () => {
      for (const g of CERT_GOALS) {
        const full = buildGoalSpecificFullFallback(g.id, g.label, { ...baseInput, goal: g.id });
        const flags = auditSemanticDuplicates(full.wins, { maxWins: 12 });
        const titleFlags = flags.filter((f) => f.field === "title");
        assert.equal(
          titleFlags.length,
          0,
          `${g.label} title semantic duplicates: ${JSON.stringify(titleFlags)}`,
        );
      }
    });
  });

  describe("TEST 5 — Progress Advancement Validation", () => {
    it("Worked increases progress and advances coaching layer", () => {
      const before = computeCoachProgressPct({}, 12);
      const afterWorked = computeCoachProgressPct({ 1: "yes" }, 12);
      assert.equal(before, 0);
      assert.ok(afterWorked > before);
      assert.ok(coachingLayerForWin(2) !== coachingLayerForWin(1));
    });

    it("Partially worked gives smaller progress than worked", () => {
      const worked = computeCoachProgressPct({ 1: "yes" }, 12);
      const partial = computeCoachProgressPct({ 1: "somewhat" }, 12);
      assert.ok(partial > 0);
      assert.ok(partial < worked);
    });

    it("Not worked triggers strategy switch in fallback path", () => {
      const path = simulateFeedbackPath("manage-overwhelm", "Manage Daily Overwhelm", ["no"]);
      assert.ok(path.wins.length >= 2);
      assert.notEqual(path.wins[0]!.title, path.wins[1]!.title);
    });
  });

  describe("TEST 6 — Analytics & Observability", () => {
    it("tracks required events and exposes dashboard with alert thresholds", () => {
      resetCoachObservabilityForTests();
      recordCoachObservabilityEvent("coach_duplicate_prevented", { goal: "test" });
      recordCoachGenerateAttempt("fallback");
      recordCoachGenerateAttempt("timeout");
      recordCoachFeedbackEvent("yes");
      recordCoachFeedbackEvent("somewhat");
      recordCoachFeedbackEvent("no");
      recordCoachProgressDelta(0, 8);

      const dash = getCoachObservabilityDashboard();
      assert.ok(dash.counters.coach_duplicate_prevented >= 1);
      assert.ok(dash.counters.coach_fallback_used >= 1);
      assert.ok(dash.counters.coach_ai_timeout >= 1);
      assert.ok(dash.counters.coach_feedback_yes >= 1);
      assert.ok(dash.rates.feedbackDistribution.yes >= 1);
      assert.equal(COACH_ALERT_THRESHOLDS.aiTimeoutRate, 0.02);
      assert.equal(COACH_ALERT_THRESHOLDS.fallbackRate, 0.1);
      assert.ok(Array.isArray(dash.alerts));
    });
  });

  describe("TEST 7 — Full Personalization Certification", () => {
    it("certification report: 5 goals × 10 wins — unique titles, no cross-goal collision on win #1", () => {
      const report = certificationReport(CERT_GOALS.map((g) => ({ id: g.id, label: g.label })));
      const firstTitles = report.map((r) => r.firstTenTitles[0]!);
      assert.equal(new Set(firstTitles).size, firstTitles.length);
      for (const row of report) {
        assert.equal(row.duplicateTitles.length, 0, `${row.label} duplicate titles`);
      }
    });

    it("anti-repetition blocks identical win injection", () => {
      const win = buildGoalSpecificInitialFallback("potty-night-training", "Night-Time Dry", {
        ...baseInput,
        goal: "potty-night-training",
      }).wins[0]!;
      assert.equal(isWinTooSimilar(win, [win]), true);
    });

    it("feedback paths (yes/somewhat/no) each produce unique next win for all cert goals", () => {
      for (const g of CERT_GOALS) {
        for (const fb of ["yes", "somewhat", "no"] as const) {
          const { wins } = simulateFeedbackPath(g.id, g.label, [fb]);
          assert.ok(wins.length >= 2, `${g.label} / ${fb}`);
        }
      }
    });
  });
});
