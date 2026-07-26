/**
 * Deterministic age-band mapping → developmental stage capabilities.
 */

import type { AgeStage, AgeStageId } from "./types.js";

const STAGES: AgeStage[] = [
  {
    id: "infant_0_6",
    label: "0–6 months",
    ageMonthsMin: 0,
    ageMonthsMax: 5,
    capabilities: [
      "co-regulation with caregiver",
      "sensory exploration",
      "feeding and sleep rhythm building",
      "social smiling and gaze",
    ],
  },
  {
    id: "infant_6_12",
    label: "6–12 months",
    ageMonthsMin: 6,
    ageMonthsMax: 11,
    capabilities: [
      "object permanence emerging",
      "mobility beginnings",
      "babble and joint attention",
      "separation awareness",
    ],
  },
  {
    id: "toddler_1_2",
    label: "1–2 years",
    ageMonthsMin: 12,
    ageMonthsMax: 23,
    capabilities: [
      "first words and gestures",
      "parallel play",
      "gross motor practice",
      "simple routines with cues",
    ],
  },
  {
    id: "toddler_2_3",
    label: "2–3 years",
    ageMonthsMin: 24,
    ageMonthsMax: 35,
    capabilities: [
      "language burst",
      "autonomy seeking",
      "pretend play beginnings",
      "emotion naming with support",
    ],
  },
  {
    id: "preschool_3_5",
    label: "3–5 years",
    ageMonthsMin: 36,
    ageMonthsMax: 59,
    capabilities: [
      "cooperative play",
      "story comprehension",
      "early self-help skills",
      "imaginative creativity",
    ],
  },
  {
    id: "school_5_8",
    label: "5–8 years",
    ageMonthsMin: 60,
    ageMonthsMax: 95,
    capabilities: [
      "structured learning readiness",
      "friendship skills",
      "focus with short blocks",
      "rule-based games",
    ],
  },
  {
    id: "school_8_12",
    label: "8–12 years",
    ageMonthsMin: 96,
    ageMonthsMax: 143,
    capabilities: [
      "longer attention windows",
      "peer belonging",
      "project-based learning",
      "growing independence",
    ],
  },
  {
    id: "teen_12_18",
    label: "12–18 years",
    ageMonthsMin: 144,
    ageMonthsMax: 216,
    capabilities: [
      "identity exploration",
      "abstract reasoning",
      "peer influence navigation",
      "self-advocacy practice",
    ],
  },
];

export function ageMonthsFromBirthDate(
  birthDate: string,
  asOfDate?: string | null,
): number {
  const birth = parseYmd(birthDate);
  const asOf = asOfDate ? parseYmd(asOfDate) : utcToday();
  if (!birth || !asOf) return 0;
  let months =
    (asOf.y - birth.y) * 12 + (asOf.m - birth.m);
  if (asOf.d < birth.d) months -= 1;
  return Math.max(0, months);
}

export function resolveAgeStage(ageMonths: number): AgeStage {
  const m = Math.max(0, Math.floor(ageMonths));
  for (const stage of STAGES) {
    if (m >= stage.ageMonthsMin && m <= stage.ageMonthsMax) {
      return stage;
    }
  }
  // Clamp older teens / adults to final band (still deterministic).
  return STAGES[STAGES.length - 1]!;
}

export function stageIdForAgeMonths(ageMonths: number): AgeStageId {
  return resolveAgeStage(ageMonths).id;
}

export function listAgeStages(): readonly AgeStage[] {
  return STAGES;
}

function parseYmd(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim());
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

function utcToday(): { y: number; m: number; d: number } {
  const n = new Date();
  return {
    y: n.getUTCFullYear(),
    m: n.getUTCMonth() + 1,
    d: n.getUTCDate(),
  };
}
