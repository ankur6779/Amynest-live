/**
 * Academy fluency metrics — WPM, accuracy, pauses, self-corrections.
 * Extends (does not replace) phonics-v3 fluency-tracker daily snapshots.
 */
import type { FluencyBand } from "./ai-reading-coach";
import { fluencyBandFromMetrics } from "./ai-reading-coach";

export type FluencySessionSample = {
  bookId: string;
  pageIndex: number;
  wordCount: number;
  /** Elapsed ms while reading the page */
  durationMs: number;
  accuracyPct: number;
  pauseCount: number;
  selfCorrections: number;
  recordedAt: number;
};

export type AcademyFluencyState = {
  version: 1;
  samples: FluencySessionSample[];
  /** Lifetime words read aloud in books */
  wordsReadAloud: number;
  bestWpm: number;
  lastBand: FluencyBand;
};

const STORAGE_PREFIX = "amynest:phonics-academy-fluency:";
const MAX_SAMPLES = 120;

export function defaultAcademyFluencyState(): AcademyFluencyState {
  return {
    version: 1,
    samples: [],
    wordsReadAloud: 0,
    bestWpm: 0,
    lastBand: "emerging",
  };
}

export function loadAcademyFluencyState(childId: number): AcademyFluencyState {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${childId}`);
    if (!raw) return defaultAcademyFluencyState();
    return { ...defaultAcademyFluencyState(), ...JSON.parse(raw) };
  } catch {
    return defaultAcademyFluencyState();
  }
}

export function saveAcademyFluencyState(
  childId: number,
  state: AcademyFluencyState,
): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${childId}`, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

export function computeWpm(wordCount: number, durationMs: number): number {
  if (durationMs <= 0 || wordCount <= 0) return 0;
  return Math.round((wordCount / durationMs) * 60_000);
}

export function estimateExpressionScore(opts: {
  accuracyPct: number;
  pauseCount: number;
  wordCount: number;
}): number {
  const pauseRate = opts.wordCount > 0 ? opts.pauseCount / opts.wordCount : 1;
  // Fewer chaotic pauses + high accuracy ≈ better expression proxy
  const raw = opts.accuracyPct * (1 - Math.min(0.5, pauseRate));
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function recordFluencySample(
  state: AcademyFluencyState,
  sample: Omit<FluencySessionSample, "recordedAt">,
): AcademyFluencyState {
  const full: FluencySessionSample = { ...sample, recordedAt: Date.now() };
  const wpm = computeWpm(sample.wordCount, sample.durationMs);
  const band = fluencyBandFromMetrics({
    accuracyPct: sample.accuracyPct,
    wordsPerMinute: wpm,
    hesitationRate: sample.wordCount > 0 ? sample.pauseCount / sample.wordCount : 0,
  });
  return {
    version: 1,
    samples: [full, ...state.samples].slice(0, MAX_SAMPLES),
    wordsReadAloud: state.wordsReadAloud + sample.wordCount,
    bestWpm: Math.max(state.bestWpm, wpm),
    lastBand: band,
  };
}

export function fluencyTrendSummary(state: AcademyFluencyState): {
  avgWpm: number;
  avgAccuracy: number;
  avgExpression: number;
  sampleCount: number;
  band: FluencyBand;
} {
  const recent = state.samples.slice(0, 20);
  if (recent.length === 0) {
    return {
      avgWpm: 0,
      avgAccuracy: 0,
      avgExpression: 0,
      sampleCount: 0,
      band: state.lastBand,
    };
  }
  let wpmSum = 0;
  let accSum = 0;
  let exprSum = 0;
  for (const s of recent) {
    wpmSum += computeWpm(s.wordCount, s.durationMs);
    accSum += s.accuracyPct;
    exprSum += estimateExpressionScore({
      accuracyPct: s.accuracyPct,
      pauseCount: s.pauseCount,
      wordCount: s.wordCount,
    });
  }
  const n = recent.length;
  return {
    avgWpm: Math.round(wpmSum / n),
    avgAccuracy: Math.round(accSum / n),
    avgExpression: Math.round(exprSum / n),
    sampleCount: n,
    band: state.lastBand,
  };
}
