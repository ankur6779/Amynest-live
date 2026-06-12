import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../i18n";
import { HealthLabZone } from "../features/health-lab/components/health-lab-zone";
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
  authStatus: "authenticated",
  getToken: async () => "playwright-token",
  signOut: async () => {},
  addListener: () => () => {},
};

const params = new URLSearchParams(window.location.search);
const childId = Number(params.get("childId") ?? "42");
const childName = params.get("childName") ?? "Riya";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <AuthContext.Provider value={stubAuth}>
        <HealthLabZone childId={childId} childName={childName} />
      </AuthContext.Provider>
    </StrictMode>,
  );
}
