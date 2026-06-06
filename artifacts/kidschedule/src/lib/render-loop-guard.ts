/**
 * Safeguards that warn (dev) or recover (prod) before React hits
 * "Maximum update depth exceeded".
 */

import { devLog } from "@/lib/dev-log";
import { logError } from "@/lib/crash-logger";
import { canAttemptAutoRecovery, navigateToSafeRoute } from "@/lib/crash-recovery";
import { isInfiniteRenderError } from "@/lib/runtime-crash-policy";

const RENDER_WARN_THRESHOLD = 40;
const REDIRECT_WARN_THRESHOLD = 6;
const REDIRECT_WINDOW_MS = 2000;

type ComponentStats = { renders: number; lastWarnAt: number };

const renderCounts = new Map<string, ComponentStats>();
const redirectHits = new Map<string, number[]>();

export function trackRender(label: string): void {
  if (!import.meta.env.DEV) return;
  const now = Date.now();
  const prev = renderCounts.get(label) ?? { renders: 0, lastWarnAt: 0 };
  const next = { renders: prev.renders + 1, lastWarnAt: prev.lastWarnAt };
  renderCounts.set(label, next);

  if (next.renders >= RENDER_WARN_THRESHOLD && now - prev.lastWarnAt > 3000) {
    next.lastWarnAt = now;
    console.warn(
      `[amynest:render-loop-guard] "${label}" rendered ${next.renders} times — possible infinite loop`,
    );
    devLog("[render-loop-guard]", label, next.renders);

    if (!import.meta.env.DEV && next.renders >= RENDER_WARN_THRESHOLD * 2) {
      const synthetic = new Error("Maximum update depth exceeded (render-loop-guard)");
      if (isInfiniteRenderError(synthetic) && canAttemptAutoRecovery()) {
        logError(synthetic, `render-loop:${label}`);
        navigateToSafeRoute();
      }
    }
  }
}

export function resetRenderCount(label: string): void {
  renderCounts.delete(label);
}

export function trackRedirect(path: string): void {
  if (!import.meta.env.DEV) return;
  const now = Date.now();
  const recent = (redirectHits.get(path) ?? []).filter((t) => now - t < REDIRECT_WINDOW_MS);
  recent.push(now);
  redirectHits.set(path, recent);
  if (recent.length >= REDIRECT_WARN_THRESHOLD) {
    console.warn(
      `[amynest:render-loop-guard] ${recent.length} redirects to "${path}" in ${REDIRECT_WINDOW_MS}ms`,
    );
  }
}

/** Hook-friendly wrapper for class components / manual instrumentation. */
export function useRenderLoopGuard(label: string): void {
  if (!import.meta.env.DEV) return;
  trackRender(label);
}
