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

describe("Parent Hub Pack 3 destinations", () => {
  it("entered Help shows intention + merged quiet names (not tip/learning mall)", () => {
    render(
      <ParentHubRoomsShell
        childName="Emma"
        isInfant={false}
        activeRoom="understand"
        onEnterRoom={vi.fn()}
        onExitRoom={vi.fn()}
        visibleTileIds={[
          "daily-tips",
          "articles",
          "new-parent-tips",
          "birth-sky",
          "answer-to-kids-how",
          "smart-math-tricks",
          "phonics",
          "olympiad",
        ]}
        renderDestination={(id) => <div data-testid={`mod-${id}`}>{id}</div>}
      />,
    );

    expect(screen.getByTestId("hub-room-intention-understand")).toHaveTextContent(
      "What can help me understand my child?",
    );
    expect(screen.getByTestId("hub-dest-row-guidance")).toBeTruthy();
    expect(screen.getByTestId("hub-dest-row-grow")).toBeTruthy();
    expect(screen.getByTestId("hub-dest-row-birth-sky")).toBeTruthy();
    expect(screen.queryByTestId("hub-dest-row-daily-tips")).toBeNull();
    expect(screen.queryByTestId("hub-dest-row-phonics")).toBeNull();
  });

  it("merge door reveals nested quiet members then opens existing module", () => {
    render(
      <ParentHubRoomsShell
        childName="Emma"
        isInfant={false}
        activeRoom="moments"
        onEnterRoom={vi.fn()}
        onExitRoom={vi.fn()}
        visibleTileIds={["activities", "origami-studio", "art-craft", "story-hub"]}
        renderDestination={(id) => <div data-testid={`mod-${id}`}>{id}</div>}
      />,
    );

    fireEvent.click(screen.getByTestId("hub-dest-row-presence"));
    expect(screen.getByTestId("hub-dest-nested-presence")).toBeTruthy();
    expect(screen.getByTestId("hub-dest-row-activities")).toBeTruthy();

    fireEvent.click(screen.getByTestId("hub-dest-row-activities"));
    expect(screen.getByTestId("mod-activities")).toBeTruthy();
  });

  it("deep-link focus opens merge door and member module", () => {
    render(
      <ParentHubRoomsShell
        childName="Emma"
        isInfant={false}
        activeRoom="understand"
        onEnterRoom={vi.fn()}
        onExitRoom={vi.fn()}
        focusTileId="phonics"
        visibleTileIds={["phonics", "smart-math-tricks", "daily-tips"]}
        renderDestination={(id) => <div data-testid={`mod-${id}`}>{id}</div>}
      />,
    );

    expect(screen.getByTestId("hub-dest-nested-grow")).toBeTruthy();
    expect(screen.getByTestId("mod-phonics")).toBeTruthy();
  });
});
