import type { PilotDiagnosticsBundle } from "./pilot-types.js";
import { getOnboardingProgress } from "./onboarding-engine.js";
import { buildReleaseHealthReport } from "./health-reporting.js";
import { buildQualityDashboard } from "./quality-dashboard.js";
import { getPerformanceSnapshot } from "./performance-monitor.js";
import { getSatisfactionRecords } from "./satisfaction-engine.js";
import { getProductEvents, getSessionCount, clearProductEvents } from "./product-analytics.js";
import { isPilotModeEnabled, setPilotModeEnabled } from "./pilot-mode.js";
import { setTeacherOsModuleEnabled, listEnabledTeacherOsModules } from "./feature-flags.js";
import { resetOnboarding } from "./onboarding-engine.js";
import type { TeacherOsModuleId } from "./types.js";

export function exportPilotDiagnostics(): PilotDiagnosticsBundle {
  return {
    exportedAt: new Date().toISOString(),
    pilotMode: isPilotModeEnabled(),
    sessionCount: getSessionCount(),
    events: getProductEvents(),
    onboarding: getOnboardingProgress(),
    health: buildReleaseHealthReport(),
    quality: buildQualityDashboard(),
    performance: getPerformanceSnapshot(),
    satisfaction: getSatisfactionRecords(),
  };
}

export function downloadPilotDiagnostics(): void {
  if (typeof document === "undefined") return;
  const bundle = exportPilotDiagnostics();
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `teacher-os-pilot-${bundle.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function resetPilotData(): void {
  clearProductEvents();
  resetOnboarding();
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("teacher-os-satisfaction-v81");
      localStorage.removeItem("teacher-os-tips-dismissed-v81");
      localStorage.removeItem("teacher-os-perf-v81");
      localStorage.removeItem("teacher-os-analytics-v1");
    }
  } catch { /* */ }
}

export function setModuleFlag(module: TeacherOsModuleId, enabled: boolean): void {
  setTeacherOsModuleEnabled(module, enabled);
}

export function getEnabledModules(): TeacherOsModuleId[] {
  return listEnabledTeacherOsModules();
}

export { setPilotModeEnabled, isPilotModeEnabled };
