/**
 * Family insights — calm, parent-safe narratives (non-diagnostic).
 */
import type { DevelopmentalTrajectory } from "./routine-developmental-trajectory.js";
import type { PredictiveDayHints } from "./routine-predictive-context.js";
import type { PersonalizationMemory } from "./routine-personalization-memory.js";

export type FamilyInsightCategory =
  | "rhythm"
  | "energy"
  | "connection"
  | "growth"
  | "autonomy";

export type FamilyInsight = {
  id: string;
  category: FamilyInsightCategory;
  message: string;
  priority: number;
};

const BANNED_INSIGHT_RE =
  /\b(diagnos|disorder|adhd|autism|delayed|behind peers|failure|urgent|alarming)\b/i;

function safeLine(text: string): string {
  if (BANNED_INSIGHT_RE.test(text)) {
    return "Amy noticed a rhythm shift — today is paced gently to match your child.";
  }
  return text;
}

/**
 * Generate ranked family insights for parent hub / routine summary.
 */
export function generateFamilyInsights(opts: {
  trajectory: DevelopmentalTrajectory;
  hints: PredictiveDayHints;
  memory: PersonalizationMemory;
  seed?: number;
}): FamilyInsight[] {
  const { trajectory, hints, memory } = opts;
  const insights: FamilyInsight[] = [];
  const hasHistory = memory.snapshotCount >= 2;

  if (memory.snapshotCount >= 3 && memory.preferredCategories.length > 0) {
    const top = memory.preferredCategories[0]!;
    const label =
      top === "play"
        ? "active play"
        : top === "study"
          ? "learning blocks"
          : top === "rest"
            ? "calm wind-down"
            : top;
    insights.push({
      id: "memory-preferred",
      category: "rhythm",
      message: safeLine(
        `Amy noticed ${label} usually lands well — today's plan keeps that balance.`,
      ),
      priority: 75,
    });
  }

  if (trajectory.consistencyTrend === "improving" && hasHistory) {
    insights.push({
      id: "rhythm-improving",
      category: "rhythm",
      message: safeLine(
        "Daily rhythm looks steadier — Amy is keeping familiar anchors while refreshing activities.",
      ),
      priority: 80,
    });
  } else if (trajectory.consistencyTrend === "needs_support" && hasHistory) {
    insights.push({
      id: "rhythm-support",
      category: "rhythm",
      message: safeLine(
        "Rhythm has been variable — today's plan uses shorter blocks and more calm transitions.",
      ),
      priority: 90,
    });
  }

  if (hints.suggestLowEnergy || trajectory.energyStability === "needs_support") {
    insights.push({
      id: "energy-gentle",
      category: "energy",
      message: safeLine(
        "Energy has been mixed — Amy front-loaded recovery-friendly pacing for today.",
      ),
      priority: 85,
    });
  }

  if (hints.suggestConnectionFocus) {
    insights.push({
      id: "connection-focus",
      category: "connection",
      message: safeLine(
        "A little extra connection time can help reset the day — family check-ins are woven in when possible.",
      ),
      priority: 88,
    });
  }

  if (trajectory.autonomyReadiness === "improving") {
    insights.push({
      id: "autonomy-ready",
      category: "autonomy",
      message: safeLine(
        "Your child is handling routines well — independence steps are included at age-appropriate moments.",
      ),
      priority: 70,
    });
  }

  if (trajectory.dominantStrength === "movement" && trajectory.regulationTrend !== "needs_support") {
    insights.push({
      id: "growth-movement",
      category: "growth",
      message: safeLine(
        "Movement-rich days are working — Amy balances active blocks with wind-down time.",
      ),
      priority: 65,
    });
  } else if (trajectory.dominantStrength === "learning") {
    insights.push({
      id: "growth-learning",
      category: "growth",
      message: safeLine(
        "Learning blocks are landing well — study time stays clustered with breaks.",
      ),
      priority: 65,
    });
  }

  if (!insights.length) {
    insights.push({
      id: "rhythm-steady",
      category: "rhythm",
      message: safeLine(
        hasHistory
          ? "Today's plan follows your family's usual rhythm with small refreshes to keep things engaging."
          : "Amy is learning your rhythm — save a few routines and plans will feel more tailored.",
      ),
      priority: hasHistory ? 50 : 40,
    });
  }
  return insights
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);
}
