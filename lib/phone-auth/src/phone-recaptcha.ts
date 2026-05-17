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
  });
}

function applyMobileVisibleLayout(el: HTMLElement): void {
  Object.assign(el.style, {
    position: "relative",
    top: "auto",
    left: "auto",
    width: "100%",
    maxWidth: "304px",
    height: "78px",
    overflow: "visible",
    opacity: "1",
    pointerEvents: "auto",
    zIndex: "1",
    margin: "0 auto",
    transform: "none",
  });
}

/** Call when the mobile verification sheet opens/closes. */
export function setPhoneRecaptchaMobileSheetActive(active: boolean): void {
  mobileSheetActive = active;
  const el = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (!el) return;
  if (active || isMobilePhoneOtpEnvironment()) {
    applyMobileVisibleLayout(el);
  } else {
    applyDesktopHiddenLayout(el);
  }
}

/** Ensure exactly one reCAPTCHA mount point exists (never duplicate IDs). */
export function ensureRecaptchaContainer(): HTMLElement {
  const byId = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (byId) {
    applyRecaptchaContainerLayout(byId);
    return byId;
  }

  const el = document.createElement("div");
  el.id = RECAPTCHA_CONTAINER_ID;
  el.setAttribute("aria-hidden", "true");
  document.body.appendChild(el);
  applyRecaptchaContainerLayout(el);
  return el;
}

export function applyRecaptchaContainerLayout(el: HTMLElement): void {
  if (isMobileMode()) {
    applyMobileVisibleLayout(el);
  } else {
    applyDesktopHiddenLayout(el);
  }
}

/** Move the shared reCAPTCHA node into the mobile sheet (or back to body). */
export function mountPhoneRecaptchaContainer(parent: HTMLElement | null): void {
  const el = ensureRecaptchaContainer();
  const target = parent ?? document.body;
  if (el.parentElement !== target) {
    target.appendChild(el);
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
  if (el) el.innerHTML = "";
}

function recaptchaSize(): "invisible" | "compact" {
  return isMobileMode() ? "compact" : "invisible";
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

/**
 * Returns a single rendered reCAPTCHA verifier for phone sign-in.
 * On mobile: visible compact widget (invisible mode crashes WebViews).
 */
export async function getPhoneRecaptchaVerifier(auth: Auth): Promise<ApplicationVerifier> {
  if (typeof document === "undefined") {
    throw new Error("reCAPTCHA is only available in the browser.");
  }

  logPhoneOtpDomainContext("reCAPTCHA init");
  const container = ensureRecaptchaContainer();
  applyRecaptchaContainerLayout(container);

  const mobile = isMobileMode();

  if (mobile && verifierInstance) {
    clearPhoneRecaptchaVerifier();
  }

  if (verifierInstance) {
    logRecaptchaDebug("reuse existing verifier");
    return verifierInstance;
  }

  if (renderPromise) return renderPromise;

  renderPromise = (async () => {
    const verifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
      size: recaptchaSize(),
      callback: () => {
        console.info("[phone-recaptcha] reCAPTCHA solved", {
          hostname: window.location.hostname,
          mobile: mobile,
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
  })();

  try {
    return await renderPromise;
  } catch (err) {
    clearPhoneRecaptchaVerifier();
    const host = window.location.hostname;
    console.error("[phone-recaptcha] render failed", {
      err,
      hostname: host,
      mobile,
      hint: shouldRedirectWwwToApex(host)
        ? "www should redirect to amynest.in — hard-refresh or clear cache"
        : `Ensure ${host} is in Firebase → Authentication → Authorized domains (${FIREBASE_PHONE_AUTH_DOMAINS.join(", ")})`,
    });
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
