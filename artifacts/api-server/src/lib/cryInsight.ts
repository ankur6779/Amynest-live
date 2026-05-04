/**
 * Cry Insight (Beta) — pure classifier.
 *
 * The MVP is intentionally rule-based and **explainable**. It combines two
 * independent signal sources:
 *
 *   1. `audioStats` — coarse client-computed features from a 5–15s clip
 *      (avgAmplitude, peakAmplitude, zeroCrossingRate, durationMs). The
 *      raw waveform never leaves the device.
 *
 *   2. `context` — parent-supplied metadata: minutes since last feed/sleep,
 *      diaper status, fever flag, age in months.
 *
 * Each signal source produces a 0–100 score per cause; we add them and
 * normalize back to a confidence percentage so the UI can render
 * "Hunger 68% · Sleepy 22%". This file is pure (no DB, no OpenAI), which
 * keeps it cheap to unit-test and easy to reason about.
 */

export type CryCause = "hunger" | "sleepy" | "discomfort" | "pain";

export const CRY_CAUSES: readonly CryCause[] = [
  "hunger",
  "sleepy",
  "discomfort",
  "pain",
] as const;

/**
 * Client-computed audio features. All fields are optional so callers can
 * still get a context-only result if the user skips recording.
 *
 * Numeric ranges (typical):
 *   avgAmplitude     — 0..1   (RMS-ish, normalised)
 *   peakAmplitude    — 0..1   (max abs sample, normalised)
 *   zeroCrossingRate — 0..1   (proxy for cry "tempo"/burstiness)
 *   durationMs       — full clip length
 */
export interface AudioStats {
  avgAmplitude?: number;
  peakAmplitude?: number;
  zeroCrossingRate?: number;
  durationMs?: number;
}

/**
 * Parent-supplied context. All fields are optional — the classifier
 * degrades gracefully when info is missing.
 *
 *   minutesSinceFeed  — how long since the last full feed
 *   minutesSinceSleep — how long since the last sleep/nap finished
 *   diaperChangedRecently — true if changed in last ~30 min
 *   fever — parent's subjective "feels warm / has temperature" flag
 *   ageMonths — child's age in months (used for hunger/sleep windowing)
 */
export interface CryContext {
  minutesSinceFeed?: number;
  minutesSinceSleep?: number;
  diaperChangedRecently?: boolean;
  fever?: boolean;
  ageMonths?: number;
}

export type CauseScores = Record<CryCause, number>;

export interface CryInsightResult {
  primary: { cause: CryCause; confidence: number };
  secondary: { cause: CryCause; confidence: number };
  /** Raw normalized 0–100 score per cause for debugging / UI bars. */
  breakdown: CauseScores;
  /** Short parent-friendly action for the primary cause. */
  suggestion: string;
  /** Set when audio + context look concerning enough to recommend a check. */
  medicalFlag: boolean;
}

const ZERO_SCORES = (): CauseScores => ({
  hunger: 0,
  sleepy: 0,
  discomfort: 0,
  pain: 0,
});

// ─── Context scoring ─────────────────────────────────────────────────────────

/**
 * How long an infant of age `m` (months) typically tolerates between feeds.
 * Returns the upper-edge of the comfort window; past this we start scoring
 * hunger more heavily.
 */
function expectedFeedWindowMins(ageMonths: number): number {
  if (ageMonths < 3) return 150;   // 0–3m: 2–3 hourly
  if (ageMonths < 6) return 180;   // 3–6m: 3 hourly
  if (ageMonths < 12) return 210;  // 6–12m: 3–4 hourly
  return 240;                      // 12m+: ~4 hourly
}

/**
 * Wake-window heuristics (Taking Cara Babies / pediatric guidance).
 * Past this, the baby is "overtired" and we lean toward sleepy.
 */
function expectedWakeWindowMins(ageMonths: number): number {
  if (ageMonths < 3) return 60;
  if (ageMonths < 6) return 90;
  if (ageMonths < 9) return 120;
  if (ageMonths < 12) return 150;
  return 180;
}

export function scoreFromContext(ctx: CryContext): CauseScores {
  const scores = ZERO_SCORES();
  const ageMonths = ctx.ageMonths ?? 6;

  // Hunger — the longer since the last feed (relative to age window),
  // the higher the score. Caps at 60 to leave headroom for audio signal.
  if (typeof ctx.minutesSinceFeed === "number") {
    const window = expectedFeedWindowMins(ageMonths);
    const ratio = ctx.minutesSinceFeed / window;
    if (ratio >= 1.5) scores.hunger += 60;
    else if (ratio >= 1) scores.hunger += 45;
    else if (ratio >= 0.7) scores.hunger += 25;
    else if (ratio >= 0.4) scores.hunger += 10;
  }

  // Sleepy — same idea but against the wake window.
  if (typeof ctx.minutesSinceSleep === "number") {
    const window = expectedWakeWindowMins(ageMonths);
    const ratio = ctx.minutesSinceSleep / window;
    if (ratio >= 1.5) scores.sleepy += 55;
    else if (ratio >= 1) scores.sleepy += 40;
    else if (ratio >= 0.7) scores.sleepy += 20;
  }

  // Discomfort — a fresh diaper points away from discomfort; otherwise we
  // give it a small baseline (parents often forget to log a soiled diaper).
  if (ctx.diaperChangedRecently === true) {
    scores.discomfort += 0;
  } else if (ctx.diaperChangedRecently === false) {
    scores.discomfort += 25;
  } else {
    scores.discomfort += 10; // unknown → mild possibility
  }

  // Pain — fever is a strong, specific signal. Otherwise pain stays low
  // unless the audio side picks it up.
  if (ctx.fever === true) {
    scores.pain += 50;
  }

  return scores;
}

// ─── Audio scoring ───────────────────────────────────────────────────────────

/**
 * Map raw audio features to per-cause scores. Each feature contributes
 * up to ~40 so audio alone can never dominate (context still matters).
 *
 * Heuristics (Phase 1):
 *   high peak + short duration         → pain (sudden, sharp onset)
 *   high avgAmp + medium ZCR           → hunger (rhythmic, escalating)
 *   medium ZCR + lower avgAmp          → discomfort (irregular, fussy)
 *   low avgAmp + low ZCR               → sleepy (whiny, lower energy)
 */
export function scoreFromAudio(stats: AudioStats): CauseScores {
  const scores = ZERO_SCORES();
  const avg = clamp01(stats.avgAmplitude ?? 0);
  const peak = clamp01(stats.peakAmplitude ?? 0);
  const zcr = clamp01(stats.zeroCrossingRate ?? 0);
  const dur = stats.durationMs ?? 0;

  // No audio → return zero (caller falls back to context-only).
  if (avg === 0 && peak === 0 && zcr === 0 && dur === 0) {
    return scores;
  }

  // Pain: sharp peak >> avg, short clip is fine. Strong, sudden onsets.
  if (peak > 0.7 && peak - avg > 0.25) {
    scores.pain += 35;
  } else if (peak > 0.85) {
    scores.pain += 20;
  }

  // Hunger: sustained loud (high avg) with moderate burst rate.
  if (avg > 0.5 && zcr >= 0.3 && zcr <= 0.6) {
    scores.hunger += 35;
  } else if (avg > 0.4) {
    scores.hunger += 15;
  }

  // Discomfort: irregular fussy pattern → moderate amp + higher ZCR variance.
  // We approximate with: ZCR > 0.5 and avg between 0.25 and 0.55.
  if (zcr > 0.5 && avg >= 0.25 && avg <= 0.55) {
    scores.discomfort += 30;
  }

  // Sleepy: low energy AND low ZCR (whiny, slow).
  if (avg < 0.35 && zcr < 0.3) {
    scores.sleepy += 30;
  } else if (avg < 0.25) {
    scores.sleepy += 15;
  }

  return scores;
}

// ─── Combination + ranking ───────────────────────────────────────────────────

/**
 * Element-wise add the two score maps, then convert to 0–100 percentages
 * that sum to 100 across all causes (so the UI bars stay sane).
 *
 * Edge case: if every score is zero (no audio + no context) we return a
 * neutral discomfort default so the UI never shows "0% / 0%".
 */
export function combineScores(
  audioScores: CauseScores,
  contextScores: CauseScores,
): CauseScores {
  const raw = ZERO_SCORES();
  for (const c of CRY_CAUSES) {
    raw[c] = (audioScores[c] ?? 0) + (contextScores[c] ?? 0);
  }
  const total = CRY_CAUSES.reduce((acc, c) => acc + raw[c], 0);
  if (total === 0) {
    return { hunger: 25, sleepy: 25, discomfort: 25, pain: 25 };
  }
  const out = ZERO_SCORES();
  for (const c of CRY_CAUSES) {
    out[c] = Math.round((raw[c] / total) * 100);
  }
  return out;
}

export function pickTopTwo(
  scores: CauseScores,
): [{ cause: CryCause; confidence: number }, { cause: CryCause; confidence: number }] {
  const ranked = CRY_CAUSES
    .map((c) => ({ cause: c, confidence: scores[c] }))
    // Stable sort by confidence desc, ties broken by CRY_CAUSES order.
    .sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return CRY_CAUSES.indexOf(a.cause) - CRY_CAUSES.indexOf(b.cause);
    });
  return [ranked[0]!, ranked[1]!];
}

type CryLang = "en";

const SUGGESTIONS: Record<CryCause, string> = {
  hunger: "Try a feed — start with breast or bottle and watch for rooting.",
  sleepy: "Dim lights, swaddle if age-appropriate, and start your wind-down routine.",
  discomfort: "Check the diaper, burp the baby, and look for tight clothing or a wedged limb.",
  pain: "Hold and soothe; check temperature and look for any obvious injury or irritation.",
};

export function getActionSuggestion(cause: CryCause, _language: CryLang = "en"): string {
  return SUGGESTIONS[cause];
}

/**
 * Conservative red-flag heuristic: if the parent reports fever AND the cry
 * shows pain-like audio characteristics (sharp peak), or if peak amplitude
 * is extreme and persists, recommend a medical check.
 */
export function shouldSuggestMedicalCheck(
  stats: AudioStats,
  ctx: CryContext,
): boolean {
  const peak = clamp01(stats.peakAmplitude ?? 0);
  const dur = stats.durationMs ?? 0;
  if (ctx.fever === true && peak > 0.7) return true;
  // Persistent very-high-peak crying (≥10s clip with peak ≥0.9 and avg ≥0.6)
  // is a Phase-1 conservative trigger — not a diagnosis, just a nudge.
  const avg = clamp01(stats.avgAmplitude ?? 0);
  if (dur >= 10_000 && peak >= 0.9 && avg >= 0.6) return true;
  return false;
}

/**
 * Top-level: compute the full insight result from inputs. This is what
 * the API route calls.
 */
export function analyseCry(
  audioStats: AudioStats,
  context: CryContext,
  _language: CryLang = "en",
): CryInsightResult {
  const audioScores = scoreFromAudio(audioStats);
  const contextScores = scoreFromContext(context);
  const breakdown = combineScores(audioScores, contextScores);
  const [primary, secondary] = pickTopTwo(breakdown);
  return {
    primary,
    secondary,
    breakdown,
    suggestion: getActionSuggestion(primary.cause, "en"),
    medicalFlag: shouldSuggestMedicalCheck(audioStats, context),
  };
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
