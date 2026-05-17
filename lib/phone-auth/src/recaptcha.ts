import { RecaptchaVerifier, type Auth } from "firebase/auth";

export const RECAPTCHA_CONTAINER_ID = "recaptcha-container";

let verifier: RecaptchaVerifier | null = null;

/** Layout for invisible badge (bottom-right) — do not hide off-screen. */
function layoutContainer(): void {
  const el = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (!el) return;
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
 * Single global RecaptchaVerifier — create once, reuse (Replit-style).
 * Only call from sendPhoneOtp, never at app boot.
 */
export function getRecaptcha(auth: Auth): RecaptchaVerifier {
  if (verifier) {
    return verifier;
  }

  const container = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (!container) {
    throw new Error(
      `#${RECAPTCHA_CONTAINER_ID} not found — add <div id="${RECAPTCHA_CONTAINER_ID}"></div> after #root in index.html`,
    );
  }

  layoutContainer();

  verifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
    size: "invisible",
    callback: () => {
      console.log("[recaptcha] solved");
    },
    "expired-callback": () => {
      console.log("[recaptcha] expired");
      resetRecaptcha();
    },
  });

  console.log("[recaptcha] created", {
    domain: window.location.hostname,
    exists: Boolean(verifier),
  });

  return verifier;
}

export function resetRecaptcha(): void {
  try {
    if (verifier) {
      verifier.clear();
    }
  } catch (err) {
    console.warn("[recaptcha] reset clear", err);
  }
  verifier = null;
}

export function logRecaptchaState(): void {
  console.log("Domain:", window.location.hostname);
  console.log("Recaptcha exists:", Boolean(verifier));
}
