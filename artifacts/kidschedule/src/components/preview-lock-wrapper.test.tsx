/**
 * Unit tests for the non-media `<PreviewLockWrapper>`.
 *
 * Verifies the 5–8 s preview-and-lock contract:
 * - Children are visible & interactive before the cap fires.
 * - The lock overlay appears the moment the timer expires.
 * - Children become non-interactive (pointer-events disabled) post-lock.
 * - Copy switches between infant and next-level modes.
 * - The cap is silently clamped to the 5–8 s contract regardless of caller.
 * - Re-mounting the wrapper restarts the timer (HubSection unmount → remount).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import {
  PreviewLockWrapper,
  getPreviewLockCopy,
} from "./preview-lock-wrapper";

describe("<PreviewLockWrapper>", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders children unlocked initially and locks after the cap", () => {
    render(
      <PreviewLockWrapper mode="next-level" capMs={6000}>
        <button data-testid="inner">Click me</button>
      </PreviewLockWrapper>,
    );

    const wrapper = screen.getByTestId("preview-lock-wrapper");
    expect(wrapper.dataset.previewLocked).toBe("false");
    expect(screen.queryByTestId("preview-lock-overlay")).toBeNull();
    expect(screen.getByTestId("inner")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(wrapper.dataset.previewLocked).toBe("true");
    expect(screen.getByTestId("preview-lock-overlay")).toBeInTheDocument();
  });

  it("disables pointer events on children once locked", () => {
    render(
      <PreviewLockWrapper mode="next-level" capMs={5000}>
        <button data-testid="inner">tap</button>
      </PreviewLockWrapper>,
    );
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    // The wrapper around children gets pointer-events-none + opacity tweaks
    // when locked. We assert the parent of the inner button (the dim layer)
    // carries those classes.
    const inner = screen.getByTestId("inner");
    const dimLayer = inner.parentElement!;
    expect(dimLayer.className).toMatch(/pointer-events-none/);
    expect(dimLayer.className).toMatch(/opacity-40/);
    expect(dimLayer.getAttribute("aria-hidden")).toBe("true");
  });

  it("uses the infant-mode copy for 0–2 children", () => {
    render(
      <PreviewLockWrapper mode="infant" capMs={5000}>
        <span>x</span>
      </PreviewLockWrapper>,
    );
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    const copy = getPreviewLockCopy("infant");
    expect(screen.getByText(copy.title)).toBeInTheDocument();
    expect(screen.getByText(copy.subtitle)).toBeInTheDocument();
  });

  it("uses the next-level copy for 2+ children", () => {
    render(
      <PreviewLockWrapper mode="next-level" capMs={5000}>
        <span>x</span>
      </PreviewLockWrapper>,
    );
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    const copy = getPreviewLockCopy("next-level");
    expect(screen.getByText(copy.title)).toBeInTheDocument();
  });

  it("clamps the cap to the 5–8 s contract (below)", () => {
    const onLocked = vi.fn();
    render(
      <PreviewLockWrapper mode="next-level" capMs={1000} onLocked={onLocked}>
        <span>x</span>
      </PreviewLockWrapper>,
    );
    // 1 s passed; should still be unlocked because the cap is silently
    // clamped to the contract floor of 5 s.
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onLocked).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(onLocked).toHaveBeenCalledTimes(1);
  });

  it("clamps the cap to the 5–8 s contract (above)", () => {
    const onLocked = vi.fn();
    render(
      <PreviewLockWrapper
        mode="next-level"
        capMs={60_000}
        onLocked={onLocked}
      >
        <span>x</span>
      </PreviewLockWrapper>,
    );
    // 8 s should be enough to fire even though the caller asked for 60.
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(onLocked).toHaveBeenCalledTimes(1);
  });

  it("restarts the timer when the wrapper is re-mounted", () => {
    const onLocked = vi.fn();
    const { unmount } = render(
      <PreviewLockWrapper mode="next-level" capMs={6000} onLocked={onLocked}>
        <span>x</span>
      </PreviewLockWrapper>,
    );
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onLocked).not.toHaveBeenCalled();
    unmount();

    // Fresh mount should not inherit elapsed time — it starts a brand-new
    // timer, mirroring HubSection's collapse-then-reopen behaviour.
    render(
      <PreviewLockWrapper mode="next-level" capMs={6000} onLocked={onLocked}>
        <span>x</span>
      </PreviewLockWrapper>,
    );
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onLocked).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onLocked).toHaveBeenCalledTimes(1);
  });
});
