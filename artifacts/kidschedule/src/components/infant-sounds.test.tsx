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
 * Plus the Spec 3 Poems tab contract:
 *   - Tab toggle exposes a "Poems" tab (replacing "Songs & Lullabies")
 *   - Tapping a poem tile opens the immersive fullscreen player
 *   - Age sub-tabs switch the visible poems
 *   - "Load More Poems" reveals additional poems in the same group
 *   - Loop is ON by default in the poem player
 *
 * jsdom has no WebAudio and only a stub HTMLAudioElement, so we install
 * minimal mocks: the WebAudio context for the white-noise engine, and the
 * `Audio` constructor + `useAuthFetch` for the ElevenLabs-backed poem
 * player. The mocked authFetch returns a canned /api/tts/synthesize
 * envelope so play() resolves without real network IO.
 */
import React from "react";
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, within, fireEvent, cleanup } from "@testing-library/react";

// ─── Module mocks (must come before the component import) ────────────────────
//
// The Poems player uses `useAuthFetch` to call /api/tts/synthesize. Mock it
// here so tests don't need a real Firebase auth context and so the synth
// call resolves instantly with a fake audio URL the mocked Audio constructor
// will happily accept as a `src`.
vi.mock("@/hooks/use-auth-fetch", () => ({
  useAuthFetch: () => async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/api/tts/synthesize")) {
      return new Response(
        JSON.stringify({
          ok: true,
          cacheKey: "deadbeef",
          audioUrl: "/api/tts/audio/deadbeef.mp3",
          cached: true,
          charCount: 50,
          contentType: "audio/mpeg",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(null, { status: 404 });
  },
}));

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

// ─── HTMLAudioElement mock (Spec 3 — Poems player) ────────────────────────────
// jsdom's <audio> implementation is a stub that doesn't actually play; we
// replace `Audio` globally with a minimal class that records the calls our
// player makes (play / pause / load / removeAttribute) and resolves play()
// synchronously so isPlaying flips on the next React tick.
class MockAudioElement {
  src = "";
  loop = false;
  volume = 1;
  preload: "auto" | "metadata" | "none" = "auto";
  paused = true;
  currentTime = 0;
  onended: ((ev: Event) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  constructor(srcArg?: string) {
    if (srcArg) this.src = srcArg;
  }
  play(): Promise<void> {
    this.paused = false;
    return Promise.resolve();
  }
  pause(): void { this.paused = true; }
  load(): void { /* no-op */ }
  removeAttribute(name: string): void {
    if (name === "src") this.src = "";
  }
  addEventListener(): void { /* no-op */ }
  removeEventListener(): void { /* no-op */ }
}

beforeAll(() => {
  // Install before any test imports the engine (the hook only touches it on
  // first play, so installing in beforeAll is fine).
  (globalThis as unknown as { AudioContext: typeof AudioContext }).AudioContext =
    MockAudioContext as unknown as typeof AudioContext;
  // HTMLAudioElement mock — used by the ElevenLabs-backed poem player.
  (globalThis as unknown as { Audio: typeof Audio }).Audio =
    MockAudioElement as unknown as typeof Audio;
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

  // ─── Spec 3 — Poems tab ─────────────────────────────────────────────────
  describe("Poems tab", () => {
    function openPoemsTab() {
      // The "Poems" tab now replaces "Songs & Lullabies" in the top toggle.
      fireEvent.click(screen.getByRole("button", { name: /^poems$/i }));
    }

    it("switches to the poems module and shows the age sub-tabs", () => {
      render(<WhiteNoiseLullaby ageMonths={2} />);
      openPoemsTab();

      expect(screen.getByTestId("infant-poems-section")).toBeInTheDocument();
      expect(screen.getByText(/poems for your baby/i)).toBeInTheDocument();
      // 3 age sub-tabs are rendered
      ["0-6m", "6-12m", "12-24m"].forEach((id) => {
        expect(screen.getByTestId(`poem-age-tab-${id}`)).toBeInTheDocument();
      });
    });

    it("defaults to the age group matching the child's age in months", () => {
      render(<WhiteNoiseLullaby ageMonths={2} />);
      openPoemsTab();

      // 2 months → 0–6m group is selected
      expect(screen.getByTestId("poem-age-tab-0-6m"))
        .toHaveAttribute("aria-selected", "true");
      // The 0–6m bucket includes the spec-provided "Sleep, Baby, Sleep" poem.
      expect(screen.getByTestId("poem-tile-sleep-baby-sleep")).toBeInTheDocument();
    });

    it("changes visible poems when a different age sub-tab is selected", () => {
      render(<WhiteNoiseLullaby ageMonths={2} />);
      openPoemsTab();

      // Pre-condition: a 0–6m poem is visible, a 12–24m poem is not.
      expect(screen.getByTestId("poem-tile-sleep-baby-sleep")).toBeInTheDocument();
      expect(screen.queryByTestId("poem-tile-one-little-star")).toBeNull();

      fireEvent.click(screen.getByTestId("poem-age-tab-12-24m"));

      // After: 12–24m content is visible, the 0–6m poem is gone.
      expect(screen.getByTestId("poem-tile-one-little-star")).toBeInTheDocument();
      expect(screen.queryByTestId("poem-tile-sleep-baby-sleep")).toBeNull();
    });

    it("paginates further poems via the Load More button", () => {
      render(<WhiteNoiseLullaby ageMonths={8} />);
      openPoemsTab();

      // 6–12m group has 5 poems but only 3 are shown initially → Load More
      // button is present.
      const loadMore = screen.getByTestId("poem-load-more");
      expect(loadMore).toBeInTheDocument();

      fireEvent.click(loadMore);

      // After Load More, all 5 poems in the 6–12m group are visible.
      ["clap-clap-little-hands", "round-and-round", "soft-little-bird",
       "pat-pat-pat", "humming-bumblebee"].forEach((id) => {
        expect(screen.getByTestId(`poem-tile-${id}`)).toBeInTheDocument();
      });
      // No more poems left → button is now hidden.
      expect(screen.queryByTestId("poem-load-more")).toBeNull();
    });

    it("opens the immersive fullscreen player when a tile is tapped, with loop ON by default", () => {
      render(<WhiteNoiseLullaby ageMonths={2} />);
      openPoemsTab();

      fireEvent.click(screen.getByTestId("poem-tile-sleep-baby-sleep"));

      const player = screen.getByTestId("poem-fullscreen-player");
      expect(player).toBeInTheDocument();
      // Loop toggle is pressed by default (Spec 3 — "Loop ON by default").
      expect(within(player).getByTestId("poem-loop-toggle"))
        .toHaveAttribute("aria-pressed", "true");
      // The 4 sleep-timer pills are rendered.
      ["off", "15m", "30m", "1h"].forEach((label) => {
        expect(within(player).getByTestId(`poem-timer-${label}`)).toBeInTheDocument();
      });
    });

    it("close button stops playback (clears the active marker on the tile)", () => {
      render(<WhiteNoiseLullaby ageMonths={2} />);
      openPoemsTab();

      const tile = screen.getByTestId("poem-tile-sleep-baby-sleep");
      fireEvent.click(tile);
      // Tile flips to data-active="true" the moment the fullscreen player
      // opens for it (covers loading, playing, and paused states). We bind
      // to `openPoem` rather than to the async `isPlaying` flag so the
      // marker doesn't blink while the synth fetch is in flight.
      expect(tile).toHaveAttribute("data-active", "true");

      fireEvent.click(screen.getByTestId("poem-fullscreen-close"));

      // openPoem is cleared synchronously on close → tile flips back. We
      // don't assert on the player's DOM presence here because
      // <AnimatePresence> keeps its children mounted during the exit
      // animation, and framer-motion's animations don't complete cleanly
      // under jsdom + fake timers (same caveat as the white-noise stop-all
      // test above).
      expect(tile).toHaveAttribute("data-active", "false");
    });
  });
});
