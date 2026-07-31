/**
 * Amy Learning Telemetry — full-page DEV dashboard.
 * Production route redirects to /dashboard (AppCore).
 */

import { useEffect, useMemo, useState } from "react";
import { ScreenShell } from "@/components/screen-shell";
import { EmptyStateCard } from "@/components/learning-progress";
import { LearningTelemetryDashboard } from "@/components/learning-telemetry/telemetry-dashboard";
import { installLearningTelemetry } from "@/lib/learning-telemetry-host";

export default function DebugTelemetryPage() {
  const allowed = useTelemetryAllowed();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!allowed) return;
    try {
      localStorage.setItem("__amynest_learning_telemetry", "1");
    } catch {
      /* ignore */
    }
    installLearningTelemetry();
    setReady(true);
  }, [allowed]);

  if (!allowed) {
    return (
      <ScreenShell title="Not available">
        <EmptyStateCard
          emoji="🔒"
          title="Learning Telemetry is dev-only"
          message="Open in a DEV build, or append ?debug=1 / ?learningTelemetry=1."
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Learning Telemetry"
      subtitle="Health, latency, queues, KG snapshots, alerts — production collectors, DEV dashboard only."
    >
      {ready ? (
        <div className="max-w-2xl">
          <LearningTelemetryDashboard embedded />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Starting collectors…</p>
      )}
    </ScreenShell>
  );
}

function useTelemetryAllowed(): boolean {
  return useMemo(() => {
    if (import.meta.env.DEV) return true;
    if (typeof window === "undefined") return false;
    try {
      const params = new URLSearchParams(window.location.search);
      return (
        params.get("debug") === "1" ||
        params.get("learningTelemetry") === "1" ||
        params.get("dev") === "1"
      );
    } catch {
      return false;
    }
  }, []);
}
