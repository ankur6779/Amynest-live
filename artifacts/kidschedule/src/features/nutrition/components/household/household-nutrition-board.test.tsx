import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HouseholdNutritionBoard } from "@/features/nutrition/components/household/household-nutrition-board";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@workspace/api-client-react", () => ({
  useListChildren: () => ({
    data: [
      { id: 1, name: "Aarav", age: 6, ageMonths: 0 },
      { id: 2, name: "Mira", age: 4, ageMonths: 0 },
    ],
  }),
}));

const openPaywall = vi.fn();
vi.mock("@/hooks/use-subscription", () => ({
  useSubscription: vi.fn(),
}));
vi.mock("@/contexts/paywall-context", () => ({
  usePaywall: () => ({ openPaywall }),
}));

vi.mock("@/features/nutrition/lib/nutrition-memory-sync", () => ({
  loadMealMemoryEntries: () => [],
}));

import { useSubscription } from "@/hooks/use-subscription";

describe("HouseholdNutritionBoard premium bypass P0", () => {
  beforeEach(() => {
    vi.mocked(useSubscription).mockReturnValue({
      isPremium: false,
      plan: "free",
      status: "free",
    } as unknown as ReturnType<typeof useSubscription>);
    openPaywall.mockClear();
  });

  it("does not render child NCI or names when locked", () => {
    render(<HouseholdNutritionBoard />);

    expect(screen.queryByText("Aarav")).toBeNull();
    expect(screen.queryByText("Mira")).toBeNull();
    expect(screen.getByText("nutrition_hub.household.premium_board")).toBeTruthy();
    expect(screen.getByText("nutrition_hub.household.board_title")).toBeTruthy();
  });

  it("renders child rows when premium", () => {
    vi.mocked(useSubscription).mockReturnValue({
      isPremium: true,
      plan: "yearly",
      status: "active",
    } as unknown as ReturnType<typeof useSubscription>);

    render(<HouseholdNutritionBoard />);

    expect(screen.getByText("Aarav")).toBeTruthy();
    expect(screen.getByText("Mira")).toBeTruthy();
  });
});
