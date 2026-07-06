import { describe, expect, it, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { Amy3DAvatar } from "./amy-3d-avatar";

// Force the "3D unsupported" branch so we can assert the 2D avatar renders
// synchronously with no intermediate blank frame — this is the exact bug
// this component was rewritten to eliminate.
vi.mock("@/lib/amy-3d/webgl-support", () => ({
  canRenderLive3D: () => false,
  prefersReducedMotion: () => false,
}));

beforeAll(() => {
  window.matchMedia =
    window.matchMedia ??
    ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList);
});

describe("Amy3DAvatar — never-blank contract", () => {
  it("renders the 2D avatar synchronously on first paint when WebGL is unavailable", () => {
    render(<Amy3DAvatar size={320} />);
    // AmyStageAvatar renders an <img> body immediately — no async gate,
    // no empty placeholder div, on the very first render.
    expect(screen.getByAltText(/amy/i)).toBeInTheDocument();
  });

  it("never renders an empty hero container", () => {
    const { container } = render(<Amy3DAvatar size={320} showWaveform />);
    // At least one meaningful child (avatar image or waveform bars) must be
    // present at all times — the hero wrapper itself must never be empty.
    expect(container.firstElementChild?.childElementCount).toBeGreaterThan(0);
  });
});
