import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NutritionProvider } from "@/features/nutrition/context/nutrition-context";
import { NutritionTopNav } from "@/features/nutrition/layout/nutrition-top-nav";
import { NutritionSectionPanel } from "@/features/nutrition/layout/nutrition-section-panel";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("framer-motion", async () => {
  const React = await import("react");
  const motion = new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === "div" || prop === "span") {
          return React.forwardRef(
            ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLElement>) =>
              React.createElement(String(prop), { ...props, ref }, children),
          );
        }
        return undefined;
      },
    },
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    LayoutGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReducedMotion: () => true,
  };
});

vi.mock("@/features/nutrition/pages/today-page", () => ({
  TodayPage: () => <div data-testid="today-page-content">Today</div>,
}));
vi.mock("@/features/nutrition/pages/plan-page", () => ({
  PlanPage: () => <div data-testid="plan-page-content">Plan</div>,
}));
vi.mock("@/features/nutrition/pages/track-page", () => ({
  TrackPage: () => <div data-testid="track-page-content">Track</div>,
}));
vi.mock("@/features/nutrition/pages/learn-page", () => ({
  LearnPage: () => <div data-testid="learn-page-content">Learn</div>,
}));
vi.mock("@/features/nutrition/pages/family-page", () => ({
  FamilyPage: () => <div data-testid="family-page-content">Family</div>,
}));

vi.mock("@/features/nutrition/hooks/use-parent-nutrition-profile", () => ({
  useParentNutritionProfile: () => ({ foodStyle: "south_indian" }),
}));

vi.mock("@/lib/nutrition-region", () => ({
  useNutritionRegion: () => ({
    config: { guidelineBadge: "ICMR" },
    getRegional: () => null,
    localizeNote: (note?: string) => note,
  }),
}));

function renderNav(initialTab: "today" | "plan" | "track" | "learn" | "family" = "today") {
  return render(
    <NutritionProvider childId={1} childAgeMonths={48} childName="Aarav">
      <NutritionTopNav />
      <NutritionSectionPanel />
    </NutritionProvider>,
    {
      wrapper: ({ children }) => {
        void initialTab;
        return <>{children}</>;
      },
    },
  );
}

describe("NutritionTopNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders sticky journey navigation below hero placement contract", () => {
    renderNav();
    const nav = screen.getByTestId("nutrition-journey-nav");
    expect(nav.className).toContain("sticky");
    expect(nav.className).toContain("z-30");
    expect(nav.className).toContain("safe-area-inset-top");
  });

  it("marks the active tab with aria-current and active indicator", () => {
    renderNav("today");
    const today = screen.getByTestId("nutrition-nav-today");
    expect(today).toHaveAttribute("aria-current", "page");
    expect(today).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("nutrition-journey-active-indicator")).toBeTruthy();
  });

  it("switches tabs and updates visible panel", async () => {
    const user = userEvent.setup();
    renderNav("today");

    expect(screen.getByTestId("nutrition-panel-today")).toBeTruthy();
    expect(screen.getByTestId("today-page-content")).toBeTruthy();

    await user.click(screen.getByTestId("nutrition-nav-plan"));

    expect(screen.getByTestId("nutrition-nav-plan")).toHaveAttribute("aria-current", "page");
    expect(screen.queryByTestId("nutrition-nav-today")).not.toHaveAttribute("aria-current");
    expect(screen.getByTestId("nutrition-panel-plan")).toBeTruthy();
    expect(screen.getByTestId("plan-page-content")).toBeTruthy();
  });

  it("supports keyboard arrow navigation between tabs", () => {
    renderNav("today");
    const today = screen.getByTestId("nutrition-nav-today");
    today.focus();

    fireEvent.keyDown(today, { key: "ArrowRight" });
    expect(screen.getByTestId("nutrition-nav-plan")).toHaveAttribute("aria-current", "page");

    const plan = screen.getByTestId("nutrition-nav-plan");
    fireEvent.keyDown(plan, { key: "ArrowLeft" });
    expect(screen.getByTestId("nutrition-nav-today")).toHaveAttribute("aria-current", "page");
  });

  it("exposes horizontal scroll container for small screens", () => {
    renderNav();
    const scroll = screen.getByTestId("nutrition-journey-nav-scroll");
    expect(scroll.className).toContain("overflow-x-auto");
    expect(scroll.getAttribute("role")).toBe("tablist");
  });

  it("keeps touch targets at least 44px tall", () => {
    renderNav();
    for (const id of ["today", "plan", "track", "learn", "family"]) {
      const tab = screen.getByTestId(`nutrition-nav-${id}`);
      expect(tab.className).toContain("min-h-11");
    }
  });
});
