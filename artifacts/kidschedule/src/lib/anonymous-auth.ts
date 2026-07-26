import { signInAnonymously } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { navigateAfterAuth } from "@/lib/auth-navigation";
import { POST_ONBOARDING_ACTIVATION_PATH } from "@/lib/onboarding-navigation";
import { FF_GUEST_TRY_FIRST } from "@/lib/mrr-experiment-flags";
import { isNativeAmyNestShell } from "@/lib/native-shell";
import type { ShimUser } from "@/lib/firebase-auth-context";

export const GUEST_CHECKOUT_MESSAGE =
  "Create a free account to subscribe — use Sign up or continue with Google.";

const GUEST_UNAVAILABLE_SESSION_KEY = "amynest:guest_try_first_unavailable";

/**
 * Thrown when Firebase Anonymous Auth is disabled for this project.
 * Callers must hide the Try First CTA — never surface this as a user-facing error.
 */
export class GuestAuthUnavailableError extends Error {
  constructor() {
    super("GuestAuthUnavailable");
    this.name = "GuestAuthUnavailableError";
  }
}

/** Persist that guest try-first cannot work in this browser session. */
export function markGuestAuthUnavailable(): void {
  try {
    sessionStorage.setItem(GUEST_UNAVAILABLE_SESSION_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export function isGuestAuthMarkedUnavailable(): boolean {
  try {
    return sessionStorage.getItem(GUEST_UNAVAILABLE_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Show Try First only when the experiment flag is on, we are in the native
 * AmyNest shell, and this session has not already learned guest auth is off.
 */
export function shouldShowGuestTryFirst(): boolean {
  if (!FF_GUEST_TRY_FIRST) return false;
  if (!isNativeAmyNestShell()) return false;
  if (isGuestAuthMarkedUnavailable()) return false;
  return true;
}

/** Firebase anonymous guest — lets parents try before creating an account. */
export async function signInAsGuest(): Promise<void> {
  if (!FF_GUEST_TRY_FIRST) {
    markGuestAuthUnavailable();
    throw new GuestAuthUnavailableError();
  }
  const auth = getFirebaseAuth();
  try {
    await signInAnonymously(auth);
    navigateAfterAuth("/onboarding");
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? "";
    if (
      code === "auth/operation-not-allowed" ||
      code === "auth/admin-restricted-operation"
    ) {
      markGuestAuthUnavailable();
      throw new GuestAuthUnavailableError();
    }
    throw err;
  }
}

export function isAnonymousUser(user: ShimUser | null | undefined): boolean {
  return user?.isAnonymous === true;
}

/** Guest users must link an account before checkout. */
export function guestCheckoutBlocked(user: ShimUser | null | undefined): boolean {
  return isAnonymousUser(user);
}

export function getGuestCheckoutBlock(
  user: ShimUser | null | undefined,
): { blocked: boolean; message: string } {
  if (!guestCheckoutBlocked(user)) {
    return { blocked: false, message: "" };
  }
  return { blocked: true, message: GUEST_CHECKOUT_MESSAGE };
}

export const GUEST_ACTIVATION_PATH = POST_ONBOARDING_ACTIVATION_PATH;
