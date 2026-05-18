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
