/** Standalone fixture for the restored Amy Audio Listen control (no auth). */
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { Volume2 } from "lucide-react";
import "../index.css";
import "../i18n";
import "@/components/amy-audio/amy-audio-living-room.css";
import { AmyVoiceProvider } from "@/contexts/amy-voice-provider";
import { Toaster } from "@/components/ui/toaster";
import { ListenButton, type Win } from "@/pages/ai-coach";
import { AudioPlayerBar } from "@/components/audio-lessons/audio-player-bar";
import { LESSONS } from "@workspace/audio-lessons";
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

const sampleWin: Win = {
  win: 1,
  title: "Co-regulate before correcting",
  objective: "Calm Aarav before discussing the broken cup.",
  deep_explanation: "Children under 7 cannot reason while flooded with cortisol.",
  actions: ["Sit at eye level", "Breathe with him for 30 seconds"],
  example: "Aarav threw his juice; sit beside him and breathe.",
  mistake_to_avoid: "Lecturing while he is still crying.",
  micro_task: "Try the 30-second breath next time he melts down.",
  duration: "1 week",
  science_reference: "Siegel, 2012 — co-regulation precedes self-regulation.",
};

const sampleLesson = LESSONS[0];

function CoachWinPreview() {
  return (
    <div
      data-testid="amy-audio-listen-preview"
      style={{
        background: "linear-gradient(160deg, #0f0c29 0%, #1a1040 55%, #0c1220 100%)",
        borderRadius: 20,
        padding: 18,
        color: "#f8f8ff",
        border: "1px solid rgba(167,139,250,0.28)",
      }}
    >
      <p style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800 }}>{sampleWin.title}</p>
      <p style={{ margin: "0 0 14px", fontSize: 13, lineHeight: 1.45, color: "rgba(255,255,255,0.82)" }}>
        {sampleWin.objective}
      </p>
      <div
        data-testid="coach-read-aloud-row"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "10px 12px",
          borderRadius: 12,
          background: "rgba(139,92,246,0.10)",
          border: "1px solid rgba(167,139,250,0.30)",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 800,
            letterSpacing: 0.6,
            color: "hsl(var(--brand-violet-200))",
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Volume2 size={16} aria-hidden />
          Read this win aloud
        </span>
        <ListenButton win={sampleWin} planCacheKey="plan-test-key" />
      </div>
    </div>
  );
}

function MiniBarPreview() {
  const [playing, setPlaying] = useState(false);
  if (!sampleLesson) return null;
  return (
    <div style={{ position: "relative", minHeight: 88 }}>
      <AudioPlayerBar
        lesson={sampleLesson}
        playing={playing}
        living
        onTogglePlay={() => setPlaying((value) => !value)}
        onExpand={() => undefined}
      />
    </div>
  );
}

function PreviewShell() {
  return (
    <>
      <p className="preview-label">Amy Audio — restored Coach Listen control</p>
      <CoachWinPreview />
      <p className="preview-label" style={{ marginTop: 28 }}>
        Quiet listen mini player — restored play affordance
      </p>
      <MiniBarPreview />
      <Toaster />
    </>
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
