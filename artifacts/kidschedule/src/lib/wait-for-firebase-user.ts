import { onAuthStateChanged, type User } from "firebase/auth";
import { firebaseAuth } from "./firebase";

/** Wait for Firebase Auth to restore session (e.g. right after sign-up redirect). */
export function waitForFirebaseUser(timeoutMs = 8000): Promise<User | null> {
  const existing = firebaseAuth.currentUser;
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const unsub = onAuthStateChanged(firebaseAuth, (user) => {
      if (user) {
        unsub();
        resolve(user);
        return;
      }
      if (Date.now() >= deadline) {
        unsub();
        resolve(null);
      }
    });
    setTimeout(() => {
      unsub();
      resolve(firebaseAuth.currentUser);
    }, timeoutMs);
  });
}
