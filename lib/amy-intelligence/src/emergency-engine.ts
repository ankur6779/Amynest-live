import type { EmergencyLessonResult, EmergencyType, LessonRef } from "./types.js";

/** Age-aware emergency lesson routing — deterministic, no network. */
const EMERGENCY_BY_AGE: Record<EmergencyType, Record<string, string[]>> = {
  tantrum: {
    "0-2": ["infant-colic-soothing"],
    "2-4": ["toddler-tantrums-101", "toddler-no-phase", "toddler-hitting-biting"],
    "4-6": ["early-school-emotional-regulation", "early-school-sibling-rivalry"],
    "5-7": ["early-school-emotional-regulation", "early-school-sibling-rivalry"],
    "6-8": ["early-school-emotional-regulation", "early-school-bullying"],
    "8-10": ["tween-sibling-fights", "tween-talking-to-them"],
    "10+": ["teen-brain-101", "teen-staying-connected"],
  },
  sleep: {
    "0-2": ["infant-sleep-foundations", "infant-safe-sleep-environment", "infant-colic-soothing"],
    "2-4": ["toddler-routines-transitions", "toddler-screen-time"],
    "4-6": ["early-school-emotional-regulation"],
    "5-7": ["early-school-emotional-regulation", "health-digital-eyes-posture"],
    "6-8": ["health-digital-eyes-posture", "early-school-exam-anxiety"],
    "8-10": ["tween-screen-balance", "tween-exam-stress"],
    "10+": ["teen-social-media", "teen-brain-101"],
  },
  crying: {
    "0-2": ["infant-colic-soothing", "infant-when-to-call-doctor", "infant-feeding-cues"],
    "2-4": ["toddler-tantrums-101", "toddler-hitting-biting"],
    "4-6": ["early-school-emotional-regulation"],
    "5-7": ["early-school-emotional-regulation"],
    "6-8": ["early-school-emotional-regulation"],
    "8-10": ["tween-talking-to-them"],
    "10+": ["teen-staying-connected", "teen-mental-health-signs"],
  },
};

const FALLBACK_AGE = "2-4";

function resolveAgeKey(age: string | null | undefined): string {
  if (!age) return FALLBACK_AGE;
  if (EMERGENCY_BY_AGE.tantrum[age]) return age;
  if (age === "4-6" || age === "6-8") return age;
  return FALLBACK_AGE;
}

export function getEmergencyLesson(
  type: EmergencyType,
  age: string | null | undefined,
  lessons: LessonRef[],
): EmergencyLessonResult | null {
  const ageKey = resolveAgeKey(age);
  const candidates = EMERGENCY_BY_AGE[type][ageKey] ?? EMERGENCY_BY_AGE[type][FALLBACK_AGE] ?? [];
  const byId = new Map(lessons.map((l) => [l.id, l]));

  for (const id of candidates) {
    if (byId.has(id)) {
      return { lessonId: id, reason: `emergency_${type}` };
    }
  }

  const fallback = lessons.find((l) => l.tier === "quick") ?? lessons[0];
  return fallback ? { lessonId: fallback.id, reason: `emergency_${type}_fallback` } : null;
}
