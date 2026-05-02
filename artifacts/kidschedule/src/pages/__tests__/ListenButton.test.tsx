/**
 * Coach ListenButton — EN/HI toggle contract.
 *
 * The button must:
 *   1. Render an EN | HI chip pair plus the speaker button.
 *   2. Default to the parent's i18n language.
 *   3. Pass the matching ElevenLabs voiceId + modelId to useAmyVoice when
 *      Listen is tapped, switching to the Hindi voice when HI is selected.
 *   4. Stop in-flight playback when the lang chip flips mid-sentence.
 *
 * The audio cache itself (GCS, content-addressed) is owned by the server and
 * verified by the api-server tests — here we only lock down the client-side
 * voice contract so the right bytes are requested.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Capture which voice options the component asks for.
const speakMock = vi.fn();
const stopMock = vi.fn();
let lastVoiceOpts: { voiceId?: string; modelId?: string } | undefined;
let mockState = { speaking: false, loading: false };

vi.mock("@/hooks/use-amy-voice", () => ({
  useAmyVoice: (opts?: { voiceId?: string; modelId?: string }) => {
    lastVoiceOpts = opts;
    return {
      speak: speakMock,
      stop: stopMock,
      speaking: mockState.speaking,
      loading: mockState.loading,
      error: null,
    };
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "en" }, t: (k: string) => k }),
}));

// Pull in the component AFTER the mocks are hoisted.
import { ListenButton, type Win } from "../ai-coach";

const sampleWin: Win = {
  win: 1,
  title: "Co-regulate before correcting",
  objective: "Calm Aarav before discussing the broken cup.",
  deep_explanation: "Children under 7 cannot reason while flooded with cortisol.",
  actions: ["Sit at eye level", "Breathe with him for 30 seconds"],
  example: "Aarav threw his juice; sit beside him and breathe.",
  mistake_to_avoid: "Lecturing while he is still crying.",
  micro_task: "Try the 30-second breath next time he melts down.",
  science_one_liner: "Co-regulation precedes self-regulation (Siegel, 2012).",
} as Win;

beforeEach(() => {
  speakMock.mockReset();
  stopMock.mockReset();
  lastVoiceOpts = undefined;
  mockState = { speaking: false, loading: false };
  cleanup();
});

describe("ListenButton (Coach)", () => {
  it("renders EN/HI chips and the Listen button", () => {
    render(<ListenButton win={sampleWin} />);
    expect(screen.getByTestId("coach-listen-lang-en")).toBeInTheDocument();
    expect(screen.getByTestId("coach-listen-lang-hi")).toBeInTheDocument();
    expect(screen.getByTestId("coach-listen-btn")).toBeInTheDocument();
  });

  it("defaults to the English voice and pronounces the win when Listen is tapped", async () => {
    const user = userEvent.setup();
    render(<ListenButton win={sampleWin} />);

    expect(lastVoiceOpts?.voiceId).toBe("QbQKfe9vgx5OsbZUvlFv");
    expect(lastVoiceOpts?.modelId).toBe("eleven_turbo_v2_5");

    await user.click(screen.getByTestId("coach-listen-btn"));
    expect(speakMock).toHaveBeenCalledTimes(1);
    const spoken = speakMock.mock.calls[0]?.[0] as string;
    expect(spoken).toContain("Co-regulate before correcting");
    expect(spoken).toContain("Sit at eye level");
  });

  it("switches to the Hindi voice + multilingual model when HI is selected", async () => {
    const user = userEvent.setup();
    render(<ListenButton win={sampleWin} />);

    await user.click(screen.getByTestId("coach-listen-lang-hi"));
    // The new render after lang change must request the Hindi voice contract.
    expect(lastVoiceOpts?.voiceId).toBe("TllHtNijgXBd45uTSCS7");
    expect(lastVoiceOpts?.modelId).toBe("eleven_multilingual_v2");

    await user.click(screen.getByTestId("coach-listen-btn"));
    expect(speakMock).toHaveBeenCalledTimes(1);
  });

  it("stops in-flight playback when the parent flips EN ↔ HI mid-sentence", async () => {
    mockState.speaking = true;
    const user = userEvent.setup();
    render(<ListenButton win={sampleWin} />);

    await user.click(screen.getByTestId("coach-listen-lang-hi"));
    expect(stopMock).toHaveBeenCalled();
  });
});
