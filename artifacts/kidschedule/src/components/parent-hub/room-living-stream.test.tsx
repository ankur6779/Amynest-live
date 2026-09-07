import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RoomLivingStream } from "./room-living-stream";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: { defaultValue?: string; name?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}));

describe("RoomLivingStream Care nutrition", () => {
  const visibleOlder = ["nutrition", "health-lab", "amy-ai"];
  const visibleInfant = ["infant-hub", "nutrition", "health-lab"];

  it("shows a labeled Nutrition path for older children", () => {
    const onSelect = vi.fn();
    render(
      <RoomLivingStream
        room="care"
        childName="Child 2"
        isInfant={false}
        visibleTileIds={visibleOlder}
        onSelectTile={onSelect}
      />,
    );

    expect(screen.getByTestId("care-quiet-nutrition")).toHaveTextContent("Nutrition");
    expect(screen.getByTestId("care-quiet-nutrition")).toHaveTextContent(
      "Meals for this body.",
    );
    expect(screen.getByTestId("care-recommend")).toHaveTextContent("nutrition");
    expect(screen.queryByTestId("care-quiet-infant-care")).toBeNull();

    fireEvent.click(screen.getByTestId("care-quiet-nutrition"));
    expect(onSelect).toHaveBeenCalledWith("nutrition");
  });

  it("shows Nutrition for infants as a quiet path beside Infant Care", () => {
    const onSelect = vi.fn();
    render(
      <RoomLivingStream
        room="care"
        childName="John"
        isInfant
        visibleTileIds={visibleInfant}
        onSelectTile={onSelect}
      />,
    );

    expect(screen.getByTestId("care-recommend")).toHaveTextContent("Today's care for John");
    expect(screen.getByTestId("care-quiet-nutrition")).toBeTruthy();
    fireEvent.click(screen.getByTestId("care-recommend"));
    expect(onSelect).toHaveBeenCalledWith("infant-hub");
  });

  it("filters Help school-meeting when the tile is not visible", () => {
    render(
      <RoomLivingStream
        room="help"
        childName="John"
        isInfant
        visibleTileIds={["amy-ai", "emotional", "speech-coach"]}
        onSelectTile={vi.fn()}
      />,
    );

    expect(screen.getByTestId("help-quiet-speech-coach")).toBeTruthy();
    expect(screen.queryByTestId("help-quiet-ptm-prep")).toBeNull();
  });
});
