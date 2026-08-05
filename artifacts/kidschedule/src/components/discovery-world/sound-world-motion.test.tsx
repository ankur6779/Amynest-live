import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import {
  AnimatedScore,
  AudioWaveBars,
  ModePanel,
  ProgressiveStarFill,
  SoundWorldPage,
  SpringProgressBar,
  StickerUnlockCelebration,
  emitXpFly,
} from "./sound-world-motion";

vi.mock("@/lib/reduced-motion", () => ({
  useReducedMotion: () => true,
}));

vi.mock("@/lib/performance-tier", () => ({
  performanceTier: () => "mid",
}));

vi.mock("@/lib/sound-world-gpu-safe", async () => {
  const actual = await vi.importActual<typeof import("@/lib/sound-world-gpu-safe")>(
    "@/lib/sound-world-gpu-safe",
  );
  return {
    ...actual,
    soundWorldGpuProfile: () => ({
      tier: "mid" as const,
      preferOpaqueSurfaces: true,
      allowIdleMotion: false,
      allowTilt: false,
      allowAtmosphere: false,
      allowExitWait: false,
    }),
  };
});

describe("sound-world-motion", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("AnimatedScore renders value under reduced motion", () => {
    render(<AnimatedScore value={42} suffix=" XP" />);
    expect(screen.getByText("42 XP")).toBeTruthy();
  });

  it("ProgressiveStarFill exposes progress semantics", () => {
    render(<ProgressiveStarFill pct={60} />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("60");
  });

  it("SpringProgressBar mounts without crash", () => {
    const { container } = render(<SpringProgressBar value={25} />);
    expect(container.querySelector("div")).toBeTruthy();
  });

  it("AudioWaveBars renders bar count", () => {
    const { container } = render(<AudioWaveBars bars={5} active={false} />);
    expect(container.querySelectorAll("span").length).toBe(5);
  });

  it("emitXpFly is safe when window exists", () => {
    expect(() => emitXpFly({ amount: 5, clientX: 10, clientY: 20 })).not.toThrow();
  });

  it("SoundWorldPage marks the GPU-safe root", () => {
    const { container } = render(
      <SoundWorldPage particles={false}>
        <span>content</span>
      </SoundWorldPage>,
    );
    expect(container.querySelector("[data-sound-world-root]")).toBeTruthy();
  });

  it("ModePanel skips AnimatePresence wait on GPU-safe clients", () => {
    const { container, rerender } = render(
      <ModePanel modeKey="explore">
        <span>grid</span>
      </ModePanel>,
    );
    expect(container.textContent).toContain("grid");
    rerender(
      <ModePanel modeKey="detail-cow">
        <span>detail</span>
      </ModePanel>,
    );
    expect(container.textContent).toContain("detail");
  });

  it("StickerUnlockCelebration dismisses even when onDone identity churns", () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    const { rerender } = render(
      <StickerUnlockCelebration active emoji="🐄" onDone={() => onDone()} />,
    );
    // Simulate parent re-renders that create a new onDone lambda each time.
    for (let i = 0; i < 8; i++) {
      rerender(<StickerUnlockCelebration active emoji="🐄" onDone={() => onDone()} />);
    }
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(onDone).toHaveBeenCalled();
  });
});
