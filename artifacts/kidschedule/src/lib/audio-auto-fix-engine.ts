/**
 * Phase 11 — Auto-fix engine: ranks top failures by impact and applies existing remediations.
 * No new telemetry — consumes rootCauseReport() only.
 */

import { warmSpeechCoach } from "@/lib/global-audio-warmup";
import { prefetchEntirePhonicsLibrary } from "@/lib/phonics-static-audio";
import { audioManager } from "@/lib/audio-manager";
import { getCoachDialogueWarmupPhrases } from "@workspace/speech-coach";
import {
  getFailureDashboard,
  getRootCauseReport,
  getTopFailureCauses,
  type AudioFailureReason,
  type AudioReliabilityModule,
} from "@/lib/audio-reliability-telemetry";

export type AutoFixImpactRow = {
  failure_reason: AudioFailureReason;
  impact_score: number;
  affected_modules: AudioReliabilityModule[];
  affected_devices: string[];
  estimated_user_impact: string;
  count: number;
  percentage: number;
  fix_action: string;
  fix_applied: boolean;
};

const DEVICE_HINTS = ["android_webview", "android_browser", "ios", "web"] as const;

function estimateUserImpact(reason: AudioFailureReason, pct: number): string {
  if (pct >= 30) return `Critical — ~${pct}% of audio failures; users hear silence or long waits`;
  if (pct >= 15) return `High — ~${pct}% of failures; frequent tap-to-retry friction`;
  if (pct >= 5) return `Moderate — ~${pct}% of failures; occasional missed playback`;
  return `Low — ~${pct}% of failures`;
}

function impactScore(count: number, pct: number, moduleSpread: number): number {
  return Math.round(count * 10 + pct * 100 + moduleSpread * 50);
}

/** Rank failure categories by impact (descending). */
export function rankFailureImpact(): AutoFixImpactRow[] {
  const failures = getFailureDashboard();
  const top = getTopFailureCauses(10);
  const byReason = new Map<AudioFailureReason, AutoFixImpactRow>();

  for (const row of failures) {
    const existing = byReason.get(row.failure_reason);
    if (existing) {
      existing.affected_modules.push(row.module);
      existing.count += row.count;
    } else {
      const topRow = top.find((t) => t.failure_reason === row.failure_reason);
      byReason.set(row.failure_reason, {
        failure_reason: row.failure_reason,
        impact_score: 0,
        affected_modules: [row.module],
        affected_devices: [...DEVICE_HINTS],
        estimated_user_impact: estimateUserImpact(row.failure_reason, topRow?.percentage ?? row.percentage),
        count: row.count,
        percentage: topRow?.percentage ?? row.percentage,
        fix_action: fixActionFor(row.failure_reason),
        fix_applied: false,
      });
    }
  }

  const ranked = [...byReason.values()].map((r) => ({
    ...r,
    affected_modules: [...new Set(r.affected_modules)],
    impact_score: impactScore(r.count, r.percentage, r.affected_modules.length),
  }));

  return ranked.sort((a, b) => b.impact_score - a.impact_score);
}

function fixActionFor(reason: AudioFailureReason): string {
  switch (reason) {
    case "AUDIO_FOCUS_LOST":
      return "Re-prime audio pipeline on visibility visible; register lifecycle recovery";
    case "CACHE_MISS":
      return "Prefetch phonics library + warm Speech Coach static phrases";
    case "AUTOPLAY_BLOCKED":
      return "Unlock media pipeline from user gesture";
    case "PIPELINE_TIMEOUT":
      return "Coalesce duplicate requests; discard stale downloads";
    case "SOURCE_NOT_FOUND":
      return "Validate static map / phonics manifest entries";
    case "NETWORK_TIMEOUT":
      return "Warm IndexedDB from static URLs on cache miss";
    case "DECODE_ERROR":
      return "Pre-decode hot assets during warmup";
    case "PLAY_REJECTED":
      return "Request coalescing + latest-wins stale guard";
    case "UNMOUNTED_DURING_PLAY":
      return "Intent epoch stale prevention before play";
    default:
      return "Inspect failed traces for root cause";
  }
}

/** Apply fix for the highest-impact failure category. Returns what was done. */
export function applyTopFailureFix(): {
  target: AutoFixImpactRow | null;
  actions: string[];
} {
  const ranked = rankFailureImpact();
  const target = ranked[0] ?? null;
  if (!target) return { target: null, actions: [] };

  const actions: string[] = [];

  switch (target.failure_reason) {
    case "CACHE_MISS":
    case "SOURCE_NOT_FOUND":
    case "NETWORK_TIMEOUT":
      prefetchEntirePhonicsLibrary();
      warmSpeechCoach([...getCoachDialogueWarmupPhrases()]);
      actions.push("prefetchEntirePhonicsLibrary", "warmSpeechCoach(all warmup phrases)");
      break;
    case "AUTOPLAY_BLOCKED":
      audioManager.unlockFromUserGesture();
      actions.push("audioManager.unlockFromUserGesture()");
      break;
    case "AUDIO_FOCUS_LOST":
      audioManager.warmMediaPipeline(true, { fromUserGesture: true });
      actions.push("warmMediaPipeline(force)");
      break;
    case "DECODE_ERROR":
      warmSpeechCoach([...getCoachDialogueWarmupPhrases()]);
      prefetchEntirePhonicsLibrary();
      actions.push("pre-decode via warmup batch");
      break;
    case "PIPELINE_TIMEOUT":
    case "PLAY_REJECTED":
    case "UNMOUNTED_DURING_PLAY":
      actions.push("stale guard + coalescer active (runtime)");
      break;
    default:
      actions.push("no automatic fix — manual trace review");
  }

  target.fix_applied = actions.length > 0;
  return { target, actions };
}

/** Full remediation plan sorted by impact — for console / release gate. */
export function getAutoFixPlan(): {
  ranked: AutoFixImpactRow[];
  report: ReturnType<typeof getRootCauseReport>;
  topFix: ReturnType<typeof applyTopFailureFix>;
  remainingBlockers: AutoFixImpactRow[];
} {
  const ranked = rankFailureImpact();
  const topFix = applyTopFailureFix();
  return {
    ranked,
    report: getRootCauseReport(),
    topFix,
    remainingBlockers: ranked.slice(1),
  };
}

declare global {
  interface Window {
    __amynestAudioAutoFix?: {
      plan: () => ReturnType<typeof getAutoFixPlan>;
      applyTop: () => ReturnType<typeof applyTopFailureFix>;
      ranked: () => AutoFixImpactRow[];
    };
  }
}

export function installAudioAutoFixDevTools(): void {
  if (typeof window === "undefined") return;
  window.__amynestAudioAutoFix = {
    plan: getAutoFixPlan,
    applyTop: applyTopFailureFix,
    ranked: rankFailureImpact,
  };
}
