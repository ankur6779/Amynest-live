/**
 * Unit tests for the media preview-cap hook (`useMediaPreviewCap`) and
 * the matching `<MediaPreviewLockOverlay>` copy-rendering.
 *
 * The hook is the heart of the in-player 5–8 s cap: it pauses the media,
 * pins `currentTime` back to the cap, and refuses any seek past the cap.
 * The overlay sits on top of the player when the hook reports `capped`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { useRef } from "react";
import {
  MediaPreviewLockOverlay,
  useMediaPreviewCap,
} from "./media-preview-lock";
import { getPreviewLockCopy } from "./preview-lock-wrapper";

/** Minimal fake of the parts of HTMLMediaElement we touch. */
function makeFakeMedia() {
  const listeners: Record<string, Array<() => void>> = {};
  const fake = {
    currentTime: 0,
    paused: true,
    addEventListener(type: string, cb: () => void) {
      (listeners[type] ??= []).push(cb);
    },
    removeEventListener(type: string, cb: () => void) {
      listeners[type] = (listeners[type] ?? []).filter((fn) => fn !== cb);
    },
    pause: vi.fn(function (this: { paused: boolean }) {
      this.paused = true;
    }),
    /** Fire a fake DOM event of `type` on the element. */
    fire(type: string) {
      for (const cb of listeners[type] ?? []) cb();
    },
  };
  return fake;
}

type FakeMedia = ReturnType<typeof makeFakeMedia>;

describe("useMediaPreviewCap", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports `capped=false` when inactive", () => {
    const fake = makeFakeMedia();
    const ref = { current: fake as unknown as HTMLMediaElement };
    const { result } = renderHook(() =>
      useMediaPreviewCap(ref, { active: false, capSeconds: 6 }),
    );
    expect(result.current).toBe(false);
  });

  it("pauses + caps when timeupdate hits the cap", () => {
    const fake = makeFakeMedia();
    const ref = { current: fake as unknown as HTMLMediaElement };
    const onCap = vi.fn();

    const { result } = renderHook(() =>
      useMediaPreviewCap(ref, { active: true, capSeconds: 6, onCap }),
    );

    expect(result.current).toBe(false);

    act(() => {
      fake.currentTime = 6.2;
      fake.fire("timeupdate");
    });

    expect(fake.pause).toHaveBeenCalledTimes(1);
    expect(fake.currentTime).toBe(6); // pinned back to the cap
    expect(onCap).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(true);
  });

  it("re-pins currentTime if the user seeks past the cap", () => {
    const fake = makeFakeMedia();
    const ref = { current: fake as unknown as HTMLMediaElement };
    renderHook(() =>
      useMediaPreviewCap(ref, { active: true, capSeconds: 5 }),
    );

    act(() => {
      fake.currentTime = 30;
      fake.fire("seeking");
    });
    expect(fake.currentTime).toBe(5);
    expect(fake.pause).toHaveBeenCalled();
  });

  it("re-pauses if the user tries to resume after the cap", () => {
    const fake = makeFakeMedia();
    const ref = { current: fake as unknown as HTMLMediaElement };
    renderHook(() =>
      useMediaPreviewCap(ref, { active: true, capSeconds: 6 }),
    );

    // First, fire the cap.
    act(() => {
      fake.currentTime = 6;
      fake.fire("timeupdate");
    });
    expect(fake.pause).toHaveBeenCalledTimes(1);

    // Now simulate a play attempt — the hook should pause again.
    act(() => {
      fake.fire("play");
    });
    expect(fake.pause).toHaveBeenCalledTimes(2);
    expect(fake.currentTime).toBe(6);
  });

  it("clamps capSeconds into the 5–8 s contract (below)", () => {
    const fake = makeFakeMedia();
    const ref = { current: fake as unknown as HTMLMediaElement };
    const onCap = vi.fn();
    renderHook(() =>
      useMediaPreviewCap(ref, { active: true, capSeconds: 1, onCap }),
    );

    // 4 s should be below the clamped 5 s floor → no cap yet.
    act(() => {
      fake.currentTime = 4;
      fake.fire("timeupdate");
    });
    expect(onCap).not.toHaveBeenCalled();

    act(() => {
      fake.currentTime = 5;
      fake.fire("timeupdate");
    });
    expect(onCap).toHaveBeenCalledTimes(1);
  });

  it("clamps capSeconds into the 5–8 s contract (above)", () => {
    const fake = makeFakeMedia();
    const ref = { current: fake as unknown as HTMLMediaElement };
    const onCap = vi.fn();
    renderHook(() =>
      useMediaPreviewCap(ref, { active: true, capSeconds: 60, onCap }),
    );
    // 8 s should fire even though caller asked for 60.
    act(() => {
      fake.currentTime = 8;
      fake.fire("timeupdate");
    });
    expect(onCap).toHaveBeenCalledTimes(1);
  });

  it("calls onCap exactly once per active session", () => {
    const fake = makeFakeMedia();
    const ref = { current: fake as unknown as HTMLMediaElement };
    const onCap = vi.fn();
    renderHook(() =>
      useMediaPreviewCap(ref, { active: true, capSeconds: 6, onCap }),
    );
    act(() => {
      fake.currentTime = 6.5;
      fake.fire("timeupdate");
      fake.currentTime = 7;
      fake.fire("timeupdate");
      fake.currentTime = 30;
      fake.fire("seeking");
    });
    expect(onCap).toHaveBeenCalledTimes(1);
  });
});

describe("<MediaPreviewLockOverlay>", () => {
  it("renders the infant copy when mode=infant", () => {
    render(<MediaPreviewLockOverlay mode="infant" />);
    const copy = getPreviewLockCopy("infant");
    expect(screen.getByText(copy.title)).toBeInTheDocument();
    expect(screen.getByText(copy.subtitle)).toBeInTheDocument();
  });

  it("renders the next-level copy when mode=next-level", () => {
    render(<MediaPreviewLockOverlay mode="next-level" />);
    const copy = getPreviewLockCopy("next-level");
    expect(screen.getByText(copy.title)).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <MediaPreviewLockOverlay
        mode="next-level"
        onClose={onClose}
        closeLabel="Close"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("useMediaPreviewCap — integration via component", () => {
  /**
   * Smoke test that the hook works end-to-end when wired through a real
   * useRef in a component (the way StoryPlayer uses it).
   */
  function Probe({ capSeconds }: { capSeconds: number }) {
    const ref = useRef<HTMLMediaElement | null>(null);
    const capped = useMediaPreviewCap(ref, { active: true, capSeconds });
    return (
      <div>
        <span data-testid="capped">{capped ? "yes" : "no"}</span>
        {/* Use video so jsdom gives us a real HTMLMediaElement-ish node. */}
        <video
          ref={ref as unknown as React.RefObject<HTMLVideoElement>}
          data-testid="media"
          src="data:audio/wav;base64,UklGRgAAAABXQVZFZm10IA=="
        />
      </div>
    );
  }

  it("flips to capped after a synthetic timeupdate past the cap", () => {
    render(<Probe capSeconds={6} />);
    expect(screen.getByTestId("capped").textContent).toBe("no");
    const media = screen.getByTestId("media") as HTMLVideoElement;
    Object.defineProperty(media, "currentTime", {
      value: 6.5,
      configurable: true,
      writable: true,
    });
    act(() => {
      fireEvent.timeUpdate(media);
    });
    expect(screen.getByTestId("capped").textContent).toBe("yes");
  });
});
