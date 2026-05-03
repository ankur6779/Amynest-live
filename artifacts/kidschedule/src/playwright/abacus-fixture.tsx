/**
 * Standalone fixture page for Playwright e2e of the Abacus PRO Zone.
 *
 * Mounts <AbacusZone /> in isolation with a stub <FirebaseAuthProvider>
 * that returns a null token (so `useAuthFetch` works without real auth).
 * All `/api/abacus/*` traffic is intercepted by `page.route()` from the
 * Playwright spec — see `playwright/specs/abacus.spec.ts`.
 *
 * URL params (so a single fixture file can drive multiple test variants):
 *   - childId   (default 7)
 *   - childName (default "Sam")
 *   - ageYears  (default 6)
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../i18n";
import { AbacusZone } from "../components/abacus-zone";
import {
  AuthContext,
  type AuthContextValue,
} from "../lib/firebase-auth-context";

const stubAuth: AuthContextValue = {
  user: {
    id: "playwright_user",
    uid: "playwright_user",
    firstName: "Playwright",
    lastName: null,
    fullName: "Playwright",
    imageUrl: null,
    emailAddresses: [],
    primaryEmailAddress: null,
    primaryPhoneNumber: null,
    setProfileImage: async () => {},
  },
  isLoaded: true,
  getToken: async () => null,
  signOut: async () => {},
  addListener: () => () => {},
};

const params = new URLSearchParams(window.location.search);
const childId = Number(params.get("childId") ?? 7);
const childName = params.get("childName") ?? "Sam";
const ageYears = Number(params.get("ageYears") ?? 6);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthContext.Provider value={stubAuth}>
      <AbacusZone
        childId={childId}
        childName={childName}
        ageYears={ageYears}
      />
    </AuthContext.Provider>
  </StrictMode>,
);
