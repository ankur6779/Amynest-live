/**
 * Playwright fixture — infant sleep library (lullabies, poems, stories).
 */
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "../i18n";
import { WhiteNoiseLullaby } from "../components/infant-sounds";
import { InfantPoems } from "../components/infant-poems";
import { InfantSleepTracks } from "../components/infant-sleep-tracks";
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

type FixtureTab = "noise" | "lullabies" | "poems" | "stories";

function InfantSleepAudioFixture() {
  const [tab, setTab] = useState<FixtureTab>("noise");
  const tabs: { id: FixtureTab; label: string }[] = [
    { id: "noise", label: "Noise" },
    { id: "lullabies", label: "Lullabies" },
    { id: "poems", label: "Poems" },
    { id: "stories", label: "Stories" },
  ];

  return (
    <div className="p-4 space-y-4" data-testid="infant-sleep-audio-fixture">
      <div className="sleep-tab-bar grid grid-cols-4 gap-1 p-1" role="tablist" aria-label="Sleep library">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className="sleep-tab-btn rounded-xl py-2.5 text-[11px] font-bold"
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "noise" ? <WhiteNoiseLullaby ageMonths={8} childId="playwright-child" /> : null}
      {tab === "lullabies" ? (
        <InfantSleepTracks
          category="lullaby"
          childId="playwright-child"
          headerTitle="Lullabies for your baby"
          headerBlurb="Tap any tile to open the immersive player."
        />
      ) : null}
      {tab === "poems" ? <InfantPoems ageMonths={8} childId="playwright-child" /> : null}
      {tab === "stories" ? (
        <InfantSleepTracks
          category="story"
          childId="playwright-child"
          headerTitle="Sleep stories"
          headerBlurb="Tap a story tile to hear Amy narrate."
        />
      ) : null}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthContext.Provider value={stubAuth}>
      <InfantSleepAudioFixture />
    </AuthContext.Provider>
  </StrictMode>,
);
