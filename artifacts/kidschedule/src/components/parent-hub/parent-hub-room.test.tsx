import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ParentHubRoomsShell } from "./parent-hub-rooms-shell";
import { ParentHubDestinationRow } from "./parent-hub-destination-row";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string; name?: string }) => {
      if (opts?.defaultValue && opts.name) {
        return opts.defaultValue.replace("{{name}}", opts.name).replace("${name}", opts.name);
      }
      if (key === "parent_hub.rooms.header" && opts?.name) {
        return `What do you need for ${opts.name}?`;
      }
      return opts?.defaultValue ?? key;
    },
  }),
}));

describe("Parent Hub Pack 2 living rooms", () => {
  it("shows photographic room doors — not accordion menus", () => {
    render(
      <ParentHubRoomsShell
        childName="Emma"
        isInfant={false}
        activeRoom={null}
        onEnterRoom={vi.fn()}
        onExitRoom={vi.fn()}
        visibleTileIds={["amy-ai", "nutrition"]}
        renderDestination={() => null}
      />,
    );

    expect(screen.getByTestId("parent-hub-rooms-shell")).toHaveAttribute(
      "data-ph-mode",
      "doors",
    );
    expect(screen.getByTestId("hub-room-door-help")).toBeTruthy();
    expect(screen.getByTestId("hub-room-door-understand")).toBeTruthy();
    expect(screen.getByTestId("hub-room-door-care")).toBeTruthy();
    expect(screen.getByTestId("hub-room-door-moments")).toBeTruthy();
    expect(screen.queryByText(/Room hero · Pack 2/i)).toBeNull();
  });

  it("entered room shows cinematic hero + quiet destination rows", () => {
    render(
      <ParentHubRoomsShell
        childName="Emma"
        isInfant={false}
        activeRoom="help"
        onEnterRoom={vi.fn()}
        onExitRoom={vi.fn()}
        visibleTileIds={["amy-ai", "emotional", "speech-coach"]}
        renderDestination={(id) => <div data-testid={`mod-${id}`}>{id}</div>}
      />,
    );

    expect(screen.getByTestId("parent-hub-rooms-shell")).toHaveAttribute(
      "data-ph-mode",
      "entered",
    );
    expect(screen.getByTestId("hub-room-hero-help")).toHaveAttribute(
      "data-pack",
      "cinematic-hero",
    );
    expect(screen.getByTestId("hub-room-feeling-help")).toHaveTextContent(
      "You are not alone.",
    );
    expect(screen.getByTestId("hub-dest-row-amy-ai")).toBeTruthy();
    expect(screen.queryByTestId("mod-amy-ai")).toBeNull();

    fireEvent.click(screen.getByTestId("hub-dest-row-amy-ai"));
    expect(screen.getByTestId("mod-amy-ai")).toBeTruthy();
  });

  it("destination row is a quiet path control", () => {
    const onSelect = vi.fn();
    render(
      <ParentHubDestinationRow
        tileId="story-hub"
        title="Story"
        hint="One quiet story"
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByTestId("hub-dest-row-story-hub"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
