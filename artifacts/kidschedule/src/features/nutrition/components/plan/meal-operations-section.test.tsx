import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MealOperationsSection } from "@/features/nutrition/components/plan/meal-operations-section";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@workspace/api-client-react", () => ({
  useListChildren: () => ({ data: [{ id: 1, name: "A", age: 8, ageMonths: 0 }] }),
}));

vi.mock("@/hooks/use-subscription", () => ({
  useSubscription: () => ({ isPremium: true }),
}));

vi.mock("@/features/nutrition/context/nutrition-context", () => ({
  useNutritionContext: () => ({
    ageGroupId: "school_6_10",
    foodStyle: "indian",
    childId: 1,
  }),
}));

vi.mock("@/features/nutrition/hooks/use-meal-memory", () => ({
  useMealMemory: () => ({ entries: [] }),
}));

vi.mock("@/features/nutrition/lib/nutrition-hub-analytics", () => ({
  trackGroceryOpened: vi.fn(),
  trackGroceryGenerated: vi.fn(),
  trackTiffinOpened: vi.fn(),
  trackTiffinGenerated: vi.fn(),
}));

vi.mock("@/features/nutrition/components/grocery/grocery-list", () => ({
  GroceryList: () => <div data-testid="grocery-list-mock" />,
}));

vi.mock("@/features/nutrition/components/grocery/shopping-mode", () => ({
  ShoppingMode: () => <div data-testid="shopping-mode-mock" />,
}));

vi.mock("@/features/nutrition/components/tiffin/tiffin-week-view", () => ({
  TiffinWeekView: () => <div data-testid="tiffin-week-mock" />,
}));

vi.mock("@/features/nutrition/components/grocery/household-grocery-board", () => ({
  HouseholdGroceryBoard: () => <div data-testid="household-board-mock" />,
}));

describe("MealOperationsSection tabs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows groceries panel by default", () => {
    render(<MealOperationsSection />);
    expect(screen.getByTestId("meal-operations-panel-groceries")).toBeTruthy();
    expect(screen.queryByTestId("meal-operations-panel-tiffin")).toBeNull();
  });

  it("switches to tiffin panel when tab clicked", () => {
    render(<MealOperationsSection />);
    fireEvent.click(screen.getByTestId("meal-operations-tab-tiffin"));
    expect(screen.getByTestId("meal-operations-panel-tiffin")).toBeTruthy();
    expect(screen.queryByTestId("meal-operations-panel-groceries")).toBeNull();
    expect(screen.getByTestId("tiffin-week-mock")).toBeTruthy();
  });

  it("switches to prep panel when tab clicked", () => {
    render(<MealOperationsSection />);
    fireEvent.click(screen.getByTestId("meal-operations-tab-prep"));
    expect(screen.getByTestId("meal-operations-panel-prep")).toBeTruthy();
  });

  it("switches to household panel when tab clicked", () => {
    render(<MealOperationsSection />);
    fireEvent.click(screen.getByTestId("meal-operations-tab-household"));
    expect(screen.getByTestId("meal-operations-panel-household")).toBeTruthy();
  });
});
