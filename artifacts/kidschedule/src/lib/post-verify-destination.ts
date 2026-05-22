import { getApiUrl } from "@/lib/api";
import { getFirebaseAuth } from "@/lib/firebase";
import { waitForIdToken } from "@/lib/auth-token";
import { shouldShowNativeNotifyPrompt } from "@/lib/native-push-bridge";
import { isSetupComplete, resolveSetupStatus } from "@/lib/setup-status";

/**
 * Where to send the user after email is verified and they have a Firebase session.
 * Prefers onboarding for new accounts; otherwise dashboard or home redirect.
 */
export async function resolvePostVerifyDestination(): Promise<string> {
  if (shouldShowNativeNotifyPrompt()) {
    return "/notify-prompt?next=/";
  }

  const user = getFirebaseAuth().currentUser;
  if (!user?.emailVerified) {
    return "/sign-in";
  }

  const token = await waitForIdToken(() => user.getIdToken(true));
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
    return "/";
  }
}
