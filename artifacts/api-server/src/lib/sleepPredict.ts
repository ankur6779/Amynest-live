/**
 * Infant Sleep Prediction engine (0–24 months) — pure, deterministic.
 *
 * All time-math is in **milliseconds since epoch** so callers can pass UTC
 * timestamps freely. Wake windows are stored in **minutes**.
 *
 * Nothing in this file talks to the DB or the network. It is hot-path
 * unit-tested.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type WakeWindow = {
  /** Minimum wake-window length in minutes for the band. */
  minMin: number;
  /** Maximum wake-window length in minutes for the band. */
  maxMin: number;
  /** Mid-point we use as the "ideal" target before adjustments. */
  idealMin: number;
};

export type NapHistoryEntry = {
  /** Epoch ms of when the nap started. */
  startedAt: number;
  /** Epoch ms of when the nap ended (omit if still in progress). */
  endedAt?: number;
  /** "nap" or "night". */
  kind: "nap" | "night";
};

export type PredictInput = {
  ageMonths: number;
  /**
   * Epoch ms of when the baby last woke up. If undefined, we fall back to
   * `now - idealWakeWindow / 2` so the UI never shows "n/a" — the parent
   * just sees a default suggestion.
   */
  lastWakeAt?: number;
  /** Length of the most recent sleep in ms (used for short/long adjust). */
  lastSleepDurationMs?: number;
  /** Total naps already taken today (used to detect missed-nap cases). */
  napCountToday?: number;
  /** Up to ~5 days of recent sessions, newest first. */
  history?: NapHistoryEntry[];
};

export type PressureBand = "restful" | "ideal" | "tired" | "overtired";

export type Prediction = {
  /** Epoch ms of the predicted next-sleep onset. */
  predictedAt: number;
  /** Epoch ms — start of the recommended window (predicted - 10 min). */
  windowStart: number;
  /** Epoch ms — end of the recommended window (predicted + 20 min). */
  windowEnd: number;
  /** Adjusted wake-window in minutes used to make this prediction. */
  idealWakeWindowMin: number;
  /** Wake-window before dynamic adjustments (for transparency). */
  baseWakeWindowMin: number;
  /** 0–120 — capped at 120 so it stays presentable. */
  sleepPressure: number;
  pressureBand: PressureBand;
  /** True at >=80% pressure — UI dims and surfaces wind-down tips. */
  shouldWindDown: boolean;
  /** Human-readable reason chain ("Short nap → window shortened 15%"). */
  reasons: string[];
  /** Suggested naps-per-day for this age band. */
  suggestedNapsPerDay: { min: number; max: number };
  /** True when input was sparse — UI should show "flexible range". */
  flexible: boolean;
};

// ─── Tables ──────────────────────────────────────────────────────────────────

/**
 * Age-banded wake windows. Bands are inclusive on the lower bound and
 * exclusive on the upper bound, so a baby that just turned 2 months falls
 * into the 2–4 mo band (not the 0–2 mo band).
 */
const WAKE_WINDOW_BANDS: ReadonlyArray<{
  min: number;
  max: number;
  win: WakeWindow;
}> = [
  { min: 0, max: 2, win: { minMin: 45, maxMin: 60, idealMin: 53 } },
  { min: 2, max: 4, win: { minMin: 60, maxMin: 90, idealMin: 75 } },
  { min: 4, max: 6, win: { minMin: 90, maxMin: 120, idealMin: 105 } },
  { min: 6, max: 9, win: { minMin: 120, maxMin: 180, idealMin: 150 } },
  { min: 9, max: 12, win: { minMin: 150, maxMin: 210, idealMin: 180 } },
  { min: 12, max: 18, win: { minMin: 180, maxMin: 270, idealMin: 225 } },
  { min: 18, max: 24, win: { minMin: 240, maxMin: 330, idealMin: 285 } },
];

/** Last band catches anything ≥24 mo (we still serve toddlers gracefully). */
const FALLBACK_WIN: WakeWindow = { minMin: 240, maxMin: 360, idealMin: 300 };

const NAPS_PER_DAY_BANDS: ReadonlyArray<{
  min: number;
  max: number;
  naps: { min: number; max: number };
}> = [
  { min: 0, max: 4, naps: { min: 4, max: 5 } },
  { min: 4, max: 6, naps: { min: 3, max: 4 } },
  { min: 6, max: 12, naps: { min: 2, max: 3 } },
  { min: 12, max: 18, naps: { min: 2, max: 2 } },
  { min: 18, max: 24, naps: { min: 1, max: 1 } },
];

const FALLBACK_NAPS = { min: 0, max: 1 };

// ─── Public lookups ──────────────────────────────────────────────────────────

export function getWakeWindowForAge(ageMonths: number): WakeWindow {
  if (!Number.isFinite(ageMonths) || ageMonths < 0) {
    return WAKE_WINDOW_BANDS[0]!.win;
  }
  for (const band of WAKE_WINDOW_BANDS) {
    if (ageMonths >= band.min && ageMonths < band.max) return band.win;
  }
  return FALLBACK_WIN;
}

export function getNapsPerDayForAge(ageMonths: number): {
  min: number;
  max: number;
} {
  if (!Number.isFinite(ageMonths) || ageMonths < 0) {
    return NAPS_PER_DAY_BANDS[0]!.naps;
  }
  for (const band of NAPS_PER_DAY_BANDS) {
    if (ageMonths >= band.min && ageMonths < band.max) return band.naps;
  }
  return FALLBACK_NAPS;
}

// ─── Dynamic adjustments ─────────────────────────────────────────────────────

const SHORT_NAP_MS = 30 * 60 * 1000; // <30 min
const LONG_NAP_MS = 90 * 60 * 1000; // >90 min (1.5h)
const SHORT_NAP_FACTOR = 0.85; // -15%
const LONG_NAP_FACTOR = 1.12; // +12%
const MISSED_NAP_FACTOR = 0.85; // bedtime earlier

/**
 * Apply spec-defined adjustments:
 *   - short last nap   → −15%
 *   - long last nap    → +12%
 *   - fewer naps today than the band's MIN → bedtime earlier (−15%)
 *
 * Returns both the adjusted minutes and the reason chain so the UI can
 * explain itself.
 */
export function applyDynamicAdjustments(
  baseMin: number,
  opts: {
    lastSleepDurationMs?: number;
    ageMonths: number;
    napCountToday?: number;
    nowMs: number;
    /** Hour-of-day boundary after which we consider "missed-nap" relevant. */
    napCutoffHour?: number;
  },
): { adjustedMin: number; reasons: string[] } {
  const reasons: string[] = [];
  let adjusted = baseMin;

  if (typeof opts.lastSleepDurationMs === "number") {
    if (opts.lastSleepDurationMs > 0 && opts.lastSleepDurationMs < SHORT_NAP_MS) {
      adjusted = adjusted * SHORT_NAP_FACTOR;
      reasons.push("Short last nap — wake window shortened by 15%.");
    } else if (opts.lastSleepDurationMs > LONG_NAP_MS) {
      adjusted = adjusted * LONG_NAP_FACTOR;
      reasons.push("Long restorative nap — wake window extended by 12%.");
    }
  }

  // Missed-nap heuristic: if it's already past the afternoon and the baby
  // has had fewer naps than the lower bound for the age band, push next
  // sleep earlier.
  const cutoff = opts.napCutoffHour ?? 14;
  const hour = new Date(opts.nowMs).getHours();
  const naps = getNapsPerDayForAge(opts.ageMonths);
  if (
    typeof opts.napCountToday === "number" &&
    hour >= cutoff &&
    opts.napCountToday < naps.min
  ) {
    adjusted = adjusted * MISSED_NAP_FACTOR;
    reasons.push("Missed naps today — suggesting an earlier bedtime.");
  }

  return { adjustedMin: Math.round(adjusted), reasons };
}

// ─── Pressure ────────────────────────────────────────────────────────────────

export function computeSleepPressure(
  awakeMs: number,
  idealWakeWindowMin: number,
): { sleepPressure: number; pressureBand: PressureBand } {
  if (idealWakeWindowMin <= 0) {
    return { sleepPressure: 0, pressureBand: "restful" };
  }
  const awakeMin = Math.max(0, awakeMs / 60_000);
  const raw = (awakeMin / idealWakeWindowMin) * 100;
  // Cap at 120 so the gauge has a sane upper bound; band-logic stays the same.
  const pressure = Math.min(120, Math.max(0, Math.round(raw)));

  let band: PressureBand;
  if (pressure < 60) band = "restful";
  else if (pressure < 80) band = "ideal";
  else if (pressure < 100) band = "tired";
  else band = "overtired";

  return { sleepPressure: pressure, pressureBand: band };
}

// ─── Top-level prediction ────────────────────────────────────────────────────

const WINDOW_LEAD_MS = 10 * 60 * 1000; // 10 min before
const WINDOW_TAIL_MS = 20 * 60 * 1000; // 20 min after

export function predictNextSleep(
  input: PredictInput,
  nowMs: number = Date.now(),
): Prediction {
  const win = getWakeWindowForAge(input.ageMonths);
  const naps = getNapsPerDayForAge(input.ageMonths);
  const baseMin = win.idealMin;

  const adj = applyDynamicAdjustments(baseMin, {
    lastSleepDurationMs: input.lastSleepDurationMs,
    ageMonths: input.ageMonths,
    napCountToday: input.napCountToday,
    nowMs,
  });

  const lastWakeAt = input.lastWakeAt ?? nowMs - (adj.adjustedMin * 60_000) / 2;
  const flexible =
    input.lastWakeAt === undefined ||
    !input.history ||
    input.history.length === 0;

  const predictedAt = lastWakeAt + adj.adjustedMin * 60_000;
  const windowStart = predictedAt - WINDOW_LEAD_MS;
  const windowEnd = predictedAt + WINDOW_TAIL_MS;

  const awakeMs = Math.max(0, nowMs - lastWakeAt);
  const { sleepPressure, pressureBand } = computeSleepPressure(
    awakeMs,
    adj.adjustedMin,
  );

  const reasons = [...adj.reasons];
  if (flexible) {
    reasons.push("Limited data — showing a flexible range.");
  }
  if (adj.adjustedMin !== baseMin) {
    reasons.push(
      `Adjusted from ${baseMin}m → ${adj.adjustedMin}m for today.`,
    );
  }

  return {
    predictedAt,
    windowStart,
    windowEnd,
    idealWakeWindowMin: adj.adjustedMin,
    baseWakeWindowMin: baseMin,
    sleepPressure,
    pressureBand,
    shouldWindDown: sleepPressure >= 80,
    reasons,
    suggestedNapsPerDay: naps,
    flexible,
  };
}

/**
 * Convenience helper: build the engine input from a list of nap rows
 * (newest first). Picks the most recent COMPLETED session as the "last
 * wake" anchor and counts today's naps in the parent's local timezone.
 *
 * `tzOffsetMin` is the client's `new Date().getTimezoneOffset()` value
 * (positive west of UTC, e.g. 330 for IST=−5:30 ⇒ wait, IST is UTC+5:30
 * so getTimezoneOffset returns −330). We use it to compute "start of
 * today" in the user's wall clock — without this the server's UTC day
 * boundary would mis-count naps for non-UTC parents.
 */
export function buildPredictInputFromHistory(
  history: NapHistoryEntry[],
  ageMonths: number,
  nowMs: number = Date.now(),
  tzOffsetMin: number = 0,
): PredictInput {
  const completed = history.filter(
    (h): h is NapHistoryEntry & { endedAt: number } =>
      typeof h.endedAt === "number" && h.endedAt > h.startedAt,
  );
  const last = completed[0];

  // Compute "start of today" in the parent's wall clock.
  //   parentNowMs = nowMs − tzOffsetMin*60_000  → shifts UTC into wall time
  //   floor to the day, then shift back to UTC
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const parentNowMs = nowMs - tzOffsetMin * 60_000;
  const parentDayStartMs = Math.floor(parentNowMs / ONE_DAY_MS) * ONE_DAY_MS;
  const startOfDayMs = parentDayStartMs + tzOffsetMin * 60_000;

  const napCountToday = history.filter(
    (h) => h.kind === "nap" && h.startedAt >= startOfDayMs,
  ).length;

  return {
    ageMonths,
    lastWakeAt: last?.endedAt,
    lastSleepDurationMs: last ? last.endedAt - last.startedAt : undefined,
    napCountToday,
    history,
  };
}
