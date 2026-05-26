/**
 * Apple Sign-In identifiers. Override via Vite env on CI/Render.
 *
 * Web: Apple Services ID (Sign in with Apple → Services IDs in Developer portal).
 * Native iOS: app bundle ID passed to @capacitor-community/apple-sign-in.
 */
import { CANONICAL_PRODUCTION_ORIGIN } from "@workspace/phone-auth";
import { firebaseWebDefaults } from "@/lib/firebase-web-defaults";
import { isCapacitorNativeShell } from "@/lib/native-shell";

export const appleAuthDefaults = {
  /** e.g. in.amynest.web — set VITE_APPLE_WEB_CLIENT_ID in production */
  webClientId: "",
  iosClientId: "com.amynest.app",
  redirectPath: "/auth/apple/callback",
} as const;

export function getAppleWebClientId(): string {
  const fromEnv = (
    import.meta.env.VITE_APPLE_WEB_CLIENT_ID as string | undefined
  )?.trim();
  return fromEnv || appleAuthDefaults.webClientId;
}

export function getAppleIosClientId(): string {
  const fromEnv = (
    import.meta.env.VITE_APPLE_IOS_CLIENT_ID as string | undefined
  )?.trim();
  return fromEnv || appleAuthDefaults.iosClientId;
}

export function getAppleRedirectUri(): string {
  const fromEnv = (
    import.meta.env.VITE_APPLE_REDIRECT_URI as string | undefined
  )?.trim();
  if (fromEnv) return fromEnv;

  if (typeof window !== "undefined" && isCapacitorNativeShell()) {
    return `${CANONICAL_PRODUCTION_ORIGIN}${appleAuthDefaults.redirectPath}`;
  }

  if (typeof window === "undefined") {
    return `${CANONICAL_PRODUCTION_ORIGIN}${appleAuthDefaults.redirectPath}`;
  }
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const path = appleAuthDefaults.redirectPath.replace(/^\//, "");
  const origin =
    window.location.hostname === "amynest.in" ||
    window.location.hostname === "www.amynest.in"
      ? CANONICAL_PRODUCTION_ORIGIN
      : window.location.origin;
  return `${origin}${base}/${path}`.replace(/([^:]\/)\/+/g, "$1");
}

/** Return URL Apple must allow when using Firebase OAuth redirect/popup on web. */
export function getFirebaseAppleOAuthHandlerUrl(): string {
  const authDomain =
    (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined)?.trim() ||
    firebaseWebDefaults.authDomain;
  return `https://${authDomain}/__/auth/handler`;
}
