/**
 * When true, account-only V2 destinations must open the guest sheet
 * instead of navigating (no raw Sign-in wall).
 */

import { isAnonymousUser } from "@/lib/anonymous-auth";
import type { ShimUser } from "@/lib/firebase-auth-context";

export function shouldUseGuestAccountSheet(args: {
  isSignedIn: boolean | undefined;
  user: ShimUser | null | undefined;
}): boolean {
  if (!args.isSignedIn) return true;
  return isAnonymousUser(args.user);
}
