import { RecaptchaVerifier, type Auth } from "firebase/auth";
import { isStandalonePwa } from "./mobile-phone-environment";

export const RECAPTCHA_CONTAINER_ID = "recaptcha-container";

const RENDER_TIMEOUT_MS = 45_000;

/** Strict invisible-only parameters — never use normal/compact. */
const INVISIBLE_PARAMS = {
  size: "invisible" as const,
  badge: "bottomright" as const,
};

let preloadPromise: Promise<boolean> | null = null;

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier | null;
    recaptchaWidgetId?: number;
    recaptchaPreloadFailed?: boolean;
    grecaptcha?: {
      reset: (widgetId?: number) => void;
      getResponse?: (widgetId?: number) => string;
    };
  }
}

function syncVerifierToWindow(verifier: RecaptchaVerifier | null): void {
  window.recaptchaVerifier = verifier;
}

export function applyRecaptchaContainerLayout(el: HTMLElement): void {
  Object.assign(el.style, {
    position: "fixed",
    bottom: "0",
    right: "0",
    width: "1px",
    height: "1px",
    overflow: "visible",
    visibility: "visible",
    display: "block",
    zIndex: "2147483646",
    pointerEvents: "none",
  });
}

export function ensureRecaptchaContainer(): HTMLElement {
  const el = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (!el) {
    throw new Error(
      `#${RECAPTCHA_CONTAINER_ID} not found — add <div id="${RECAPTCHA_CONTAINER_ID}"></div> after #root in index.html`,
    );
  }
  return el;
}

function renderWithTimeout(verifier: RecaptchaVerifier): Promise<number> {
  return Promise.race([
    verifier.render(),
    new Promise<number>((_, reject) => {
      setTimeout(
        () => reject(new Error("Invisible security check timed out. Please refresh.")),
        RENDER_TIMEOUT_MS,
      );
    }),
  ]);
}

/**
 * Preload invisible reCAPTCHA once (page load on sign-in). Never runs in standalone PWA.
 */
export async function preloadInvisibleRecaptcha(auth: Auth): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (isStandalonePwa()) {
    console.info("[recaptcha] skip preload in standalone PWA");
    return false;
  }

  if (window.recaptchaVerifier && window.recaptchaWidgetId !== undefined) {
    return true;
  }

  if (window.recaptchaPreloadFailed) {
    return false;
  }

  if (preloadPromise) {
    return preloadPromise;
  }

  preloadPromise = (async () => {
    try {
      if (window.recaptchaVerifier) {
        return window.recaptchaWidgetId !== undefined;
      }

      const container = ensureRecaptchaContainer();
      applyRecaptchaContainerLayout(container);

      const verifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
        ...INVISIBLE_PARAMS,
        callback: () => {
          console.log("[recaptcha] invisible solved");
        },
        "expired-callback": () => {
          console.warn("[recaptcha] invisible expired — refresh required");
          resetRecaptcha();
          window.recaptchaPreloadFailed = true;
        },
      });

      syncVerifierToWindow(verifier);

      const widgetId = await renderWithTimeout(verifier);
      window.recaptchaWidgetId = widgetId;
      window.recaptchaPreloadFailed = false;

      console.log("[recaptcha] invisible preloaded", {
        domain: window.location.hostname,
        widgetId,
      });

      return true;
    } catch (err) {
      console.error("Recaptcha preload error:", err);
      resetRecaptcha();
      window.recaptchaPreloadFailed = true;
      return false;
    } finally {
      preloadPromise = null;
    }
  })();

  return preloadPromise;
}

export function isRecaptchaReady(): boolean {
  return Boolean(
    typeof window !== "undefined" &&
      window.recaptchaVerifier &&
      window.recaptchaWidgetId !== undefined &&
      !window.recaptchaPreloadFailed,
  );
}

/** Throws if preload did not finish — never creates a visible fallback widget. */
export function getRecaptchaVerifierForSend(): RecaptchaVerifier {
  if (!window.recaptchaVerifier) {
    throw new Error("Recaptcha not ready");
  }
  return window.recaptchaVerifier;
}

export function resetRecaptcha(): void {
  try {
    window.recaptchaVerifier?.clear();
  } catch (err) {
    console.warn("[recaptcha] reset clear", err);
  }
  syncVerifierToWindow(null);
  window.recaptchaWidgetId = undefined;
  preloadPromise = null;
}

export function logRecaptchaState(): void {
  console.log("Domain:", typeof window !== "undefined" ? window.location.hostname : "");
  console.log("Recaptcha exists:", Boolean(window.recaptchaVerifier));
  console.log("Recaptcha rendered:", window.recaptchaWidgetId !== undefined);
  console.log("Recaptcha mode: invisible-only");
  console.log("Recaptcha ready:", isRecaptchaReady());
}

/** @deprecated Use preloadInvisibleRecaptcha + getRecaptchaVerifierForSend */
export async function prepareRecaptchaForSend(auth: Auth): Promise<RecaptchaVerifier> {
  await preloadInvisibleRecaptcha(auth);
  return getRecaptchaVerifierForSend();
}

/** @deprecated */
export function getRecaptcha(auth: Auth): RecaptchaVerifier {
  void auth;
  return getRecaptchaVerifierForSend();
}
