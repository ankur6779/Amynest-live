import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  AnimatedScore,
  AudioWaveBars,
  ProgressiveStarFill,
  SpringProgressBar,
  emitXpFly,
} from "./sound-world-motion";

vi.mock("@/lib/reduced-motion", () => ({
  useReducedMotion: () => true,
}));

vi.mock("@/lib/performance-tier", () => ({
  performanceTier: () => "mid",
}));

describe("sound-world-motion", () => {
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
});
