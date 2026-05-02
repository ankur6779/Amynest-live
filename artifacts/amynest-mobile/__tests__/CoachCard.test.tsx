/**
 * Mobile CoachCard — read-aloud contract test.
 *
 * Mirrors the web ListenButton test: locks down that a Win on the mobile
 * coach swiper renders an EN | HI chip pair + Listen button, defaults to
 * the parent's i18n language, and asks the useAmyVoice hook for the right
 * ElevenLabs voiceId + modelId when the parent flips between languages.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const speakMock = vi.fn();
const stopMock = vi.fn();
let lastVoiceOpts: { voiceId?: string; modelId?: string } | undefined;
let mockState = { speaking: false, loading: false };

vi.mock("@/hooks/useAmyVoice", () => ({
  useAmyVoice: (opts?: { voiceId?: string; modelId?: string }) => {
    lastVoiceOpts = opts;
    return {
      speak: speakMock,
      stop: stopMock,
      speaking: mockState.speaking,
      loading: mockState.loading,
      error: null,
      currentTime: 0,
      duration: 0,
      seekTo: vi.fn(),
    };
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "en" }, t: (k: string) => k }),
}));

vi.mock("expo-blur", () => ({
  BlurView: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "blur" }, children),
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({ mode: "dark" }),
  ThemeProvider: ({ children }: { children?: React.ReactNode }) => children,
}));

vi.mock("@/hooks/useColors", () => ({
  useColors: () => ({
    textStrong: "#fff",
    textSubtle: "#aaa",
    primaryForeground: "#fff",
    statusSuccessBg: "rgba(34,197,94,0.18)",
    statusSuccessBorder: "rgba(34,197,94,0.35)",
    statusSuccessText: "rgba(134,239,172,1)",
    statusErrorBg: "rgba(236,72,153,0.25)",
    statusErrorBorder: "rgba(236,72,153,0.4)",
    statusErrorText: "rgba(251,207,232,1)",
    radius: { md: 8 },
  }),
}));

vi.mock("../components/ActionButtons", () => ({
  default: () => React.createElement("div", { "data-testid": "action-buttons" }),
}));

import CoachCard, { type CoachWin } from "../components/CoachCard";

const sampleWin: CoachWin = {
  id: "win-1",
  index: 1,
  title: "Co-regulate before correcting",
  objective: "Calm Aarav before discussing the broken cup.",
  explanation: "Children under 7 cannot reason while flooded with cortisol.",
  actions: ["Sit at eye level", "Breathe with him for 30 seconds"],
  example: "Aarav threw his juice; sit beside him and breathe.",
  mistake: "Lecturing while he is still crying.",
  microTask: "Try the 30-second breath next time he melts down.",
  science: "Co-regulation precedes self-regulation (Siegel, 2012).",
  accent: ["#7c3aed", "#ec4899"] as const,
};

beforeEach(() => {
  speakMock.mockReset();
  stopMock.mockReset();
  lastVoiceOpts = undefined;
  mockState = { speaking: false, loading: false };
  cleanup();
});

function renderCard() {
  return render(
    <CoachCard
      win={sampleWin}
      total={3}
      topInset={0}
      bottomInset={0}
      onAction={() => {}}
    />,
  );
}

describe("CoachCard read-aloud", () => {
  it("renders EN/HI chips and the Listen button on every win", () => {
    renderCard();
    expect(screen.getByTestId("coach-listen-row")).toBeInTheDocument();
    expect(screen.getByTestId("coach-listen-lang-en")).toBeInTheDocument();
    expect(screen.getByTestId("coach-listen-lang-hi")).toBeInTheDocument();
    expect(screen.getByTestId("coach-listen-btn")).toBeInTheDocument();
  });

  it("defaults to the English voice and reads the win text aloud on tap", async () => {
    const user = userEvent.setup();
    renderCard();

    expect(lastVoiceOpts?.voiceId).toBe("QbQKfe9vgx5OsbZUvlFv");
    expect(lastVoiceOpts?.modelId).toBe("eleven_turbo_v2_5");

    await user.click(screen.getByTestId("coach-listen-btn"));
    expect(speakMock).toHaveBeenCalledTimes(1);
    const spoken = speakMock.mock.calls[0]?.[0] as string;
    expect(spoken).toContain("Co-regulate before correcting");
    expect(spoken).toContain("Sit at eye level");
  });

  it("switches to the Hindi voice + multilingual model when HI is tapped", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByTestId("coach-listen-lang-hi"));
    expect(lastVoiceOpts?.voiceId).toBe("TllHtNijgXBd45uTSCS7");
    expect(lastVoiceOpts?.modelId).toBe("eleven_multilingual_v2");

    await user.click(screen.getByTestId("coach-listen-btn"));
    expect(speakMock).toHaveBeenCalledTimes(1);
  });

  it("stops in-flight playback when the parent flips language mid-sentence", async () => {
    mockState.speaking = true;
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByTestId("coach-listen-lang-hi"));
    expect(stopMock).toHaveBeenCalled();
  });
});
