import {
  RecaptchaVerifier,
  type ApplicationVerifier,
  type Auth,
} from "firebase/auth";
import {
  FIREBASE_PHONE_AUTH_DOMAINS,
  logPhoneOtpDomainContext,
} from "./site-domain";
import { isAndroidPwa } from "./mobile-phone-environment";

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

/** Module singleton — never multiple RecaptchaVerifier instances. */
let recaptchaInstance: RecaptchaVerifier | null = null;
let renderPromise: Promise<RecaptchaVerifier | null> | null = null;

function syncInstanceToWindow(): void {
  window.recaptchaVerifier = recaptchaInstance;
}

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

/**
 * Container lives in index.html after #root — do not reparent (Android WebView crash).
 */
export function ensureRecaptchaContainer(): HTMLElement {
  let el = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = RECAPTCHA_CONTAINER_ID;
    document.body.appendChild(el);
  }
  applyInvisibleRecaptchaContainerLayout(el);
  return el;
}

export function applyRecaptchaContainerLayout(el: HTMLElement): void {
  applyInvisibleRecaptchaContainerLayout(el);
}

export function mountPhoneRecaptchaContainer(_parent: HTMLElement | null): void {
  ensureRecaptchaContainer();
}

export function setPhoneRecaptchaMobileSheetActive(_active: boolean): void {
  ensureRecaptchaContainer();
}

export function logRecaptchaDebug(context: string): void {
  console.info(`[phone-recaptcha] ${context}`, {
    hostname: typeof window !== "undefined" ? window.location.hostname : "",
    androidPwa: isAndroidPwa(),
    containerPresent: Boolean(document.getElementById(RECAPTCHA_CONTAINER_ID)),
    verifierReady: Boolean(recaptchaInstance),
    widgetId: window.recaptchaWidgetId,
  });
}

/** HARD reset — after OTP failure or crash loop prevention. */
export function hardResetRecaptcha(): void {
  try {
    if (recaptchaInstance) {
      recaptchaInstance.clear();
    }
  } catch (err) {
    console.warn("[phone-recaptcha] hard reset clear", err);
  }
  recaptchaInstance = null;
  window.recaptchaVerifier = null;
  window.recaptchaWidgetId = undefined;
  renderPromise = null;
  const el = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (el) {
    el.innerHTML = "";
    applyInvisibleRecaptchaContainerLayout(el);
  }
}

export function clearRecaptchaOnFailure(): void {
  hardResetRecaptcha();
}

export function destroyPhoneRecaptchaVerifier(): void {
  hardResetRecaptcha();
}

export function clearPhoneRecaptchaVerifier(): void {
  hardResetRecaptcha();
}

export function resetPhoneRecaptchaWidget(): boolean {
  const widgetId = window.recaptchaWidgetId;
  const grecaptcha = window.grecaptcha;
  if (widgetId === undefined || !grecaptcha?.reset) {
    return false;
  }
  try {
    grecaptcha.reset(widgetId);
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

/** Defer iframe work off the click stack — reduces Android PWA WebView kills. */
async function deferBeforeRecaptchaWork(): Promise<void> {
  if (isAndroidPwa()) {
    await new Promise<void>((resolve) => setTimeout(resolve, 200));
  }
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/**
 * Safe singleton init — returns null instead of throwing (prevents UI crash).
 */
export function initRecaptcha(auth: Auth): RecaptchaVerifier | null {
  try {
    ensureRecaptchaContainer();

    if (recaptchaInstance) {
      syncInstanceToWindow();
      return recaptchaInstance;
    }

    recaptchaInstance = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
      size: "invisible",
      callback: () => {
        console.log("[phone-recaptcha] reCAPTCHA solved");
      },
      "expired-callback": () => {
        console.log("[phone-recaptcha] reCAPTCHA expired");
        resetPhoneRecaptchaWidget();
      },
    });

    syncInstanceToWindow();
    console.log("[phone-recaptcha] Recaptcha created:", recaptchaInstance);
    return recaptchaInstance;
  } catch (err) {
    console.error("Recaptcha init crash:", err);
    hardResetRecaptcha();
    return null;
  }
}

export function getRecaptcha(auth: Auth): RecaptchaVerifier | null {
  return initRecaptcha(auth);
}

/**
 * Render widget once before signInWithPhoneNumber (lazy on Android PWA).
 */
export async function ensureRecaptchaReady(auth: Auth): Promise<RecaptchaVerifier | null> {
  if (typeof document === "undefined") {
    return null;
  }

  logPhoneOtpDomainContext("reCAPTCHA ready");
  const verifier = initRecaptcha(auth);
  if (!verifier) {
    return null;
  }

  if (window.recaptchaWidgetId !== undefined) {
    return verifier;
  }

  if (renderPromise) {
    return renderPromise;
  }

  renderPromise = (async () => {
    try {
      await deferBeforeRecaptchaWork();
      const widgetId = await renderWithTimeout(verifier);
      window.recaptchaWidgetId = widgetId;
      console.log("[phone-recaptcha] Recaptcha:", recaptchaInstance);
      console.log("[phone-recaptcha] WidgetId:", widgetId);
      return verifier;
    } catch (err) {
      console.error("[phone-recaptcha] render failed", err);
      hardResetRecaptcha();
      return null;
    } finally {
      renderPromise = null;
    }
  })();

  return renderPromise;
}

export async function setupPhoneRecaptcha(auth: Auth): Promise<RecaptchaVerifier> {
  const v = await ensureRecaptchaReady(auth);
  if (!v) {
    throw new Error("Recaptcha failed");
  }
  return v;
}

export async function getPhoneRecaptchaVerifier(auth: Auth): Promise<ApplicationVerifier> {
  return setupPhoneRecaptcha(auth);
}

export async function prepareMobilePhoneOtpVerifier(auth: Auth): Promise<ApplicationVerifier> {
  return setupPhoneRecaptcha(auth);
}

export async function awaitMobileRecaptchaVerification(
  auth: Auth,
): Promise<ApplicationVerifier> {
  return setupPhoneRecaptcha(auth);
}

export function createStaticRecaptchaVerifier(_token: string): ApplicationVerifier {
  return {
    type: "recaptcha",
    verify: () => Promise.reject(new Error("Use initRecaptcha() / sendPhoneOtpSafely() instead.")),
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
