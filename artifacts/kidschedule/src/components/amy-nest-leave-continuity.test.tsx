import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AmyNestLeaveContinuity } from "./amy-nest-leave-continuity";

describe("AmyNestLeaveContinuity", () => {
  it("always offers Today Home and Parent Hub", () => {
    render(<AmyNestLeaveContinuity />);
    expect(screen.getByTestId("leave-exit-today-home")).toHaveTextContent("Today Home");
    expect(screen.getByTestId("leave-exit-parent-hub")).toHaveTextContent("Parent Hub");
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
