/**
 * Public OAuth client IDs (safe in bundle). Override via Vite env on CI/Render.
 * Web client is used for Firebase redirect + Android serverClientId.
 * iOS native sign-in also needs an iOS OAuth client in Firebase + GoogleService-Info.plist.
 */
export const googleAuthDefaults = {
  webClientId:
    "573340015027-s9pidrbahvsvq86esiispv6nqpng7i3j.apps.googleusercontent.com",
} as const;

/** Reversed web client ID for iOS URL scheme (Google Sign-In callback). */
export function reversedGoogleWebClientId(clientId: string): string {
  const suffix = ".apps.googleusercontent.com";
  if (!clientId.endsWith(suffix)) return clientId;
  const id = clientId.slice(0, -suffix.length);
  return `com.googleusercontent.apps.${id}`;
}

/** Firebase OAuth handler — must be an authorized redirect URI on the Google Cloud Web client. */
export function getFirebaseGoogleOAuthHandlerUrl(): string {
  const authDomain =
    (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined)?.trim() ||
    firebaseWebDefaults.authDomain;
  return `https://${authDomain}/__/auth/handler`;
}

/** Origins that must appear on the Google Cloud Web OAuth client. */
export function getGoogleOAuthAuthorizedOrigins(): string[] {
  return [
    "https://www.amynest.in",
    "https://amynest.in",
    "http://localhost",
    "http://127.0.0.1",
  ];
}
