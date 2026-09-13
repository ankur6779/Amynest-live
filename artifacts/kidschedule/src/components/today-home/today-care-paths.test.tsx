import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Router } from "wouter";
import { TodayCarePaths } from "./today-care-paths";
import { writeStoredActiveChildId } from "@/hooks/use-active-child-id";

vi.mock("@/hooks/use-active-child-id", () => ({
  writeStoredActiveChildId: vi.fn(),
}));

describe("TodayCarePaths", () => {
  it("renders nothing before a plan so Home stays plan-first", () => {
    render(
      <Router hook={() => ["/dashboard", () => {}]}>
        <TodayCarePaths childId={7} stage="before_plan" ageYears={2} />
      </Router>,
    );
    expect(screen.queryByTestId("today-care-paths")).toBeNull();
  });

  it("wires age-aware Home doors after the plan is visible", () => {
    render(
      <Router hook={() => ["/dashboard", () => {}]}>
        <TodayCarePaths childId={7} stage="plan_visible" ageYears={4} ageMonths={0} />
      </Router>,
    );
    expect(screen.getByTestId("today-care-paths")).toHaveAttribute(
      "aria-label",
      "What Amy can help with",
    );
    expect(screen.getByTestId("today-care-routines")).toHaveAttribute("href", "/routines");
    expect(screen.getByTestId("today-care-play")).toHaveAttribute("href", "/games");
    expect(screen.getByTestId("today-care-grow")).toHaveAttribute("href", "/parenting-hub");
    expect(screen.getByTestId("today-care-amy")).toHaveAttribute("href", "/assistant");
    expect(screen.queryByTestId("today-care-rooms")).toBeNull();
    fireEvent.click(screen.getByTestId("today-care-amy"));
    expect(writeStoredActiveChildId).toHaveBeenCalledWith(7);
  });

  it("shows Rooms only after first plan action", () => {
    render(
      <Router hook={() => ["/dashboard", () => {}]}>
        <TodayCarePaths childId={7} stage="first_action" ageYears={7} />
      </Router>,
    );
    expect(screen.getByTestId("today-care-rooms")).toHaveAttribute("href", "/parenting-hub");
  });
});
