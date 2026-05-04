/**
 * TTS button state tests for WinCard (coach.tsx) and TurnView (amy-ai.tsx).
 *
 * Covers:
 *   TurnView — renders "Listen" when idle, "Stop" when that turn is the
 *              active TTS turn (speaking or loading), calls onListen with
 *              the correct turnId and combined content+question text.
 *   WinCard  — renders "Listen" when idle, "Stop" when speaking or loading,
 *              calls speak() with win text, calls stop() on second tap.
 *
 * TurnView is tested directly via its named export (added for testability).
 * WinCard is tested through CoachScreen resumed into "result" phase.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";

// ─── Controllable TTS mock ─────────────────────────────────────────────────
// ttsState is a plain mutable object — flip fields before each render to
// simulate different speaking / loading states without re-importing the mock.
const ttsSpeak = vi.fn();
const ttsStop = vi.fn();
const ttsState: { speaking: boolean; loading: boolean } = {
  speaking: false,
  loading: false,
};

vi.mock("@/hooks/useAmyVoice", () => ({
  useAmyVoice: () => ({
    speak: ttsSpeak,
    stop: ttsStop,
    speaking: ttsState.speaking,
    loading: ttsState.loading,
    error: null,
    currentTime: 0,
    duration: 0,
    seekTo: vi.fn(),
  }),
}));

// ─── Mocks shared by both screens ─────────────────────────────────────────
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({ mode: "dark", theme: { gradient: ["#0b0b1a", "#1a1633"] } }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/AiQuotaBanner", () => ({ default: () => null }));

vi.mock("@/store/useSubscriptionStore", () => ({
  useSubscriptionStore: Object.assign(
    () => ({ refresh: vi.fn() }),
    { getState: () => ({ refresh: vi.fn().mockResolvedValue(undefined) }) },
  ),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

// ─── Amy AI / TurnView mocks ───────────────────────────────────────────────
// (TurnView uses useTranslation + expo-linear-gradient + @expo/vector-icons;
//  all resolved via vitest.config.ts aliases — no extra mocks needed.)

// ─── Coach screen mocks ───────────────────────────────────────────────────
const mockAuthFetch = vi.fn();
vi.mock("@/hooks/useAuthFetch", () => ({ useAuthFetch: () => mockAuthFetch }));

const mockUseLocalSearchParams = vi.fn<[], Record<string, string>>(() => ({}));
vi.mock("expo-router", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock("@/hooks/useProfileComplete", () => ({
  useProfileComplete: () => ({ profileComplete: true, isLoading: false }),
}));

vi.mock("@/components/ProfileLockScreen", () => ({
  ProfileLockScreen: () => null,
}));

vi.mock("@/hooks/useSectionUsage", () => ({
  useSectionUsage: () => ({
    isPremium: true,
    fullyUsed: false,
    loaded: true,
    markBlockUsed: vi.fn(),
  }),
}));

vi.mock("expo-haptics", () => ({
  impactAsync: vi.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: "light" },
}));

vi.mock("@workspace/coach-topic-questions", () => ({
  getTopicQuestions: () => [],
}));

vi.mock("@workspace/infant-problems", () => ({
  INFANT_PROBLEMS: [],
  isInfantProblemId: () => false,
  getInfantProblem: () => null,
  pickLang: (p: unknown) => p,
}));

vi.mock("@/hooks/useColors", () => ({
  useColors: () => ({ statusInfoBg: "#ffffff" }),
}));

// ─── Imports after vi.mock calls ──────────────────────────────────────────
import { TurnView } from "@/app/amy-ai";
import CoachScreen from "@/app/(tabs)/coach";

// ─── Shared test fixtures ─────────────────────────────────────────────────
function makeJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

type TutorTurn = {
  id: string;
  role: "tutor";
  reply: {
    type: string;
    content: string;
    examples: string[];
    question: string | null;
    options: string[];
    answer: number | null;
  };
  pickedIndex?: number;
};

function makeTutorTurn(content: string, question?: string): TutorTurn {
  return {
    id: "turn-abc",
    role: "tutor",
    reply: {
      type: "teach",
      content,
      examples: [],
      question: question ?? null,
      options: [],
      answer: null,
    },
  };
}

const SAMPLE_COACH_SESSION = {
  sessionId: "ses-1",
  goalId: "manage-tantrums",
  plan: {
    title: "Reduce Bedtime Tantrums",
    root_cause: "Child resists transitions",
    summary: "Use these strategies every night.",
    wins: [
      {
        win: 1,
        title: "Create a Visual Schedule",
        objective: "Make the bedtime routine predictable.",
        deep_explanation: "Predictability reduces anxiety.",
        actions: ["Draw a schedule together", "Review at 6 pm"],
        example: "Aarav knows bath comes before story.",
        mistake_to_avoid: "Skipping steps confuses children.",
        micro_task: "Draw the schedule tonight with your child.",
        duration: "5 min",
        science_reference: "Routine theory, Siegel 2012",
      },
    ],
  },
  inputs: {
    goal: "Manage Tantrums",
    ageGroup: "5–7 years",
    severity: "Moderate – frequent",
    triggers: ["Being told 'no'"],
    routine: "No clear routine yet",
  },
  feedbacks: {},
};

// ═══════════════════════════════════════════════════════════════════════════
// TurnView TTS button — tested directly via its exported function
// ═══════════════════════════════════════════════════════════════════════════
describe("TurnView TTS button (amy-ai.tsx)", () => {
  beforeEach(() => {
    ttsSpeak.mockReset();
    ttsStop.mockReset();
    ttsState.speaking = false;
    ttsState.loading = false;
    cleanup();
  });

  function renderTurnView(
    content: string,
    question: string | null,
    ttsActiveId: string | null,
    ttsSpeaking: boolean,
    ttsLoading: boolean,
    onListen = vi.fn(),
  ) {
    const turn = makeTutorTurn(content, question ?? undefined);
    return render(
      <TurnView
        turn={turn}
        onPickOption={vi.fn()}
        onListen={onListen}
        ttsActiveId={ttsActiveId}
        ttsLoading={ttsLoading}
        ttsSpeaking={ttsSpeaking}
      />,
    );
  }

  it("shows the Listen label when no TTS is active for this turn", () => {
    renderTurnView("Phonics is great!", null, null, false, false);
    expect(screen.getByText("ai.listen")).toBeInTheDocument();
  });

  it("shows the Listen label when a different turn is the active TTS turn", () => {
    renderTurnView("Phonics is great!", null, "other-turn-id", true, false);
    // turn.id = "turn-abc" ≠ ttsActiveId = "other-turn-id" → idle label
    expect(screen.getByText("ai.listen")).toBeInTheDocument();
  });

  it("shows Stop when this turn is the active TTS turn and speaking", () => {
    renderTurnView("Phonics is great!", null, "turn-abc", true, false);
    expect(screen.getByText("ai.stop")).toBeInTheDocument();
  });

  it("shows Stop when this turn is the active TTS turn and ttsLoading", () => {
    renderTurnView("Phonics is great!", null, "turn-abc", false, true);
    expect(screen.getByText("ai.stop")).toBeInTheDocument();
  });

  it("calls onListen with the correct turnId when Listen is tapped", async () => {
    const onListen = vi.fn();
    renderTurnView("Phonics is great!", null, null, false, false, onListen);

    const listenBtn = screen.getByRole("button", { name: "ai.listen" });
    await act(async () => {
      fireEvent.click(listenBtn);
    });

    expect(onListen).toHaveBeenCalledTimes(1);
    expect(onListen).toHaveBeenCalledWith("turn-abc", expect.any(String));
  });

  it("calls onListen with the combined content + question as the spoken text", async () => {
    const onListen = vi.fn();
    renderTurnView(
      "Photosynthesis makes food for plants.",
      "What do plants need?",
      null,
      false,
      false,
      onListen,
    );

    const listenBtn = screen.getByRole("button", { name: "ai.listen" });
    await act(async () => {
      fireEvent.click(listenBtn);
    });

    expect(onListen).toHaveBeenCalledTimes(1);
    const [calledTurnId, calledText] = onListen.mock.calls[0] as [string, string];
    expect(calledTurnId).toBe("turn-abc");
    expect(calledText).toContain("Photosynthesis makes food for plants.");
    expect(calledText).toContain("What do plants need?");
  });

  it("calls onListen with only the content when there is no question", async () => {
    const onListen = vi.fn();
    renderTurnView("Just the content here.", null, null, false, false, onListen);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "ai.listen" }));
    });

    const [, calledText] = onListen.mock.calls[0] as [string, string];
    expect(calledText).toBe("Just the content here.");
  });

  it("calls onListen when the Stop button is tapped (toggle is handled by the parent)", async () => {
    const onListen = vi.fn();
    // This turn is active + speaking → button label is "Stop"
    renderTurnView("Active turn text.", null, "turn-abc", true, false, onListen);

    const stopBtn = screen.getByRole("button", { name: "ai.stop" });
    await act(async () => {
      fireEvent.click(stopBtn);
    });

    // TurnView always delegates to onListen; the parent (AmyAIScreen) decides
    // whether to call tts.stop() or tts.speak() based on activeTtsTurnId.
    expect(onListen).toHaveBeenCalledTimes(1);
    expect(onListen).toHaveBeenCalledWith("turn-abc", expect.any(String));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// WinCard TTS button — tested via CoachScreen resumed into "result" phase
// ═══════════════════════════════════════════════════════════════════════════
describe("WinCard TTS button (coach.tsx)", () => {
  beforeEach(() => {
    ttsSpeak.mockReset();
    ttsStop.mockReset();
    ttsState.speaking = false;
    ttsState.loading = false;
    mockAuthFetch.mockReset();
    mockUseLocalSearchParams.mockReturnValue({ resume: "ses-1" });
    cleanup();
  });

  async function renderCoachWithPlan() {
    mockAuthFetch.mockResolvedValueOnce(makeJsonResponse(SAMPLE_COACH_SESSION));
    render(<CoachScreen />);
    await waitFor(() =>
      expect(screen.getByText("Create a Visual Schedule")).toBeInTheDocument(),
    );
  }

  it("renders the Listen button label when TTS is idle", async () => {
    await renderCoachWithPlan();
    const listenBtns = screen.getAllByRole("button", { name: /Listen/i });
    expect(listenBtns.length).toBeGreaterThan(0);
  });

  it("renders the Stop button label when speaking is true", async () => {
    ttsState.speaking = true;
    await renderCoachWithPlan();
    const stopBtns = screen.getAllByRole("button", { name: /Stop/i });
    expect(stopBtns.length).toBeGreaterThan(0);
  });

  it("renders the Stop button label when ttsLoading is true", async () => {
    ttsState.loading = true;
    await renderCoachWithPlan();
    const stopBtns = screen.getAllByRole("button", { name: /Stop/i });
    expect(stopBtns.length).toBeGreaterThan(0);
  });

  it("calls speak when the Listen button is tapped", async () => {
    await renderCoachWithPlan();

    const listenBtn = screen.getAllByRole("button", { name: /Listen/i })[0];
    await act(async () => {
      fireEvent.click(listenBtn);
    });

    expect(ttsSpeak).toHaveBeenCalledTimes(1);
    const spoken = ttsSpeak.mock.calls[0]?.[0] as string;
    // winText = [title, objective, micro_task].filter(Boolean).join(". ")
    expect(spoken).toContain("Create a Visual Schedule");
    expect(spoken).toContain("Make the bedtime routine predictable.");
    expect(spoken).toContain("Draw the schedule tonight with your child.");
  });

  it("calls stop when tapped again while already speaking (ttsActiveRef set)", async () => {
    // Start with speaking=true so the mock always returns it from the first render.
    // handleListen branches on (ttsActiveRef.current && speaking):
    //   tap 1 → ref=false → else branch → speak() + ref becomes true
    //   tap 2 → ref=true  → if  branch → stop()
    ttsState.speaking = true;
    await renderCoachWithPlan();

    // Button shows "Stop" because speaking=true
    const stopBtns = screen.getAllByRole("button", { name: /Stop/i });
    expect(stopBtns.length).toBeGreaterThan(0);

    // Tap 1: ttsActiveRef.current=false → else branch → calls speak
    await act(async () => {
      fireEvent.click(stopBtns[0]);
    });
    expect(ttsSpeak).toHaveBeenCalledTimes(1);
    expect(ttsStop).toHaveBeenCalledTimes(0);

    // Tap 2: ttsActiveRef.current=true AND speaking=true → if branch → calls stop
    const stopBtns2 = screen.getAllByRole("button", { name: /Stop/i });
    await act(async () => {
      fireEvent.click(stopBtns2[0]);
    });
    expect(ttsStop).toHaveBeenCalledTimes(1);
  });
});
