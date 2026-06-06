/**
 * Level 7 — Firebase auth token refresh without forced logout.
 */

import { getFirebaseAuth } from "@/lib/firebase";
import { recordRecoveryEvent } from "@/lib/self-healing/recovery-stats";
import { recordSelfHealingAction } from "@/lib/self-healing/action-log";

let refreshInFlight = false;

/** Attempt silent token refresh. Returns new token or null. */
export async function refreshAuthSession(): Promise<string | null> {
  if (refreshInFlight) return null;
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return null;

  refreshInFlight = true;
  recordSelfHealingAction("auth_refresh");
  try {
    const token = await user.getIdToken(true);
    recordRecoveryEvent({
      level: 7,
      outcome: "auto_recovered",
      detail: "token_refreshed",
    });
    return token;
  } catch (err) {
    recordRecoveryEvent({
      level: 7,
      outcome: "manual_required",
      detail: err instanceof Error ? err.message : "auth_refresh_failed",
    });
    return null;
  } finally {
    refreshInFlight = false;
  }
}

/** Retry a fetch after refreshing auth — for 401 / auth-token errors. */
export async function withAuthRecovery<T>(
  fn: () => Promise<T>,
  isAuthError: (err: unknown) => boolean,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!isAuthError(err)) throw err;
    const token = await refreshAuthSession();
    if (!token) throw err;
    return fn();
  }
}
