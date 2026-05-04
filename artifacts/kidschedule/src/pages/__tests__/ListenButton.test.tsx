/**
 * Coach ListenButton — English-only voice contract.
 *
 * The button must:
 *   1. Render the Listen button.
 *   2. Always use the English voice (Ananya K, eleven_turbo_v2_5).
 *   3. Speak the full win text when Listen is tapped.
 *   4. Stop in-flight playback when tapped again.
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
  duration: "1 week",
  science_reference: "Siegel, 2012 — co-regulation precedes self-regulation.",
};

beforeEach(() => {
  speakMock.mockReset();
  stopMock.mockReset();
  lastVoiceOpts = undefined;
  mockState = { speaking: false, loading: false };
  cleanup();
});

describe("ListenButton (Coach)", () => {
  it("renders the Listen button", () => {
    render(<ListenButton win={sampleWin} />);
    expect(screen.getByTestId("coach-listen-btn")).toBeInTheDocument();
  });

  it("uses the English voice and pronounces the win when Listen is tapped", async () => {
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

  it("stops in-flight playback when tapped during playback", async () => {
    mockState.speaking = true;
    const user = userEvent.setup();
    render(<ListenButton win={sampleWin} />);

    await user.click(screen.getByTestId("coach-listen-btn"));
    expect(stopMock).toHaveBeenCalled();
  });
});
