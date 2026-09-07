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

  it("Ask Amy living — companionship room, not chatbot shelf", () => {
    render(
      <ParentHubRoomsShell
        childName="Emma"
        isInfant={false}
        activeRoom="help"
        onEnterRoom={vi.fn()}
        onExitRoom={vi.fn()}
        visibleTileIds={["amy-ai", "emotional", "speech-coach"]}
        renderDestination={(id) => <div data-testid={`mod-${id}`}>{id}</div>}
        renderAskAmyStream={({ activePath, onSelectPath }) => (
          <div data-testid="ask-amy-living-stream">
            <button
              type="button"
              data-testid="ask-amy-quiet-feelings"
              onClick={() => onSelectPath("feelings")}
            >
              Feelings
            </button>
            <span data-path={activePath} />
          </div>
        )}
      />,
    );

    fireEvent.click(screen.getByTestId("hub-dest-row-ask-amy"));
    expect(screen.getByTestId("ask-amy-living-stream")).toBeTruthy();
    expect(screen.getByTestId("hub-room-module-ask-amy")).toBeTruthy();
    expect(screen.queryByTestId("mod-amy-ai")).toBeNull();
    fireEvent.click(screen.getByTestId("ask-amy-quiet-feelings"));
    expect(screen.getByTestId("parent-hub-exit-panel")).toBeTruthy();
  });

  it("Grow living — one educational room, no six-SKU nest", () => {
    render(
      <ParentHubRoomsShell
        childName="Emma"
        isInfant={false}
        activeRoom="understand"
        onEnterRoom={vi.fn()}
        onExitRoom={vi.fn()}
        visibleTileIds={[
          "daily-tips",
          "smart-math-tricks",
          "abacus",
          "phonics",
          "spelling-mastery",
          "smart-study",
          "olympiad",
        ]}
        renderDestination={(id) => <div data-testid={`mod-${id}`}>{id}</div>}
        renderGrowStream={({ activeTileId, onSelectTile }) => (
          <div data-testid="grow-living-stream">
            <button
              type="button"
              data-testid="grow-recommend"
              onClick={() => onSelectTile("phonics")}
            >
              Practice
            </button>
            <span data-active={activeTileId ?? ""} />
          </div>
        )}
      />,
    );

    fireEvent.click(screen.getByTestId("hub-dest-row-grow"));
    expect(screen.queryByTestId("hub-dest-nested-grow")).toBeNull();
    expect(screen.getByTestId("grow-living-stream")).toBeTruthy();
    expect(screen.getByTestId("hub-room-module-grow")).toBeTruthy();
    fireEvent.click(screen.getByTestId("grow-recommend"));
    expect(screen.getByTestId("mod-phonics")).toBeTruthy();
    expect(screen.getByTestId("parent-hub-exit-panel")).toBeTruthy();
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

  it("P0-6 Help living — one companionship spine, never peer product doors", () => {
    render(
      <ParentHubRoomsShell
        childName="Emma"
        isInfant={false}
        activeRoom="help"
        onEnterRoom={vi.fn()}
        onExitRoom={vi.fn()}
        visibleTileIds={["amy-ai", "emotional", "speech-coach", "ptm-prep"]}
        renderDestination={(id) => <div data-testid={`mod-${id}`}>{id}</div>}
        renderRoomLivingStream={({ room, onSelectTile }) => (
          <div data-testid={`${room}-living-stream`}>
            <button
              type="button"
              data-testid="help-recommend"
              onClick={() => onSelectTile("amy-ai")}
            >
              Start here
            </button>
            <button
              type="button"
              data-testid="help-quiet-speech-coach"
              onClick={() => onSelectTile("speech-coach")}
            >
              Speech
            </button>
          </div>
        )}
      />,
    );

    expect(screen.getByTestId("help-living-stream")).toBeTruthy();
    expect(screen.getByTestId("parent-hub-rooms-shell")).toHaveAttribute(
      "data-ph-room-living",
      "1",
    );
    expect(screen.queryByTestId("hub-dest-row-ask-amy")).toBeNull();
    expect(screen.queryByTestId("hub-dest-row-emotional")).toBeNull();
    expect(screen.queryByTestId("hub-dest-row-speech-coach")).toBeNull();
    expect(screen.queryByTestId("hub-dest-row-ptm-prep")).toBeNull();

    fireEvent.click(screen.getByTestId("help-recommend"));
    expect(screen.getByTestId("mod-amy-ai")).toBeTruthy();
    expect(screen.getByTestId("parent-hub-exit-panel")).toBeTruthy();
  });

  it("P0-6 Understand living — Guidance leads, peers removed", () => {
    render(
      <ParentHubRoomsShell
        childName="Emma"
        isInfant={false}
        activeRoom="understand"
        onEnterRoom={vi.fn()}
        onExitRoom={vi.fn()}
        visibleTileIds={["daily-tips", "birth-sky", "phonics"]}
        renderDestination={(id) => <div data-testid={`mod-${id}`}>{id}</div>}
        renderRoomLivingStream={({ room, onSelectTile }) => (
          <div data-testid={`${room}-living-stream`}>
            <button
              type="button"
              data-testid="understand-recommend"
              onClick={() => onSelectTile("daily-tips")}
            >
              Today's guidance
            </button>
          </div>
        )}
      />,
    );

    expect(screen.getByTestId("understand-living-stream")).toBeTruthy();
    expect(screen.queryByTestId("hub-dest-row-guidance")).toBeNull();
    expect(screen.queryByTestId("hub-dest-row-birth-sky")).toBeNull();
    expect(screen.queryByTestId("hub-dest-row-grow")).toBeNull();
    fireEvent.click(screen.getByTestId("understand-recommend"));
    expect(screen.getByTestId("mod-daily-tips")).toBeTruthy();
    expect(screen.getByTestId("parent-hub-exit-panel")).toBeTruthy();
  });

  it("P0-6 Care living — Today's care leads, equal care cards removed", () => {
    render(
      <ParentHubRoomsShell
        childName="Emma"
        isInfant={false}
        activeRoom="care"
        onEnterRoom={vi.fn()}
        onExitRoom={vi.fn()}
        visibleTileIds={["nutrition", "health-lab", "infant-hub"]}
        renderDestination={(id) => <div data-testid={`mod-${id}`}>{id}</div>}
        renderRoomLivingStream={({ room, onSelectTile }) => (
          <div data-testid={`${room}-living-stream`}>
            <button
              type="button"
              data-testid="care-recommend"
              onClick={() => onSelectTile("nutrition")}
            >
              Today's care
            </button>
          </div>
        )}
      />,
    );

    expect(screen.getByTestId("care-living-stream")).toBeTruthy();
    expect(screen.queryByTestId("hub-dest-row-nutrition")).toBeNull();
    expect(screen.queryByTestId("hub-dest-row-health-lab")).toBeNull();
    expect(screen.queryByTestId("hub-dest-row-infant-care")).toBeNull();
    fireEvent.click(screen.getByTestId("care-recommend"));
    expect(screen.getByTestId("mod-nutrition")).toBeTruthy();
    expect(screen.getByTestId("parent-hub-exit-panel")).toBeTruthy();
  });

  it("keeps room door title and feeling as separate fields", () => {
    render(
      <ParentHubRoomsShell
        childName="Child 2"
        isInfant={false}
        activeRoom={null}
        onEnterRoom={vi.fn()}
        onExitRoom={vi.fn()}
        visibleTileIds={["amy-ai", "nutrition"]}
        renderDestination={() => null}
      />,
    );

    const help = screen.getByTestId("hub-room-door-help");
    const title = help.querySelector(".ph-room-door-title");
    const feeling = help.querySelector(".ph-room-door-feeling");
    expect(title?.textContent).toBe("Help");
    expect(feeling?.textContent).toBe("You are not alone.");
    expect(help).toHaveAttribute("aria-label", "Help. You are not alone.");
    expect(title?.compareDocumentPosition(feeling!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("shows a recovery state when a module has no content", () => {
    render(
      <ParentHubRoomsShell
        childName="Emma"
        isInfant={false}
        activeRoom="help"
        onEnterRoom={vi.fn()}
        onExitRoom={vi.fn()}
        visibleTileIds={["amy-ai"]}
        renderDestination={() => null}
      />,
    );

    fireEvent.click(screen.getByTestId("hub-dest-row-ask-amy"));
    expect(screen.getByTestId("parent-hub-module-unavailable")).toBeTruthy();
    fireEvent.click(screen.getByTestId("parent-hub-module-unavailable-back"));
    expect(screen.queryByTestId("parent-hub-module-unavailable")).toBeNull();
  });

  it("opens Grow path destinations from Understand living", () => {
    render(
      <ParentHubRoomsShell
        childName="Devan"
        isInfant={false}
        activeRoom="understand"
        onEnterRoom={vi.fn()}
        onExitRoom={vi.fn()}
        visibleTileIds={["daily-tips", "phonics"]}
        renderDestination={(id) => <div data-testid={`mod-${id}`}>{id}</div>}
        renderGrowStream={({ onSelectTile }) => (
          <div data-testid="grow-living-stream">
            <button
              type="button"
              data-testid="grow-quiet-sounds"
              onClick={() => onSelectTile("phonics")}
            >
              Sounds
            </button>
          </div>
        )}
        renderRoomLivingStream={({ room, onSelectTile }) => (
          <div data-testid={`${room}-living-stream`}>
            <button
              type="button"
              data-testid="understand-quiet-grow"
              onClick={() => onSelectTile("__grow_stream__")}
            >
              Grow
            </button>
          </div>
        )}
      />,
    );

    fireEvent.click(screen.getByTestId("understand-quiet-grow"));
    fireEvent.click(screen.getByTestId("grow-quiet-sounds"));
    expect(screen.getByTestId("mod-phonics")).toBeTruthy();
  });

  it("announces URL-safe deepen tiles when a Care path opens", () => {
    const onDeepenTile = vi.fn();
    render(
      <ParentHubRoomsShell
        childName="Aria"
        isInfant={false}
        activeRoom="care"
        onEnterRoom={vi.fn()}
        onExitRoom={vi.fn()}
        onDeepenTile={onDeepenTile}
        visibleTileIds={["nutrition", "health-lab"]}
        renderDestination={(id) => <div data-testid={`mod-${id}`}>{id}</div>}
        renderRoomLivingStream={({ room, onSelectTile }) => (
          <div data-testid={`${room}-living-stream`}>
            <button
              type="button"
              data-testid="care-quiet-nutrition"
              onClick={() => onSelectTile("nutrition")}
            >
              Nutrition
            </button>
          </div>
        )}
      />,
    );

    fireEvent.click(screen.getByTestId("care-quiet-nutrition"));
    expect(screen.getByTestId("mod-nutrition")).toBeTruthy();
    expect(onDeepenTile).toHaveBeenCalledWith("nutrition");
  });

  it("clears an open module when the selected child changes", () => {
    const { rerender } = render(
      <ParentHubRoomsShell
        childName="John"
        childId={1}
        isInfant
        activeRoom="care"
        onEnterRoom={vi.fn()}
        onExitRoom={vi.fn()}
        visibleTileIds={["infant-hub", "nutrition"]}
        renderDestination={(id) => <div data-testid={`mod-${id}`}>{id}</div>}
      />,
    );

    fireEvent.click(screen.getByTestId("hub-dest-row-infant-care"));
    expect(screen.getByTestId("mod-infant-hub")).toBeTruthy();

    rerender(
      <ParentHubRoomsShell
        childName="Child 2"
        childId={2}
        isInfant={false}
        activeRoom="care"
        onEnterRoom={vi.fn()}
        onExitRoom={vi.fn()}
        visibleTileIds={["nutrition", "health-lab"]}
        renderDestination={(id) => <div data-testid={`mod-${id}`}>{id}</div>}
      />,
    );

    expect(screen.queryByTestId("mod-infant-hub")).toBeNull();
  });
});
