/**
 * InfantSoundsTab playback test.
 *
 * Verifies that:
 *   1. Tapping a noise tile invokes the player with the right { type:
 *      "noise" } source.
 *   2. Tapping a lullaby's play button invokes the player with the right
 *      { type: "melody" } source (bytes-on-disk are produced by the lib
 *      synth, exercised in lib/infant-hub/src/audioSynth.test.ts).
 *   3. The active tile/lullaby flips to its "playing" pause icon — and
 *      tapping it again calls toggle a second time (stop path).
 *   4. The visible volume slider is wired to the hook's setVolume.
 *   5. The per-row download button calls download() with the right id +
 *      source and surfaces the saved confirmation.
 *   6. Free users get one in-session play; the second new play routes to
 *      the paywall instead of starting the audio. Premium users are
 *      unrestricted.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const toggleMock = vi.fn();
const stopMock = vi.fn();
const setVolumeMock = vi.fn();
const downloadMock = vi.fn();
const routerPushMock = vi.fn();
const markFeatureUsedMock = vi.fn();
let activeId: string | null = null;
let volume = 0.8;
let isPremium = false;
// Stateful Try-Free flag — `markFeatureUsed` flips it on, so a second call
// in the same render exercises the "already used → paywall" branch the way
// the real React-Query-backed hook does after its optimistic cache update.
let alreadyUsed = false;

vi.mock("@/hooks/useNoisePlayer", () => ({
  useNoisePlayer: () => ({
    activeId,
    toggle: toggleMock,
    stop: stopMock,
    error: null,
    volume,
    setVolume: setVolumeMock,
    download: downloadMock,
  }),
}));

vi.mock("@/hooks/useFeatureUsage", () => ({
  useFeatureUsage: () => ({
    isPremium,
    isLoaded: true,
    hasUsedFeature: (id: string) =>
      id === "hub_infant_sounds" ? alreadyUsed : false,
    markFeatureUsed: (id: string) => {
      markFeatureUsedMock(id);
      if (id === "hub_infant_sounds") alreadyUsed = true;
    },
    isFeatureLocked: () => false,
  }),
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: routerPushMock, replace: vi.fn(), back: vi.fn() }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && typeof opts === "object") {
        let result = key;
        for (const [k, v] of Object.entries(opts)) {
          const placeholder = new RegExp(`\\{\\{${k}\\}\\}`, "g");
          if (placeholder.test(result)) {
            result = result.replace(placeholder, String(v));
          } else {
            result = `${result} ${String(v)}`;
          }
        }
        return result;
      }
      return key;
    },
    i18n: { language: "en" },
  }),
}));

import InfantSoundsTab from "@/components/infant/InfantSoundsTab";

beforeEach(() => {
  toggleMock.mockClear();
  stopMock.mockClear();
  setVolumeMock.mockClear();
  downloadMock.mockReset();
  routerPushMock.mockClear();
  markFeatureUsedMock.mockClear();
  activeId = null;
  volume = 0.8;
  isPremium = false;
  alreadyUsed = false;
});

describe("InfantSoundsTab playback", () => {
  it("calls toggle with a noise source when a noise play button is tapped", () => {
    render(<InfantSoundsTab ageMonths={2} />);
    // The "shush" tile is recommended for 0–3 m; its play button has
    // aria-label "infant_hub.sounds.play Shushing" (label combined with
    // noise label by the row).
    const btn = screen.getByLabelText("infant_hub.sounds.play Shushing");
    fireEvent.click(btn);
    expect(toggleMock).toHaveBeenCalledTimes(1);
    const [id, source] = toggleMock.mock.calls[0];
    expect(id).toBe("shush");
    expect(source).toMatchObject({ type: "noise", kind: "white" });
  });

  it("calls toggle with a melody source when a lullaby play button is tapped", () => {
    render(<InfantSoundsTab ageMonths={6} />);
    const btn = screen.getByLabelText("infant_hub.sounds.play Twinkle Twinkle Little Star");
    fireEvent.click(btn);
    expect(toggleMock).toHaveBeenCalledTimes(1);
    const [id, source] = toggleMock.mock.calls[0];
    expect(id).toBe("twinkle");
    expect(source.type).toBe("melody");
    expect(Array.isArray(source.notes)).toBe(true);
    expect(source.notes.length).toBeGreaterThan(0);
  });

  it("renders the new starter-track lullabies (Sleep Little One, White Noise Dream)", () => {
    render(<InfantSoundsTab ageMonths={4} />);
    expect(
      screen.getByLabelText("infant_hub.sounds.play Sleep Little One"),
    ).toBeTruthy();
    expect(
      screen.getByLabelText("infant_hub.sounds.play White Noise Dream"),
    ).toBeTruthy();
  });

  it("flips the lullaby button to the pause icon when the player reports it active", () => {
    activeId = "twinkle";
    render(<InfantSoundsTab ageMonths={6} />);
    // Pause label means the row is now in the playing state.
    const pauseBtn = screen.getByLabelText("infant_hub.sounds.pause");
    expect(pauseBtn).toBeTruthy();
    fireEvent.click(pauseBtn);
    // Same toggle call — the hook will recognise activeId === id and stop.
    expect(toggleMock).toHaveBeenCalledTimes(1);
    expect(toggleMock.mock.calls[0][0]).toBe("twinkle");
  });

  it("shows a Stop-all pill while something is playing and wires it to stop()", () => {
    activeId = "shush";
    render(<InfantSoundsTab ageMonths={2} />);
    const stopAll = screen.getAllByLabelText("infant_hub.sounds.stop_all")[0];
    fireEvent.click(stopAll);
    expect(stopMock).toHaveBeenCalledTimes(1);
  });

  it("renders the volume slider and wires its +/- step buttons to setVolume", () => {
    volume = 0.5;
    render(<InfantSoundsTab ageMonths={6} />);
    const down = screen.getByLabelText("infant_hub.sounds.volume_down");
    const up = screen.getByLabelText("infant_hub.sounds.volume_up");
    expect(down).toBeTruthy();
    expect(up).toBeTruthy();
    fireEvent.click(up);
    fireEvent.click(down);
    expect(setVolumeMock).toHaveBeenCalledTimes(2);
    // First call raises by 10%, second lowers by 10%.
    expect(setVolumeMock.mock.calls[0][0]).toBeCloseTo(0.6, 5);
    expect(setVolumeMock.mock.calls[1][0]).toBeCloseTo(0.4, 5);
  });

  it("calls download() with the noise source when its download button is tapped", async () => {
    downloadMock.mockResolvedValue({
      uri: "file:///docs/amynest-shushing.wav",
      fileName: "amynest-shushing.wav",
    });
    render(<InfantSoundsTab ageMonths={2} />);
    const dl = screen.getByLabelText("infant_hub.sounds.download_a11y Shushing");
    fireEvent.click(dl);
    await waitFor(() => expect(downloadMock).toHaveBeenCalledTimes(1));
    const [id, source, label] = downloadMock.mock.calls[0];
    expect(id).toBe("shush");
    expect(source).toMatchObject({ type: "noise", kind: "white" });
    expect(label).toBe("Shushing");
  });

  it("calls download() with the melody source when a lullaby download is tapped", async () => {
    downloadMock.mockResolvedValue({
      uri: "file:///docs/amynest-twinkle.wav",
      fileName: "amynest-twinkle.wav",
    });
    render(<InfantSoundsTab ageMonths={6} />);
    const dl = screen.getByLabelText(
      "infant_hub.sounds.download_a11y Twinkle Twinkle Little Star",
    );
    fireEvent.click(dl);
    await waitFor(() => expect(downloadMock).toHaveBeenCalledTimes(1));
    const [id, source, label] = downloadMock.mock.calls[0];
    expect(id).toBe("twinkle");
    expect(source.type).toBe("melody");
    expect(label).toBe("Twinkle Twinkle Little Star");
  });
});

describe("InfantSoundsTab Try-Free per-play gating", () => {
  it("free user: first new play marks the feature used and is allowed; second play routes to /paywall", () => {
    isPremium = false;
    alreadyUsed = false;
    const { rerender } = render(<InfantSoundsTab ageMonths={2} />);

    // First play — allowed; goes through useFeatureUsage.markFeatureUsed.
    fireEvent.click(screen.getByLabelText("infant_hub.sounds.play Shushing"));
    expect(toggleMock).toHaveBeenCalledTimes(1);
    expect(markFeatureUsedMock).toHaveBeenCalledWith("hub_infant_sounds");
    expect(routerPushMock).not.toHaveBeenCalled();

    // Re-render so the closure picks up the now-true `alreadyUsed`. In real
    // app code React Query's optimistic cache update triggers this for free.
    rerender(<InfantSoundsTab ageMonths={2} />);

    // Second new play — server already says used → paywall.
    fireEvent.click(screen.getByLabelText("infant_hub.sounds.play Heartbeat"));
    expect(toggleMock).toHaveBeenCalledTimes(1); // still 1
    expect(routerPushMock).toHaveBeenCalledTimes(1);
    expect(routerPushMock.mock.calls[0][0]).toMatchObject({
      pathname: "/paywall",
      params: { reason: "hub_infant_sounds" },
    });
  });

  it("free user: stopping the active track does not burn the free use and never paywalls", () => {
    isPremium = false;
    alreadyUsed = false;
    activeId = "shush";
    render(<InfantSoundsTab ageMonths={2} />);

    // Tapping the active row's pause button is a stop — never gated.
    const pauseBtn = screen.getByLabelText("infant_hub.sounds.pause");
    fireEvent.click(pauseBtn);
    expect(toggleMock).toHaveBeenCalledTimes(1);
    expect(markFeatureUsedMock).not.toHaveBeenCalled();
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it("premium user: every play passes through to toggle() without marking the feature", () => {
    isPremium = true;
    render(<InfantSoundsTab ageMonths={2} />);

    fireEvent.click(screen.getByLabelText("infant_hub.sounds.play Shushing"));
    fireEvent.click(screen.getByLabelText("infant_hub.sounds.play Heartbeat"));
    fireEvent.click(screen.getByLabelText("infant_hub.sounds.play Womb"));
    expect(toggleMock).toHaveBeenCalledTimes(3);
    expect(markFeatureUsedMock).not.toHaveBeenCalled();
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it("free user: download counts as the use — a follow-up play routes to /paywall", async () => {
    isPremium = false;
    alreadyUsed = false;
    downloadMock.mockResolvedValue({
      uri: "file:///docs/amynest-shushing.wav",
      fileName: "amynest-shushing.wav",
    });
    const { rerender } = render(<InfantSoundsTab ageMonths={2} />);

    // First action of the session is a download — allowed and marks used.
    fireEvent.click(screen.getByLabelText("infant_hub.sounds.download_a11y Shushing"));
    await waitFor(() => expect(downloadMock).toHaveBeenCalledTimes(1));
    expect(markFeatureUsedMock).toHaveBeenCalledWith("hub_infant_sounds");

    rerender(<InfantSoundsTab ageMonths={2} />);

    // Second action (a play of a different track) — blocked.
    fireEvent.click(screen.getByLabelText("infant_hub.sounds.play Heartbeat"));
    expect(toggleMock).not.toHaveBeenCalled();
    expect(routerPushMock).toHaveBeenCalledTimes(1);
  });

  it("returning free user (already used in a prior session): the very first play paywalls", () => {
    // Simulates a fresh app launch where the server already remembers the
    // feature was burned in a previous session.
    isPremium = false;
    alreadyUsed = true;
    render(<InfantSoundsTab ageMonths={2} />);

    fireEvent.click(screen.getByLabelText("infant_hub.sounds.play Shushing"));
    expect(toggleMock).not.toHaveBeenCalled();
    expect(markFeatureUsedMock).not.toHaveBeenCalled();
    expect(routerPushMock).toHaveBeenCalledTimes(1);
    expect(routerPushMock.mock.calls[0][0]).toMatchObject({
      pathname: "/paywall",
      params: { reason: "hub_infant_sounds" },
    });
  });
});
