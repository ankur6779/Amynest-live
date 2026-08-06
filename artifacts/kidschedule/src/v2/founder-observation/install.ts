/**
 * Installs Founder Observation capture on the page.
 * DEV + opt-in only. Renders nothing. No analytics sink.
 */

import {
  isFounderObservationBuildEnabled,
  isFounderObservationEnabled,
  setFounderObservationPreferred,
} from "./enabled";
import {
  describeActionTarget,
  isMeaningfulActionTarget,
} from "./classify";
import {
  exportFounderObservationJson,
  getFounderObservationSummary,
  isFounderObservationSessionActive,
  noteActivity,
  recordExit,
  recordMeaningfulAction,
  recordScreen,
  resetFounderObservationStore,
  startFounderObservationSession,
} from "./store";

export type FounderObservationApi = {
  getSummary: typeof getFounderObservationSummary;
  exportJson: typeof exportFounderObservationJson;
  clear: () => void;
  enable: () => void;
  disable: () => void;
  isActive: () => boolean;
};

declare global {
  interface Window {
    __AMYNEST_FOUNDER_OBS__?: FounderObservationApi;
  }
}

let installed = false;
let listenersAttached = false;

function attachListeners(): void {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;

  const onPointer = () => noteActivity();
  const onKey = () => noteActivity();
  const onClick = (event: MouseEvent) => {
    noteActivity();
    if (isMeaningfulActionTarget(event.target)) {
      recordMeaningfulAction(
        describeActionTarget(event.target),
        window.location.pathname,
      );
    }
  };
  const onExit = () => recordExit("pagehide");

  window.addEventListener("pointerdown", onPointer, { passive: true });
  window.addEventListener("keydown", onKey, { passive: true });
  window.addEventListener("scroll", onPointer, { passive: true });
  window.addEventListener("click", onClick, true);
  window.addEventListener("pagehide", onExit);

  (attachListeners as unknown as { _cleanup?: () => void })._cleanup = () => {
    window.removeEventListener("pointerdown", onPointer);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("scroll", onPointer);
    window.removeEventListener("click", onClick, true);
    window.removeEventListener("pagehide", onExit);
    listenersAttached = false;
  };
}

function detachListeners(): void {
  const cleanup = (attachListeners as unknown as { _cleanup?: () => void })
    ._cleanup;
  cleanup?.();
}

function exposeApi(): void {
  if (typeof window === "undefined") return;
  window.__AMYNEST_FOUNDER_OBS__ = {
    getSummary: getFounderObservationSummary,
    exportJson: exportFounderObservationJson,
    clear: () => {
      resetFounderObservationStore();
      if (isFounderObservationEnabled()) {
        startFounderObservationSession(window.location.pathname);
      }
    },
    enable: () => {
      setFounderObservationPreferred(true);
      installFounderObservation();
    },
    disable: () => {
      setFounderObservationPreferred(false);
      uninstallFounderObservation();
    },
    isActive: isFounderObservationSessionActive,
  };
}

export function installFounderObservation(): boolean {
  if (!isFounderObservationBuildEnabled()) return false;
  if (!isFounderObservationEnabled()) return false;
  if (installed) return true;
  installed = true;

  exposeApi();
  attachListeners();
  if (!isFounderObservationSessionActive()) {
    startFounderObservationSession(
      typeof window !== "undefined" ? window.location.pathname : "/",
    );
  }
  noteActivity();

  if (typeof console !== "undefined") {
    console.info(
      "[AmyNest Founder Observation] active — window.__AMYNEST_FOUNDER_OBS__.getSummary()",
    );
  }
  return true;
}

export function uninstallFounderObservation(): void {
  if (!installed) return;
  recordExit("uninstall");
  detachListeners();
  resetFounderObservationStore();
  installed = false;
  if (typeof window !== "undefined") {
    delete window.__AMYNEST_FOUNDER_OBS__;
  }
}

export function isFounderObservationInstalled(): boolean {
  return installed;
}

/** Call when the SPA path changes (from the invisible host). */
export function founderObservationOnPathChange(pathname: string): void {
  if (!installed || !isFounderObservationSessionActive()) return;
  recordScreen(pathname);
  noteActivity();
}
