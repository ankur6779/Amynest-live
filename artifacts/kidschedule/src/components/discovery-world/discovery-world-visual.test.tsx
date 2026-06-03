/**
 * Discovery Worlds production polish — visual regression contracts (DOM structure + copy).
 */
import { describe, it, expect } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import {
  DISCOVERY_COPY,
  DiscoveryEmptyState,
  DiscoveryErrorState,
  DiscoveryHeroFallback,
  DiscoveryPageLoading,
  DiscoveryProgressDots,
} from "./discovery-world-polish";
import { WorldHeroImage } from "./world-hero-image";

describe("DISCOVERY_COPY", () => {
  it("uses warm parent-facing tone for hub and dashboard empties", () => {
    expect(DISCOVERY_COPY.noChildHub.title).toMatch(/child profile/i);
    expect(DISCOVERY_COPY.emptyParentFavorites.message).toMatch(/worlds/i);
    expect(DISCOVERY_COPY.emptyExplore.message).toMatch(/sticker/i);
  });
});

describe("DiscoveryEmptyState", () => {
  it("renders explore empty with stable test id", () => {
    render(<DiscoveryEmptyState variant="emptyExplore" testId="dw-empty-explore" />);
    expect(screen.getByTestId("dw-empty-explore")).toBeTruthy();
    expect(screen.getByText(DISCOVERY_COPY.emptyExplore.title)).toBeTruthy();
  });
});

describe("DiscoveryErrorState", () => {
  it("exposes alert role for world not found", () => {
    render(<DiscoveryErrorState />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(DISCOVERY_COPY.worldNotFound.title)).toBeTruthy();
  });
});

describe("DiscoveryPageLoading", () => {
  it("announces loading status to assistive tech", () => {
    render(<DiscoveryPageLoading />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });
});

describe("DiscoveryHeroFallback", () => {
  it("uses role=img with accessible name", () => {
    render(<DiscoveryHeroFallback emoji="🚗" alt="Car" />);
    expect(screen.getByRole("img", { name: "Car" })).toBeTruthy();
  });
});

describe("DiscoveryProgressDots", () => {
  it("renders progress tablist when multiple slides", () => {
    const { container } = render(<DiscoveryProgressDots activeIndex={1} total={5} />);
    expect(screen.getByRole("tablist")).toBeTruthy();
    expect(container.querySelectorAll('[role="presentation"]')).toHaveLength(5);
  });

  it("renders nothing for single-slide sequences", () => {
    const { container } = render(<DiscoveryProgressDots activeIndex={0} total={1} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("WorldHeroImage", () => {
  it("falls back to premium hero when src fails", () => {
    render(<WorldHeroImage src="/broken.webp" emoji="🦁" alt="Lion" />);
    const img = document.querySelector("img");
    expect(img).toBeTruthy();
    act(() => {
      fireEvent.error(img!);
    });
    expect(screen.getByRole("img", { name: "Lion" })).toBeTruthy();
  });

  it("uses eager high priority for default hero loads", () => {
    render(<WorldHeroImage src="/ok.webp" emoji="🦁" alt="Lion" />);
    const img = document.querySelector("img");
    expect(img?.getAttribute("fetchpriority")).toBe("high");
    expect(img?.getAttribute("loading")).toBe("eager");
  });
});
