import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildQualityDashboard,
  buildReleaseHealthReport,
  downloadPilotDiagnostics,
  exportPilotDiagnostics,
  getPerformanceSnapshot,
  isPilotModeEnabled,
  resetPilotData,
  setPilotModeEnabled,
  setModuleFlag,
  getEnabledModules,
  avg,
} from "@workspace/teacher-os";
import type { TeacherOsModuleId } from "@workspace/teacher-os";
import { WS_GLASS_CARD, WS_MUTED_TEXT, WS_CONTAINER } from "@/features/worksheet-studio/worksheet-studio-theme";
import { useState } from "react";

/** Internal pilot / admin dashboard — not shown to teachers unless pilot mode or ?tos_admin=1 */
export function TeacherOsPilotDashboard() {
  const [pilot, setPilot] = useState(isPilotModeEnabled());
  const quality = buildQualityDashboard();
  const health = buildReleaseHealthReport();
  const perf = getPerformanceSnapshot();

  const togglePilot = () => {
    setPilotModeEnabled(!pilot);
    setPilot(!pilot);
  };

  return (
    <div className={cn(WS_CONTAINER, "space-y-4 pb-8")}>
      <header className={cn(WS_GLASS_CARD, "p-4")}>
        <h2 className="text-lg font-bold text-[#1e3a5f]">Pilot Intelligence (Internal)</h2>
        <p className={cn("text-sm", WS_MUTED_TEXT)}>Quality, health & adoption metrics</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant={pilot ? "default" : "outline"} onClick={togglePilot}>
            Pilot mode: {pilot ? "ON" : "OFF"}
          </Button>
          <Button size="sm" variant="outline" onClick={downloadPilotDiagnostics}>Export diagnostics JSON</Button>
          <Button size="sm" variant="outline" onClick={resetPilotData}>Reset pilot data</Button>
        </div>
      </header>

      <section className={cn(WS_GLASS_CARD, "p-4")}>
        <p className="text-xs font-bold uppercase text-[#1e3a5f]/60">Release health</p>
        <ul className={cn("mt-2 space-y-1 text-sm", WS_MUTED_TEXT)}>
          <li>Crash-free sessions: {health.crashFreeRate}% ({health.crashFreeSessions}/{health.totalSessions})</li>
          <li>API failures: {health.apiFailures}</li>
          <li>Offline fallbacks: {health.offlineFallbacks}</li>
          <li>PDF export failures: {health.pdfExportFailures}</li>
          <li>Vision failures: {health.visionFailures}</li>
        </ul>
      </section>

      <section className={cn(WS_GLASS_CARD, "p-4")}>
        <p className="text-xs font-bold uppercase text-[#1e3a5f]/60">Most / least used</p>
        <p className={cn("mt-2 text-sm", WS_MUTED_TEXT)}>
          Top: {quality.mostUsedFeatures.map((f) => `${f.feature} (${f.count})`).join(", ") || "—"}
        </p>
        <p className={cn("text-sm", WS_MUTED_TEXT)}>
          Unused: {quality.leastUsedFeatures.map((f) => f.feature).join(", ") || "—"}
        </p>
        <p className={cn("mt-2 text-sm", WS_MUTED_TEXT)}>
          Export rate: {quality.exportRate}% · AI acceptance: {quality.aiAcceptanceRate}% · Avg quality: {quality.avgWorksheetQuality}
        </p>
      </section>

      <section className={cn(WS_GLASS_CARD, "p-4")}>
        <p className="text-xs font-bold uppercase text-[#1e3a5f]/60">Performance</p>
        <ul className={cn("mt-2 space-y-1 text-sm", WS_MUTED_TEXT)}>
          <li>Avg AI latency: {avg(perf.aiLatencyMs)}ms</li>
          <li>Avg editor load: {avg(perf.editorLoadMs)}ms</li>
          <li>Avg time to export: {avg(perf.timeToExportMs)}ms</li>
          <li>Avg session: {Math.round(quality.avgSessionDurationMs / 1000)}s</li>
        </ul>
      </section>

      <section className={cn(WS_GLASS_CARD, "p-4")}>
        <p className="text-xs font-bold uppercase text-[#1e3a5f]/60">Module flags</p>
        <p className={cn("mt-1 text-xs", WS_MUTED_TEXT)}>Enabled: {getEnabledModules().join(", ")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["monthly_curriculum", "admin_dashboard"] as TeacherOsModuleId[]).map((m) => (
            <Button key={m} size="sm" variant="outline" onClick={() => setModuleFlag(m, true)}>{m}</Button>
          ))}
        </div>
      </section>

      <details className={cn(WS_GLASS_CARD, "p-4 text-xs", WS_MUTED_TEXT)}>
        <summary className="cursor-pointer font-medium text-[#1e3a5f]">Raw export preview</summary>
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all">
          {JSON.stringify(exportPilotDiagnostics(), null, 2).slice(0, 3000)}…
        </pre>
      </details>
    </div>
  );
}
