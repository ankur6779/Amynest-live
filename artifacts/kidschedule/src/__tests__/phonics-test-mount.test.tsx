import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { PhonicsTest } from "@/components/phonics-test";

vi.mock("@/hooks/use-amy-voice", () => ({
  useAmyVoice: () => ({
    speak: vi.fn(),
    pause: vi.fn(),
    speaking: false,
    loading: false,
    error: null,
  }),
}));

vi.mock("@/hooks/use-auth-fetch", () => ({
  useAuthFetch: () =>
    vi.fn(async (url: string) => {
      if (url.includes("availability")) {
        return {
          ok: true,
          json: async () => ({
            eligible: true,
            ageGroup: "2_3y",
            daily: { available: true, lastCompletedAt: null, nextAvailableAt: null, lastScore: null },
            weekly: { available: true, lastCompletedAt: null, nextAvailableAt: null, lastScore: null },
          }),
        };
      }
      if (url.includes("config")) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            eligible: true,
            hasContent: true,
            daily: { questionCount: 5, available: true, nextAvailableAt: null },
            weekly: { questionCount: 10, available: true, nextAvailableAt: null },
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    }),
}));

describe("PhonicsTest mount", () => {
  it("renders embedded daily test without throwing", () => {
    expect(() =>
      render(
        <PhonicsTest
          childId={1}
          childName="Test"
          totalAgeMonths={30}
          testFilter="daily"
          embeddedTitle="Quick Check"
        />,
      ),
    ).not.toThrow();
  });
});
