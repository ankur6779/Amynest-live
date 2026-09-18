import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AmyAstroCosmicPortrait } from "./cosmic-portrait";
import { AMY_ASTRO_PORTRAIT_FALLBACK_SRC, AMY_ASTRO_TILE_PORTRAIT_SRC } from "../lib/branding";

describe("AmyAstroCosmicPortrait", () => {
  it("renders a hero illustration frame that fills the wrapper", () => {
    const { container } = render(
      <AmyAstroCosmicPortrait childName="Child 2" presentation="hero" reducedMotion />,
    );
    const frame = screen.getByTestId("amy-astro-cosmic-portrait");
    expect(frame).toHaveAttribute("data-portrait-presentation", "hero");
    expect(frame.className).toContain("amy-astro-portrait-frame--hero");
    const img = container.querySelector("img.amy-astro-portrait-illustration");
    expect(img).toBeTruthy();
    expect(img).toHaveAttribute("src", AMY_ASTRO_TILE_PORTRAIT_SRC);
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveClass("amy-astro-portrait-illustration");
  });

  it("uses a smaller closing presentation without sign chips", () => {
    render(
      <AmyAstroCosmicPortrait
        childName="Child 2"
        presentation="closing"
        sunSign="Cancer"
        moonSign="Sagittarius"
        reducedMotion
      />,
    );
    const frame = screen.getByTestId("amy-astro-cosmic-portrait");
    expect(frame).toHaveAttribute("data-portrait-presentation", "closing");
    expect(frame.className).toContain("amy-astro-portrait-frame--closing");
    expect(frame.querySelector(".amy-astro-portrait-sign-row")).toBeNull();
  });

  it("falls back to the SVG when the PNG fails", () => {
    const { container } = render(
      <AmyAstroCosmicPortrait childName="Child 1" presentation="hero" reducedMotion />,
    );
    const img = container.querySelector("img.amy-astro-portrait-illustration")!;
    fireEvent.error(img);
    expect(img).toHaveAttribute("src", AMY_ASTRO_PORTRAIT_FALLBACK_SRC);
    expect(screen.getByTestId("amy-astro-cosmic-portrait")).toHaveAttribute(
      "data-image-status",
      "fallback",
    );
  });
});
