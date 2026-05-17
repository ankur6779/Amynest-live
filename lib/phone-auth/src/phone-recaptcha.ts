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

/** Single global instance — never create on button click. */
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

/**
 * Static container in index.html after #root — touch layout only, never reparent.
 */
export function ensureRecaptchaContainer(): HTMLElement {
  const el = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (!el) {
    throw new Error(
      `#${RECAPTCHA_CONTAINER_ID} missing — add <div id="${RECAPTCHA_CONTAINER_ID}"></motion> to index.html after #root`,
    );
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
  ensureRecaptchaContainer();
}

export function setPhoneRecaptchaMobileSheetActive(_active: boolean): void {
  /* no-op — invisible only */
}

export function logRecaptchaDebug(context: string): void {
  console.info(`[phone-recaptcha] ${context}`, {
    domain: typeof window !== "undefined" ? window.location.hostname : "",
    recaptchaExists: Boolean(recaptcha),
    widgetId: window.recaptchaWidgetId,
    containerInDom: Boolean(document.getElementById(RECAPTCHA_CONTAINER_ID)),
    firebaseAuthorizedDomains: FIREBASE_PHONE_AUTH_DOMAINS,
  });
}

/** Reset only after OTP failure (Replit-style). */
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

/**
 * Create invisible verifier once (sync). Does NOT call render — use warmUpRecaptcha on load.
 */
export function setupRecaptcha(auth: Auth): RecaptchaVerifier {
  ensureRecaptchaContainer();
  logRecaptchaState();

  if (recaptcha) {
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
  logRecaptchaState();
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
 * Render widget once (page load). Replit-style: badge ready before Send OTP.
 */
export async function warmUpRecaptcha(auth: Auth): Promise<RecaptchaVerifier> {
  logPhoneOtpDomainContext("warmUpRecaptcha");
  const verifier = setupRecaptcha(auth);

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
      console.log("[phone-recaptcha] render complete, widgetId:", widgetId);
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

/** @deprecated Use warmUpRecaptcha */
export async function ensureRecaptchaReady(auth: Auth): Promise<RecaptchaVerifier | null> {
  try {
    return await warmUpRecaptcha(auth);
  } catch {
    return null;
  }
}

export async function setupPhoneRecaptcha(auth: Auth): Promise<RecaptchaVerifier> {
  return warmUpRecaptcha(auth);
}

export async function getPhoneRecaptchaVerifier(auth: Auth): Promise<ApplicationVerifier> {
  return warmUpRecaptcha(auth);
}

export async function prepareMobilePhoneOtpVerifier(auth: Auth): Promise<ApplicationVerifier> {
  return warmUpRecaptcha(auth);
}

export async function awaitMobileRecaptchaVerification(
  auth: Auth,
): Promise<ApplicationVerifier> {
  return warmUpRecaptcha(auth);
}

export function createStaticRecaptchaVerifier(_token: string): ApplicationVerifier {
  return {
    type: "recaptcha",
    verify: () => Promise.reject(new Error("Use setupRecaptcha() / warmUpRecaptcha() instead.")),
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
      `[phone-recaptcha] Add "${host}" in Firebase Console → Authentication → ` +
        `Settings → Authorized domains (required: ${FIREBASE_PHONE_AUTH_DOMAINS.join(", ")})`,
    );
  }
}

export function firebasePhoneAuthDomainHint(hostname = window.location.hostname): string {
  return (
    `Add "${hostname}" under Firebase Console → Authentication → Settings → Authorized domains. ` +
    `Required: amynest.in, www.amynest.in (and localhost for dev).`
  );
}
