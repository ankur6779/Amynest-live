import { generateRawNonce, sha256Hex } from "@/lib/auth-nonce";
import {
  getAppleRedirectUri,
  getAppleWebClientId,
} from "@/lib/apple-auth-defaults";

const APPLE_SCRIPT_ID = "appleid-auth-js";
const APPLE_SCRIPT_SRC =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

export const APPLE_RAW_NONCE_STORAGE_KEY = "amynest_apple_raw_nonce";

type AppleAuthInitConfig = {
  clientId: string;
  scope: string;
  redirectURI: string;
  state?: string;
  nonce?: string;
  usePopup: boolean;
};

type AppleAuthorization = {
  id_token: string;
  code: string;
  state?: string;
};

type AppleSignInSuccessEvent = CustomEvent<{
  authorization: AppleAuthorization;
  user?: {
    email?: string;
    name?: { firstName?: string; lastName?: string };
  };
}>;

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: AppleAuthInitConfig) => void;
        signIn: () => Promise<unknown>;
      };
    };
  }
}

function loadAppleAuthScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.AppleID?.auth) {
      resolve();
      return;
    }
    const existing = document.getElementById(APPLE_SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Apple Sign-In script failed to load")),
      );
      return;
    }
    const script = document.createElement("script");
    script.id = APPLE_SCRIPT_ID;
    script.src = APPLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Apple Sign-In script"));
    document.head.appendChild(script);
  });
}

export async function prepareAppleWebNonce(): Promise<{
  rawNonce: string;
  hashedNonce: string;
}> {
  const rawNonce = generateRawNonce();
  const hashedNonce = await sha256Hex(rawNonce);
  sessionStorage.setItem(APPLE_RAW_NONCE_STORAGE_KEY, rawNonce);
  return { rawNonce, hashedNonce };
}

export function consumeStoredAppleRawNonce(): string | null {
  const raw = sessionStorage.getItem(APPLE_RAW_NONCE_STORAGE_KEY);
  sessionStorage.removeItem(APPLE_RAW_NONCE_STORAGE_KEY);
  return raw;
}

export async function initAppleWebSdk(hashedNonce: string): Promise<void> {
  const clientId = getAppleWebClientId();
  if (!clientId) {
    throw Object.assign(
      new Error("Apple web client ID is not configured."),
      { code: "app/apple-not-configured" },
    );
  }

  await loadAppleAuthScript();
  window.AppleID!.auth.init({
    clientId,
    scope: "name email",
    redirectURI: getAppleRedirectUri(),
    state: "amynest-sign-in",
    nonce: hashedNonce,
    usePopup: false,
  });
}

/** Redirect-based Sign in with Apple (no popup). */
export async function loginWithAppleWebSdk(): Promise<void> {
  const { hashedNonce } = await prepareAppleWebNonce();
  await initAppleWebSdk(hashedNonce);
  await window.AppleID!.auth.signIn();
}

/**
 * On /auth/apple/callback after redirect: SDK fires success/failure events.
 */
export function waitForAppleWebRedirectResult(): Promise<{
  idToken: string;
  rawNonce: string;
  fullName: string | null;
}> {
  return new Promise((resolve, reject) => {
    const rawNonce = consumeStoredAppleRawNonce();
    if (!rawNonce) {
      reject(
        Object.assign(new Error("Apple sign-in session expired. Try again."), {
          code: "app/apple-session-expired",
        }),
      );
      return;
    }

    const onSuccess = (event: Event) => {
      cleanup();
      const detail = (event as AppleSignInSuccessEvent).detail;
      const idToken = detail?.authorization?.id_token;
      if (!idToken) {
        reject(
          Object.assign(new Error("Apple did not return an ID token."), {
            code: "app/apple-no-id-token",
          }),
        );
        return;
      }
      const first = detail.user?.name?.firstName ?? "";
      const last = detail.user?.name?.lastName ?? "";
      const fullName = [first, last].filter(Boolean).join(" ").trim() || null;
      resolve({ idToken, rawNonce, fullName });
    };

    const onFailure = (event: Event) => {
      cleanup();
      const detail = (event as CustomEvent<{ error?: string }>).detail;
      const code =
        detail?.error === "popup_closed_by_user"
          ? "auth/popup-closed-by-user"
          : "app/apple-sign-in-failed";
      reject(
        Object.assign(
          new Error(detail?.error ?? "Apple sign-in failed."),
          { code },
        ),
      );
    };

    const cleanup = () => {
      document.removeEventListener("AppleIDSignInOnSuccess", onSuccess);
      document.removeEventListener("AppleIDSignInOnFailure", onFailure);
    };

    document.addEventListener("AppleIDSignInOnSuccess", onSuccess);
    document.addEventListener("AppleIDSignInOnFailure", onFailure);
  });
}

/** Re-init SDK on callback route so Apple processes the redirect response. */
export async function bootAppleWebCallbackListener(
  hashedNonce: string,
): Promise<void> {
  await initAppleWebSdk(hashedNonce);
}
