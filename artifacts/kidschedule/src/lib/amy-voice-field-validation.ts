/**
 * Field validation harness — real-world Amy voice checks (network, device tier, health).
 */

import {
  AMY_VOICE_SUCCESS_TARGETS,
  getAmyVoiceHealthSnapshot,
  resetAmyVoiceHealthMetrics,
  type AmyVoiceHealthSnapshot,
} from "@/lib/amy-voice-health";
import {
  getAmyVoiceAnalyticsSnapshot,
  resetAmyVoiceAnalytics,
  type AmyVoiceAnalyticsSnapshot,
} from "@/lib/amy-voice-analytics";
import { getAmyVoiceDeliverySnapshot } from "@/lib/amy-voice-delivery-profile";
import { buildWeeklyStruggleReview } from "@/lib/amy-voice-struggle-insights";
import { isAndroidAmyNestAudioClient } from "@/lib/device-lite";
import { isAmyVoiceOffline, getTtsApiCircuitRemainingMs } from "@/lib/amy-voice-circuit";

export type AmyVoiceDeviceTier = "low" | "mid" | "high";

export type AmyVoiceNetworkProfile = "online" | "offline" | "degraded";

export type AmyVoiceFieldValidationReport = {
  at: number;
  deviceTier: AmyVoiceDeviceTier;
  networkProfile: AmyVoiceNetworkProfile;
  health: AmyVoiceHealthSnapshot;
  analytics: AmyVoiceAnalyticsSnapshot;
  delivery: ReturnType<typeof getAmyVoiceDeliverySnapshot>;
  weeklyReview: ReturnType<typeof buildWeeklyStruggleReview>;
  recommendations: string[];
  passed: boolean;
};

export type AmyVoiceFieldValidationOptions = {
  /** Simulate degraded network expectations without mutating navigator.onLine. */
  assumeDegradedNetwork?: boolean;
  /** Force low-end device pacing thresholds. */
  forceLowEndDevice?: boolean;
};

function detectDeviceTier(forceLowEnd = false): AmyVoiceDeviceTier {
  if (forceLowEnd) return "low";
  if (typeof navigator === "undefined") return "mid";

  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency ?? 4;
  const isAndroid = isAndroidAmyNestAudioClient();

  if ((memory != null && memory <= 2) || cores <= 4 || isAndroid) return "low";
  if ((memory != null && memory <= 4) || cores <= 6) return "mid";
  return "high";
}

function detectNetworkProfile(assumeDegraded = false): AmyVoiceNetworkProfile {
  if (assumeDegraded) return "degraded";
  if (isAmyVoiceOffline()) return "offline";
  if (getTtsApiCircuitRemainingMs() > 0) return "degraded";
  return "online";
}

function buildRecommendations(
  health: AmyVoiceHealthSnapshot,
  analytics: AmyVoiceAnalyticsSnapshot,
  deviceTier: AmyVoiceDeviceTier,
  networkProfile: AmyVoiceNetworkProfile,
): string[] {
  const recs: string[] = [];

  if (deviceTier === "low") {
    recs.push("Prefer static/cache layers; validate speak latency on a physical low-RAM device.");
  }
  if (networkProfile !== "online") {
    recs.push("Confirm emergency_local and text_visual fallbacks remain audible and teacher-like.");
  }
  if (!health.meetsSuccessTargets && health.rollingWindow.sampleSize >= 25) {
    if (health.rollingWindow.fallbackRate > AMY_VOICE_SUCCESS_TARGETS.maxFallbackRate) {
      recs.push("Prioritize static audio generation for top fallback phrases.");
    }
    if (health.rollingWindow.avgReplayCount > AMY_VOICE_SUCCESS_TARGETS.maxAvgReplayCount) {
      recs.push("Review teaching delivery and phrase splitting for high-replay content.");
    }
  }
  if (analytics.topStrugglePhrases.length > 0) {
    recs.push(
      `Generate static audio for: ${analytics.topStrugglePhrases
        .slice(0, 3)
        .map((p) => p.text.slice(0, 40))
        .join(" | ")}`,
    );
  }
  if (analytics.staticAudioPriorities.length > 0) {
    recs.push(
      `Top static-audio queue: ${analytics.staticAudioPriorities
        .slice(0, 3)
        .map((p) => p.text.slice(0, 40))
        .join(" | ")}`,
    );
  }
  const weekly = buildWeeklyStruggleReview();
  if (weekly.recommendedActions.length > 0) {
    recs.push(`Weekly teaching focus: ${weekly.recommendedActions.slice(0, 3).join(", ")}`);
  }

  return recs;
}

/** Snapshot current session health/analytics with device + network context. */
export function runAmyVoiceFieldValidation(
  options: AmyVoiceFieldValidationOptions = {},
): AmyVoiceFieldValidationReport {
  const deviceTier = detectDeviceTier(options.forceLowEndDevice);
  const networkProfile = detectNetworkProfile(options.assumeDegradedNetwork);
  const health = getAmyVoiceHealthSnapshot();
  const analytics = getAmyVoiceAnalyticsSnapshot();
  const delivery = getAmyVoiceDeliverySnapshot();
  const weeklyReview = buildWeeklyStruggleReview();
  const recommendations = buildRecommendations(
    health,
    analytics,
    deviceTier,
    networkProfile,
  );

  const passed =
    health.healthStatus === "healthy" ||
    health.healthStatus === "watch" ||
    health.rollingWindow.sampleSize < 25;

  return {
    at: Date.now(),
    deviceTier,
    networkProfile,
    health,
    analytics,
    delivery,
    weeklyReview,
    recommendations,
    passed,
  };
}

export function resetAmyVoiceFieldValidationSession(): void {
  resetAmyVoiceHealthMetrics();
  resetAmyVoiceAnalytics();
}

export type AmyVoiceFieldValidationApi = {
  run: typeof runAmyVoiceFieldValidation;
  reset: typeof resetAmyVoiceFieldValidationSession;
  successTargets: typeof AMY_VOICE_SUCCESS_TARGETS;
};

declare global {
  interface Window {
    __amyVoiceValidation?: AmyVoiceFieldValidationApi;
  }
}

export function installAmyVoiceFieldValidationHarness(): void {
  if (typeof window === "undefined") return;
  window.__amyVoiceValidation = {
    run: runAmyVoiceFieldValidation,
    reset: resetAmyVoiceFieldValidationSession,
    successTargets: AMY_VOICE_SUCCESS_TARGETS,
  };
  if (import.meta.env.DEV) {
    console.info(
      "[AMY VOICE]",
      "Field validation ready — run __amyVoiceValidation.run({ forceLowEndDevice: true })",
    );
  }
}
