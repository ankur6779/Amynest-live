import { signInAnonymously } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { navigateAfterAuth } from "@/lib/auth-navigation";
import { POST_ONBOARDING_ACTIVATION_PATH } from "@/lib/onboarding-navigation";
import type { ShimUser } from "@/lib/firebase-auth-context";

export const GUEST_CHECKOUT_MESSAGE =
  "Create a free account to subscribe — use Sign up or continue with Google.";

export class GuestAuthUnavailableError extends Error {
  constructor() {
    super(
      "Try-first isn’t available right now. Continue with Google or email sign-in below.",
    );
    this.name = "GuestAuthUnavailableError";
  }
}

/** Firebase anonymous guest — lets parents try before creating an account. */
export async function signInAsGuest(): Promise<void> {
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
