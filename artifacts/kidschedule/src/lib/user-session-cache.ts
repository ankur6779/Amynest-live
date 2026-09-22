import { ACTIVE_CHILD_STORAGE_KEY } from "@/lib/coach-age-nav";
import { clearDashboardCaches } from "@/lib/dashboard-data-cache";
import { clearOnboardingChatSession } from "@/lib/onboarding-chat-session";
import { clearOnboardingRunId } from "@/lib/onboarding-telemetry";
import { clearOnboardingCompletionCache } from "@/lib/setup-status";
import { setLearningSyncUser } from "@/lib/learning-sync-engine";

const SESSION_UID_KEY = "amynest:session:uid:v1";

/**
 * Wipe client-side caches tied to a prior account/session.
 * Required after account deletion or when Firebase uid changes — otherwise
 * stale onboarding/children data blocks child add and skips onboarding.
 *
 * Does not remove `amynest:device:id:v1`. The installation id is reused so
 * the backend can treat this install as one session; account ownership lives
 * in `user_devices`, not in the local id.
 *
 * Learning-sync / worksheet offline queues are user-scoped in localStorage —
 * we only unbind the active learning-sync user so another account cannot
 * flush or burn the prior user's pending writes.
 */
export function clearUserSessionCaches(): void {
  clearOnboardingCompletionCache();
  clearOnboardingChatSession();
  clearOnboardingRunId();
  clearDashboardCaches();
  setLearningSyncUser(null);

  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(ACTIVE_CHILD_STORAGE_KEY);
    localStorage.removeItem(SESSION_UID_KEY);
    localStorage.removeItem("amynest_onboarding_session");
  } catch {
    /* private mode */
  }
}

/** Remember last signed-in uid to detect account switches on the same device. */
export function readStoredSessionUid(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_UID_KEY);
    return raw && raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

export function persistStoredSessionUid(uid: string | null): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (!uid) {
      localStorage.removeItem(SESSION_UID_KEY);
      return;
    }
    localStorage.setItem(SESSION_UID_KEY, uid);
  } catch {
    /* private mode */
  }
}
