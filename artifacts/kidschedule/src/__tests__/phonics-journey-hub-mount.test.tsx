import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { PhonicsJourneyHub } from "@/components/phonics-journey-hub";
import { getPhonicsLevel } from "@/lib/phonics-content";

vi.mock("@/hooks/use-phonics-curriculum", () => ({
  usePhonicsCurriculum: () => ({ data: null, loading: false, error: null }),
}));

const level = getPhonicsLevel(30)!;
const progress = { practiced: {}, mastered: {} };
const practiceItems = [
  {
    id: "a",
    symbol: "A",
    sound: "A says ah",
    phoneme: "ah",
    type: "letter" as const,
  },
];

describe("PhonicsJourneyHub mount", () => {
  it("renders without infinite update loop", () => {
    expect(() =>
      render(
        <PhonicsJourneyHub
          childId={1}
          childName="Test"
          totalAgeMonths={30}
          level={level}
          progress={progress}
          practiceItems={practiceItems}
        />,
      ),
    ).not.toThrow();
  });

  it("survives corrupt lastSession localStorage", () => {
    localStorage.setItem(
      "amynest:phonics-habit:1",
      JSON.stringify({
        lastSession: { date: "2026-06-01", pointsEarned: 5 },
      }),
    );
    expect(() =>
      render(
        <PhonicsJourneyHub
          childId={1}
          childName="Test"
          totalAgeMonths={30}
          level={level}
          progress={progress}
          practiceItems={practiceItems}
        />,
      ),
    ).not.toThrow();
  });
});
