import { useEffect } from "react";
import { initInstallAttributionListeners } from "@/lib/install-attribution";
import { installLearningEventBus } from "@/lib/learning-events-bridge";
import { installKnowledgeGraphDiscoveryBridge } from "@/lib/knowledge-graph-client";
import { installLearningRuntimeBridge } from "@/lib/learning-runtime-bridge";
import { recordInstallTimestampIfNeeded } from "@/lib/review-service";
import { recordEngagementDay } from "@/lib/retention-engine";

/**
 * Bootstraps growth systems: install attribution, review install timestamp,
 * and daily engagement streak on app open.
 */
export function GrowthBootstrap() {
  useEffect(() => {
    recordInstallTimestampIfNeeded();
    initInstallAttributionListeners();
    recordEngagementDay("app_open");
    installLearningEventBus();
    installKnowledgeGraphDiscoveryBridge();
    installLearningRuntimeBridge();
    // Silent production collectors — no UI.
    void import("@/lib/learning-telemetry-host").then((m) => {
      m.installLearningTelemetry();
    });
    // DEV-only tooling. Production tree-shakes these branches.
    if (import.meta.env.DEV) {
      void import("@/lib/amy-runtime-inspector").then((m) => {
        m.installAmyRuntimeInspector();
      });
      void import("@/lib/learning-reliability-host").then((m) => {
        m.installLearningReliabilityHost();
      });
    }
  }, []);

  return null;
}
