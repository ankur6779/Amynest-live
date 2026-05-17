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

let setupPromise: Promise<RecaptchaVerifier> | null = null;

/**
 * Bottom-corner mount — do NOT move off-screen or opacity:0; Google escalates to
 * visible "Verify you're human" when the widget is hidden.
 */
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

/** @deprecated Container stays on body. */
export function mountPhoneRecaptchaContainer(_parent: HTMLElement | null): void {
  ensureRecaptchaContainer();
}

/** @deprecated No visible sheet — invisible only. */
export function setPhoneRecaptchaMobileSheetActive(_active: boolean): void {
  ensureRecaptchaContainer();
}

export function logRecaptchaDebug(context: string): void {
  const container = document.getElementById(RECAPTCHA_CONTAINER_ID);
  console.info(`[phone-recaptcha] ${context}`, {
    hostname: window.location.hostname,
    containerPresent: Boolean(container),
    verifierReady: Boolean(window.recaptchaVerifier),
    widgetId: window.recaptchaWidgetId,
  });
}

/** Tear down verifier before a fresh create (force resend). */
export function destroyPhoneRecaptchaVerifier(): void {
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch {
      /* ignore */
    }
    window.recaptchaVerifier = null;
  }
  window.recaptchaWidgetId = undefined;
  setupPromise = null;
}

/** @deprecated Use destroyPhoneRecaptchaVerifier or resetPhoneRecaptchaWidget. */
export function clearPhoneRecaptchaVerifier(): void {
  destroyPhoneRecaptchaVerifier();
}

/** Reset invisible widget instead of showing a new visible challenge. */
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
 * Create invisible reCAPTCHA once, persist on window, render to get widgetId.
 * Call before signInWithPhoneNumber(auth, phone, window.recaptchaVerifier).
 */
export async function setupPhoneRecaptcha(auth: Auth): Promise<RecaptchaVerifier> {
  if (typeof document === "undefined") {
    throw new Error("reCAPTCHA is only available in the browser.");
  }

  logPhoneOtpDomainContext("reCAPTCHA setup");
  ensureRecaptchaContainer();

  if (window.recaptchaVerifier) {
    console.log("Recaptcha:", window.recaptchaVerifier);
    console.log("WidgetId:", window.recaptchaWidgetId);
    return window.recaptchaVerifier;
  }

  if (setupPromise) {
    return setupPromise;
  }

  setupPromise = (async () => {
    destroyPhoneRecaptchaVerifier();

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

    const widgetId = await renderWithTimeout(verifier);
    window.recaptchaWidgetId = widgetId;

    console.log("Recaptcha:", window.recaptchaVerifier);
    console.log("WidgetId:", window.recaptchaWidgetId);
    logRecaptchaDebug("setup complete");

    return verifier;
  })();

  try {
    return await setupPromise;
  } catch (err) {
    destroyPhoneRecaptchaVerifier();
    console.error("[phone-recaptcha] setup failed", err);
    throw err;
  } finally {
    setupPromise = null;
  }
}

/** Alias — setup once, reuse global verifier. */
export async function getPhoneRecaptchaVerifier(auth: Auth): Promise<ApplicationVerifier> {
  return setupPhoneRecaptcha(auth);
}

/** @deprecated Alias. */
export async function prepareMobilePhoneOtpVerifier(auth: Auth): Promise<ApplicationVerifier> {
  return setupPhoneRecaptcha(auth);
}

/** @deprecated Alias. */
export async function awaitMobileRecaptchaVerification(
  auth: Auth,
): Promise<ApplicationVerifier> {
  return setupPhoneRecaptcha(auth);
}

/** @deprecated Use setupPhoneRecaptcha. */
export function createStaticRecaptchaVerifier(_token: string): ApplicationVerifier {
  return {
    type: "recaptcha",
    verify: () => Promise.reject(new Error("Use setupPhoneRecaptcha() instead.")),
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
