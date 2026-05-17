/**
 * Firebase Console → Authentication → Templates uses ONE shared "Custom action URL"
 * for all email types (verification, password reset, etc.). You cannot set different
 * URLs per template in the console.
 *
 * Our app overrides the link per send via ActionCodeSettings in code. This canonical
 * URL matches what you should set in Firebase so preview + SDK sends stay aligned.
 * The `mode` query param (verifyEmail | resetPassword) routes to the right page.
 */
export const CANONICAL_FIREBASE_ACTION_URL = "https://amynest.in/auth/action";

export function getFirebaseActionUrlForLocalDev(): string {
  if (typeof window !== "undefined" && window.location?.hostname) {
    const { hostname, origin } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${origin}/auth/action`;
    }
  }
  return CANONICAL_FIREBASE_ACTION_URL;
}
