import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HealthZonePremiumSection } from "./health-zone-premium-section";
import { ParentHubQuietModuleProvider } from "@/lib/parent-hub/quiet-module-context";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) =>
      typeof fallback === "string" ? fallback : _key,
  }),
}));

vi.mock("@/lib/hub-render-context", () => ({
  useInfantDiscoveryPreview: () => false,
  useHubSectionPoints: () => () => {},
}));

describe("HealthZonePremiumSection quiet Rooms open", () => {
  it("keeps the body collapsed in the Hub mall", () => {
    render(
      <HealthZonePremiumSection id="nutrition" title="Nutrition" description="Meals">
        <div data-testid="nutrition-body">Meals for this body</div>
      </HealthZonePremiumSection>,
    );
    expect(screen.queryByTestId("nutrition-body")).toBeNull();
  });

  it("shows destination content immediately inside a quiet Rooms module", () => {
    render(
      <ParentHubQuietModuleProvider>
        <HealthZonePremiumSection id="nutrition" title="Nutrition" description="Meals">
          <div data-testid="nutrition-body">Meals for this body</div>
        </HealthZonePremiumSection>
      </ParentHubQuietModuleProvider>,
    );
    expect(screen.getByTestId("nutrition-body")).toBeTruthy();
  });
});
