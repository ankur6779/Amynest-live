/**
 * InfantHub smoke test (task #196 parity work)
 *
 * Verifies the mobile InfantHub featured card renders the new parity tabs
 * (Health, Milestones, Cues, Sounds) alongside the original 5 base tabs,
 * and that the Try-Free pill shows on the new tabs while the user is on the
 * free plan and hasn't consumed the per-feature first-use token yet.
 *
 * Heavy children (CryInsight, SleepPredict, the new InfantHealth/Milestones
 * /Cues/Sounds/SleepHelpers/FeedingReference panels) are stubbed so the
 * test stays focused on the tab wiring + gating.
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/hooks/useAuthFetch", () => ({
  useAuthFetch: () => vi.fn(),
}));

const markFeatureUsed = vi.fn();
const isFeatureLocked = vi.fn().mockReturnValue(false);
const hasUsedFeature = vi.fn().mockReturnValue(false);

vi.mock("@/hooks/useFeatureUsage", () => ({
  useFeatureUsage: () => ({
    isPremium: false,
    isLoaded: true,
    hasUsedFeature,
    markFeatureUsed,
    isFeatureLocked,
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && typeof opts === "object") {
        return Object.values(opts).reduce<string>(
          (acc, v) => acc.replace(/\{\{[^}]+\}\}/, String(v)),
          key,
        );
      }
      return key;
    },
    i18n: { language: "en" },
  }),
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/LockedBlock", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/PremiumBadge", () => ({
  default: () => <div data-testid="premium-badge" />,
}));
vi.mock("@/components/CryInsight", () => ({ default: () => <div data-testid="cry-stub" /> }));
vi.mock("@/components/SleepPredict", () => ({ default: () => <div data-testid="sleep-stub" /> }));
vi.mock("@/components/infant/InfantHealthTab", () => ({
  default: () => <div data-testid="health-stub">HEALTH</div>,
}));
vi.mock("@/components/infant/InfantMilestonesTab", () => ({
  default: () => <div data-testid="milestones-stub">MILESTONES</div>,
}));
vi.mock("@/components/infant/InfantCuesTab", () => ({
  default: () => <div data-testid="cues-stub">CUES</div>,
}));
vi.mock("@/components/infant/InfantSoundsTab", () => ({
  default: () => <div data-testid="sounds-stub">SOUNDS</div>,
}));
vi.mock("@/components/infant/InfantSleepHelpers", () => ({
  default: () => <div data-testid="sleep-helpers-stub">SLEEPHELPERS</div>,
}));
vi.mock("@/components/infant/InfantFeedingReference", () => ({
  default: () => <div data-testid="feeding-ref-stub">FEEDINGREF</div>,
}));

import InfantHub from "@/components/InfantHub";

function renderHub() {
  return render(<InfantHub childId={1} childName="Aarav" ageMonths={6} />);
}

describe("InfantHub featured card (parity tabs)", () => {
  it("renders all 9 tabs (5 base + 4 parity)", () => {
    renderHub();
    // Tab labels resolve to their i18n key in this test env (mocked t()).
    expect(screen.getByText("infant_hub.tabs.sleep")).toBeTruthy();
    expect(screen.getByText("infant_hub.tabs.feeding")).toBeTruthy();
    expect(screen.getByText("infant_hub.tabs.development")).toBeTruthy();
    expect(screen.getByText("infant_hub.tabs.behavior")).toBeTruthy();
    expect(screen.getByText("infant_hub.tabs.daily_care")).toBeTruthy();
    expect(screen.getByText("infant_hub.tabs.health")).toBeTruthy();
    expect(screen.getByText("infant_hub.tabs.milestones")).toBeTruthy();
    expect(screen.getByText("infant_hub.tabs.cues")).toBeTruthy();
    expect(screen.getByText("infant_hub.tabs.sounds")).toBeTruthy();
  });

  it("shows the SleepHelpers section under the default Sleep tab", () => {
    renderHub();
    expect(screen.getByTestId("sleep-helpers-stub")).toBeTruthy();
  });

  it("opens the Health parity tab and renders its content", () => {
    renderHub();
    const tab = screen.getByText("infant_hub.tabs.health");
    fireEvent.click(tab);
    expect(screen.getByTestId("health-stub")).toBeTruthy();
  });

  it("opens the Sounds parity tab and renders its content", () => {
    renderHub();
    fireEvent.click(screen.getByText("infant_hub.tabs.sounds"));
    expect(screen.getByTestId("sounds-stub")).toBeTruthy();
  });

  it("shows a Try-Free badge on each new tab while the feature is unused", () => {
    renderHub();
    // 4 parity tabs each render one TryFreeBadge while hasUsedFeature is false
    // and isPremium is false. The active sleep tab also shows a badge for the
    // sleep_helpers gated section header. Total ≥ 5.
    const badges = screen.getAllByTestId("try-free-badge");
    expect(badges.length).toBeGreaterThanOrEqual(5);
  });

  it("calls markFeatureUsed for the active tab on mount and on tab change", () => {
    markFeatureUsed.mockClear();
    renderHub();
    // The default active tab is 'sleep', which marks the sleep_helpers feature.
    expect(markFeatureUsed).toHaveBeenCalledWith("hub_infant_sleep_helpers");
    fireEvent.click(screen.getByText("infant_hub.tabs.milestones"));
    expect(markFeatureUsed).toHaveBeenCalledWith("hub_infant_milestones");
  });
});
