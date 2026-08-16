import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AmyNestLeaveContinuity } from "./amy-nest-leave-continuity";

describe("AmyNestLeaveContinuity", () => {
  it("always offers Home, Today's plan, Amy, and Rooms", () => {
    render(<AmyNestLeaveContinuity />);
    expect(screen.getByTestId("leave-exit-today-home")).toHaveTextContent("Home");
    expect(screen.getByTestId("leave-exit-today-home")).toHaveAttribute("href", "/dashboard");
    expect(screen.getByTestId("leave-exit-todays-plan")).toHaveTextContent("Today's plan");
    expect(screen.getByTestId("leave-exit-todays-plan")).toHaveAttribute("href", "/routines");
    expect(screen.getByTestId("leave-exit-beside-you")).toHaveTextContent("Amy");
    expect(screen.getByTestId("leave-exit-beside-you")).toHaveAttribute("href", "/assistant");
    expect(screen.getByTestId("leave-exit-parent-hub")).toHaveTextContent("Rooms");
    expect(screen.getByTestId("leave-exit-parent-hub")).toHaveAttribute("href", "/parenting-hub");
    expect(screen.queryByTestId("leave-exit-continue")).toBeNull();
  });

  it("optional continue is not a catalogue", () => {
    render(
      <AmyNestLeaveContinuity
        continueHref="/parenting-hub"
        continueLabel="Back to rooms"
      />,
    );
    expect(screen.getByTestId("leave-exit-continue")).toHaveAttribute("href", "/parenting-hub");
    expect(screen.getByTestId("leave-exit-continue")).toHaveTextContent("Back to rooms");
  });
});
