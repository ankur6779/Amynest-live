import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

import { MobileRecipeCard } from "@/components/MobileRecipeCard";
import { DailyStory } from "@/components/DailyStory";
import { AmazingFacts } from "@/components/AmazingFacts";
import { ChildrenStrip, type Child } from "@/components/ChildrenStrip";

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({ mode: "dark", theme: "dark" }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

let isOnlineMock = true;
const appStoreState = {
  status: "ready",
  error: null,
  lastUpdated: Date.now(),
  fromCache: false,
  data: { ok: true },
  refresh: vi.fn(),
  queueLength: 0,
  syncing: false,
};

vi.mock("@/store/useAppStore", () => ({
  useAppStore: <T,>(sel: (s: typeof appStoreState) => T) => sel(appStoreState),
}));

vi.mock("@/store/useNetworkStore", () => ({
  useNetworkStore: <T,>(sel: (s: { isOnline: boolean }) => T) =>
    sel({ isOnline: isOnlineMock }),
  selectIsOnline: (s: { isOnline: boolean }) => s.isOnline,
}));

beforeEach(() => {
  cleanup();
  isOnlineMock = true;
});

describe("Dashboard hooks-order regression (Task #249)", () => {
  it("ChildrenStrip: toggling children [] ↔ [oneChild] does not throw", () => {
    const noop = () => {};
    const oneChild: Child = { id: 1, name: "Aanya", age: 4, ageMonths: 48 };
    const otherChild: Child = { id: 2, name: "Vihaan", age: 3, ageMonths: 36 };

    const { rerender } = render(
      <ChildrenStrip children={[]} onManage={noop} onAdd={noop} />,
    );
    rerender(<ChildrenStrip children={[oneChild]} onManage={noop} onAdd={noop} />);
    rerender(<ChildrenStrip children={[]} onManage={noop} onAdd={noop} />);
    rerender(<ChildrenStrip children={[otherChild]} onManage={noop} onAdd={noop} />);
  });

  it("MobileRecipeCard: toggling empty ↔ populated does not throw", () => {
    const { rerender, queryByTestId } = render(
      <MobileRecipeCard meal={null} recipe={null} nutrition={null} />,
    );
    expect(queryByTestId("mobile-recipe-card")).toBeNull();

    rerender(
      <MobileRecipeCard
        meal="Breakfast"
        recipe={{
          prepTime: "5m",
          cookTime: "10m",
          servings: "2",
          ingredients: ["eggs", "toast"],
          steps: ["mix", "cook"],
        }}
        nutrition={null}
      />,
    );
    expect(queryByTestId("mobile-recipe-card")).not.toBeNull();

    rerender(<MobileRecipeCard meal={null} recipe={null} nutrition={null} />);
    expect(queryByTestId("mobile-recipe-card")).toBeNull();
  });

  it("DailyStory: re-rendering across age changes does not throw", () => {
    const { rerender } = render(<DailyStory ageMonths={36} />);
    rerender(<DailyStory ageMonths={60} />);
    rerender(<DailyStory ageMonths={36} />);
  });

  it("AmazingFacts: re-rendering across age-group boundaries does not throw", () => {
    const { rerender } = render(<AmazingFacts ageMonths={60} />);
    rerender(<AmazingFacts ageMonths={1} />);
    rerender(<AmazingFacts ageMonths={120} />);
    rerender(<AmazingFacts ageMonths={60} />);
  });

  it("AppDataStatusBanner: toggling isOnline true ↔ false does not throw", async () => {
    // Dynamically import AFTER the store mocks above are registered.
    const { default: AppDataStatusBanner } = await import(
      "@/components/AppDataStatusBanner"
    );
    isOnlineMock = true;
    const { rerender } = render(<AppDataStatusBanner />);
    isOnlineMock = false;
    rerender(<AppDataStatusBanner />);
    isOnlineMock = true;
    rerender(<AppDataStatusBanner />);
  });
});
