/**
 * RoutineCarousel — card press / toggle behaviour tests.
 *
 * Verifies the dashboard's tap-to-open-detail wiring:
 *   • When `onPressCard` is provided, the card body becomes a button that
 *     fires the handler with the task id.
 *   • The action button (Done / Undo) still fires `onToggle` and does NOT
 *     bubble up to `onPressCard`, so toggling status doesn't navigate.
 *   • When `onPressCard` is omitted, the card stays a non-interactive view.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RoutineCarousel from "./RoutineCarousel";
import type { RoutineTask } from "@/contexts/ProgressContext";

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({ mode: "light" }),
}));

vi.mock("expo-haptics", () => ({
  selectionAsync: vi.fn(),
  impactAsync: vi.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
}));

const sampleTasks: RoutineTask[] = [
  {
    id: "t-1-0",
    title: "Morning stretch",
    time: "7:00 AM",
    minutes: 15,
    icon: "sunny",
    done: false,
  },
  {
    id: "t-1-1",
    title: "Breakfast",
    time: "7:30 AM",
    minutes: 30,
    icon: "restaurant",
    done: true,
  },
];

describe("RoutineCarousel", () => {
  it("invokes onPressCard with the task id when the card body is tapped", () => {
    const onPressCard = vi.fn();
    const onToggle = vi.fn();

    render(
      <RoutineCarousel
        tasks={sampleTasks}
        onToggle={onToggle}
        onPressCard={onPressCard}
      />,
    );

    const cardButton = screen.getByRole("button", {
      name: /Open routine details for Morning stretch/i,
    });
    fireEvent.click(cardButton);

    expect(onPressCard).toHaveBeenCalledTimes(1);
    expect(onPressCard).toHaveBeenCalledWith("t-1-0");
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("invokes onToggle (and not onPressCard) when the Done button is tapped", () => {
    const onPressCard = vi.fn();
    const onToggle = vi.fn();

    render(
      <RoutineCarousel
        tasks={sampleTasks}
        onToggle={onToggle}
        onPressCard={onPressCard}
      />,
    );

    const doneBtn = screen.getByRole("button", {
      name: /Mark Morning stretch done/i,
    });
    fireEvent.click(doneBtn);

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith("t-1-0");
    expect(onPressCard).not.toHaveBeenCalled();
  });

  it("invokes onToggle for the Undo button on a completed task", () => {
    const onToggle = vi.fn();

    render(
      <RoutineCarousel tasks={sampleTasks} onToggle={onToggle} />,
    );

    const undoBtn = screen.getByRole("button", {
      name: /Mark Breakfast not done/i,
    });
    fireEvent.click(undoBtn);

    expect(onToggle).toHaveBeenCalledWith("t-1-1");
  });

  it("does not render a card-level button when onPressCard is omitted", () => {
    const onToggle = vi.fn();

    render(
      <RoutineCarousel tasks={sampleTasks} onToggle={onToggle} />,
    );

    expect(
      screen.queryByRole("button", {
        name: /Open routine details for Morning stretch/i,
      }),
    ).toBeNull();
  });
});
