import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Router } from "wouter";
import { TodayCarePaths } from "./today-care-paths";
import { writeStoredActiveChildId } from "@/hooks/use-active-child-id";

vi.mock("@/hooks/use-active-child-id", () => ({
  writeStoredActiveChildId: vi.fn(),
}));

describe("TodayCarePaths", () => {
  it("wires existing Home → module destinations with child context on Speech Coach", () => {
    render(
      <Router hook={() => ["/dashboard", () => {}]}>
        <TodayCarePaths childId={7} />
      </Router>,
    );
    expect(screen.getByTestId("today-care-paths")).toHaveAttribute(
      "aria-label",
      "What Amy can help with",
    );
    expect(screen.getByTestId("today-care-routines")).toHaveAttribute("href", "/routines");
    expect(screen.getByTestId("today-care-speech-coach")).toHaveAttribute(
      "href",
      "/speech-coach",
    );
    expect(screen.getByTestId("today-care-amy")).toHaveAttribute("href", "/assistant");
    expect(screen.getByTestId("today-care-rooms")).toHaveAttribute("href", "/parenting-hub");
    fireEvent.click(screen.getByTestId("today-care-speech-coach"));
    expect(writeStoredActiveChildId).toHaveBeenCalledWith(7);
  });
});
