/**
 * Coach ListenButton — Amy Audio control + voice contract.
 *
 * Restored from 6db944be visual hierarchy (dedicated Listen pill + Volume icon).
 * Playback must:
 *   1. Render a discoverable control with an accessible name and 44px target.
 *   2. Speak the full win text when Listen is tapped (coach cache identity).
 *   3. Stop in-flight playback when tapped again.
 *   4. Surface speak() failures instead of staying silently "playing".
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const speakMock = vi.fn().mockResolvedValue({ success: true });
const pauseMock = vi.fn();
let mockState = { speaking: false, loading: false, error: null as string | null };
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
    error: mockState.error,
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "en" },
    t: (k: string, def?: string) => (typeof def === "string" ? def : k),
  }),
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
  cleanup();
  speakMock.mockReset();
  speakMock.mockResolvedValue({ success: true });
  pauseMock.mockReset();
  mockState = { speaking: false, loading: false, error: null };
  capturedOnFinished = undefined;
});

describe("ListenButton (Coach)", () => {
  it("renders a discoverable Listen control with an accessible name", () => {
    render(<ListenButton win={sampleWin} planCacheKey="plan-test-key" />);
    const btn = screen.getByRole("button", { name: "Play Amy's response" });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("data-testid", "coach-listen-btn");
    expect(btn).toHaveTextContent("Listen");
    expect(btn.querySelector("svg")).toBeTruthy();
  });

  it("uses a minimum 44px touch target", () => {
    render(<ListenButton win={sampleWin} planCacheKey="plan-test-key" />);
    const btn = screen.getByTestId("coach-listen-btn");
    expect(btn).toHaveStyle({ minHeight: "44px", minWidth: "48px" });
  });

  it("speaks the full win text when Listen is tapped", async () => {
    const user = userEvent.setup();
    render(<ListenButton win={sampleWin} planCacheKey="plan-test-key" />);

    await user.click(screen.getByTestId("coach-listen-btn"));
    expect(speakMock).toHaveBeenCalledTimes(1);
    const [spoken, opts] = speakMock.mock.calls[0] as [string, { coach?: boolean; playbackMode?: string }];
    expect(spoken).toContain("Co-regulate before correcting");
    expect(spoken).toContain("Sit at eye level");
    expect(spoken).not.toMatch(/^\s*\{/);
    expect(opts?.coach).toBe(true);
    expect(opts?.playbackMode).toBe("partial-ok");
  });

  it("does not let the click bubble to a parent handler", async () => {
    const parentClick = vi.fn();
    const user = userEvent.setup();
    render(
      <div onClick={parentClick}>
        <ListenButton win={sampleWin} planCacheKey="plan-test-key" />
      </div>,
    );
    await user.click(screen.getByTestId("coach-listen-btn"));
    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(parentClick).not.toHaveBeenCalled();
  });

  it("stops in-flight playback when tapped during playback", async () => {
    const user = userEvent.setup();
    render(<ListenButton win={sampleWin} planCacheKey="plan-test-key" />);

    await user.click(screen.getByTestId("coach-listen-btn"));
    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("coach-listen-btn")).toHaveTextContent("Stop");
    expect(screen.getByTestId("coach-listen-btn")).toHaveAttribute("data-audio-state", "playing");

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

  it("offers Play again after playback finishes", async () => {
    speakMock.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<ListenButton win={sampleWin} planCacheKey="plan-test-key" />);

    await user.click(screen.getByTestId("coach-listen-btn"));
    expect(screen.getByTestId("coach-listen-btn")).toHaveTextContent("Stop");
    await act(async () => {
      capturedOnFinished?.();
    });
    const btn = screen.getByTestId("coach-listen-btn");
    expect(btn).toHaveTextContent("Play again");
    expect(btn).toHaveAttribute("data-audio-state", "completed");
    expect(btn).toHaveAccessibleName("Play Amy's response again");
  });

  it("surfaces API failure as Retry instead of a silent idle button", async () => {
    speakMock.mockResolvedValue({ success: false, error: "tts_timeout" });
    const user = userEvent.setup();
    render(<ListenButton win={sampleWin} planCacheKey="plan-test-key" />);

    await user.click(screen.getByTestId("coach-listen-btn"));
    const btn = await screen.findByTestId("coach-listen-btn");
    expect(btn).toHaveTextContent("Retry");
    expect(btn).toHaveAttribute("data-audio-state", "error");
    expect(btn).toHaveAccessibleName("Retry audio");
  });

  it("surfaces play() rejection instead of swallowing it", async () => {
    speakMock.mockRejectedValue(new Error("NotAllowedError"));
    const user = userEvent.setup();
    render(<ListenButton win={sampleWin} planCacheKey="plan-test-key" />);

    await user.click(screen.getByTestId("coach-listen-btn"));
    const btn = await screen.findByTestId("coach-listen-btn");
    expect(btn).toHaveTextContent("Retry");
    expect(btn).toHaveAttribute("data-audio-state", "error");
  });

  it("retries audio after an error", async () => {
    speakMock.mockResolvedValueOnce({ success: false, error: "tts_timeout" });
    speakMock.mockResolvedValueOnce({ success: true });
    const user = userEvent.setup();
    render(<ListenButton win={sampleWin} planCacheKey="plan-test-key" />);

    await user.click(screen.getByTestId("coach-listen-btn"));
    expect(await screen.findByText("Retry")).toBeInTheDocument();

    await user.click(screen.getByTestId("coach-listen-btn"));
    expect(speakMock).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("coach-listen-btn")).toHaveTextContent("Stop");
  });

  it("surfaces empty and invalid audio as Retry", async () => {
    const user = userEvent.setup();
    speakMock.mockResolvedValueOnce({ success: false, error: "tts_empty_text" });
    render(<ListenButton win={sampleWin} planCacheKey="plan-test-key" />);
    await user.click(screen.getByTestId("coach-listen-btn"));
    expect(await screen.findByText("Retry")).toBeInTheDocument();

    cleanup();
    speakMock.mockResolvedValueOnce({ success: false, error: "invalid_audio_url" });
    render(<ListenButton win={sampleWin} planCacheKey="plan-test-key" />);
    await user.click(screen.getByTestId("coach-listen-btn"));
    expect(await screen.findByText("Retry")).toBeInTheDocument();
  });

  it("stop during loading cancels instead of leaving a stuck Stop", async () => {
    mockState.loading = true;
    const user = userEvent.setup();
    render(<ListenButton win={sampleWin} planCacheKey="plan-test-key" />);
    const btn = screen.getByTestId("coach-listen-btn");
    expect(btn).toHaveAttribute("data-audio-state", "loading");
    await user.click(btn);
    expect(pauseMock).toHaveBeenCalled();
    expect(btn).not.toHaveAttribute("data-audio-state", "playing");
  });

  it("ignores a stale TTS failure after Stop", async () => {
    let finishSpeak!: (value: { success: boolean; error?: string }) => void;
    speakMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishSpeak = resolve;
        }),
    );
    const user = userEvent.setup();
    render(<ListenButton win={sampleWin} planCacheKey="plan-test-key" />);
    await user.click(screen.getByTestId("coach-listen-btn"));
    expect(screen.getByTestId("coach-listen-btn")).toHaveTextContent("Stop");

    await user.click(screen.getByTestId("coach-listen-btn"));
    expect(pauseMock).toHaveBeenCalled();
    expect(screen.getByTestId("coach-listen-btn")).toHaveTextContent("Listen");

    await act(async () => {
      finishSpeak({ success: false, error: "tts_timeout" });
    });
    expect(screen.getByTestId("coach-listen-btn")).toHaveTextContent("Listen");
    expect(screen.getByTestId("coach-listen-btn")).toHaveAttribute("data-audio-state", "idle");
  });

  it("ignores onFinished from a cancelled request after switching wins", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ListenButton win={sampleWin} planCacheKey="plan-test-key" />);
    await user.click(screen.getByTestId("coach-listen-btn"));
    const staleFinished = capturedOnFinished;

    rerender(
      <ListenButton
        win={{ ...sampleWin, win: 2, title: "Different win" }}
        planCacheKey="plan-test-key"
      />,
    );
    expect(screen.getByTestId("coach-listen-btn")).toHaveTextContent("Listen");

    await act(async () => {
      staleFinished?.();
    });
    expect(screen.getByTestId("coach-listen-btn")).toHaveTextContent("Listen");
    expect(screen.getByTestId("coach-listen-btn")).not.toHaveAttribute(
      "data-audio-state",
      "completed",
    );
  });

  it("pauses on unmount so navigation does not leave audio running", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ListenButton win={sampleWin} planCacheKey="plan-test-key" />);
    await user.click(screen.getByTestId("coach-listen-btn"));
    unmount();
    expect(pauseMock).toHaveBeenCalled();
  });

  it("starts a new speak when a second Amy response is tapped after stop", async () => {
    const user = userEvent.setup();
    const secondWin = { ...sampleWin, win: 2, title: "Name the feeling first" };
    const { rerender } = render(<ListenButton win={sampleWin} planCacheKey="plan-a" />);
    await user.click(screen.getByTestId("coach-listen-btn"));
    await user.click(screen.getByTestId("coach-listen-btn"));
    rerender(<ListenButton win={secondWin} planCacheKey="plan-a" />);
    await user.click(screen.getByTestId("coach-listen-btn"));
    expect(speakMock).toHaveBeenCalledTimes(2);
    const [spoken] = speakMock.mock.calls[1] as [string];
    expect(spoken).toContain("Name the feeling first");
  });
});
