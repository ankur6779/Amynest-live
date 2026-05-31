/**
 * Phase 12 — Runtime release certification report (existing telemetry only).
 */

import {
  getAudioReliabilityDashboard,
  getLatencyReport,
  getRootCauseReport,
} from "@/lib/audio-reliability-telemetry";
import { getAndroidAudioRecoveryStats } from "@/lib/android-audio-lifecycle";
import { rankFailureImpact } from "@/lib/audio-auto-fix-engine";
import { exportDeviceMatrixTemplate } from "@/lib/audio-reliability-telemetry";

export type ReleaseCertificationReport = {
  timestamp: string;
  pass_gate: {
    speech_coach_success: boolean;
    learning_zone_success: boolean;
    blending_success: boolean;
    reading_success: boolean;
    parent_hub_success: boolean;
    cache_hit_95: boolean;
    gesture_coverage_100: boolean;
    focus_recovery_100: boolean;
    manifest_missing_0: boolean;
  };
  go_no_go: "GO" | "NO-GO";
  module_metrics: ReturnType<typeof getAudioReliabilityDashboard>;
  latency: ReturnType<typeof getLatencyReport>;
  top_missing_assets: ReturnType<typeof rankFailureImpact>;
  remaining_failures: ReturnType<typeof rankFailureImpact>;
  android_recovery: ReturnType<typeof getAndroidAudioRecoveryStats>;
  root_causes: ReturnType<typeof getRootCauseReport>;
  device_matrix_template: ReturnType<typeof exportDeviceMatrixTemplate>;
};

const SUCCESS_TARGET = 99.5;
const CACHE_TARGET = 95;

function moduleSuccess(module: string): number {
  const row = getAudioReliabilityDashboard().find((d) => d.module === module);
  if (!row || row.requested === 0) return 100;
  return row.successRate;
}

function moduleCacheHit(module: string): number {
  const row = getLatencyReport().modules.find((m) => m.module === module);
  return row?.cache_hit_rate ?? 100;
}

export function getReleaseCertificationReport(
  opts?: { gestureCoveragePct?: number; manifestMissing?: number },
): ReleaseCertificationReport {
  const gesturePct = opts?.gestureCoveragePct ?? 100;
  const manifestMissing = opts?.manifestMissing ?? 0;
  const android = getAndroidAudioRecoveryStats();

  const speechCoach = moduleSuccess("speech_coach");
  const phonics = moduleSuccess("phonics");
  const blending = moduleSuccess("blending");
  const reading = moduleSuccess("reading");
  const parentHub = moduleSuccess("parent_hub");

  const lzCache = Math.min(moduleCacheHit("phonics"), moduleCacheHit("blending"));
  const coachCache = moduleCacheHit("speech_coach");

  const pass = {
    speech_coach_success: speechCoach >= SUCCESS_TARGET,
    learning_zone_success: phonics >= SUCCESS_TARGET,
    blending_success: blending >= SUCCESS_TARGET,
    reading_success: reading >= SUCCESS_TARGET,
    parent_hub_success: parentHub >= SUCCESS_TARGET,
    cache_hit_95: lzCache >= CACHE_TARGET && coachCache >= CACHE_TARGET,
    gesture_coverage_100: gesturePct >= 100,
    focus_recovery_100: android.unrecovered_focus_loss === 0,
    manifest_missing_0: manifestMissing === 0,
  };

  const allPass = Object.values(pass).every(Boolean);

  return {
    timestamp: new Date().toISOString(),
    pass_gate: pass,
    go_no_go: allPass ? "GO" : "NO-GO",
    module_metrics: getAudioReliabilityDashboard(),
    latency: getLatencyReport(),
    top_missing_assets: rankFailureImpact().slice(0, 10),
    remaining_failures: rankFailureImpact().slice(1),
    android_recovery: android,
    root_causes: getRootCauseReport(),
    device_matrix_template: exportDeviceMatrixTemplate(),
  };
}

declare global {
  interface Window {
    __amynestAudioCertification?: {
      report: () => ReleaseCertificationReport;
      deviceMatrix: () => ReturnType<typeof exportDeviceMatrixTemplate>;
    };
  }
}

export function installAudioReleaseCertificationDevTools(): void {
  if (typeof window === "undefined") return;
  window.__amynestAudioCertification = {
    report: getReleaseCertificationReport,
    deviceMatrix: exportDeviceMatrixTemplate,
  };
  console.info(
    "[AudioCertification] Ready — window.__amynestAudioCertification.report()",
  );
}
