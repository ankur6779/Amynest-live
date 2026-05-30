import { getFirebaseAuth } from "@/lib/firebase";

/** Display name from Firebase user or linked OAuth provider (Facebook, Google, Apple). */
export function readOAuthParentNameHint(): string {
  try {
    const user = getFirebaseAuth().currentUser;
    if (!user) return "";
    const display = user.displayName?.trim();
    if (display) return display;
    for (const provider of user.providerData) {
      const name = provider.displayName?.trim();
      if (name) return name;
    }
    return "";
  } catch {
    return "";
  }
}

export function readFirebaseUserId(): string | null {
  try {
    return getFirebaseAuth().currentUser?.uid ?? null;
  } catch {
    return null;
  }
}
