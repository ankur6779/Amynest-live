import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NutritionHubParentContent } from "./nutrition-hub-parent-tile";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { months?: number; returnObjects?: boolean }) => {
      if (opts?.returnObjects) return ["Iron", "Calcium"];
      if (key.endsWith("age_hint")) return `${opts?.months} months`;
      if (key.endsWith("cta")) return "Open Nutrition";
      if (key.endsWith("intro")) return "Meals for this body.";
      if (key.endsWith("ages_all")) return "All ages";
      if (key.endsWith("access_title")) return "Access";
      if (key.endsWith("free_access")) return "Free meals";
      if (key.endsWith("premium_access")) return "Premium plans";
      return key;
    },
  }),
}));

vi.mock("@/components/app-link", () => ({
  AppLink: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("NutritionHubParentContent", () => {
  it("renders an infant meal preview for the 6–12 month band", () => {
    render(
      <NutritionHubParentContent
        childAgeMonths={8}
        childName="Aria"
        isFreeJourneyPeriod={false}
        isPremium
      />,
    );

    expect(screen.getByTestId("nutrition-hub-parent-content")).toHaveAttribute(
      "data-nutrition-band",
      "infant_6_12",
    );
    expect(screen.getByTestId("nutrition-age-band")).toHaveTextContent("6–12");
    expect(screen.getByTestId("nutrition-today-meal")).toBeTruthy();
    expect(screen.getByTestId("nutrition-age-preview")).toHaveTextContent("Aria");
  });

  it("renders preschool and school meals without going blank", () => {
    const { rerender } = render(
      <NutritionHubParentContent
        childAgeMonths={36}
        childName="Devan"
        isFreeJourneyPeriod={false}
        isPremium
      />,
    );
    expect(screen.getByTestId("nutrition-hub-parent-content")).toHaveAttribute(
      "data-nutrition-band",
      "preschool_3_6",
    );
    expect(screen.getByTestId("nutrition-today-meal")).toBeTruthy();

    rerender(
      <NutritionHubParentContent
        childAgeMonths={72}
        childName="Kai Montgomery-Anastasia"
        isFreeJourneyPeriod={false}
        isPremium
      />,
    );
    expect(screen.getByTestId("nutrition-hub-parent-content")).toHaveAttribute(
      "data-nutrition-band",
      "school_6_10",
    );
    expect(screen.getByTestId("nutrition-age-preview")).toHaveTextContent(
      "Kai Montgomery-Anastasia",
    );
    expect(screen.getByTestId("nutrition-today-meal")).toBeTruthy();
  });

  it("keeps exclusive-feeding guidance for 0–6 months instead of a blank meal", () => {
    render(
      <NutritionHubParentContent
        childAgeMonths={3}
        childName="Aria"
        isFreeJourneyPeriod={false}
        isPremium
      />,
    );
    expect(screen.getByTestId("nutrition-hub-parent-content")).toHaveAttribute(
      "data-nutrition-band",
      "infant_0_6",
    );
    expect(screen.getByTestId("nutrition-preview-guidance")).toHaveTextContent(
      /breast/i,
    );
    expect(screen.queryByTestId("nutrition-today-meal")).toBeNull();
  });
});
