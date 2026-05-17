import { RecaptchaVerifier, type ApplicationVerifier, type Auth } from "firebase/auth";
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
  isMobilePhoneOtpEnvironment,
  shouldPreRenderPhoneRecaptcha,
} from "./mobile-phone-environment";

export const RECAPTCHA_CONTAINER_ID = "recaptcha-container";

const RENDER_TIMEOUT_MS = 30_000;
const VERIFY_TIMEOUT_MS = 120_000;

let verifierInstance: RecaptchaVerifier | null = null;
let renderPromise: Promise<ApplicationVerifier> | null = null;
let mobileSheetActive = false;

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

/** Fixed on viewport — never reparent (moving the iframe crashes iOS WebViews on tap). */
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

/** Call when the mobile verification sheet opens/closes. */
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

/** Ensure exactly one reCAPTCHA mount point on document.body (never inside React portals). */
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

/**
 * @deprecated Do not move the reCAPTCHA node — causes iframe crash on tap. Layout-only.
 */
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

export function clearPhoneRecaptchaVerifier(): void {
  if (verifierInstance) {
    try {
      verifierInstance.clear();
    } catch {
      /* ignore */
    }
    verifierInstance = null;
  }
  renderPromise = null;
  const el = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (el) {
    el.innerHTML = "";
    if (!isMobileMode()) {
      applyDesktopHiddenLayout(el);
    }
  }
}

function recaptchaSize(): "invisible" | "normal" {
  return isMobileMode() ? "normal" : "invisible";
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

function verifyWithTimeout(verifier: RecaptchaVerifier): Promise<unknown> {
  return Promise.race([
    verifier.verify(),
    new Promise<never>((_, reject) => {
      setTimeout(
        () =>
          reject(
            new Error(
              "Verification timed out. Tap the checkbox again or reload the page.",
            ),
          ),
        VERIFY_TIMEOUT_MS,
      );
    }),
  ]);
}

async function createAndRenderVerifier(auth: Auth): Promise<RecaptchaVerifier> {
  const mobile = isMobileMode();
  const container = ensureRecaptchaContainer();
  applyRecaptchaContainerLayout(container);

  if (mobile) {
    clearPhoneRecaptchaVerifier();
  }

  const verifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
    size: recaptchaSize(),
    callback: () => {
      console.info("[phone-recaptcha] reCAPTCHA solved", {
        hostname: window.location.hostname,
        mobile,
      });
    },
    "expired-callback": () => {
      console.warn("[phone-recaptcha] reCAPTCHA expired — will reset verifier");
      clearPhoneRecaptchaVerifier();
    },
  });

  await renderWithTimeout(verifier);
  verifierInstance = verifier;
  logRecaptchaDebug("render complete");
  return verifier;
}

/**
 * Mobile: render widget, wait for user tap (verify), then caller runs signInWithPhoneNumber.
 * Desktop: invisible verifier (verify happens inside signInWithPhoneNumber).
 */
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
    console.error("[phone-recaptcha] render failed", {
      err,
      hostname: host,
      mobile: isMobileMode(),
      hint: shouldRedirectWwwToApex(host)
        ? "www should redirect to amynest.in — hard-refresh or clear cache"
        : `Ensure ${host} is in Firebase → Authentication → Authorized domains (${FIREBASE_PHONE_AUTH_DOMAINS.join(", ")})`,
    });
    throw err;
  }
}

/**
 * On mobile WebViews: complete the checkbox challenge BEFORE signInWithPhoneNumber.
 * Calling both at once duplicates iframe work and crashes iOS on tap.
 */
export async function awaitMobileRecaptchaVerification(auth: Auth): Promise<ApplicationVerifier> {
  if (!isMobileMode()) {
    return getPhoneRecaptchaVerifier(auth);
  }

  clearPhoneRecaptchaVerifier();
  renderPromise = null;

  const verifier = await createAndRenderVerifier(auth);
  renderPromise = Promise.resolve(verifier);

  logRecaptchaDebug("awaiting user verify()");
  try {
    await verifyWithTimeout(verifier);
    logRecaptchaDebug("verify() complete");
    return verifier;
  } catch (err) {
    clearPhoneRecaptchaVerifier();
    throw err;
  }
}

/** Call on sign-in page mount — logs domain context for Phone OTP / reCAPTCHA. */
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
