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

function makeFixtureWavBlob(durationSec = 12, sampleRate = 8000): Blob {
  const samples = durationSec * sampleRate;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples * 2, true);
  return new Blob([buffer], { type: "audio/wav" });
}

const originalFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.includes("/api/static-audio/")) {
    return new Response(makeFixtureWavBlob(12), {
      status: 200,
      headers: {
        "content-type": "audio/wav",
        "x-amynest-static-source": "asset",
        "content-length": String(44 + 12 * 8000 * 2),
      },
    });
  }
  return originalFetch(input, init);
};

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
