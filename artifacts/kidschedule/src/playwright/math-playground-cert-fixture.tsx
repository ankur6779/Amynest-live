/**
 * Production certification fixture — Math Playground with Smart Math Tricks tab shell.
 */
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "../i18n";
import {
  ACTIVITY_CARDS,
  MINI_GAME_TEMPLATES,
  defaultLearningState,
  generateActivity,
  generateMiniGame,
  type PlaygroundActivityId,
  type PlaygroundPersistedState,
} from "@workspace/math-playground";
import { MathPlayground } from "../components/math-playground";
import { Toaster } from "../components/ui/toaster";
import {
  AuthContext,
  type AuthContextValue,
} from "../lib/firebase-auth-context";

const stubAuth: AuthContextValue = {
  user: {
    id: "cert_user",
    uid: "cert_user",
    firstName: "Cert",
    lastName: null,
    fullName: "Cert Child",
    imageUrl: null,
    emailAddresses: [],
    primaryEmailAddress: null,
    primaryPhoneNumber: null,
    setProfileImage: async () => {},
  },
  isLoaded: true,
  authStatus: "authenticated",
  getToken: async () => null,
  signOut: async () => {},
  addListener: () => () => {},
};

const params = new URLSearchParams(window.location.search);
const childId = Number(params.get("childId") ?? 99);
const childName = params.get("childName") ?? "Cert";
const ageYears = Number(params.get("ageYears") ?? 7);

function readPlaygroundState(): PlaygroundPersistedState | null {
  const key = `amynest_math_playground_v4_${childId}`;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as PlaygroundPersistedState) : null;
  } catch {
    return null;
  }
}

(window as unknown as { __MP_CERT__: Record<string, unknown> }).__MP_CERT__ = {
  childId,
  ageYears,
  activityIds: ACTIVITY_CARDS.map((c) => c.id),
  miniGameTemplates: MINI_GAME_TEMPLATES,
  generateActivity: (activityId: PlaygroundActivityId, seed?: number) =>
    generateActivity({
      activityId,
      ageYears,
      childId: seed ?? childId,
      learning: defaultLearningState(),
      adaptivityTier: "standard",
      enableMiniGames: true,
      seed,
    }),
  generateMiniGame: (template: (typeof MINI_GAME_TEMPLATES)[number], seed: number) =>
    generateMiniGame(template, "4-5", seed, "standard"),
  getPlaygroundState: readPlaygroundState,
  resetPlaygroundState: () => {
    for (const prefix of [
      "amynest_math_playground_v4",
      "amynest_math_playground_v3",
      "amynest_math_playground_v2",
      "amynest_math_playground_v1",
    ]) {
      localStorage.removeItem(`${prefix}_${childId}`);
    }
  },
};

function CertShell() {
  const [tab, setTab] = useState<"today" | "playground">("today");

  return (
    <div data-testid="cert-root">
      <div
        className="flex gap-1 p-1 rounded-2xl mb-3"
        style={{ background: "rgba(255,255,255,0.07)" }}
        data-testid="cert-smt-tabs"
      >
        <button
          type="button"
          data-testid="smt-tab-today"
          onClick={() => setTab("today")}
          className="flex-1 py-2 rounded-xl font-bold text-xs"
        >
          📅 Today
        </button>
        <button
          type="button"
          data-testid="smt-tab-playground"
          onClick={() => setTab("playground")}
          className="flex-1 py-2 rounded-xl font-bold text-xs"
        >
          🎮 Playground
        </button>
      </div>
      {tab === "today" && (
        <p data-testid="cert-today-placeholder" className="text-white/60 text-sm">
          Smart Math Tricks — Today tab (cert shell)
        </p>
      )}
      {tab === "playground" && (
        <MathPlayground childName={childName} ageYears={ageYears} childId={childId} />
      )}
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={stubAuth}>
        <CertShell />
        <Toaster />
      </AuthContext.Provider>
    </QueryClientProvider>
  </StrictMode>,
);
