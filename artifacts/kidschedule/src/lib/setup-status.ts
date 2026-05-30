import { clearOnboardingChatSession } from "@/lib/onboarding-chat-session";
import {
  healOnboardingCompletionIfNeeded,
  logOnboardingFinish,
  mergeSetupStatusPreferComplete,
} from "@/lib/onboarding-completion";

export type SetupStatus = {
  onboardingComplete: boolean;
  profileComplete: boolean;
};

export type AuthFetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export function isSetupComplete(data: SetupStatus | undefined): boolean {
  if (!data) return false;
  return data.onboardingComplete || data.profileComplete;
}

const ONBOARDING_COMPLETE_SESSION_KEY = "amynest_onboarding_complete_v1";

export function readOnboardingCache(): SetupStatus {
  let cached = false;
  if (typeof localStorage !== "undefined") {
    cached = localStorage.getItem("onboardingComplete") === "true";
  }
  if (!cached && typeof sessionStorage !== "undefined") {
    try {
      cached = sessionStorage.getItem(ONBOARDING_COMPLETE_SESSION_KEY) === "true";
    } catch {
      /* ignore */
    }
  }
  return { onboardingComplete: cached, profileComplete: cached };
}

/**
 * Write completion to local cache. Never downgrades — incomplete payloads are ignored.
 * Use {@link clearOnboardingCompletionCache} for explicit server-driven resets only.
 */
export function persistOnboardingCache(data: SetupStatus): void {
  if (!isSetupComplete(data)) return;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("onboardingComplete", "true");
  }
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.setItem(ONBOARDING_COMPLETE_SESSION_KEY, "true");
    } catch {
      /* ignore */
    }
  }
}

/** Explicit reset — not used during bootstrap or refresh paths. */
export function clearOnboardingCompletionCache(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("onboardingComplete");
  }
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem(ONBOARDING_COMPLETE_SESSION_KEY);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Server COMPLETE + local INCOMPLETE → repair local cache and clear resume session.
 * Server is the single source of truth for completion.
 */
export function repairLocalFromServerComplete(
  serverStatus: SetupStatus,
  cached: SetupStatus = readOnboardingCache(),
): SetupStatus {
  if (!isSetupComplete(serverStatus)) {
    return mergeSetupStatusPreferComplete(cached, serverStatus);
  }

  if (!isSetupComplete(cached)) {
    logOnboardingFinish("SERVER_COMPLETE_LOCAL_INCOMPLETE_REPAIRED", {
      cached,
      server: serverStatus,
    });
    persistOnboardingCache(serverStatus);
    clearOnboardingChatSession();
  }

  return serverStatus;
}

/** Never downgrade a verified-complete client cache from stale/incomplete API reads. */
export function applySetupStatusUpdate(
  cached: SetupStatus | undefined,
  remote: SetupStatus | undefined,
): SetupStatus {
  return mergeSetupStatusPreferComplete(
    cached ?? { onboardingComplete: false, profileComplete: false },
    remote ?? { onboardingComplete: false, profileComplete: false },
  );
}

/** Match AppCore / mobile: API flag, existing children, or profile-based heal. */
export async function resolveSetupStatus(
  authFetch: AuthFetchFn,
): Promise<SetupStatus> {
  const cached = readOnboardingCache();
  let res: Response;

  try {
    res = await authFetch("/api/onboarding");
  } catch (e) {
    console.error("[setup-status] onboarding fetch failed", e);
    logOnboardingFinish("BOOTSTRAP_ONBOARDING_DECISION", {
      action: "use-cache",
      reason: "onboarding-fetch-error",
      cached,
    });
    if (isSetupComplete(cached)) return cached;
    const healed = await healOnboardingCompletionIfNeeded(authFetch);
    return healed ? repairLocalFromServerComplete(healed, cached) : cached;
  }

  if (res.status === 401) {
    if (isSetupComplete(cached)) return cached;
    throw new Error("auth-unauthorized");
  }

  if (!res.ok) {
    logOnboardingFinish("BOOTSTRAP_ONBOARDING_DECISION", {
      action: "use-cache",
      reason: "onboarding-http-error",
      status: res.status,
      cached,
    });
    if (isSetupComplete(cached)) return cached;
    const healed = await healOnboardingCompletionIfNeeded(authFetch);
    return healed ? repairLocalFromServerComplete(healed, cached) : cached;
  }

  let data: SetupStatus;
  try {
    data = (await res.json()) as SetupStatus;
  } catch (e) {
    console.error("[setup-status] onboarding json parse failed", e);
    if (isSetupComplete(cached)) return cached;
    const healed = await healOnboardingCompletionIfNeeded(authFetch);
    return healed ? repairLocalFromServerComplete(healed, cached) : cached;
  }

  if (isSetupComplete(data)) {
    const repaired = repairLocalFromServerComplete(data, cached);
    logOnboardingFinish("BOOTSTRAP_ONBOARDING_DECISION", {
      action: "accept-api",
      reason: "api-complete",
      data: repaired,
    });
    return repaired;
  }

  try {
    const childrenRes = await authFetch("/api/children");
    if (childrenRes.ok) {
      const children = (await childrenRes.json()) as unknown;
      if (Array.isArray(children) && children.length > 0) {
        const fromChildren = { onboardingComplete: true, profileComplete: true };
        const repaired = repairLocalFromServerComplete(fromChildren, cached);
        logOnboardingFinish("BOOTSTRAP_ONBOARDING_DECISION", {
          action: "infer-from-children",
          reason: "has-children",
          childCount: children.length,
          data: repaired,
        });
        return repaired;
      }
    }
  } catch (e) {
    console.error("[setup-status] children fetch failed", e);
  }

  const healed = await healOnboardingCompletionIfNeeded(authFetch);
  if (healed) {
    return repairLocalFromServerComplete(healed, cached);
  }

  const merged = applySetupStatusUpdate(cached, data);
  logOnboardingFinish("BOOTSTRAP_ONBOARDING_DECISION", {
    action: isSetupComplete(merged) ? "merge-prefer-complete" : "incomplete",
    reason: "no-heal-signals",
    cached,
    api: data,
    merged,
  });
  return merged;
}
