import { RecaptchaVerifier, type ApplicationVerifier, type Auth } from "firebase/auth";
import {
  FIREBASE_PHONE_AUTH_DOMAINS,
  logPhoneOtpDomainContext,
  redirectWwwToCanonicalApex,
  shouldRedirectWwwToApex,
} from "./site-domain";

export { FIREBASE_PHONE_AUTH_DOMAINS } from "./site-domain";

export const RECAPTCHA_CONTAINER_ID = "recaptcha-container";

let verifierInstance: RecaptchaVerifier | null = null;
let renderPromise: Promise<ApplicationVerifier> | null = null;

/** Ensure exactly one hidden reCAPTCHA mount point exists (never duplicate IDs). */
export function ensureRecaptchaContainer(): HTMLElement {
  const byId = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (byId) return byId;

  const el = document.createElement("div");
  el.id = RECAPTCHA_CONTAINER_ID;
  el.setAttribute("aria-hidden", "true");
  // Invisible reCAPTCHA still needs a real-sized mount (1×1px breaks iframe on some browsers).
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
  });
  document.body.appendChild(el);
  return el;
}

export function logRecaptchaDebug(context: string): void {
  const container = document.getElementById(RECAPTCHA_CONTAINER_ID);
  const iframe = container?.querySelector("iframe");
  console.info(`[phone-recaptcha] ${context}`, {
    hostname: window.location.hostname,
    href: window.location.href,
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

/**
 * Returns a single rendered invisible reCAPTCHA verifier for phone sign-in.
 * Call clearPhoneRecaptchaVerifier() before creating a fresh one on resend.
 */
export async function getPhoneRecaptchaVerifier(auth: Auth): Promise<ApplicationVerifier> {
  if (typeof document === "undefined") {
    throw new Error("reCAPTCHA is only available in the browser.");
  }

  if (redirectWwwToCanonicalApex()) {
    throw new Error("Redirecting to amynest.in for phone verification…");
  }

  logPhoneOtpDomainContext("reCAPTCHA init");
  ensureRecaptchaContainer();

  if (verifierInstance) {
    logRecaptchaDebug("reuse existing verifier");
    return verifierInstance;
  }

  if (renderPromise) return renderPromise;

  renderPromise = (async () => {
    const verifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
      size: "invisible",
      callback: () => {
        console.info("[phone-recaptcha] reCAPTCHA solved", {
          hostname: window.location.hostname,
        });
      },
      "expired-callback": () => {
        console.warn("[phone-recaptcha] reCAPTCHA expired — will reset verifier");
        clearPhoneRecaptchaVerifier();
      },
    });

    await verifier.render();
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
      hint: shouldRedirectWwwToApex(host)
        ? "www should redirect to amynest.in — hard-refresh or clear cache"
        : `Ensure ${host} is in Firebase → Authentication → Authorized domains (${FIREBASE_PHONE_AUTH_DOMAINS.join(", ")})`,
    });
    throw err;
  }
}

/** Call on sign-in page mount — redirects www → apex before reCAPTCHA. */
export function warnIfPhoneAuthDomainMissingFromFirebase(): void {
  redirectWwwToCanonicalApex();
}

export function firebasePhoneAuthDomainHint(hostname = window.location.hostname): string {
  return (
    `Add "${hostname}" (and www/non-www variants) under Firebase Console → ` +
    `Authentication → Settings → Authorized domains. ` +
    `Recommended: ${FIREBASE_PHONE_AUTH_DOMAINS.join(", ")}.`
  );
}
