const TRANSITION_MS = 180;

type DocumentWithVT = Document & {
  startViewTransition?: (updateCallback: () => void | Promise<void>) => {
    finished: Promise<void>;
  };
};

/**
 * Runs a DOM update inside the View Transitions API when supported.
 * Falls back to immediate execution on older WebViews / browsers.
 */
export function withViewTransition(update: () => void): void {
  if (typeof document === "undefined") {
    update();
    return;
  }

  const startVT = (document as DocumentWithVT).startViewTransition;
  if (typeof startVT !== "function") {
    update();
    return;
  }

  startVT.call(document, () => {
    update();
  });
}

export const VIEW_TRANSITION_DURATION_MS = TRANSITION_MS;
