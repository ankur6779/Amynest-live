/**
 * Boot-time self-healing installation — wires levels 4, 6, 8 without code mutation.
 */

import { startResilienceWatcher } from "@/lib/resilience-recovery";
import { recordSelfHealingAction } from "@/lib/self-healing/action-log";
import { getSelfHealingDashboardSnapshot } from "@/lib/self-healing/dashboard";

let installed = false;

export function installSelfHealingRuntime(): () => void {
  if (typeof window === "undefined" || installed) return () => {};
  installed = true;

  const stopResilience = startResilienceWatcher({
    onReport: (report) => {
      if (report.removedCorruptedPayload || report.removedStaleEntries > 0) {
        recordSelfHealingAction(
          `resilience:${report.notes.join(";").slice(0, 100)}`,
        );
      }
    },
  });

  window.addEventListener("online", () => recordSelfHealingAction("network:online"));
  window.addEventListener("offline", () => recordSelfHealingAction("network:offline"));

  const w = window as Window & {
    __amynestSelfHealingDashboard?: typeof getSelfHealingDashboardSnapshot;
  };
  w.__amynestSelfHealingDashboard = getSelfHealingDashboardSnapshot;

  console.info("[amynest:self-healing] Runtime installed");
  return stopResilience;
}
