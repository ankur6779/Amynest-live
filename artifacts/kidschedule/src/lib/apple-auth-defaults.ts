/**
 * Apple Sign-In identifiers. Override via Vite env on CI/Render.
 *
 * Web: Apple Services ID (Sign in with Apple → Services IDs in Developer portal).
 * Native iOS: app bundle ID passed to @capacitor-community/apple-sign-in.
 */
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

  if (typeof window === "undefined") {
    return `https://amynest.in${appleAuthDefaults.redirectPath}`;
  }
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const path = appleAuthDefaults.redirectPath.replace(/^\//, "");
  return `${window.location.origin}${base}/${path}`;
}
