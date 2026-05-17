import {
  RecaptchaVerifier,
  type ApplicationVerifier,
  type Auth,
} from "firebase/auth";
import {
  canRunInAppPhoneRecaptcha,
  isMobilePhoneOtpEnvironment,
} from "./mobile-phone-environment";
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

/** Single instance — created on first Send OTP, not at app boot. */
let recaptcha: RecaptchaVerifier | null = null;
let renderPromise: Promise<RecaptchaVerifier> | null = null;

function syncToWindow(): void {
  window.recaptchaVerifier = recaptcha;
}

export function logRecaptchaState(): void {
  console.log("Domain:", typeof window !== "undefined" ? window.location.hostname : "");
  console.log("Recaptcha exists:", Boolean(recaptcha));
  console.log("Recaptcha rendered:", window.recaptchaWidgetId !== undefined);
  logRecaptchaDebug("state");
}

export function ensureRecaptchaContainer(): HTMLElement {
  const el = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (!el) {
    throw new Error(`#${RECAPTCHA_CONTAINER_ID} missing in index.html (after #root)`);
  }
  return el;
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

export function mountPhoneRecaptchaContainer(_parent: HTMLElement | null): void {
  const el = ensureRecaptchaContainer();
  applyRecaptchaContainerLayout(el);
}

export function setPhoneRecaptchaMobileSheetActive(_active: boolean): void {
  /* invisible only */
}

export function logRecaptchaDebug(context: string): void {
  console.info(`[phone-recaptcha] ${context}`, {
    domain: typeof window !== "undefined" ? window.location.hostname : "",
    recaptchaExists: Boolean(recaptcha),
    widgetId: window.recaptchaWidgetId,
    mobile: isMobilePhoneOtpEnvironment(),
    containerInDom: Boolean(document.getElementById(RECAPTCHA_CONTAINER_ID)),
    firebaseAuthorizedDomains: FIREBASE_PHONE_AUTH_DOMAINS,
  });
}

export function resetRecaptchaOnFailure(): void {
  try {
    if (recaptcha) {
      recaptcha.clear();
    }
  } catch (err) {
    console.warn("[phone-recaptcha] clear on failure", err);
  }
  recaptcha = null;
  window.recaptchaVerifier = null;
  window.recaptchaWidgetId = undefined;
  renderPromise = null;
}

export function clearRecaptchaOnFailure(): void {
  resetRecaptchaOnFailure();
}

export function hardResetRecaptcha(): void {
  resetRecaptchaOnFailure();
}

export function destroyPhoneRecaptchaVerifier(): void {
  resetRecaptchaOnFailure();
}

export function clearPhoneRecaptchaVerifier(): void {
  resetRecaptchaOnFailure();
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
  } catch {
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

async function deferBeforeRecaptchaRender(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  if (isMobilePhoneOtpEnvironment()) {
    await new Promise<void>((resolve) => setTimeout(resolve, 80));
  }
}

/**
 * Create verifier once (sync). Does not render — safe to call without loading iframe.
 */
export function setupRecaptcha(auth: Auth): RecaptchaVerifier {
  const el = ensureRecaptchaContainer();
  applyRecaptchaContainerLayout(el);

  if (recaptcha) {
    syncToWindow();
    return recaptcha;
  }

  recaptcha = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
    size: "invisible",
    callback: () => {
      console.log("[phone-recaptcha] reCAPTCHA solved");
    },
    "expired-callback": () => {
      console.log("[phone-recaptcha] reCAPTCHA expired");
      resetPhoneRecaptchaWidget();
    },
  });

  syncToWindow();
  console.log("[phone-recaptcha] setupRecaptcha created");
  return recaptcha;
}

export function initRecaptcha(auth: Auth): RecaptchaVerifier | null {
  try {
    return setupRecaptcha(auth);
  } catch (err) {
    console.error("Recaptcha init error:", err);
    return null;
  }
}

export function getRecaptcha(auth: Auth): RecaptchaVerifier | null {
  return initRecaptcha(auth);
}

/**
 * Render iframe only when user sends OTP — never on app boot (prevents Chrome/PWA crash).
 */
export async function prepareRecaptchaForSend(auth: Auth): Promise<RecaptchaVerifier> {
  if (!canRunInAppPhoneRecaptcha()) {
    throw new Error("reCAPTCHA unavailable in installed Android app");
  }

  logPhoneOtpDomainContext("prepareRecaptchaForSend");
  const verifier = setupRecaptcha(auth);

  if (window.recaptchaWidgetId !== undefined) {
    logRecaptchaState();
    return verifier;
  }

  if (renderPromise) {
    return renderPromise;
  }

  renderPromise = (async () => {
    try {
      await deferBeforeRecaptchaRender();
      const widgetId = await renderWithTimeout(verifier);
      window.recaptchaWidgetId = widgetId;
      logRecaptchaState();
      return verifier;
    } catch (err) {
      console.error("[phone-recaptcha] render failed", err);
      resetRecaptchaOnFailure();
      throw err;
    } finally {
      renderPromise = null;
    }
  })();

  return renderPromise;
}

/** @deprecated Do not warm up on app load — use prepareRecaptchaForSend */
export async function warmUpRecaptcha(auth: Auth): Promise<RecaptchaVerifier> {
  return prepareRecaptchaForSend(auth);
}

export async function ensureRecaptchaReady(auth: Auth): Promise<RecaptchaVerifier | null> {
  try {
    return await prepareRecaptchaForSend(auth);
  } catch {
    return null;
  }
}

export async function setupPhoneRecaptcha(auth: Auth): Promise<RecaptchaVerifier> {
  return prepareRecaptchaForSend(auth);
}

export async function getPhoneRecaptchaVerifier(auth: Auth): Promise<ApplicationVerifier> {
  return prepareRecaptchaForSend(auth);
}

export async function prepareMobilePhoneOtpVerifier(auth: Auth): Promise<ApplicationVerifier> {
  return prepareRecaptchaForSend(auth);
}

export async function awaitMobileRecaptchaVerification(
  auth: Auth,
): Promise<ApplicationVerifier> {
  return prepareRecaptchaForSend(auth);
}

export function createStaticRecaptchaVerifier(_token: string): ApplicationVerifier {
  return {
    type: "recaptcha",
    verify: () => Promise.reject(new Error("Use prepareRecaptchaForSend() instead.")),
  };
}

export function warnIfPhoneAuthDomainMissingFromFirebase(): void {
  logPhoneOtpDomainContext("sign-in mount");
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  if (
    host &&
    !FIREBASE_PHONE_AUTH_DOMAINS.includes(host as (typeof FIREBASE_PHONE_AUTH_DOMAINS)[number])
  ) {
    console.warn(
      `[phone-recaptcha] Add "${host}" in Firebase → Authentication → Authorized domains`,
    );
  }
}

export function firebasePhoneAuthDomainHint(hostname = window.location.hostname): string {
  return (
    `Add "${hostname}" under Firebase Console → Authentication → Settings → Authorized domains. ` +
    `Required: amynest.in, www.amynest.in`
  );
}
