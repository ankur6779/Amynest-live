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
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const toggleMock = vi.fn();
const stopMock = vi.fn();
let activeId: string | null = null;

vi.mock("@/hooks/useNoisePlayer", () => ({
  useNoisePlayer: () => ({
    activeId,
    toggle: toggleMock,
    stop: stopMock,
    error: null,
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

import InfantSoundsTab from "@/components/infant/InfantSoundsTab";

beforeEach(() => {
  toggleMock.mockClear();
  stopMock.mockClear();
  activeId = null;
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
});
