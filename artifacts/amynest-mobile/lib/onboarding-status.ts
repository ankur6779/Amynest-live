export type OnboardingStatusPayload = {
  onboardingComplete: boolean;
  profileComplete: boolean;
};

export function isSetupComplete(data?: OnboardingStatusPayload | null): boolean {
  if (!data) return false;
  return data.onboardingComplete || data.profileComplete;
}

type AuthFetchFn = (path: string, init?: RequestInit) => Promise<Response>;

/** Match web AppCore.resolveSetupStatus — children imply setup is done. */
export async function fetchSetupStatus(
  authFetch: AuthFetchFn,
): Promise<OnboardingStatusPayload> {
  const res = await authFetch("/api/onboarding");
  if (!res.ok) {
    return { onboardingComplete: false, profileComplete: false };
  }

  const data = (await res.json()) as OnboardingStatusPayload;
  if (isSetupComplete(data)) {
    return data;
  }

  const childrenRes = await authFetch("/api/children");
  if (childrenRes.ok) {
    const children = (await childrenRes.json()) as unknown;
    if (Array.isArray(children) && children.length > 0) {
      return { onboardingComplete: true, profileComplete: true };
    }
  }

  return {
    onboardingComplete: !!data.onboardingComplete,
    profileComplete: !!data.profileComplete,
  };
}
