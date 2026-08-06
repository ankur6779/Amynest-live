import { getApiUrl } from "@/lib/api";
import { getFirebaseAuth } from "@/lib/firebase";
import { waitForIdToken } from "@/lib/auth-token";
import { shouldShowPermissionsSetupPromptAsync } from "@/lib/pwa-android-permissions";
import { isSetupComplete, resolveSetupStatus } from "@/lib/setup-status";
import { tryResolveV2PostAuthPath } from "@/v2/guest/soft-save";

async function resolvePostAuthDestinationWithToken(
  getToken: () => Promise<string | null>,
): Promise<string> {
  // Phase 4B soft-save / Premium return — before classic onboarding restart.
  const v2Path = tryResolveV2PostAuthPath();
  if (v2Path) {
    return v2Path;
  }

  if (await shouldShowPermissionsSetupPromptAsync()) {
    return "/notify-prompt?next=/";
  }

  const token = await waitForIdToken(getToken);
  if (!token) {
    return "/";
  }

  const authFetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    const url =
      typeof input === "string" && input.startsWith("/")
        ? getApiUrl(input)
        : input;
    return fetch(url, { ...init, headers });
  };

  try {
    const data = await resolveSetupStatus(authFetch);
    if (!isSetupComplete(data)) {
      return "/onboarding";
    }
    return "/dashboard";
  } catch {
    return getFirebaseAuth().currentUser ? "/dashboard" : "/";
  }
}

/**
 * Where to send the user after email is verified and they have a Firebase session.
 * Prefers onboarding for new accounts; otherwise dashboard or home redirect.
 */
export async function resolvePostVerifyDestination(): Promise<string> {
  const user = getFirebaseAuth().currentUser;
  if (!user?.emailVerified) {
    return "/sign-in";
  }
  return resolvePostAuthDestinationWithToken(() => user.getIdToken(true));
}

/** After Google / Apple / phone OAuth — skip email verification gate. */
export async function resolvePostOAuthDestination(): Promise<string> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    return "/sign-in";
  }
  return resolvePostAuthDestinationWithToken(() => user.getIdToken(true));
}
