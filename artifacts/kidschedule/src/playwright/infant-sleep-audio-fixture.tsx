/**
 * Playwright fixture — infant sleep library (lullabies, poems, stories).
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../i18n";
import { WhiteNoiseLullaby } from "../components/infant-sounds";
import {
  AuthContext,
  type AuthContextValue,
} from "../lib/firebase-auth-context";
import {
  getInfantSleepPlaybackTraceLog,
  resetInfantSleepPlaybackTraceForTests,
  warnIfAudioSourceDuplicated,
} from "../lib/infant-sleep-playback-trace";

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
  getToken: async () => "playwright-test-token",
  signOut: async () => {},
  addListener: () => () => {},
};

declare global {
  interface Window {
    __infantSleepAudit?: {
      resetTrace: () => void;
      warnDuplication: (id: string, source: string) => boolean;
      getPlaybackTrace: () => ReturnType<typeof getInfantSleepPlaybackTraceLog>;
    };
  }
}

window.__infantSleepAudit = {
  resetTrace: resetInfantSleepPlaybackTraceForTests,
  warnDuplication: warnIfAudioSourceDuplicated,
  getPlaybackTrace: getInfantSleepPlaybackTraceLog,
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthContext.Provider value={stubAuth}>
      <WhiteNoiseLullaby ageMonths={8} childId="playwright-child" />
    </AuthContext.Provider>
  </StrictMode>,
);
