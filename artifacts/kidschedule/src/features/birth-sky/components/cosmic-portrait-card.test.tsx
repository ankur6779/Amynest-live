import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AmyAstroCosmicPortraitCard } from "./cosmic-portrait-card";
import { buildCosmicPortrait } from "../lib/signature-insight";

function portraitFor(name: string) {
  return buildCosmicPortrait({
    childName: name,
    sunSign: "Cancer",
    moonSign: "Sagittarius",
    moonPhaseLabel: "Waxing Gibbous",
    risingSign: "Cancer",
    daySky: false,
  });
}

describe("AmyAstroCosmicPortraitCard", () => {
  it("renders distinct hero and closing portrait presentations", () => {
    render(
      <AmyAstroCosmicPortraitCard
        childName="Child 2"
        portrait={portraitFor("Child 2")}
        reducedMotion
        onAskAmy={() => undefined}
      />,
    );
    const frames = screen.getAllByTestId("amy-astro-cosmic-portrait");
    expect(frames).toHaveLength(2);
    expect(frames[0]).toHaveAttribute("data-portrait-presentation", "hero");
    expect(frames[1]).toHaveAttribute("data-portrait-presentation", "closing");
    expect(screen.getByTestId("amy-astro-portrait-save-memory")).toBeInTheDocument();
    expect(screen.getByLabelText("Child 2")).toBeInTheDocument();
    const cluster = screen.getByTestId("amy-astro-portrait-cta-cluster");
    expect(cluster.className).toContain("amynest-fab-avoid");
    expect(cluster.querySelector(".amy-astro-portrait-cta-row")?.className).not.toContain(
      "amynest-fab-avoid",
    );
    expect(screen.getByTestId("amy-astro-portrait-disclaimer")).toHaveTextContent(
      "This is for awareness and reflection, not prediction.",
    );
    expect(screen.getByTestId("amy-astro-portrait-tagline")).toHaveTextContent(
      "Guided by stars. Inspired by love. Built for your child.",
    );
  });

  it("updates personalized copy when the child changes", () => {
    const { rerender } = render(
      <AmyAstroCosmicPortraitCard
        childName="Child 1"
        portrait={portraitFor("Child 1")}
        reducedMotion
        profileId="p1"
      />,
    );
    expect(screen.getByLabelText("Child 1")).toBeInTheDocument();

    rerender(
      <AmyAstroCosmicPortraitCard
        childName="Child 3"
        portrait={portraitFor("Child 3")}
        reducedMotion
        profileId="p3"
      />,
    );
    expect(screen.getByLabelText("Child 3")).toBeInTheDocument();
    expect(screen.queryByLabelText("Child 1")).toBeNull();
    expect(screen.getByText(/I'll keep discovering new stars as Child 3 grows/i)).toBeInTheDocument();
  });
});
