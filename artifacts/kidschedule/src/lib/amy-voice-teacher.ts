/**
 * Teacher-like delivery — expectation framing, recovery, effort-aware praise.
 * Refined for one-layer-per-phrase compression, praise spacing, and adaptive guidance.
 */

import type { AmyDifficultyLevel } from "@/lib/amy-voice-difficulty";
import type { AmyIntent } from "@/lib/amy-voice-intent";
import type { AmySpeechMode } from "@/lib/amy-speech-mode";

export type TeacherDeliveryContext = {
  phrases: string[];
  intent: AmyIntent;
  difficulty: AmyDifficultyLevel;
  previousDifficulty: AmyDifficultyLevel;
  speechMode: AmySpeechMode;
  multiStep: boolean;
  /** Consecutive successful deliveries — drives fast recovery and minimal guidance. */
  successStreak?: number;
  /** Cohort-driven guidance override. */
  guidanceTierOverride?: GuidanceTier | null;
};

export type GuidanceTier = "full" | "light" | "minimal";

const EXPECTATION_FRAMES = [
  "Let's try this",
  "Watch carefully",
  "Here's the next step",
  "Alright, let's go",
] as const;

const RECOVERY_FRAMES = [
  "That's okay",
  "You're getting closer",
  "Let's try it together",
] as const;

const EFFORT_PRAISE = [
  "That was tricky, but you did it",
  "Great work sticking with it",
  "You kept going — well done",
] as const;

const LIGHT_ACK = ["Nice", "Got it", "There you go", "Right"] as const;

const SUFFIX_TAILS = ["now", "next", "when you're ready"] as const;

type StructureMode = "prefix" | "suffix" | "embedded";

const rotateCursor: Record<string, number> = {};
const recentPraiseUsed: boolean[] = [];

/** Pick a rotating variant to avoid repetitive phrasing. */
export function pickTeacherPhrase(
  pool: readonly string[],
  category: string,
): string {
  if (pool.length === 0) return "";
  const idx = rotateCursor[category] ?? 0;
  rotateCursor[category] = (idx + 1) % pool.length;
  return pool[idx]!;
}

export function resetTeacherPhraseRotation(): void {
  for (const key of Object.keys(rotateCursor)) delete rotateCursor[key];
}

export function resetTeacherPraiseSpacing(): void {
  recentPraiseUsed.length = 0;
}

function lowercaseLead(body: string): string {
  const t = body.trim();
  if (!t) return t;
  return t.charAt(0).toLowerCase() + t.slice(1);
}

function stripTrailingPunct(text: string): string {
  return text.trim().replace(/[.!?]+$/, "");
}

/** Merge guiding lead-in with instruction body using natural pause. */
export function combineTeacherLead(lead: string, body: string): string {
  const trimmedLead = (lead ?? "").trim().replace(/[.!?]+$/, "");
  const bodyText = (body ?? "").trim();
  if (!bodyText) return trimmedLead;
  if (!trimmedLead) return bodyText;
  return `${trimmedLead}… ${lowercaseLead(bodyText)}`;
}

function pickStructureMode(category: string): StructureMode {
  const modes: StructureMode[] = ["prefix", "suffix", "embedded"];
  const idx = rotateCursor[`struct:${category}`] ?? 0;
  rotateCursor[`struct:${category}`] = (idx + 1) % modes.length;
  return modes[idx]!;
}

/** Apply one guidance layer with prefix, suffix, or embedded structure. */
export function wrapWithGuidanceStructure(
  lead: string,
  body: string,
  structure?: StructureMode,
): string {
  const trimmedLead = (lead ?? "").trim().replace(/[.!?]+$/, "");
  const bodyText = stripTrailingPunct(body ?? "");
  if (!bodyText) return trimmedLead;
  if (!trimmedLead) return body;

  const mode = structure ?? pickStructureMode("guidance");
  const lowerBody = lowercaseLead(bodyText);

  switch (mode) {
    case "suffix": {
      const tail = pickTeacherPhrase(SUFFIX_TAILS, "suffix");
      return `${bodyText} ${tail}.`;
    }
    case "embedded":
      return `Let's ${lowerBody} next.`;
    default:
      return combineTeacherLead(trimmedLead, bodyText);
  }
}

const TEACHER_LAYER_RE =
  /^(let's try|let's do this|watch carefully|here's the next|here we go|alright|that's okay|you're getting|great work sticking|that was tricky|you kept going|nice|got it|there you go|right|first|then|finally|try)\b/i;

function hasTeacherLayer(phrase: string): boolean {
  const p = phrase.trim();
  if (TEACHER_LAYER_RE.test(p)) return true;
  return /…/.test(p) && /^(now|next|let's try again)/i.test(p);
}

/** True when learner improved after a struggle — effort deserves acknowledgment. */
export function detectEffortRecovery(
  previous: AmyDifficultyLevel,
  current: AmyDifficultyLevel,
  intent: AmyIntent,
): boolean {
  if (intent !== "feedback") return false;
  return (
    previous === "struggling" &&
    (current === "neutral" || current === "confident")
  );
}

export function shouldThrottlePraise(): boolean {
  const recent = recentPraiseUsed.slice(-2);
  return recent.some(Boolean);
}

function recordPraiseInteraction(usedHeavyPraise: boolean): void {
  recentPraiseUsed.push(usedHeavyPraise);
  if (recentPraiseUsed.length > 6) recentPraiseUsed.shift();
}

/** Decide how much teacher scaffolding to apply. */
export function getGuidanceTier(ctx: TeacherDeliveryContext): GuidanceTier {
  const streak = ctx.successStreak ?? 0;

  if (ctx.difficulty === "struggling") return "full";
  if (ctx.difficulty === "confident") return "minimal";
  if (streak >= 2) return "minimal";
  if (ctx.multiStep && streak >= 1 && ctx.difficulty === "neutral") {
    return "minimal";
  }
  if (ctx.multiStep && ctx.difficulty === "neutral") return "light";
  return "full";
}

function applyLayer(
  phrases: string[],
  index: number,
  lead: string,
  category: string,
): string[] {
  const out = [...phrases];
  const target = out[index]?.trim() ?? "";
  if (!target || hasTeacherLayer(target)) return out;
  out[index] = wrapWithGuidanceStructure(lead, target, pickStructureMode(category));
  return out;
}

function applyExpectationFraming(
  phrases: string[],
  intent: AmyIntent,
  multiStep: boolean,
): string[] {
  if (phrases.length === 0) return phrases;
  if (intent !== "instruction" && intent !== "attention") return phrases;
  if (!multiStep && intent !== "instruction") return phrases;
  if (hasTeacherLayer(phrases[0]!)) return phrases;

  const frame = pickTeacherPhrase(EXPECTATION_FRAMES, "expectation");
  return applyLayer(phrases, 0, frame, "expectation");
}

function applyRecoverySupport(phrases: string[], difficulty: AmyDifficultyLevel): string[] {
  if (phrases.length === 0 || difficulty !== "struggling") return phrases;
  if (hasTeacherLayer(phrases[0]!)) return phrases;

  const recovery = pickTeacherPhrase(RECOVERY_FRAMES, "recovery");
  void import("@/lib/amy-voice-analytics").then((m) =>
    m.recordAmyVoiceRecoveryUsage("struggling_support"),
  );
  return applyLayer(phrases, 0, recovery, "recovery");
}

function applyEffortPraise(
  phrases: string[],
  previous: AmyDifficultyLevel,
  current: AmyDifficultyLevel,
  intent: AmyIntent,
): { phrases: string[]; usedHeavyPraise: boolean } {
  if (!detectEffortRecovery(previous, current, intent) || phrases.length === 0) {
    return { phrases, usedHeavyPraise: false };
  }

  if (shouldThrottlePraise()) {
    const ack = pickTeacherPhrase(LIGHT_ACK, "light-ack");
    return { phrases: [ack], usedHeavyPraise: false };
  }

  const praise = pickTeacherPhrase(EFFORT_PRAISE, "effort");
  const first = phrases[0]!.trim();
  if (first.match(/^(good job|well done|great)/i) && !hasTeacherLayer(first)) {
    return {
      phrases: applyLayer(phrases, 0, praise, "effort"),
      usedHeavyPraise: true,
    };
  }
  return { phrases: [`${praise}!`], usedHeavyPraise: true };
}

/** Minimal transition for one follow-up phrase only — avoids stacking on every step. */
function linkTeacherFlowLight(phrases: string[], intent: AmyIntent): string[] {
  if (phrases.length <= 1) return phrases;

  return phrases.map((raw, index) => {
    const p = raw.trim();
    if (index === 0 || index > 1 || hasTeacherLayer(p)) return p;
    if (/^(now|next|let's|again|then|okay|alright|that's)/i.test(p)) return p;

    const lower = lowercaseLead(p);
    if (intent === "correction") {
      return wrapWithGuidanceStructure("Let's try again", lower, "prefix");
    }
    return wrapWithGuidanceStructure("Next", lower, "prefix");
  });
}

/**
 * Apply teacher delivery with one guidance layer per phrase and adaptive intervention.
 */
export function applyTeacherDelivery(ctx: TeacherDeliveryContext): string[] {
  let phrases = [...ctx.phrases].map((p) => p.trim()).filter(Boolean);
  if (phrases.length === 0) return phrases;

  const tier = ctx.guidanceTierOverride ?? getGuidanceTier(ctx);
  if (tier === "minimal") return phrases;

  const effortRecovery = detectEffortRecovery(
    ctx.previousDifficulty,
    ctx.difficulty,
    ctx.intent,
  );

  if (effortRecovery) {
    const { phrases: praised, usedHeavyPraise } = applyEffortPraise(
      phrases,
      ctx.previousDifficulty,
      ctx.difficulty,
      ctx.intent,
    );
    recordPraiseInteraction(usedHeavyPraise);
    return praised;
  }

  if (ctx.difficulty === "struggling") {
    phrases = applyRecoverySupport(phrases, ctx.difficulty);
    recordPraiseInteraction(false);
    return phrases;
  }

  if (tier === "light") {
    phrases = applyExpectationFraming(phrases, ctx.intent, false);
    recordPraiseInteraction(false);
    return phrases;
  }

  phrases = applyExpectationFraming(phrases, ctx.intent, ctx.multiStep);

  const firstHasLayer = hasTeacherLayer(phrases[0] ?? "");
  if (ctx.multiStep && phrases.length > 1 && !firstHasLayer) {
    phrases = linkTeacherFlowLight(phrases, ctx.intent);
  }

  recordPraiseInteraction(false);
  return phrases;
}
