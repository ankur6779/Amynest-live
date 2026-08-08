import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SubItemGate } from "./sub-item-gate";

vi.mock("wouter", () => ({
  useLocation: () => ["/parenting-hub", vi.fn()],
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) =>
      typeof fallback === "string" ? fallback : key,
  }),
}));

vi.mock("@/hooks/use-subscription", () => ({
  useSubscription: () => ({ isPremium: false }),
}));

vi.mock("@/hooks/use-learning-progress", () => ({
  useLearningProgress: () => ({
    journeyDay: 1,
    status: { hubAccess: { isFreePeriod: false } },
  }),
}));

vi.mock("@/hooks/use-section-usage", () => ({
  useSectionUsage: () => ({
    isPremium: false,
    blockUsedIds: ["overwhelmed", "anxious", "connect", "break"],
    isBlockLocked: () => true,
    markBlockUsed: vi.fn(),
  }),
}));

vi.mock("@/lib/subscription-gate", () => ({
  openSubscriptionGate: vi.fn(),
}));

describe("SubItemGate P0-7 hard-day", () => {
  it("D2 bypasses lock for Emotional Support MFHO even when usage says locked", () => {
    render(
      <SubItemGate sectionId="hub_emotional" subItemId="overwhelmed">
        <button type="button">I feel overwhelmed</button>
      </SubItemGate>,
    );
    expect(screen.getByRole("button", { name: "I feel overwhelmed" })).toBeTruthy();
    expect(screen.queryByTestId("sub-item-lock-overlay")).toBeNull();
  });

  it("D6 locked non-hard-day overlay uses continuity CTA + Not now", () => {
    render(
      <SubItemGate sectionId="hub_articles" subItemId="article-9">
        <button type="button">Article</button>
      </SubItemGate>,
    );
    expect(screen.getByTestId("sub-item-lock-overlay")).toBeTruthy();
    expect(screen.getByTestId("sub-item-lock-continue").textContent).toMatch(
      /Continue with AmyNest/i,
    );
    expect(screen.getByTestId("sub-item-lock-not-now").textContent).toMatch(/Not now/i);
    expect(screen.queryByText(/Premium feature/i)).toBeNull();
  });
});
