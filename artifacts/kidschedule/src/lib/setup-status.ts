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

export function readOnboardingCache(): SetupStatus {
  const cached =
    typeof localStorage !== "undefined" &&
    localStorage.getItem("onboardingComplete") === "true";
  return { onboardingComplete: cached, profileComplete: cached };
}

export function persistOnboardingCache(data: SetupStatus): void {
  if (typeof localStorage === "undefined") return;
  if (isSetupComplete(data)) {
    localStorage.setItem("onboardingComplete", "true");
  } else {
    localStorage.removeItem("onboardingComplete");
  }
}

/** Match AppCore / mobile: API flag or existing children. */
export async function resolveSetupStatus(
  authFetch: AuthFetchFn,
): Promise<SetupStatus> {
  let res: Response;
  try {
    res = await authFetch("/api/onboarding");
  } catch (e) {
    console.error("[setup-status] onboarding fetch failed", e);
    return readOnboardingCache();
  }

  if (res.status === 401) {
    const cached = readOnboardingCache();
    if (isSetupComplete(cached)) return cached;
    throw new Error("auth-unauthorized");
  }

  if (!res.ok) {
    return readOnboardingCache();
  }

  let data: SetupStatus;
  try {
    data = (await res.json()) as SetupStatus;
  } catch (e) {
    console.error("[setup-status] onboarding json parse failed", e);
    return readOnboardingCache();
  }

  if (isSetupComplete(data)) {
    return data;
  }

  try {
    const childrenRes = await authFetch("/api/children");
    if (childrenRes.ok) {
      const children = (await childrenRes.json()) as unknown;
      if (Array.isArray(children) && children.length > 0) {
        return { onboardingComplete: true, profileComplete: true };
      }
    }
  } catch (e) {
    console.error("[setup-status] children fetch failed", e);
  }

  return data;
}
