import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CoachUnderstandingScreen } from "@/pages/coach-understanding-screen";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue ?? key,
  }),
}));

const understanding = {
  bullets: ["Your child is under 2 years old"],
  closingLine: "We'll start with small actions.",
  focusAreas: ["Calmer transitions"],
};

describe("CoachUnderstandingScreen age gate", () => {
  it("shows generate CTA when child is coach-eligible", () => {
    render(
      <CoachUnderstandingScreen
        goalTitle="Balance screen time"
        understanding={understanding}
        onBack={() => {}}
        onGenerate={() => {}}
        canGenerate
      />,
    );
    expect(screen.getByTestId("coach-generate-plan")).toBeTruthy();
    expect(screen.queryByTestId("coach-preview-age-gate")).toBeNull();
  });

  it("hides generate CTA and shows age gate for preview-only infants", () => {
    render(
      <CoachUnderstandingScreen
        goalTitle="Balance screen time"
        understanding={understanding}
        onBack={() => {}}
        onGenerate={() => {}}
        canGenerate={false}
      />,
    );
    expect(screen.queryByTestId("coach-generate-plan")).toBeNull();
    expect(screen.getByTestId("coach-preview-age-gate")).toBeTruthy();
    expect(screen.getByText("Available from age 2+")).toBeTruthy();
  });
});
