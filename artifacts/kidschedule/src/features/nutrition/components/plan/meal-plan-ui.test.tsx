import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MealPlanDaySelector } from "@/features/nutrition/components/plan/meal-plan-day-selector";
import { MealPlanSlotCard } from "@/features/nutrition/components/plan/meal-plan-slot-card";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/features/nutrition/context/nutrition-context", () => ({
  useNutritionContext: () => ({ childId: 1 }),
}));

vi.mock("@/hooks/use-auth-fetch", () => ({
  useAuthFetch: () => vi.fn(),
}));

vi.mock("@/features/nutrition/lib/nutrition-memory-sync", () => ({
  persistMealOutcome: vi.fn(),
}));

describe("MealPlanDaySelector", () => {
  it("renders sticky day selector with safe-area top offset", () => {
    render(
      <MealPlanDaySelector labels={["Mon", "Tue"]} selectedIndex={0} onSelect={vi.fn()} />,
    );

    const root = screen.getByTestId("meal-plan-day-selector");
    expect(root.className).toContain("sticky");
    expect(root.className).toContain("safe-area-inset-top");
  });

  it("calls onSelect when a day is clicked", () => {
    const onSelect = vi.fn();
    render(
      <MealPlanDaySelector labels={["Mon", "Tue"]} selectedIndex={0} onSelect={onSelect} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Tue" }));
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});

describe("MealPlanSlotCard", () => {
  it("hides nutrition details by default and expands on chevron tap", () => {
    render(
      <MealPlanSlotCard
        time="Breakfast"
        mealText="Ragi dosa + milk"
        mealSlot="breakfast"
        colorClass="bg-muted"
      />,
    );

    expect(screen.queryByText("nutrition_hub.intelligence.why_this_meal")).toBeNull();

    fireEvent.click(screen.getByTestId("meal-plan-slot-expand"));
    expect(screen.getByText("nutrition_hub.intelligence.why_this_meal")).toBeTruthy();
    expect(screen.getByText("nutrition_hub.intelligence.supports")).toBeTruthy();
  });

  it("shows meal name and nutrient badges when collapsed", () => {
    render(
      <MealPlanSlotCard
        time="Lunch"
        mealText="Rice + dal + sabzi"
        mealSlot="lunch"
        colorClass="bg-muted"
      />,
    );

    expect(screen.getByText("Rice + dal + sabzi")).toBeTruthy();
    expect(screen.getByTestId("meal-plan-slot-expand")).toBeTruthy();
  });
});
