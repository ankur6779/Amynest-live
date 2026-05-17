import { RecaptchaVerifier, type Auth } from "firebase/auth";
import { isMobilePhoneOtpEnvironment } from "./mobile-phone-environment";

export const RECAPTCHA_CONTAINER_ID = "recaptcha-container";

const RENDER_TIMEOUT_MS = 30_000;

let verifier: RecaptchaVerifier | null = null;
let renderPromise: Promise<RecaptchaVerifier> | null = null;

declare global {
  interface Window {
    recaptchaWidgetId?: number;
    grecaptcha?: {
      reset: (widgetId?: number) => void;
      getResponse?: (widgetId?: number) => string;
    };
  }
}

function useVisibleRecaptcha(): boolean {
  return isMobilePhoneOtpEnvironment();
}

export function applyRecaptchaContainerLayout(el: HTMLElement): void {
  if (useVisibleRecaptcha()) {
    Object.assign(el.style, {
      position: "fixed",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      width: "304px",
      minHeight: "78px",
      overflow: "visible",
      visibility: "visible",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: "2147483646",
      pointerEvents: "auto",
      background: "rgba(12,6,30,0.94)",
      borderRadius: "14px",
      padding: "10px",
      border: "1px solid rgba(123,63,242,0.45)",
      boxSizing: "border-box",
    });
    return;
  }

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

export function ensureRecaptchaContainer(): HTMLElement {
  const el = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (!el) {
    throw new Error(
      `#${RECAPTCHA_CONTAINER_ID} not found — add <div id="${RECAPTCHA_CONTAINER_ID}"></div> after #root in index.html`,
    );
  }
  return el;
}

function setupRecaptcha(auth: Auth): RecaptchaVerifier {
  const container = ensureRecaptchaContainer();
  applyRecaptchaContainerLayout(container);

  if (verifier) {
    return verifier;
  }

  const size = useVisibleRecaptcha() ? "normal" : "invisible";

  verifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
    size,
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
    size,
    exists: Boolean(verifier),
  });

  return verifier;
}

function renderWithTimeout(v: RecaptchaVerifier): Promise<number> {
  return Promise.race([
    v.render(),
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
    await new Promise<void>((resolve) => setTimeout(resolve, 120));
  }
}

/**
 * Create verifier if needed, then render iframe — must run inside Send OTP tap.
 * Never call at app boot (OOM / crash on mobile).
 */
export async function prepareRecaptchaForSend(auth: Auth): Promise<RecaptchaVerifier> {
  const instance = setupRecaptcha(auth);

  if (window.recaptchaWidgetId !== undefined) {
    logRecaptchaState();
    return instance;
  }

  if (renderPromise) {
    return renderPromise;
  }

  renderPromise = (async () => {
    try {
      await deferBeforeRecaptchaRender();
      const widgetId = await renderWithTimeout(instance);
      window.recaptchaWidgetId = widgetId;
      logRecaptchaState();
      return instance;
    } catch (err) {
      console.error("[recaptcha] render failed", err);
      resetRecaptcha();
      throw err;
    } finally {
      renderPromise = null;
    }
  })();

  return renderPromise;
}

/** @deprecated Prefer prepareRecaptchaForSend — does not render. */
export function getRecaptcha(auth: Auth): RecaptchaVerifier {
  return setupRecaptcha(auth);
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
  window.recaptchaWidgetId = undefined;
  renderPromise = null;
}

export function logRecaptchaState(): void {
  console.log("Domain:", window.location.hostname);
  console.log("Recaptcha exists:", Boolean(verifier));
  console.log("Recaptcha rendered:", window.recaptchaWidgetId !== undefined);
  console.log("Recaptcha mode:", useVisibleRecaptcha() ? "normal-mobile" : "invisible-desktop");
}
