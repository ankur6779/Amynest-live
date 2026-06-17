/**
 * Phase I + Phase G.5 — Parent Hub → Smart Study Zone → Phonics predictive prewarm.
 *
 * The old prewarm started only once the child opened the phonics screen (too
 * late → first-tap latency), and the predictive version warmed curated TIER
 * packs that the child might never open. This is now MASTERY-DRIVEN: from the
 * Parent Hub entry we ask the real mastery engine for the child's actual next
 * lesson / phoneme pack / word pack / decodable story, then warm ONLY those
 * assets — gated by network, battery, memory, and device performance, and
 * capped by an adaptive per-device budget so we never waste bandwidth or
 * pollute the cache on low-end / metered devices.
 *
 * Reuses the frozen prefetch primitives in phonics-static-audio; it only
 * changes WHEN/WHETHER/WHAT warming starts, never the playback engine.
 */
import {
  prefetchEntirePhonicsLibrary,
  prefetchPhonicsAudioKeys,
  prefetchPhonicsContentTexts,
} from "@/lib/phonics-static-audio";
import { isPhonicsModuleAvailable } from "@/lib/phonics-manifest-validation";
import { getNetworkTier } from "@/lib/network-adaptive-timeout";
import { performanceTier } from "@/lib/performance-tier";
import { isLowMemoryIosClient } from "@/lib/device-lite";
import { logAmyVoiceDiag } from "@/lib/amy-voice-audio-diag";
import {
  buildLearningPathPrediction,
  buildSessionAssetBundle,
  DEFAULT_PREWARM_THRESHOLDS,
  type PrewarmBudget,
  type PrewarmThresholds,
} from "@/lib/phonics-v3/learning-path";
import {
  markPrewarmedKeys,
  recordPrewarmScheduled,
  recordPrewarmSkipped,
} from "@/lib/phonics-prewarm-telemetry";

export type PhonicsPredictivePrewarmInput = {
  /** Required for mastery-driven prediction. Without it we fall back to packs. */
  childId?: number;
  /** Curriculum level from the curriculum API when known. */
  curriculumLevel?: number;
  /** Child age in months — used to seed level when curriculum level is unknown. */
  ageMonths?: number;
  /** Legacy/explicit override — predicted phoneme audioKeys. */
  nextPhonemes?: string[];
  /** Legacy/explicit override — predicted CVC / sight words. */
  nextWords?: string[];
  /** Legacy/explicit override — predicted decodable-story / sentence texts. */
  nextStoryTexts?: string[];
  /** Override confidence thresholds (testing / tuning). */
  thresholds?: PrewarmThresholds;
};

let hubPrewarmStartedThisSession = false;

function prefersReducedData(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return conn?.saveData === true;
}

/** Battery is best-effort: skip heavy prewarm on low, discharging devices. */
async function batteryAllowsPrewarm(): Promise<boolean> {
  try {
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{ level: number; charging: boolean }>;
    };
    if (typeof nav.getBattery !== "function") return true;
    const battery = await nav.getBattery();
    if (battery.charging) return true;
    return battery.level >= 0.2;
  } catch {
    return true;
  }
}

/**
 * Capability gate. Returns true only when it is safe to warm proactively.
 * Conservative: any signal of constraint (offline/slow/saveData/low-mem/low-tier)
 * defers warming to the lazy on-screen path.
 */
export function canPredictivelyPrewarmPhonics(): boolean {
  if (typeof window === "undefined") return false;
  if (!isPhonicsModuleAvailable()) return false;
  const net = getNetworkTier();
  if (net === "offline" || net === "slow") return false;
  if (prefersReducedData()) return false;
  if (isLowMemoryIosClient()) return false;
  if (performanceTier() === "low") return false;
  return true;
}

/**
 * Phase 5 — adaptive per-device warm budget. High-end + fast network warms
 * aggressively; mid-tier warms the essentials; everything else is minimal.
 * (canPredictivelyPrewarmPhonics already excludes low-tier / slow / saveData.)
 */
export function resolvePrewarmBudget(): PrewarmBudget {
  const tier = performanceTier();
  const net = getNetworkTier();
  if (tier === "high" && net === "fast") {
    return { maxPhonemeKeys: 32, maxWords: 16, maxStoryLines: 14 };
  }
  if (tier === "high" || net === "fast") {
    return { maxPhonemeKeys: 20, maxWords: 10, maxStoryLines: 8 };
  }
  return { maxPhonemeKeys: 12, maxWords: 6, maxStoryLines: 5 };
}

/** Whether to also tail-warm the curated full library (only when budget is large). */
function shouldTailWarmLibrary(budget: PrewarmBudget): boolean {
  return budget.maxWords >= 16;
}

function runIdle(task: () => void): void {
  if (typeof window !== "undefined" && window.requestIdleCallback) {
    window.requestIdleCallback(task, { timeout: 2500 });
    return;
  }
  if (typeof window !== "undefined") {
    window.setTimeout(task, 200);
    return;
  }
  task();
}

/**
 * Kick off predictive phonics warming from the Parent Hub. Idempotent per
 * session; safe to call on every hub mount.
 *
 * Pass `childId` (+ optional `curriculumLevel` / `ageMonths`) for mastery-driven
 * warming. Explicit `nextPhonemes/nextWords/nextStoryTexts` still work and take
 * precedence (used by tests / callers with their own prediction).
 */
export function schedulePhonicsPredictivePrewarm(
  input: PhonicsPredictivePrewarmInput = {},
): void {
  if (hubPrewarmStartedThisSession) return;
  if (!canPredictivelyPrewarmPhonics()) {
    recordPrewarmSkipped("capability_gate");
    return;
  }
  hubPrewarmStartedThisSession = true;

  runIdle(() => {
    void (async () => {
      if (!(await batteryAllowsPrewarm())) {
        hubPrewarmStartedThisSession = false; // allow retry once charging
        recordPrewarmSkipped("battery");
        return;
      }

      const budget = resolvePrewarmBudget();
      const thresholds = input.thresholds ?? DEFAULT_PREWARM_THRESHOLDS;

      let phonemeKeys = input.nextPhonemes ?? [];
      let wordTexts = input.nextWords ?? [];
      let storyTexts = input.nextStoryTexts ?? [];
      let predictionConfidence = 100;
      let level = input.curriculumLevel ?? 0;

      // Mastery-driven path: derive the child's ACTUAL next targets.
      const hasExplicit =
        (input.nextPhonemes?.length ?? 0) +
          (input.nextWords?.length ?? 0) +
          (input.nextStoryTexts?.length ?? 0) >
        0;
      if (!hasExplicit && typeof input.childId === "number") {
        try {
          const prediction = buildLearningPathPrediction({
            childId: input.childId,
            curriculumLevel: input.curriculumLevel,
            ageMonths: input.ageMonths,
          });
          const bundle = buildSessionAssetBundle(prediction, budget, thresholds);
          phonemeKeys = bundle.phonemeKeys;
          wordTexts = bundle.wordTexts;
          storyTexts = bundle.storyTexts;
          predictionConfidence = prediction.lesson.confidence;
          level = prediction.context.level;
        } catch (err) {
          logAmyVoiceDiag("phonics_prewarm_prediction_error", {
            message: err instanceof Error ? err.message : String(err),
          });
        }
      } else {
        // Apply budget caps to explicit packs too.
        phonemeKeys = phonemeKeys.slice(0, budget.maxPhonemeKeys);
        wordTexts = wordTexts.slice(0, budget.maxWords);
        storyTexts = storyTexts.slice(0, budget.maxStoryLines);
      }

      if (phonemeKeys.length + wordTexts.length + storyTexts.length === 0) {
        recordPrewarmSkipped("empty_bundle");
        return;
      }

      recordPrewarmScheduled({
        childId: input.childId ?? -1,
        level,
        confidence: predictionConfidence,
        phonemes: phonemeKeys.length,
        words: wordTexts.length,
        storyLines: storyTexts.length,
      });
      logAmyVoiceDiag("phonics_predictive_prewarm", {
        net: getNetworkTier(),
        tier: performanceTier(),
        phonemes: phonemeKeys.length,
        words: wordTexts.length,
        stories: storyTexts.length,
        confidence: predictionConfidence,
      });

      // Warm ONLY the predicted next-session assets, and remember them so the
      // telemetry layer can compute prewarm hit/miss against real playback.
      if (phonemeKeys.length) {
        prefetchPhonicsAudioKeys(phonemeKeys);
        markPrewarmedKeys(phonemeKeys);
      }
      if (wordTexts.length) {
        prefetchPhonicsContentTexts(wordTexts);
        markPrewarmedKeys(wordTexts);
      }
      if (storyTexts.length) {
        prefetchPhonicsContentTexts(storyTexts);
        markPrewarmedKeys(storyTexts);
      }

      // Only the strongest devices tail-warm the full curated library, and only
      // after the targeted next-session assets are queued.
      if (shouldTailWarmLibrary(budget)) {
        prefetchEntirePhonicsLibrary();
      }
    })();
  });
}

/** Test-only reset. */
export function _resetPhonicsPredictivePrewarmForTests(): void {
  hubPrewarmStartedThisSession = false;
}
