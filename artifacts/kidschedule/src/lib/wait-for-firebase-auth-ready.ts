import type { Auth } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";

/** Resolve after Firebase Auth has finished initializing (required before action codes). */
export async function waitForFirebaseAuthReady(
  auth: Auth = firebaseAuth,
): Promise<void> {
  await auth.authStateReady();
}
