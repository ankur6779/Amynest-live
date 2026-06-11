/**
 * Standalone fixture for Math Playground mini-game Playwright e2e.
 *
 * Mounts <MathPlayground /> with stub auth. Mini games require
 * VITE_MP_MINI_GAMES=1 (set in playwright.config.math-playground.ts).
 *
 * URL params:
 *   - childId   (default 7)
 *   - childName (default "Sam")
 *   - ageYears  (default 5)
 *   - mode      "hub" | "mini" (default "mini" — direct pop_correct_answer)
 */
import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "../i18n";
import { generateMiniGame } from "@workspace/math-playground";
import { MathPlayground } from "../components/math-playground";
import { MathPuzzles } from "../components/math-playground/activities/MathPuzzles";
import { usePlaygroundAmy } from "../components/math-playground/hooks/usePlaygroundAmy";
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
  getToken: async () => null,
  signOut: async () => {},
  addListener: () => () => {},
};

const params = new URLSearchParams(window.location.search);
const childId = Number(params.get("childId") ?? 7);
const childName = params.get("childName") ?? "Sam";
const ageYears = Number(params.get("ageYears") ?? 5);
const mode = params.get("mode") ?? "mini";
const miniTemplate = (params.get("template") ?? "pop_correct_answer") as
  | "pop_correct_answer"
  | "rocket_counting"
  | "balloon_burst"
  | "feed_the_monkey"
  | "number_train"
  | "castle_builder";

function MiniGameFixture() {
  const amy = usePlaygroundAmy(ageYears);
  const [done, setDone] = useState(false);
  const payload = useMemo(
    () => generateMiniGame(miniTemplate, "4-5", 42, "standard"),
    [],
  );
  const correct =
    payload.correctAnswer ?? payload.choices?.[payload.correctIndex ?? 0] ?? 0;

  useEffect(() => {
    (window as unknown as { __MP_MINI_PAYLOAD__?: typeof payload }).__MP_MINI_PAYLOAD__ = payload;
  }, [payload]);

  return (
    <div data-testid="mp-fixture-mini">
      <MathPuzzles
        payload={payload}
        amy={amy}
        accentColor="hsl(var(--brand-teal-400))"
        childId={childId}
        onComplete={() => setDone(true)}
      />
      {done && (
        <p data-testid="mp-puzzle-complete" className="text-white font-bold mt-4">
          complete:{correct}
        </p>
      )}
    </div>
  );
}

function HubFixture() {
  return (
    <MathPlayground childId={childId} childName={childName} ageYears={ageYears} />
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthContext.Provider value={stubAuth}>
      {mode === "hub" ? <HubFixture /> : <MiniGameFixture />}
    </AuthContext.Provider>
  </StrictMode>,
);
