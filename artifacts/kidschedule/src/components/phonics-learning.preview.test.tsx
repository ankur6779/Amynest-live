/**
 * Integration tests that prove `<NextStagePhonicsCard>` honours the
 * server-provided `previewOnly` flag per item.
 *
 * Specifically:
 *   1. A tile with `previewOnly=true` wires the audio button with a 5–8 s cap
 *      and shows the lock overlay when the cap fires.
 *   2. A tile with `previewOnly=false` does NOT wire any cap and never
 *      shows the lock overlay — i.e. an early-unlocked next-stage item
 *      plays at full length.
 *   3. Mixed lists are handled per-tile (not per-card).
 *
 * We render `<NextStagePhonicsCard>` directly (rather than driving the full
 * `<PhonicsLearning>` shell) so the test can exercise the per-item gating
 * without spinning up firebase auth, react-query, and the wider phonics
 * data layer.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { HubPhonicsDto } from "@/hooks/use-hub-content";

const audioProps: Array<Record<string, unknown>> = [];

vi.mock("@/components/audio-play-button", () => ({
  AudioPlayButton: (props: Record<string, unknown>) => {
    audioProps.push(props);
    return (
      <button
        data-testid={`audio-${props.text as string}`}
        data-has-cap={props.maxPlayMs ? "true" : "false"}
        onClick={() => {
          // Simulate the cap firing if (and only if) the caller wired it.
          const cb = props.onCapped as (() => void) | undefined;
          if (cb) cb();
        }}
      >
        play
      </button>
    );
  },
  preloadAmyVoice: vi.fn(),
}));

import { NextStagePhonicsCard } from "./phonics-learning";

function makePhonics(
  id: number,
  symbol: string,
  previewOnly: boolean,
): HubPhonicsDto {
  return {
    id,
    ageGroup: "2-4",
    band: "4-6",
    level: 2,
    type: "letter",
    symbol,
    sound: `sound-${symbol}`,
    example: `${symbol}pple`,
    emoji: null,
    hint: null,
    conceptId: `concept-${id}`,
    isUniversal: false,
    previewOnly,
  };
}

describe("<NextStagePhonicsCard> per-item preview gating", () => {
  beforeEach(() => {
    audioProps.length = 0;
  });

  it("applies the 5–8 s cap and shows the lock when previewOnly=true", () => {
    const lockedItem = makePhonics(11, "A", true);
    render(
      <NextStagePhonicsCard items={[lockedItem]} previewMode="next-level" />,
    );

    const tile = screen.getByTestId("phonics-next-stage-tile-11");
    expect(tile.dataset.previewOnly).toBe("true");
    const btn = screen.getByTestId("audio-sound-A");
    expect(btn.dataset.hasCap).toBe("true");

    // Lock overlay only appears after the cap fires.
    expect(screen.queryByText(/level to unlock this/i)).toBeNull();
    fireEvent.click(btn);
    expect(screen.getByText(/level to unlock this/i)).toBeInTheDocument();
  });

  it("does NOT apply a cap when previewOnly=false (server says unlocked)", () => {
    const unlockedItem = makePhonics(22, "B", false);
    render(
      <NextStagePhonicsCard items={[unlockedItem]} previewMode="next-level" />,
    );

    const tile = screen.getByTestId("phonics-next-stage-tile-22");
    expect(tile.dataset.previewOnly).toBe("false");
    const btn = screen.getByTestId("audio-sound-B");
    expect(btn.dataset.hasCap).toBe("false");

    // Even after firing the click, no lock overlay should appear.
    fireEvent.click(btn);
    expect(screen.queryByText(/level to unlock/i)).toBeNull();
    expect(screen.queryByText(/grows/i)).toBeNull();
  });

  it("handles mixed lists per-tile, not per-card", () => {
    const items = [
      makePhonics(31, "C", true),
      makePhonics(32, "D", false),
      makePhonics(33, "E", true),
    ];
    render(
      <NextStagePhonicsCard items={items} previewMode="infant" />,
    );

    expect(screen.getByTestId("phonics-next-stage-tile-31").dataset.previewOnly).toBe("true");
    expect(screen.getByTestId("phonics-next-stage-tile-32").dataset.previewOnly).toBe("false");
    expect(screen.getByTestId("phonics-next-stage-tile-33").dataset.previewOnly).toBe("true");
    expect(screen.getByTestId("audio-sound-C").dataset.hasCap).toBe("true");
    expect(screen.getByTestId("audio-sound-D").dataset.hasCap).toBe("false");
    expect(screen.getByTestId("audio-sound-E").dataset.hasCap).toBe("true");
  });

  it("uses the infant copy when previewMode=infant", () => {
    render(
      <NextStagePhonicsCard
        items={[makePhonics(41, "F", true)]}
        previewMode="infant"
      />,
    );
    fireEvent.click(screen.getByTestId("audio-sound-F"));
    expect(screen.getByText(/grows/i)).toBeInTheDocument();
  });
});
