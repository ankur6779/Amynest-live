import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ParentHubRoomsShell } from "./parent-hub-rooms-shell";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: { defaultValue?: string; name?: string }) => {
      if (opts?.defaultValue && opts.name) {
        return opts.defaultValue.includes("{{name}}")
          ? opts.defaultValue.replace("{{name}}", opts.name)
          : opts.defaultValue;
      }
      return opts?.defaultValue ?? _key;
    },
  }),
}));

vi.mock("@/components/app-link", () => ({
  AppLink: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("Parent Hub Pack 4 living flow", () => {
  it("highlights exactly one recommended path first", () => {
    render(
      <ParentHubRoomsShell
        childName="Emma"
        isInfant={false}
        activeRoom="help"
        onEnterRoom={vi.fn()}
        onExitRoom={vi.fn()}
        visibleTileIds={["amy-ai", "emotional", "speech-coach"]}
        renderDestination={() => null}
      />,
    );

    expect(screen.getByTestId("hub-dest-recommend-ask-amy")).toHaveTextContent(
      "Start here",
    );
    expect(screen.queryByTestId("hub-dest-recommend-emotional")).toBeNull();
    const rows = screen.getAllByTestId(/hub-dest-row-/);
    expect(rows[0]).toHaveAttribute("data-testid", "hub-dest-row-ask-amy");
  });

  it("shows exit panel after opening a destination — Back to Home primary", () => {
    render(
      <ParentHubRoomsShell
        childName="Emma"
        isInfant={false}
        activeRoom="understand"
        onEnterRoom={vi.fn()}
        onExitRoom={vi.fn()}
        visibleTileIds={["daily-tips", "articles"]}
        renderDestination={(id) => <div data-testid={`mod-${id}`}>{id}</div>}
        renderGuidanceStream={() => (
          <div data-testid="guidance-living-stream">stream</div>
        )}
      />,
    );

    fireEvent.click(screen.getByTestId("hub-dest-row-guidance"));
    // Guidance living — one stream, no nested tip/article catalogue
    expect(screen.queryByTestId("hub-dest-nested-guidance")).toBeNull();
    expect(screen.getByTestId("guidance-living-stream")).toBeTruthy();
    expect(screen.getByTestId("hub-room-module-guidance")).toBeTruthy();
    expect(screen.getByTestId("parent-hub-exit-panel")).toBeTruthy();
    expect(screen.getByTestId("parent-hub-exit-home")).toBeTruthy();
  });

  it("Guidance kill-switch keeps nested catalogue when stream not provided", () => {
    render(
      <ParentHubRoomsShell
        childName="Emma"
        isInfant={false}
        activeRoom="understand"
        onEnterRoom={vi.fn()}
        onExitRoom={vi.fn()}
        visibleTileIds={["daily-tips", "articles"]}
        renderDestination={(id) => <div data-testid={`mod-${id}`}>{id}</div>}
      />,
    );

    fireEvent.click(screen.getByTestId("hub-dest-row-guidance"));
    expect(screen.getByTestId("hub-dest-nested-guidance")).toBeTruthy();
    fireEvent.click(screen.getByTestId("hub-dest-row-daily-tips"));
    expect(screen.getByTestId("mod-daily-tips")).toBeTruthy();
  });

  it("Pack 5 — destination module mounts under quiet continuity slot", () => {
    render(
      <ParentHubRoomsShell
        childName="Emma"
        isInfant={false}
        activeRoom="help"
        onEnterRoom={vi.fn()}
        onExitRoom={vi.fn()}
        visibleTileIds={["amy-ai"]}
        renderDestination={(id) => <div data-testid={`mod-${id}`}>{id}</div>}
      />,
    );
    fireEvent.click(screen.getByTestId("hub-dest-row-ask-amy"));
    const slot = screen.getByTestId("hub-room-module-amy-ai");
    expect(slot).toHaveAttribute("data-ph-pack", "5");
    expect(screen.getByTestId("mod-amy-ai")).toBeTruthy();
  });

  it("Moments root stays ≤3 with Presence recommended", () => {
    render(
      <ParentHubRoomsShell
        childName="Emma"
        isInfant={false}
        activeRoom="moments"
        onEnterRoom={vi.fn()}
        onExitRoom={vi.fn()}
        visibleTileIds={[
          "activities",
          "story-hub",
          "worksheets",
          "talking-amy",
          "discovery-worlds",
        ]}
        renderDestination={() => null}
      />,
    );

    expect(screen.getByTestId("hub-dest-recommend-presence")).toHaveTextContent(
      "Try this together",
    );
    expect(screen.getByTestId("hub-dest-row-presence")).toBeTruthy();
    expect(screen.getByTestId("hub-dest-row-story")).toBeTruthy();
    expect(screen.getByTestId("hub-dest-row-make")).toBeTruthy();
    expect(screen.queryByTestId("hub-dest-row-talking-amy")).toBeNull();
    expect(screen.queryByTestId("hub-dest-row-discovery-worlds")).toBeNull();
  });

  it("Moments living — one emotional room, never four product doors", () => {
    render(
      <ParentHubRoomsShell
        childName="Emma"
        isInfant={false}
        activeRoom="moments"
        onEnterRoom={vi.fn()}
        onExitRoom={vi.fn()}
        visibleTileIds={[
          "activities",
          "story-hub",
          "worksheets",
          "talking-amy",
          "discovery-worlds",
        ]}
        renderDestination={(id) => <div data-testid={`mod-${id}`}>{id}</div>}
        renderMomentsStream={({ activeTileId, onSelectTile }) => (
          <div data-testid="moments-living-stream">
            <button
              type="button"
              data-testid="moments-recommend"
              onClick={() => onSelectTile("activities")}
            >
              Ten minutes
            </button>
            <button
              type="button"
              data-testid="moments-quiet-story"
              onClick={() => onSelectTile("story-hub")}
            >
              Story
            </button>
            <span data-active={activeTileId ?? ""} />
          </div>
        )}
      />,
    );

    expect(screen.getByTestId("moments-living-stream")).toBeTruthy();
    expect(screen.getByTestId("parent-hub-rooms-shell")).toHaveAttribute(
      "data-mo-living",
      "1",
    );
    // Peer product catalogue removed
    expect(screen.queryByTestId("hub-dest-row-presence")).toBeNull();
    expect(screen.queryByTestId("hub-dest-row-story")).toBeNull();
    expect(screen.queryByTestId("hub-dest-row-make")).toBeNull();
    expect(screen.queryByTestId("hub-dest-row-talking-amy")).toBeNull();

    fireEvent.click(screen.getByTestId("moments-recommend"));
    expect(screen.getByTestId("mod-activities")).toBeTruthy();
    expect(screen.getByTestId("parent-hub-exit-panel")).toBeTruthy();
  });

  it("Care recommends Infant Care for infants", () => {
    render(
      <ParentHubRoomsShell
        childName="Emma"
        isInfant
        activeRoom="care"
        onEnterRoom={vi.fn()}
        onExitRoom={vi.fn()}
        visibleTileIds={["infant-hub", "nutrition"]}
        renderDestination={() => null}
      />,
    );
    expect(screen.getByTestId("hub-dest-recommend-infant-care")).toHaveTextContent(
      "Today's care",
    );
  });
});
