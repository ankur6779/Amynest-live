/**
 * Amy Runtime Inspector — full-page DEV console.
 * Gated: import.meta.env.DEV or ?debug=1 / ?dev=1 / ?runtimeInspector=1
 * No production UI impact (route redirects in PROD).
 */

import { useEffect, useMemo, useState } from "react";
import { ScreenShell } from "@/components/screen-shell";
import { EmptyStateCard } from "@/components/learning-progress";
import { RuntimeInspectorConsole } from "@/components/amy-runtime-inspector/runtime-inspector-console";
import {
  installAmyRuntimeInspector,
  isAmyRuntimeInspectorBuildEnabled,
  setAmyRuntimeInspectorPreferred,
} from "@/lib/amy-runtime-inspector";

export default function DebugRuntimePage() {
  const allowed = useInspectorAllowed();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!allowed) return;
    setAmyRuntimeInspectorPreferred(true);
    installAmyRuntimeInspector();
    setReady(true);
  }, [allowed]);

  if (!allowed) {
    return (
      <ScreenShell title="Not available">
        <EmptyStateCard
          emoji="🔒"
          title="Runtime Inspector is dev-only"
          message="Open in a DEV build, or append ?debug=1 / ?runtimeInspector=1."
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Amy Runtime Inspector"
      subtitle="Observable learning decisions — events, rules, latency, time travel. No production writes."
    >
      {ready ? (
        <div className="max-w-xl">
          <RuntimeInspectorConsole embedded />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Starting inspector capture…</p>
      )}
    </ScreenShell>
  );
}

function useInspectorAllowed(): boolean {
  return useMemo(() => {
    if (!isAmyRuntimeInspectorBuildEnabled()) {
      // Allow explicit query flags only in non-prod if somehow loaded
      if (typeof window === "undefined") return false;
      try {
        const params = new URLSearchParams(window.location.search);
        return params.get("debug") === "1" || params.get("runtimeInspector") === "1";
      } catch {
        return false;
      }
    }
    return true;
  }, []);
}
