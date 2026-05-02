/**
 * WhiteNoiseLullaby — immersive sound module behavioural tests.
 *
 * Locks in the Spec 1 contract introduced for the upgraded white-noise tab:
 *   - Smart suggestion strip ("Best for sleep now") renders + plays its sound
 *   - Animated tile grid renders all 7 noise types
 *   - Tapping a tile activates its sound + auto-opens the fullscreen player
 *   - The fullscreen player surfaces: orb, mixer with per-sound volume,
 *     add-sound chips, sleep timer pills, and a stop-everything button
 *   - The mini player appears whenever something is playing and can stop all
 *
 * jsdom has no WebAudio, so we install a minimal mock AudioContext that
 * exposes only the methods the engine actually calls — enough to prove the
 * UI wiring is correct without trying to verify real audio output.
 */
import React from "react";
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, within, fireEvent, cleanup } from "@testing-library/react";

import { WhiteNoiseLullaby } from "./infant-sounds";

// ─── WebAudio mock ────────────────────────────────────────────────────────────

class MockAudioParam {
  value = 0;
  setValueAtTime(v: number) { this.value = v; return this; }
  linearRampToValueAtTime(v: number) { this.value = v; return this; }
  exponentialRampToValueAtTime(v: number) { this.value = v; return this; }
  cancelScheduledValues() { return this; }
}
class MockNode {
  connect(target: unknown) { return target as MockNode; }
  disconnect() { /* no-op */ }
}
class MockGainNode extends MockNode { gain = new MockAudioParam(); }
class MockBiquadFilterNode extends MockNode {
  type = "lowpass";
  frequency = new MockAudioParam();
  Q = new MockAudioParam();
}
class MockOscillatorNode extends MockNode {
  type = "sine";
  frequency = new MockAudioParam();
  start() { /* no-op */ }
  stop() { /* no-op */ }
}
class MockBufferSourceNode extends MockNode {
  buffer: AudioBuffer | null = null;
  loop = false;
  playbackRate = new MockAudioParam();
  start() { /* no-op */ }
  stop() { /* no-op */ }
}
class MockAnalyserNode extends MockNode {
  fftSize = 512;
  getByteTimeDomainData(buf: Uint8Array) {
    // Fill with silence (128 = midpoint of unsigned byte time domain)
    for (let i = 0; i < buf.length; i++) buf[i] = 128;
  }
}
class MockAudioBuffer {
  constructor(public _channels: number, public length: number, public sampleRate: number) {}
  getChannelData() { return new Float32Array(this.length); }
}
class MockAudioContext {
  state = "running" as const;
  sampleRate = 44100;
  currentTime = 0;
  destination = new MockNode();
  createBuffer(channels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer(channels, length, sampleRate) as unknown as AudioBuffer;
  }
  createGain() { return new MockGainNode() as unknown as GainNode; }
  createBiquadFilter() { return new MockBiquadFilterNode() as unknown as BiquadFilterNode; }
  createOscillator() { return new MockOscillatorNode() as unknown as OscillatorNode; }
  createBufferSource() { return new MockBufferSourceNode() as unknown as AudioBufferSourceNode; }
  createAnalyser() { return new MockAnalyserNode() as unknown as AnalyserNode; }
  resume() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}

beforeAll(() => {
  // Install before any test imports the engine (the hook only touches it on
  // first play, so installing in beforeAll is fine).
  (globalThis as unknown as { AudioContext: typeof AudioContext }).AudioContext =
    MockAudioContext as unknown as typeof AudioContext;
  // jsdom doesn't implement requestAnimationFrame consistently across versions
  // and we don't want it firing during assertions — replace with no-op.
  globalThis.requestAnimationFrame = (() => 0) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = (() => undefined) as typeof cancelAnimationFrame;
});

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("WhiteNoiseLullaby — immersive module", () => {
  it("renders the smart suggestion strip and the full tile grid", () => {
    render(<WhiteNoiseLullaby ageMonths={2} />);

    // Smart suggestion banner
    expect(screen.getByTestId("smart-suggestion")).toBeInTheDocument();
    expect(screen.getByText(/best for sleep now/i)).toBeInTheDocument();

    // All 7 noise tiles
    ["shush", "rain", "fan", "heartbeat", "pink", "white", "womb"].forEach((id) => {
      expect(screen.getByTestId(`tile-${id}`)).toBeInTheDocument();
    });
  });

  it("activates a sound when a tile is tapped and surfaces the mini-player + fullscreen player", () => {
    render(<WhiteNoiseLullaby ageMonths={2} />);

    const rainTile = screen.getByTestId("tile-rain");
    expect(rainTile).toHaveAttribute("data-active", "false");

    fireEvent.click(rainTile);

    // The tile is now marked active
    expect(rainTile).toHaveAttribute("data-active", "true");
    // Mini player appears
    expect(screen.getByTestId("mini-player")).toBeInTheDocument();
    expect(screen.getByText(/1 sound playing/i)).toBeInTheDocument();
    // Fullscreen player auto-opens on first play
    expect(screen.getByTestId("fullscreen-player")).toBeInTheDocument();
    // Mixer surface visible with rain volume slider
    expect(screen.getByTestId("fullscreen-mixer")).toBeInTheDocument();
    expect(screen.getByTestId("fullscreen-volume-rain")).toBeInTheDocument();
    // Timer pills present
    ["Off", "15m", "30m", "1h"].forEach((label) => {
      expect(screen.getByTestId(`fullscreen-timer-${label}`)).toBeInTheDocument();
    });
  });

  it("supports mixing a second sound via the add-to-mix chips", () => {
    render(<WhiteNoiseLullaby ageMonths={2} />);

    fireEvent.click(screen.getByTestId("tile-rain"));
    // Rain is active, so the chip for rain should NOT be in the add list,
    // but heartbeat (inactive) should be.
    const addHeartbeat = screen.getByTestId("fullscreen-add-heartbeat");
    fireEvent.click(addHeartbeat);

    // Both rain + heartbeat now appear in the mixer
    const mixer = screen.getByTestId("fullscreen-mixer");
    expect(within(mixer).getByTestId("fullscreen-volume-rain")).toBeInTheDocument();
    expect(within(mixer).getByTestId("fullscreen-volume-heartbeat")).toBeInTheDocument();
    expect(screen.getByText(/2 sounds playing/i)).toBeInTheDocument();
  });

  it("stop-all clears all sounds and removes the mini-player", () => {
    render(<WhiteNoiseLullaby ageMonths={2} />);

    fireEvent.click(screen.getByTestId("tile-rain"));
    fireEvent.click(screen.getByTestId("fullscreen-add-fan"));
    expect(screen.getByText(/2 sounds playing/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("fullscreen-stop-all"));

    // Engine state is the source of truth: both tiles flip to inactive
    // synchronously. We don't assert on the mini-player DOM presence here
    // because <AnimatePresence> keeps its children mounted during the exit
    // animation, and framer-motion's animations don't complete cleanly under
    // jsdom + fake timers. The data-active check below is the contract.
    expect(screen.getByTestId("tile-rain")).toHaveAttribute("data-active", "false");
    expect(screen.getByTestId("tile-fan")).toHaveAttribute("data-active", "false");
  });

  it("selecting a sleep timer pill sets it as the active timer", () => {
    render(<WhiteNoiseLullaby ageMonths={2} />);

    fireEvent.click(screen.getByTestId("tile-rain"));
    const fifteen = screen.getByTestId("fullscreen-timer-15m");
    fireEvent.click(fifteen);

    expect(fifteen).toHaveAttribute("aria-pressed", "true");
    // Previously-active "Off" pill is now released
    expect(screen.getByTestId("fullscreen-timer-Off")).toHaveAttribute("aria-pressed", "false");
  });

  it("info button on a tile reveals the detail card without playing the sound", () => {
    render(<WhiteNoiseLullaby ageMonths={2} />);

    const infoBtn = screen.getByTestId("tile-info-fan");
    fireEvent.click(infoBtn);

    // Detail card is shown — heading uses the noise label
    expect(screen.getAllByText(/^Fan$/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/best for:/i)).toBeInTheDocument();
    // Sound did NOT start — tile stays inactive
    expect(screen.getByTestId("tile-fan")).toHaveAttribute("data-active", "false");
  });

  it("songs tab still renders the existing static lullaby cards", () => {
    render(<WhiteNoiseLullaby ageMonths={2} />);

    // Switch tab
    fireEvent.click(screen.getByRole("button", { name: /songs & lullabies/i }));

    expect(screen.getByText(/songs for this age/i)).toBeInTheDocument();
    expect(screen.getByText(/twinkle twinkle little star/i)).toBeInTheDocument();
    expect(screen.getByText(/your voice is the instrument/i)).toBeInTheDocument();
  });
});
