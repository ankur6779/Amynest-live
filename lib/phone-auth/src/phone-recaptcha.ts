import {
  RecaptchaVerifier,
  type ApplicationVerifier,
  type Auth,
} from "firebase/auth";
import {
  FIREBASE_PHONE_AUTH_DOMAINS,
  logPhoneOtpDomainContext,
} from "./site-domain";

export { FIREBASE_PHONE_AUTH_DOMAINS } from "./site-domain";
export {
  isAndroidPwa,
  isMobilePhoneOtpEnvironment,
  shouldPreRenderPhoneRecaptcha,
  shouldUseBrowserForPhoneOtp,
  buildPhoneOtpBrowserUrl,
} from "./mobile-phone-environment";

export const RECAPTCHA_CONTAINER_ID = "recaptcha-container";

const RENDER_TIMEOUT_MS = 30_000;

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier | null;
    recaptchaWidgetId?: number;
    grecaptcha?: {
      reset: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
    };
  }
}

let renderPromise: Promise<RecaptchaVerifier> | null = null;

function applyInvisibleRecaptchaContainerLayout(el: HTMLElement): void {
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

/** Persistent mount on document.body — survives route changes. */
export function ensureRecaptchaContainer(): HTMLElement {
  let el = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = RECAPTCHA_CONTAINER_ID;
    document.body.appendChild(el);
  } else if (el.parentElement !== document.body) {
    document.body.appendChild(el);
  }
  applyInvisibleRecaptchaContainerLayout(el);
  return el;
}

export function applyRecaptchaContainerLayout(el: HTMLElement): void {
  applyInvisibleRecaptchaContainerLayout(el);
}

/** @deprecated */
export function mountPhoneRecaptchaContainer(_parent: HTMLElement | null): void {
  ensureRecaptchaContainer();
}

/** @deprecated */
export function setPhoneRecaptchaMobileSheetActive(_active: boolean): void {
  ensureRecaptchaContainer();
}

export function logRecaptchaDebug(context: string): void {
  console.info(`[phone-recaptcha] ${context}`, {
    hostname: typeof window !== "undefined" ? window.location.hostname : "",
    containerPresent: Boolean(document.getElementById(RECAPTCHA_CONTAINER_ID)),
    verifierReady: Boolean(window.recaptchaVerifier),
    widgetId: window.recaptchaWidgetId,
  });
}

/** Clear verifier after OTP failure — do not call on every click. */
export function clearRecaptchaOnFailure(): void {
  try {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
    }
  } catch (err) {
    console.warn("[phone-recaptcha] clear on failure", err);
  }
  window.recaptchaVerifier = null;
  window.recaptchaWidgetId = undefined;
  renderPromise = null;
  const el = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (el) {
    el.innerHTML = "";
    applyInvisibleRecaptchaContainerLayout(el);
  }
}

/** @deprecated Use clearRecaptchaOnFailure */
export function destroyPhoneRecaptchaVerifier(): void {
  clearRecaptchaOnFailure();
}

/** @deprecated */
export function clearPhoneRecaptchaVerifier(): void {
  clearRecaptchaOnFailure();
}

export function resetPhoneRecaptchaWidget(): boolean {
  const widgetId = window.recaptchaWidgetId;
  const grecaptcha = window.grecaptcha;
  if (widgetId === undefined || !grecaptcha?.reset) {
    return false;
  }
  try {
    grecaptcha.reset(widgetId);
    console.log("[phone-recaptcha] grecaptcha.reset", widgetId);
    return true;
  } catch (err) {
    console.warn("[phone-recaptcha] grecaptcha.reset failed", err);
    return false;
  }
}

function renderWithTimeout(verifier: RecaptchaVerifier): Promise<number> {
  return Promise.race([
    verifier.render(),
    new Promise<number>((_, reject) => {
      setTimeout(
        () => reject(new Error("Security check timed out. Please try again.")),
        RENDER_TIMEOUT_MS,
      );
    }),
  ]);
}

/**
 * Create invisible RecaptchaVerifier once (sync). Does not call render().
 * Reuses window.recaptchaVerifier — never recreates on every OTP click.
 */
export function getRecaptcha(auth: Auth): RecaptchaVerifier {
  try {
    ensureRecaptchaContainer();

    if (window.recaptchaVerifier) {
      console.log("[phone-recaptcha] Recaptcha reuse:", window.recaptchaVerifier);
      console.log("[phone-recaptcha] WidgetId:", window.recaptchaWidgetId);
      return window.recaptchaVerifier;
    }

    const verifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
      size: "invisible",
      callback: () => {
        console.log("[phone-recaptcha] reCAPTCHA solved");
      },
      "expired-callback": () => {
        console.log("[phone-recaptcha] reCAPTCHA expired");
        resetPhoneRecaptchaWidget();
      },
    });

    window.recaptchaVerifier = verifier;
    console.log("[phone-recaptcha] Recaptcha created:", verifier);
    return verifier;
  } catch (err) {
    console.error("Recaptcha init error:", err);
    throw err;
  }
}

/**
 * Ensure widget is rendered exactly once before signInWithPhoneNumber.
 */
export async function ensureRecaptchaReady(auth: Auth): Promise<RecaptchaVerifier> {
  if (typeof document === "undefined") {
    throw new Error("reCAPTCHA is only available in the browser.");
  }

  logPhoneOtpDomainContext("reCAPTCHA ready");
  const verifier = getRecaptcha(auth);

  if (window.recaptchaWidgetId !== undefined) {
    return verifier;
  }

  if (renderPromise) {
    return renderPromise;
  }

  renderPromise = (async () => {
    try {
      const widgetId = await renderWithTimeout(verifier);
      window.recaptchaWidgetId = widgetId;
      console.log("[phone-recaptcha] Recaptcha:", window.recaptchaVerifier);
      console.log("[phone-recaptcha] WidgetId:", window.recaptchaWidgetId);
      logRecaptchaDebug("render complete");
      return verifier;
    } catch (err) {
      console.error("[phone-recaptcha] render failed", err);
      clearRecaptchaOnFailure();
      throw err;
    } finally {
      renderPromise = null;
    }
  })();

  return renderPromise;
}

/** @deprecated Alias */
export async function setupPhoneRecaptcha(auth: Auth): Promise<RecaptchaVerifier> {
  return ensureRecaptchaReady(auth);
}

export async function getPhoneRecaptchaVerifier(auth: Auth): Promise<ApplicationVerifier> {
  return ensureRecaptchaReady(auth);
}

export async function prepareMobilePhoneOtpVerifier(auth: Auth): Promise<ApplicationVerifier> {
  return ensureRecaptchaReady(auth);
}

export async function awaitMobileRecaptchaVerification(
  auth: Auth,
): Promise<ApplicationVerifier> {
  return ensureRecaptchaReady(auth);
}

export function createStaticRecaptchaVerifier(_token: string): ApplicationVerifier {
  return {
    type: "recaptcha",
    verify: () => Promise.reject(new Error("Use getRecaptcha() / ensureRecaptchaReady() instead.")),
  };
}

export function warnIfPhoneAuthDomainMissingFromFirebase(): void {
  logPhoneOtpDomainContext("sign-in mount");
}

export function firebasePhoneAuthDomainHint(hostname = window.location.hostname): string {
  return (
    `Add "${hostname}" (and www/non-www variants) under Firebase Console → ` +
    `Authentication → Settings → Authorized domains. ` +
    `Required: ${FIREBASE_PHONE_AUTH_DOMAINS.join(", ")}.`
  );
}
