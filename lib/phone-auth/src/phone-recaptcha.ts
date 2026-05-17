import { RecaptchaVerifier, type ApplicationVerifier, type Auth } from "firebase/auth";

export const RECAPTCHA_CONTAINER_ID = "recaptcha-container";

/** Domains that must appear in Firebase → Authentication → Authorized domains. */
export const FIREBASE_PHONE_AUTH_DOMAINS = [
  "amynest.in",
  "www.amynest.in",
  "localhost",
  "127.0.0.1",
  "amynest-live-1.onrender.com",
  "amynest-frontend-dev.onrender.com",
] as const;

let verifierInstance: RecaptchaVerifier | null = null;
let renderPromise: Promise<ApplicationVerifier> | null = null;

/** Ensure exactly one hidden reCAPTCHA mount point exists (never duplicate IDs). */
export function ensureRecaptchaContainer(): HTMLElement {
  const byId = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (byId) return byId;

  const el = document.createElement("div");
  el.id = RECAPTCHA_CONTAINER_ID;
  el.setAttribute("aria-hidden", "true");
  Object.assign(el.style, {
    position: "fixed",
    bottom: "0",
    right: "0",
    width: "1px",
    height: "1px",
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
    console.error("[phone-recaptcha] render failed", err);
    throw err;
  }
}

export function firebasePhoneAuthDomainHint(hostname = window.location.hostname): string {
  return (
    `Add "${hostname}" (and www/non-www variants) under Firebase Console → ` +
    `Authentication → Settings → Authorized domains. ` +
    `Recommended: ${FIREBASE_PHONE_AUTH_DOMAINS.join(", ")}.`
  );
}
