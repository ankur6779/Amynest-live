/**
 * Continuous Optimization — Real learning effectiveness.
 *
 * Measures *actual learning improvement*, not engagement. Pure derivation
 * from the existing `SkillGraphEntry[]` history — no new state.
 *
 * Signals tracked:
 *  - retention after N days (mastered skills that didn't decay)
 *  - forgotten-skill recovery (skills that re-mastered after a gap)
 *  - mastery stability (low variance across repeated attempts)
 *  - long-term confidence growth (trend across snapshots)
 *  - transfer learning (related skill bumps after target practice)
 */

import type { SkillGraphEntry } from "./skill-graph";

export interface SkillSnapshot {
  /** ISO date (YYYY-MM-DD). */
  dateIso: string;
  entries: Pick<
    SkillGraphEntry,
    "skillId" | "category" | "mastery" | "confidence" | "attempts" | "progressionStage" | "relatedSkills"
  >[];
}

export interface LearningEffectivenessReport {
  /** 0..1 — fraction of mastered skills that stayed mastered ≥ 14d ago. */
  retentionRate: number;
  /** Count of skills recovered after a forgotten gap. */
  recoveredSkills: number;
  /** 0..1 — high when mastery is stable across recent attempts. */
  masteryStability: number;
  /** -1..1 — trend in average confidence across snapshots. */
  confidenceTrend: number;
  /** Number of related skills that bumped after the focus skill was practiced. */
  transferSignals: number;
  /** Convenience label for dashboards. */
  label: "growing" | "steady" | "watch" | "no_signal";
}

/** Days a skill must remain above mastery threshold to count as "retained". */
const RETENTION_DAYS = 14;
const MASTERED_THRESHOLD = 80;

function dayDiff(a: string, b: string): number {
  const ta = Date.parse(`${a}T00:00:00Z`);
  const tb = Date.parse(`${b}T00:00:00Z`);
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return 0;
  return Math.round((tb - ta) / 86_400_000);
}

/**
 * Compute the effectiveness report from a sorted (oldest → newest) list of
 * weekly/monthly skill snapshots. At least 2 snapshots are needed to detect
 * trends; otherwise the report degrades gracefully.
 */
export function buildLearningEffectiveness(
  snapshots: SkillSnapshot[],
): LearningEffectivenessReport {
  if (snapshots.length === 0) {
    return {
      retentionRate: 0,
      recoveredSkills: 0,
      masteryStability: 0,
      confidenceTrend: 0,
      transferSignals: 0,
      label: "no_signal",
    };
  }

  const sorted = [...snapshots].sort((a, b) => a.dateIso.localeCompare(b.dateIso));
  const newest = sorted[sorted.length - 1]!;

  // ── Retention ──
  // A skill is "retained" if it was mastered ≥ RETENTION_DAYS ago AND
  // remains mastered in the newest snapshot.
  let retainedCount = 0;
  let masteredHistorical = 0;
  for (const snap of sorted) {
    if (dayDiff(snap.dateIso, newest.dateIso) < RETENTION_DAYS) continue;
    for (const e of snap.entries) {
      if (e.mastery < MASTERED_THRESHOLD) continue;
      masteredHistorical += 1;
      const stillMastered = newest.entries.find(
        (n) => n.skillId === e.skillId && n.mastery >= MASTERED_THRESHOLD,
      );
      if (stillMastered) retainedCount += 1;
    }
  }
  const retentionRate = masteredHistorical > 0 ? retainedCount / masteredHistorical : 0;

  // ── Recovered skills ──
  // A skill counts as recovered if it was *forgotten* (low mastery in a mid
  // snapshot) and then re-mastered in the newest one.
  let recoveredSkills = 0;
  if (sorted.length >= 3) {
    const earliest = sorted[0]!;
    const middleEntries = new Map<string, number>();
    for (let i = 1; i < sorted.length - 1; i++) {
      for (const e of sorted[i]!.entries) {
        const prev = middleEntries.get(e.skillId);
        if (prev == null || e.mastery < prev) middleEntries.set(e.skillId, e.mastery);
      }
    }
    for (const e of earliest.entries) {
      if (e.mastery < MASTERED_THRESHOLD) continue;
      const dip = middleEntries.get(e.skillId);
      if (dip != null && dip < 50) {
        const current = newest.entries.find((n) => n.skillId === e.skillId);
        if (current && current.mastery >= MASTERED_THRESHOLD) {
          recoveredSkills += 1;
        }
      }
    }
  }

  // ── Mastery stability ──
  // For each skill present in newest, look at the spread of mastery across
  // its appearances; low spread = stable.
  let stabilitySum = 0;
  let stabilityCount = 0;
  for (const cur of newest.entries) {
    const values: number[] = [];
    for (const snap of sorted) {
      const m = snap.entries.find((e) => e.skillId === cur.skillId);
      if (m) values.push(m.mastery);
    }
    if (values.length >= 2) {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance =
        values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / values.length;
      const stddev = Math.sqrt(variance);
      // 0..1, where 0 stddev → 1 stability, 50 stddev → 0 stability.
      stabilitySum += Math.max(0, 1 - stddev / 50);
      stabilityCount += 1;
    }
  }
  const masteryStability = stabilityCount > 0 ? stabilitySum / stabilityCount : 0;

  // ── Confidence trend ──
  // Slope of avg confidence across snapshots, normalized to -1..1.
  let confidenceTrend = 0;
  if (sorted.length >= 2) {
    const avgs = sorted.map((s) => {
      if (s.entries.length === 0) return 0;
      const sum = s.entries.reduce((a, e) => a + e.confidence, 0);
      return sum / s.entries.length;
    });
    const first = avgs[0]!;
    const last = avgs[avgs.length - 1]!;
    confidenceTrend = Math.max(-1, Math.min(1, (last - first) / 100));
  }

  // ── Transfer signals ──
  // For each newest entry that improved vs first, count related skills that
  // also improved.
  let transferSignals = 0;
  if (sorted.length >= 2) {
    const first = sorted[0]!;
    for (const cur of newest.entries) {
      const prev = first.entries.find((e) => e.skillId === cur.skillId);
      if (!prev) continue;
      if (cur.mastery <= prev.mastery + 5) continue;
      for (const rel of cur.relatedSkills ?? []) {
        const prevRel = first.entries.find((e) => e.skillId === rel);
        const curRel = newest.entries.find((e) => e.skillId === rel);
        if (prevRel && curRel && curRel.mastery > prevRel.mastery + 5) {
          transferSignals += 1;
        }
      }
    }
  }

  // ── Label ──
  let label: LearningEffectivenessReport["label"] = "no_signal";
  if (newest.entries.length === 0) label = "no_signal";
  else if (
    confidenceTrend >= 0.1 &&
    (retentionRate >= 0.6 || masteryHistoricalGate(masteredHistorical))
  ) {
    label = "growing";
  } else if (retentionRate < 0.4 && masteredHistorical >= 3) {
    label = "watch";
  } else if (confidenceTrend < -0.1) {
    label = "watch";
  } else {
    label = "steady";
  }

  return {
    retentionRate,
    recoveredSkills,
    masteryStability,
    confidenceTrend,
    transferSignals,
    label,
  };
}

function masteryHistoricalGate(count: number): boolean {
  return count <= 2;
}
