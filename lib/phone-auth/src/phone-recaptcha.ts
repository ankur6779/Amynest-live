import {
  RecaptchaVerifier,
  type ApplicationVerifier,
  type Auth,
} from "firebase/auth";
import {
  FIREBASE_PHONE_AUTH_DOMAINS,
  logPhoneOtpDomainContext,
  shouldRedirectWwwToApex,
} from "./site-domain";
import {
  isMobilePhoneOtpEnvironment,
  shouldPreRenderPhoneRecaptcha,
} from "./mobile-phone-environment";

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
const TOKEN_TIMEOUT_MS = 120_000;
const POST_TOKEN_DELAY_MS = 350;

type GrecaptchaWindow = Window & {
  grecaptcha?: {
    getResponse: (widgetId?: number) => string;
    reset: (widgetId?: number) => void;
  };
};

let verifierInstance: RecaptchaVerifier | null = null;
let renderPromise: Promise<RecaptchaVerifier> | null = null;
let mobileSheetActive = false;
let pendingTokenResolve: ((token: string) => void) | null = null;
let pendingTokenReject: ((err: Error) => void) | null = null;

function isMobileMode(): boolean {
  return isMobilePhoneOtpEnvironment() || mobileSheetActive;
}

function applyDesktopHiddenLayout(el: HTMLElement): void {
  Object.assign(el.style, {
    position: "fixed",
    top: "-10000px",
    left: "0",
    width: "304px",
    height: "78px",
    overflow: "hidden",
    opacity: "0",
    pointerEvents: "none",
    zIndex: "9999",
    margin: "",
    transform: "",
    maxWidth: "",
    bottom: "",
    background: "",
  });
}

function applyMobileOverlayLayout(el: HTMLElement): void {
  el.setAttribute("aria-hidden", "false");
  Object.assign(el.style, {
    position: "fixed",
    left: "50%",
    bottom: "max(28px, env(safe-area-inset-bottom))",
    top: "auto",
    transform: "translateX(-50%)",
    width: "min(304px, calc(100vw - 32px))",
    maxWidth: "304px",
    minHeight: "78px",
    height: "auto",
    overflow: "visible",
    opacity: "1",
    pointerEvents: "auto",
    zIndex: "100003",
    margin: "0",
    background: "#fff",
    borderRadius: "4px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
  });
}

export function setPhoneRecaptchaMobileSheetActive(active: boolean): void {
  mobileSheetActive = active;
  const el = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (!el) return;
  if (active || isMobilePhoneOtpEnvironment()) {
    applyMobileOverlayLayout(el);
  } else {
    applyDesktopHiddenLayout(el);
    el.setAttribute("aria-hidden", "true");
  }
}

export function ensureRecaptchaContainer(): HTMLElement {
  let el = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = RECAPTCHA_CONTAINER_ID;
    document.body.appendChild(el);
  } else if (el.parentElement !== document.body) {
    document.body.appendChild(el);
  }
  applyRecaptchaContainerLayout(el);
  return el;
}

export function applyRecaptchaContainerLayout(el: HTMLElement): void {
  if (isMobileMode()) {
    applyMobileOverlayLayout(el);
  } else {
    applyDesktopHiddenLayout(el);
    el.setAttribute("aria-hidden", "true");
  }
}

export function mountPhoneRecaptchaContainer(_parent: HTMLElement | null): void {
  const el = ensureRecaptchaContainer();
  if (el.parentElement !== document.body) {
    document.body.appendChild(el);
  }
  applyRecaptchaContainerLayout(el);
}

export function logRecaptchaDebug(context: string): void {
  const container = document.getElementById(RECAPTCHA_CONTAINER_ID);
  const iframe = container?.querySelector("iframe");
  console.info(`[phone-recaptcha] ${context}`, {
    hostname: window.location.hostname,
    href: window.location.href,
    mobileMode: isMobileMode(),
    containerPresent: Boolean(container),
    iframePresent: Boolean(iframe),
    verifierReady: Boolean(verifierInstance),
  });
}

function resetPendingTokenWaiters(): void {
  pendingTokenResolve = null;
  pendingTokenReject = null;
}

function readGrecaptchaToken(): string {
  const grecaptcha = (window as GrecaptchaWindow).grecaptcha;
  if (!grecaptcha) return "";
  try {
    return grecaptcha.getResponse() || grecaptcha.getResponse(0) || "";
  } catch {
    return "";
  }
}

function teardownRecaptchaDom(): void {
  const el = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (el) {
    el.innerHTML = "";
    applyDesktopHiddenLayout(el);
    el.setAttribute("aria-hidden", "true");
  }
}

export function clearPhoneRecaptchaVerifier(): void {
  resetPendingTokenWaiters();
  if (verifierInstance) {
    try {
      verifierInstance.clear();
    } catch {
      /* ignore */
    }
    verifierInstance = null;
  }
  renderPromise = null;
  teardownRecaptchaDom();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createStaticRecaptchaVerifier(token: string): ApplicationVerifier {
  return {
    type: "recaptcha",
    verify: () => {
      if (!token) {
        return Promise.reject(new Error("reCAPTCHA token missing — try again."));
      }
      return Promise.resolve(token);
    },
  };
}

function renderWithTimeout(verifier: RecaptchaVerifier): Promise<void> {
  return Promise.race([
    verifier.render(),
    new Promise<void>((_, reject) => {
      setTimeout(
        () => reject(new Error("Security check timed out. Please try again.")),
        RENDER_TIMEOUT_MS,
      );
    }),
  ]);
}

function waitForUserRecaptchaToken(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    pendingTokenResolve = resolve;
    pendingTokenReject = reject;
    setTimeout(() => {
      if (pendingTokenReject === reject) {
        pendingTokenReject(
          new Error(
            "Verification timed out. Tap the checkbox again or open in Chrome.",
          ),
        );
        resetPendingTokenWaiters();
      }
    }, TOKEN_TIMEOUT_MS);
  });
}

function onRecaptchaCheckboxSolved(): void {
  // Run off the reCAPTCHA iframe callback stack — sync verify() here crashes Android PWA.
  setTimeout(() => {
    try {
      const token = readGrecaptchaToken();
      if (!token) {
        pendingTokenReject?.(
          new Error("Could not read reCAPTCHA response. Please try again."),
        );
        resetPendingTokenWaiters();
        return;
      }
      logRecaptchaDebug("token from grecaptcha.getResponse");
      pendingTokenResolve?.(token);
      resetPendingTokenWaiters();
    } catch (err) {
      pendingTokenReject?.(
        err instanceof Error ? err : new Error(String(err)),
      );
      resetPendingTokenWaiters();
    }
  }, 0);
}

async function createAndRenderVerifier(auth: Auth): Promise<RecaptchaVerifier> {
  const mobile = isMobileMode();
  const container = ensureRecaptchaContainer();
  applyRecaptchaContainerLayout(container);

  if (mobile) {
    clearPhoneRecaptchaVerifier();
  }

  const verifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
    size: mobile ? "normal" : "invisible",
    callback: () => {
      console.info("[phone-recaptcha] checkbox solved callback");
      onRecaptchaCheckboxSolved();
    },
    "expired-callback": () => {
      console.warn("[phone-recaptcha] reCAPTCHA expired");
      clearPhoneRecaptchaVerifier();
      pendingTokenReject?.(new Error("reCAPTCHA expired. Please try again."));
      resetPendingTokenWaiters();
    },
  });

  await renderWithTimeout(verifier);
  verifierInstance = verifier;
  logRecaptchaDebug("render complete");
  return verifier;
}

export async function getPhoneRecaptchaVerifier(auth: Auth): Promise<ApplicationVerifier> {
  if (typeof document === "undefined") {
    throw new Error("reCAPTCHA is only available in the browser.");
  }

  logPhoneOtpDomainContext("reCAPTCHA init");

  if (verifierInstance) {
    logRecaptchaDebug("reuse existing verifier");
    return verifierInstance;
  }

  if (renderPromise) return renderPromise;

  renderPromise = createAndRenderVerifier(auth);

  try {
    return await renderPromise;
  } catch (err) {
    clearPhoneRecaptchaVerifier();
    const host = window.location.hostname;
    console.error("[phone-recaptcha] render failed", { err, hostname: host });
    throw err;
  }
}

/**
 * Mobile: wait for checkbox via grecaptcha callback (no verifier.verify() on tap).
 * Returns a one-shot ApplicationVerifier for signInWithPhoneNumber.
 */
export async function prepareMobilePhoneOtpVerifier(
  auth: Auth,
): Promise<ApplicationVerifier> {
  if (!isMobileMode()) {
    return getPhoneRecaptchaVerifier(auth);
  }

  clearPhoneRecaptchaVerifier();
  renderPromise = null;

  const renderTask = createAndRenderVerifier(auth);
  renderPromise = renderTask;
  await renderTask;

  logRecaptchaDebug("waiting for checkbox token");
  const token = await waitForUserRecaptchaToken();

  if (verifierInstance) {
    try {
      verifierInstance.clear();
    } catch {
      /* ignore */
    }
    verifierInstance = null;
  }
  renderPromise = null;
  teardownRecaptchaDom();
  await delay(POST_TOKEN_DELAY_MS);

  logRecaptchaDebug("returning static verifier for signIn");
  return createStaticRecaptchaVerifier(token);
}

/** @deprecated Use prepareMobilePhoneOtpVerifier — verify() on tap crashes Android PWA. */
export async function awaitMobileRecaptchaVerification(
  auth: Auth,
): Promise<ApplicationVerifier> {
  return prepareMobilePhoneOtpVerifier(auth);
}

export function warnIfPhoneAuthDomainMissingFromFirebase(): void {
  logPhoneOtpDomainContext("sign-in mount");
}

export function firebasePhoneAuthDomainHint(hostname = window.location.hostname): string {
  return (
    `Add "${hostname}" (and www/non-www variants) under Firebase Console → ` +
    `Authentication → Settings → Authorized domains. ` +
    `Recommended: ${FIREBASE_PHONE_AUTH_DOMAINS.join(", ")}.`
  );
}
