import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ParentHubRoom } from "./parent-hub-room";

describe("ParentHubRoom Pack 1 shell", () => {
  it("renders title, subtitle, and architecture containers when open", () => {
    render(
      <ParentHubRoom
        roomId="help"
        title="Help"
        subtitle="When something feels hard right now."
        open
        onToggle={vi.fn()}
        destinations={<div data-testid="dest-ask-amy">Ask Amy</div>}
      />,
    );

    expect(screen.getByTestId("hub-room-help")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Help" })).toBeTruthy();
    expect(screen.getByText("When something feels hard right now.")).toBeTruthy();
    expect(screen.getByTestId("hub-room-hero-help")).toHaveAttribute(
      "data-pack",
      "hero-placeholder",
    );
    expect(screen.getByTestId("hub-room-destinations-help")).toBeTruthy();
    expect(screen.getByTestId("hub-room-deeplink-help")).toBeTruthy();
    expect(screen.getByTestId("dest-ask-amy")).toBeTruthy();
  });

  it("does not mount destinations when collapsed (lazy room body)", () => {
    render(
      <ParentHubRoom
        roomId="moments"
        title="Moments"
        subtitle="Share one human presence together."
        open={false}
        onToggle={vi.fn()}
        destinations={<div data-testid="dest-story">Story</div>}
      />,
    );

    expect(screen.queryByTestId("hub-room-body-moments")).toBeNull();
    expect(screen.queryByTestId("dest-story")).toBeNull();
  });
});
