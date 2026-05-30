/**
 * Coach ListenButton — voice contract.
 *
 * The button must:
 *   1. Render the Listen button.
 *   2. Speak the full win text when Listen is tapped (coach cache identity when available).
 *   3. Stop in-flight playback when tapped again.
 *
 * Voice identity is driven by audioIdentity / coach opts passed to speak(),
 * not by hook-level voiceId/modelId.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const speakMock = vi.fn().mockResolvedValue({ success: true });
const pauseMock = vi.fn();
let mockState = { speaking: false, loading: false };
let capturedOnFinished: (() => void) | undefined;

vi.mock("@/hooks/use-amy-voice", () => ({
  useAmyVoice: () => ({
    speak: (...args: unknown[]) => {
      const opts = args[1] as { onFinished?: () => void } | undefined;
      capturedOnFinished = opts?.onFinished;
      return speakMock(...args);
    },
    primeSpeakGesture: vi.fn(),
    pause: pauseMock,
    speaking: mockState.speaking,
    loading: mockState.loading,
    error: null,
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "en" }, t: (k: string) => k }),
}));

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
  speakMock.mockResolvedValue({ success: true });
  pauseMock.mockReset();
  mockState = { speaking: false, loading: false };
  capturedOnFinished = undefined;
  cleanup();
});

describe("ListenButton (Coach)", () => {
  it("renders the Listen button", () => {
    render(<ListenButton win={sampleWin} planCacheKey="plan-test-key" />);
    expect(screen.getByTestId("coach-listen-btn")).toBeInTheDocument();
  });

  it("speaks the full win text when Listen is tapped", async () => {
    const user = userEvent.setup();
    render(<ListenButton win={sampleWin} planCacheKey="plan-test-key" />);

    await user.click(screen.getByTestId("coach-listen-btn"));
    expect(speakMock).toHaveBeenCalledTimes(1);
    const [spoken, opts] = speakMock.mock.calls[0] as [string, { coach?: boolean; playbackMode?: string }];
    expect(spoken).toContain("Co-regulate before correcting");
    expect(spoken).toContain("Sit at eye level");
    expect(opts?.coach).toBe(true);
    expect(opts?.playbackMode).toBe("partial-ok");
  });

  it("stops in-flight playback when tapped during playback", async () => {
    const user = userEvent.setup();
    render(<ListenButton win={sampleWin} planCacheKey="plan-test-key" />);

    await user.click(screen.getByTestId("coach-listen-btn"));
    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("coach-listen-btn")).toHaveTextContent("Stop");

    await user.click(screen.getByTestId("coach-listen-btn"));
    expect(pauseMock).toHaveBeenCalled();
  });

  it("shows Stop while listen-aloud is active even when controller speaking is false", async () => {
    mockState.speaking = false;
    const user = userEvent.setup();
    render(<ListenButton win={sampleWin} planCacheKey="plan-test-key" />);

    await user.click(screen.getByTestId("coach-listen-btn"));
    expect(screen.getByTestId("coach-listen-btn")).toHaveTextContent("Stop");
  });

  it("resets Stop state when playback finishes", async () => {
    speakMock.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<ListenButton win={sampleWin} planCacheKey="plan-test-key" />);

    await user.click(screen.getByTestId("coach-listen-btn"));
    expect(screen.getByTestId("coach-listen-btn")).toHaveTextContent("Stop");
    await act(async () => {
      capturedOnFinished?.();
    });
    expect(screen.getByTestId("coach-listen-btn")).toHaveTextContent("Listen");
  });
});
