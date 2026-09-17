/** Standalone fixture for the restored Audio Lesson player sheet (no auth). */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import "../i18n";
import "@/components/amy-audio/amy-audio-living-room.css";
import { AmyVoiceProvider } from "@/contexts/amy-voice-provider";
import { PlayerSheet } from "@/components/audio-lessons/player-sheet";
import { getLessonById, getSeriesById } from "@workspace/audio-lessons";
import {
  AuthContext,
  type AuthContextValue,
} from "@/lib/firebase-auth-context";

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

const lesson = getLessonById("toddler-tantrums-101");
const series = getSeriesById("toddler-tantrums") ?? null;

function PreviewShell() {
  if (!lesson) {
    return <p style={{ color: "#fff", padding: 24 }}>Lesson not found</p>;
  }
  return (
    <PlayerSheet
      lesson={lesson}
      series={series}
      visible
      autoPlay={false}
      onMinimize={() => undefined}
    />
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <AuthContext.Provider value={stubAuth}>
        <AmyVoiceProvider>
          <PreviewShell />
        </AmyVoiceProvider>
      </AuthContext.Provider>
    </StrictMode>,
  );
}
