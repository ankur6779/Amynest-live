/**
 * Guard for Android WebView pending Google/Facebook OAuth bootstrap.
 *
 * Native AuthBridge persists ID/access tokens across WebView reloads so login
 * can finish after the account picker. Those tokens must never auto-replace an
 * already-signed-in non-anonymous Firebase session (shared-tablet hijack).
 *
 * Anonymous guests may still bootstrap — that completes "Try First → Google".
 */
export type PendingNativeOAuthBootstrapDecision =
  | "bootstrap"
  | "skip"
  | "skip_clear_stale";

export function decidePendingNativeOAuthBootstrap(input: {
  hasPendingToken: boolean;
  signInInFlight: boolean;
  currentUser: { isAnonymous?: boolean } | null | undefined;
}): PendingNativeOAuthBootstrapDecision {
  if (!input.hasPendingToken) return "skip";
  if (input.signInInFlight) return "skip";
  const user = input.currentUser;
  if (user && user.isAnonymous !== true) return "skip_clear_stale";
  return "bootstrap";
}
