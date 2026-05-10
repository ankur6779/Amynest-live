// ─────────────────────────────────────────────────────────────────────────
// Core forecasting algorithm.
// Anticipatory load projection via Exponentially Weighted Moving Average
// (EWMA) over per-bucket caregiver demand from the last N historical days,
// blended with the draft target-day routine.
// ─────────────────────────────────────────────────────────────────────────

import type {
  CaregiverAvailability,
  ChildRoutineInput,
} from "@workspace/conflict-resolution";
import type { HandlerKey } from "@workspace/family-routine";

import type {
  BottleneckPrediction,
  CaregiverLoadForecast,
  ForecastOptions,
  HistoricalDay,
  LoadBucketSeries,
  LoadHotspot,
  MultiDayForecast,
  RebalanceProposal,
} from "./types";

// ── time helpers (kept local — load-forecast must have zero coupling
//    with the routine-shape of conflict-resolution). ─────────────────────

function parseTime(t: string): number {
  if (!t) return -1;
  const m24 = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (m24) {
    const h = Number(m24[1]);
    const mm = Number(m24[2]);
    if (h >= 0 && h <= 24 && mm >= 0 && mm < 60) return h * 60 + mm;
  }
  const m12 = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(t.trim());
  if (m12) {
    let h = Number(m12[1]) % 12;
    if (m12[3].toUpperCase() === "PM") h += 12;
    return h * 60 + Number(m12[2]);
  }
  return -1;
}

function formatTime12(mins: number): string {
  const h24 = Math.floor((mins % 1440) / 60);
  const mm = mins % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = ((h24 + 11) % 12) + 1;
  return `${h12}:${String(mm).padStart(2, "0")} ${period}`;
}

function formatTime24(mins: number): string {
  const h = Math.floor((mins % 1440) / 60);
  const mm = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function hashId(parts: Array<string | number>): string {
  let h = 5381;
  const str = parts.join("|");
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

// ── 1. Build a single day's caregiver load series. ────────────────────────

/**
 * Project each routine item onto bucket-level caregiver demand.
 * For every minute the item is active, the assigned caregiver gets +1
 * (or +0 if the activity has no caregiver assigned).
 */
export function buildDayLoadSeries(
  routines: ChildRoutineInput[],
  bucketMinutes: number,
  caregivers: HandlerKey[],
): LoadBucketSeries {
  const buckets = Math.ceil(1440 / bucketMinutes);
  const load: Record<HandlerKey, number[]> = {} as Record<HandlerKey, number[]>;
  for (const cg of caregivers) {
    load[cg] = new Array(buckets).fill(0);
  }
  for (const r of routines) {
    for (const it of r.items) {
      const start = parseTime(it.time);
      if (start < 0) continue;
      const end = start + Math.max(1, it.duration || 0);
      const cg = (it.caregiver ?? r.child.defaultCaregiver) as HandlerKey | undefined;
      if (!cg || !load[cg]) continue;
      const startBucket = Math.floor(start / bucketMinutes);
      const endBucket = Math.min(buckets - 1, Math.ceil(end / bucketMinutes) - 1);
      for (let b = startBucket; b <= endBucket; b++) {
        load[cg][b] += 1;
      }
    }
  }
  return { bucketMinutes, buckets, load };
}

// ── 2. EWMA blend of historical days into a single profile. ──────────────

/**
 * Compute a weighted historical load profile.
 * Most recent day is weighted highest via EWMA: w_i = alpha * (1-alpha)^i
 * with i=0 being the most recent.
 */
export function historicalLoadProfile(
  history: HistoricalDay[],
  bucketMinutes: number,
  caregivers: HandlerKey[],
  alpha = 0.45,
): LoadBucketSeries {
  const buckets = Math.ceil(1440 / bucketMinutes);
  const out: Record<HandlerKey, number[]> = {} as Record<HandlerKey, number[]>;
  for (const cg of caregivers) out[cg] = new Array(buckets).fill(0);

  // Sort most-recent first so EWMA weight decays with age.
  const sorted = [...history].sort((a, b) => (a.date < b.date ? 1 : -1));

  let weightSum = 0;
  for (let i = 0; i < sorted.length; i++) {
    const w = alpha * Math.pow(1 - alpha, i);
    weightSum += w;
    const day = buildDayLoadSeries(sorted[i].routines, bucketMinutes, caregivers);
    for (const cg of caregivers) {
      for (let b = 0; b < buckets; b++) {
        out[cg][b] += day.load[cg][b] * w;
      }
    }
  }
  // Normalize so the result is comparable to a single-day series.
  if (weightSum > 0) {
    for (const cg of caregivers) {
      for (let b = 0; b < buckets; b++) out[cg][b] /= weightSum;
    }
  }
  return { bucketMinutes, buckets, load: out };
}

// ── 3. Forecast for a single target date. ────────────────────────────────

/**
 * forecastDailyLoad
 *   - Builds historical profile via EWMA.
 *   - If draftRoutines provided, blends draft (60%) with historical (40%).
 *   - Returns the forecast + hotspot list.
 */
export function forecastDailyLoad(opts: ForecastOptions): CaregiverLoadForecast {
  const bucketMinutes = opts.bucketMinutes ?? 15;
  const lookback = opts.lookbackDays ?? 7;
  const alpha = opts.alpha ?? 0.45;
  const history = (opts.history ?? []).slice(0, lookback);
  const caregivers = opts.caregivers.map((c) => c.caregiver);

  const histProfile = historicalLoadProfile(history, bucketMinutes, caregivers, alpha);

  let blended: LoadBucketSeries = histProfile;
  if (opts.draftRoutines && opts.draftRoutines.length > 0) {
    const draft = buildDayLoadSeries(opts.draftRoutines, bucketMinutes, caregivers);
    const blendDraft = 0.6;
    const blendHist = 1 - blendDraft;
    const out: Record<HandlerKey, number[]> = {} as Record<HandlerKey, number[]>;
    for (const cg of caregivers) {
      out[cg] = new Array(histProfile.buckets).fill(0);
      for (let b = 0; b < histProfile.buckets; b++) {
        out[cg][b] = draft.load[cg][b] * blendDraft + histProfile.load[cg][b] * blendHist;
      }
    }
    blended = { bucketMinutes, buckets: histProfile.buckets, load: out };
  }

  const hotspots = detectHotspots(blended, opts.caregivers, opts.date);
  const confidence = clamp(Math.round(history.length * 1.2 + (opts.draftRoutines ? 2 : 0)), 1, 10);

  return {
    date: opts.date,
    historyDays: history.length,
    series: blended,
    hotspots,
    confidence,
  };
}

// ── 4. Hotspot (bottleneck) detection on a load series. ──────────────────

function caregiverAvailableAt(cg: CaregiverAvailability, bucketStart: number): boolean {
  for (const w of cg.windows ?? []) {
    const ws = parseTime(w.start);
    const we = parseTime(w.end);
    if (ws >= 0 && we > ws && bucketStart >= ws && bucketStart < we) return true;
  }
  return false;
}

export function detectHotspots(
  series: LoadBucketSeries,
  caregivers: CaregiverAvailability[],
  date: string,
): LoadHotspot[] {
  const out: LoadHotspot[] = [];
  for (const cg of caregivers) {
    const cap = cg.capacity;
    const arr = series.load[cg.caregiver];
    if (!arr) continue;

    // Coalesce contiguous over-capacity buckets into a single hotspot window.
    let i = 0;
    while (i < arr.length) {
      const bucketStart = i * series.bucketMinutes;
      const overloaded = arr[i] > cap + 0.05 && caregiverAvailableAt(cg, bucketStart);
      if (!overloaded) { i++; continue; }
      let j = i;
      let peak = arr[i];
      while (j < arr.length) {
        const bs = j * series.bucketMinutes;
        if (arr[j] <= cap + 0.05) break;
        if (!caregiverAvailableAt(cg, bs)) break;
        if (arr[j] > peak) peak = arr[j];
        j++;
      }
      const startMins = i * series.bucketMinutes;
      const endMins = j * series.bucketMinutes;
      const overload = +(peak - cap).toFixed(2);
      out.push({
        id: hashId(["hotspot", date, cg.caregiver, startMins, endMins]),
        caregiver: cg.caregiver,
        startTime: formatTime12(startMins),
        endTime: formatTime12(endMins),
        startTime24: formatTime24(startMins),
        endTime24: formatTime24(endMins),
        projectedLoad: +peak.toFixed(2),
        capacity: cap,
        overload,
        confidence: 6,
      });
      i = j + 1;
    }
  }
  return out.sort((a, b) => b.overload - a.overload);
}

// ── 5. Multi-day horizon. ────────────────────────────────────────────────

export function forecastHorizon(opts: ForecastOptions): MultiDayForecast {
  const horizon = Math.max(1, opts.horizonDays ?? 1);
  const forecasts: CaregiverLoadForecast[] = [];
  for (let d = 0; d < horizon; d++) {
    const target = addDays(opts.date, d);
    forecasts.push(forecastDailyLoad({ ...opts, date: target, horizonDays: 1 }));
  }
  // Household score = 100 minus sum-of-overloads (capped).
  const totalOverload = forecasts.reduce(
    (s, f) => s + f.hotspots.reduce((ss, h) => ss + Math.max(0, h.overload), 0),
    0,
  );
  const householdLoadScore = clamp(Math.round(100 - totalOverload * 8), 0, 100);
  return {
    generatedAt: new Date().toISOString(),
    horizonDays: horizon,
    forecasts,
    householdLoadScore,
  };
}

// ── 6. Predict bottlenecks (severity-classified). ────────────────────────

export function predictBottlenecks(forecast: MultiDayForecast): BottleneckPrediction[] {
  const out: BottleneckPrediction[] = [];
  for (const f of forecast.forecasts) {
    for (const h of f.hotspots) {
      const sev: BottleneckPrediction["severity"] =
        h.overload >= 1.5 ? "high" : h.overload >= 0.75 ? "medium" : "low";
      out.push({
        date: f.date,
        caregiver: h.caregiver,
        windowLabel: `${h.startTime}–${h.endTime}`,
        severity: sev,
        reason:
          `Projected demand ${h.projectedLoad.toFixed(1)} children vs capacity ${h.capacity}` +
          ` (overload +${h.overload.toFixed(2)}).`,
      });
    }
  }
  return out;
}

// ── 7. Rebalance proposals — naïve but useful first cut. ─────────────────

export function recommendRebalance(
  forecast: CaregiverLoadForecast,
  caregivers: CaregiverAvailability[],
  draftRoutines: ChildRoutineInput[] | undefined,
): RebalanceProposal[] {
  const out: RebalanceProposal[] = [];
  if (!draftRoutines || draftRoutines.length === 0) return out;
  const series = forecast.series;

  for (const hot of forecast.hotspots) {
    // Find the activity item active during the hotspot window assigned to
    // the overloaded caregiver. Prefer the lowest-priority category we can
    // safely shift (play / creative > study > meal).
    const startMins = parseTime(hot.startTime24);
    const endMins = parseTime(hot.endTime24);

    let candidate: { childId: number; childName: string; activity: string; startTime: string; rank: number } | null = null;
    for (const r of draftRoutines) {
      for (const it of r.items) {
        const cg = (it.caregiver ?? r.child.defaultCaregiver) as HandlerKey | undefined;
        if (cg !== hot.caregiver) continue;
        const s = parseTime(it.time);
        if (s < 0) continue;
        const e = s + Math.max(1, it.duration || 0);
        if (e <= startMins || s >= endMins) continue;
        const rank = shiftRank(it.category);
        if (rank === 0) continue;
        if (!candidate || rank > candidate.rank) {
          candidate = { childId: r.child.id, childName: r.child.name, activity: it.activity, startTime: it.time, rank };
        }
      }
    }
    if (!candidate) continue;

    // Pick the freest other caregiver during this window.
    const targetCg = pickFreestCaregiver(series, caregivers, hot.caregiver, startMins, endMins);
    if (!targetCg) continue;

    out.push({
      id: hashId(["rebal", forecast.date, hot.id, candidate.childId, candidate.startTime]),
      date: forecast.date,
      hotspotId: hot.id,
      fromCaregiver: hot.caregiver,
      toCaregiver: targetCg,
      childId: candidate.childId,
      childName: candidate.childName,
      activity: candidate.activity,
      startTime: candidate.startTime,
      rationale:
        `Move "${candidate.activity}" for ${candidate.childName} from ${hot.caregiver} to ${targetCg} ` +
        `to relieve a projected overload during ${hot.startTime}–${hot.endTime}.`,
      projectedRelief: 1,
    });
  }
  return out;
}

function shiftRank(category: string): number {
  // Higher = easier to shift caregiver-wise.
  switch (category) {
    case "play":
    case "creative": return 5;
    case "outdoor":  return 4;
    case "study":    return 3;
    case "hygiene":  return 2;
    case "meal":     return 1;
    case "sleep":
    case "school":   return 0; // do not shift
    default:         return 2;
  }
}

function pickFreestCaregiver(
  series: LoadBucketSeries,
  caregivers: CaregiverAvailability[],
  exclude: HandlerKey,
  startMins: number,
  endMins: number,
): HandlerKey | null {
  let best: { cg: HandlerKey; load: number } | null = null;
  for (const cg of caregivers) {
    if (cg.caregiver === exclude) continue;
    if (!caregiverAvailableAt(cg, startMins)) continue;
    const arr = series.load[cg.caregiver] ?? [];
    const startBucket = Math.floor(startMins / series.bucketMinutes);
    const endBucket = Math.min(arr.length - 1, Math.ceil(endMins / series.bucketMinutes) - 1);
    let peak = 0;
    for (let b = startBucket; b <= endBucket; b++) if (arr[b] > peak) peak = arr[b];
    if (peak >= cg.capacity) continue;
    if (!best || peak < best.load) best = { cg: cg.caregiver, load: peak };
  }
  return best?.cg ?? null;
}

// ── helpers ──────────────────────────────────────────────────────────────

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function addDays(date: string, days: number): string {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
