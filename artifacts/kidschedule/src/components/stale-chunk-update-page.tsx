/**
 * Shown when a lazy route chunk fails after deploy (stale hashed asset).
 * Avoids AppErrorBoundary "navigate away" loops on Birth Sky / Astro.
 */

import { useState } from "react";
import { AppFallbackUi } from "@/components/app-fallback-ui";
import { handleRecoveryReload } from "@/lib/clear-cache-reload";
import { clearRefreshCompleteFlag } from "@/lib/refresh-orchestrator";

const STALE_RELOAD_TS = "amynest:stale-chunk-reload:ts";
const STALE_RELOAD_COUNT = "amynest:stale-chunk-reload:count";

function clearStaleReloadBudget(): void {
  try {
    sessionStorage.removeItem(STALE_RELOAD_TS);
    sessionStorage.removeItem(STALE_RELOAD_COUNT);
  } catch {
    /* ignore */
  }
}

type Props = {
  /** Optional route label for support context */
  label?: string;
};

export function StaleChunkUpdatePage({ label }: Props) {
  const [reloading, setReloading] = useState(false);

  return (
    <AppFallbackUi
      title="Update ready"
      message={
        label
          ? `A newer AmyNest build is ready to open ${label}.\nRefresh once to continue.`
          : "A newer AmyNest build is ready.\nRefresh once to continue."
      }
      primaryLabel="Refresh AmyNest"
      reloading={reloading}
      onReload={() => {
        setReloading(true);
        clearStaleReloadBudget();
        clearRefreshCompleteFlag();
        void handleRecoveryReload({ force: true, reason: "stale_chunk_update_page" });
      }}
      onGoHome={() => {
        clearStaleReloadBudget();
        window.location.assign("/");
      }}
    />
  );
}
