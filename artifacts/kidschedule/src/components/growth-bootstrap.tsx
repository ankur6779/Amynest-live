import { useEffect } from "react";
import { initInstallAttributionListeners } from "@/lib/install-attribution";
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
  }, []);

  return null;
}
