/**
 * Continuous Optimization — Long-term family journey.
 *
 * Generates rare, emotionally warm yearly summaries, milestone timelines,
 * "learning memories", and consistency highlights. Sits on top of:
 *   - growth-arc.ts (monthly snapshots)
 *   - family-milestones.ts (rare moments)
 *
 * Rules:
 *  - Output is rare and meaningful — never a daily card.
 *  - Copy is parent-shareable but never compares children to others.
 *  - Pure derivation from existing snapshots + milestones.
 */

import type { GrowthArcSnapshot } from "./growth-arc";
import type { FamilyMilestone } from "./family-milestones";

export interface LearningMemoryMoment {
  /** Month label, e.g. "2026-03". */
  dateLabel: string;
  emoji: string;
  title: string;
  message: string;
}

export interface FamilyJourneyHighlight {
  category: "consistency" | "growth" | "comeback" | "skill";
  emoji: string;
  title: string;
  message: string;
}

export interface FamilyJourneySummary {
  /** Period this summary covers, e.g. "2026". */
  periodLabel: string;
  /** Headline that bookmarks the year. */
  headline: string;
  /** Subline used under the headline. */
  subline: string;
  /** Curated memories — at most 6. */
  memories: LearningMemoryMoment[];
  /** Curated highlights — at most 4. */
  highlights: FamilyJourneyHighlight[];
  /** Closing warm note. */
  closing: string;
}

export interface FamilyJourneyInput {
  snapshots: GrowthArcSnapshot[];
  milestones: FamilyMilestone[];
  childName?: string;
  periodLabel: string;
}

const NAME = (n?: string) => (n && n.trim() ? n : "your child");

/**
 * Build a yearly (or otherwise long-period) family journey summary.
 * Returns `null` when there's not enough signal to be meaningful (< 2
 * snapshots and < 1 milestone).
 */
export function buildFamilyJourney(input: FamilyJourneyInput): FamilyJourneySummary | null {
  if (input.snapshots.length < 2 && input.milestones.length === 0) return null;

  const name = NAME(input.childName);
  const sorted = [...input.snapshots].sort((a, b) => a.month.localeCompare(b.month));

  const memories: LearningMemoryMoment[] = [];
  for (const m of input.milestones.slice(0, 6)) {
    memories.push({
      dateLabel: input.periodLabel,
      emoji: m.emoji,
      title: m.title,
      message: m.message,
    });
  }

  const highlights: FamilyJourneyHighlight[] = [];

  // ── Consistency highlight ──
  const activeMonths = sorted.filter((s) => s.activitiesCompleted > 0).length;
  if (activeMonths >= 6) {
    highlights.push({
      category: "consistency",
      emoji: "📅",
      title: `${activeMonths} months of rhythm`,
      message: `Steady learning shown up across most of the year — the quiet kind of magic.`,
    });
  } else if (activeMonths >= 3) {
    highlights.push({
      category: "consistency",
      emoji: "🌱",
      title: `${activeMonths} months of learning`,
      message: `${name} kept returning, gently. That's how confidence quietly builds.`,
    });
  }

  // ── Growth highlight ──
  if (sorted.length >= 2) {
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    const masteryDelta = last.masteryScore - first.masteryScore;
    if (masteryDelta >= 15) {
      highlights.push({
        category: "growth",
        emoji: "🌟",
        title: "Real growth, gently earned",
        message: `${name}'s mastery grew steadily across the year — a beautiful arc.`,
      });
    }
  }

  // ── Comeback highlight ──
  const inactiveMonths = sorted.filter((s) => s.activitiesCompleted === 0).length;
  const hasComebackMilestone = input.milestones.some((m) => m.id === "comeback_recovery");
  if (inactiveMonths >= 1 && hasComebackMilestone) {
    highlights.push({
      category: "comeback",
      emoji: "🌈",
      title: "A warm return",
      message: `Life paused — and ${name} came back. That return is worth honoring.`,
    });
  }

  // ── Skill highlight (mastered-skill growth across the period) ──
  if (sorted.length >= 2) {
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    const masteredDelta = last.masteredSkills - first.masteredSkills;
    if (masteredDelta >= 3) {
      highlights.push({
        category: "skill",
        emoji: "🪄",
        title: "A wider skill map",
        message: `${name}'s skills opened up — quietly, day by day.`,
      });
    }
  }

  return {
    periodLabel: input.periodLabel,
    headline: `${name}'s ${input.periodLabel} learning year`,
    subline:
      "A year of small, steady, beautiful moments. Nothing loud — just real, gentle growth.",
    memories,
    highlights: highlights.slice(0, 4),
    closing: `Thank you for being the calm rhythm behind ${name}'s growth.`,
  };
}
