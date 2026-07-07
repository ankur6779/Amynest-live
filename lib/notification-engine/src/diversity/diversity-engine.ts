import type { HistoryEntry } from "../types.js";
import { bodySimilarity } from "../memory/anti-repetition.js";
import { daysSince } from "../personalization/context.js";

/**
 * Emotional angle of a message. Inferred cheaply from copy so we can avoid
 * hammering the same angle repeatedly (e.g. urgency every day).
 */
export type EmotionalAngle =
  | "celebration"
  | "encouragement"
  | "curiosity"
  | "urgency"
  | "guidance"
  | "reassurance"
  | "neutral";

export interface DiversityCandidate {
  category: string;
  title: string;
  body: string;
  /** Call-to-action phrase or deep-link intent. */
  cta?: string;
  emotionalAngle?: EmotionalAngle;
}

export interface DiversityAssessment {
  /** 0–100: higher = more diverse relative to recent history. */
  score: number;
  /** True when the candidate is too similar and should be rotated/rejected. */
  repetitive: boolean;
  /** Which dimensions collided. */
  collisions: Array<"category" | "cta" | "wording" | "emotional_angle">;
  /** Suggested categories to rotate toward (least recently used). */
  rotateToward: string[];
}

const ROTATION_POOL = [
  "routine",
  "learning_activity",
  "nutrition",
  "story_time",
  "phonics",
  "parenting_tips",
  "milestone",
  "engagement",
  "insights",
];

const RECENT_WINDOW_DAYS = 3;
const WORDING_SIMILARITY_THRESHOLD = 0.6;

/**
 * Score how diverse a candidate is versus recent sends across four dimensions:
 * category, CTA, wording, and emotional angle. Complements anti-repetition
 * (which handles hard topic/body blocks) by measuring softer variety and
 * recommending what to rotate toward. Pure and side-effect free.
 */
export function assessDiversity(
  candidate: DiversityCandidate,
  history: HistoryEntry[],
  now = new Date(),
): DiversityAssessment {
  const recent = history.filter((h) => daysSince(h.sentAt, now) <= RECENT_WINDOW_DAYS);
  const collisions: DiversityAssessment["collisions"] = [];
  let score = 100;

  // Category repetition within the recent window.
  const sameCategory = recent.filter((h) => h.category === candidate.category).length;
  if (sameCategory >= 2) {
    collisions.push("category");
    score -= 25 + (sameCategory - 2) * 10;
  } else if (sameCategory === 1) {
    score -= 10;
  }

  // Wording similarity against recent bodies.
  let maxSim = 0;
  for (const h of recent) {
    maxSim = Math.max(maxSim, bodySimilarity(candidate.body, h.body));
  }
  if (maxSim >= WORDING_SIMILARITY_THRESHOLD) {
    collisions.push("wording");
    score -= Math.round(maxSim * 30);
  }

  // CTA repetition (best-effort: compare title tail / cta text).
  if (candidate.cta) {
    const ctaNorm = normalize(candidate.cta);
    const ctaRepeat = recent.some((h) => normalize(h.title).includes(ctaNorm) || (h.body && normalize(h.body).includes(ctaNorm)));
    if (ctaRepeat) {
      collisions.push("cta");
      score -= 15;
    }
  }

  // Emotional angle repetition.
  const angle = candidate.emotionalAngle ?? inferEmotionalAngle(candidate.title, candidate.body);
  const recentAngles = recent.map((h) => inferEmotionalAngle(h.title, h.body));
  const sameAngle = recentAngles.filter((x) => x === angle).length;
  if (angle !== "neutral" && sameAngle >= 2) {
    collisions.push("emotional_angle");
    score -= 15;
  }

  score = clampScore(score);

  return {
    score,
    repetitive: collisions.length >= 2 || score < 40,
    collisions,
    rotateToward: leastRecentlyUsedCategories(recent),
  };
}

/** Cheap lexical inference of a message's emotional angle. */
export function inferEmotionalAngle(title: string, body: string): EmotionalAngle {
  const t = `${title} ${body}`.toLowerCase();
  if (/(congrat|great job|amazing|proud|🎉|celebrat|milestone|streak)/.test(t)) return "celebration";
  if (/(ending|today|last chance|don't miss|hurry|expires|soon)/.test(t)) return "urgency";
  if (/(did you know|curious|wonder|guess|surprise|discover)/.test(t)) return "curiosity";
  if (/(no pressure|whenever|it's okay|take your time|saved|here for you|missed you)/.test(t)) return "reassurance";
  if (/(try|let's|tip|how to|steps|start|create)/.test(t)) return "guidance";
  if (/(keep going|you can|one small|almost|nearly|momentum)/.test(t)) return "encouragement";
  return "neutral";
}

function leastRecentlyUsedCategories(recent: HistoryEntry[]): string[] {
  const used = new Set(recent.map((h) => h.category));
  return ROTATION_POOL.filter((c) => !used.has(c)).slice(0, 3);
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
