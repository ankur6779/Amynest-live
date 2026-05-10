/**
 * Amy Speech Coach — premium gating regression test (Task #326).
 *
 * Asserts:
 *   1. Initial render of /speech-coach does NOT call markFeatureUsed for any
 *      `hub_speech_*` sub-feature key (rendering the screen alone must not
 *      consume a free user's first-use allowance).
 *   2. Tapping any control inside a section (e.g. a milestone tab) marks
 *      that section's feature key exactly once.
 *   3. The Expert Support waitlist join button is reachable without any
 *      LockedBlock paywall — it is a free action.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Mocks ─────────────────────────────────────────────────────────────────

const mockMarkFeatureUsed = vi.fn();
let mockUsageState: { isPremium: boolean; locked: Set<string> } = {
  isPremium: false,
  locked: new Set(),
};

vi.mock("@/hooks/useFeatureUsage", () => ({
  useFeatureUsage: () => ({
    isPremium: mockUsageState.isPremium,
    isLoaded: true,
    hasUsedFeature: () => false,
    isFeatureLocked: (id: string) => mockUsageState.locked.has(id),
    markFeatureUsed: mockMarkFeatureUsed,
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("@/hooks/useAuthFetch", () => ({
  useAuthFetch: () => vi.fn().mockResolvedValue({ ok: true, json: async () => [] }),
}));

vi.mock("@/hooks/useAmyVoice", () => ({
  useAmyVoice: () => ({
    speak: vi.fn(),
    stop: vi.fn(),
    speaking: false,
    loading: false,
    error: null,
    currentTime: 0,
    duration: 0,
    seekTo: vi.fn(),
  }),
}));

// audit-block-ignore-start (mock color fixtures for useColors in tests)
vi.mock("@/hooks/useColors", () => ({
  useColors: () => ({
    background: "#0f0c29",
    foreground: "#ffffff",
    card: "#1a1633",
    border: "rgba(255,255,255,0.12)",
    muted: "#221c40",
    mutedForeground: "#9aa0c2",
    primary: "#7B3FF2",
    primaryForeground: "#ffffff",
    surface: "#1a1633",
    textMuted: "#9aa0c2",
    textDim: "#6b7099",
  }),
}));
// audit-block-ignore-end

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children?: React.ReactNode }) => children,
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  Stack: { Screen: () => null },
}));

vi.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-stub": "gradient" }, children),
}));

vi.mock("@expo/vector-icons", () => ({
  Ionicons: ({ name }: { name?: string }) =>
    React.createElement("span", { "data-icon": name }),
}));

// LockedBlock is the real paywall overlay. We render its children directly
// when unlocked, and a paywall placeholder when locked, so the test can
// distinguish the two states without pulling in router/auth.
vi.mock("@/components/LockedBlock", () => ({
  __esModule: true,
  default: ({
    children,
    locked,
    reason,
  }: {
    children?: React.ReactNode;
    locked?: boolean;
    reason?: string;
  }) =>
    locked
      ? React.createElement("div", { "data-paywall": reason })
      : React.createElement(React.Fragment, null, children),
}));

// ─── Imports under test (after mocks) ─────────────────────────────────────
import SpeechCoachScreen from "@/app/speech-coach";

function renderScreen() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <SpeechCoachScreen />
    </QueryClientProvider>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe("Amy Speech Coach gating", () => {
  beforeEach(() => {
    mockMarkFeatureUsed.mockClear();
    mockUsageState = { isPremium: false, locked: new Set() };
    cleanup();
  });

  it("does NOT mark any hub_speech_* feature used on initial render", async () => {
    renderScreen();
    // Allow any pending effects to flush.
    await waitFor(() => {
      // The screen mounted; nothing else to assert.
      expect(screen.getByText("screens.speech_coach.title")).toBeTruthy();
    });
    const speechCalls = mockMarkFeatureUsed.mock.calls.filter(([k]) =>
      typeof k === "string" && k.startsWith("hub_speech_"),
    );
    expect(speechCalls).toHaveLength(0);
  });

  it("marks the matching hub_speech_* feature on first interaction within a section", async () => {
    renderScreen();
    await waitFor(() => screen.getByText("screens.speech_coach.title"));

    // Tap a milestones tab — fireEvent.touchStart bubbles to the wrapping
    // section View whose onTouchStart handler triggers markOnce.
    const tab = screen.getByText("screens.speech_coach.milestones.tab.2y");
    fireEvent.touchStart(tab);

    const milestoneCalls = mockMarkFeatureUsed.mock.calls.filter(
      ([k]) => k === "hub_speech_milestones",
    );
    expect(milestoneCalls.length).toBeGreaterThanOrEqual(1);

    // A second interaction within the same section must not re-mark it.
    fireEvent.touchStart(tab);
    const milestoneCallsAgain = mockMarkFeatureUsed.mock.calls.filter(
      ([k]) => k === "hub_speech_milestones",
    );
    expect(milestoneCallsAgain).toHaveLength(milestoneCalls.length);

    // No other speech feature should have been marked yet.
    const otherSpeech = mockMarkFeatureUsed.mock.calls.filter(
      ([k]) =>
        typeof k === "string" &&
        k.startsWith("hub_speech_") &&
        k !== "hub_speech_milestones",
    );
    expect(otherSpeech).toHaveLength(0);
  });

  it("never wraps the Expert Support waitlist behind a paywall", async () => {
    // Lock every speech feature key including hub_speech_expert: the expert
    // waitlist must still render its CTA, because it is intentionally NOT
    // gated by LockedBlock.
    mockUsageState = {
      isPremium: false,
      locked: new Set([
        "hub_speech_milestones",
        "hub_speech_pronounce",
        "hub_speech_read_aloud",
        "hub_speech_games",
        "hub_speech_guidance",
        "hub_speech_affirmations",
        "hub_speech_reports",
        "hub_speech_expert",
      ]),
    };

    renderScreen();
    await waitFor(() =>
      screen.getByText("screens.speech_coach.expert.section_title"),
    );

    // The Join Waitlist CTA renders even though hub_speech_expert is locked.
    expect(
      screen.getByText("screens.speech_coach.expert.join_waitlist"),
    ).toBeTruthy();

    // No paywall placeholder for hub_speech_expert exists in the DOM.
    expect(
      document.querySelector('[data-paywall="hub_speech_expert"]'),
    ).toBeNull();
  });
});
