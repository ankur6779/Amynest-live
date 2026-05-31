import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { SpellingMastery } from "@/components/spelling-mastery";

vi.mock("@/hooks/use-amy-voice", () => ({
  useAmyVoice: () => ({
    pause: vi.fn(),
    speaking: false,
    loading: false,
    error: null,
  }),
}));

vi.mock("@/lib/amy-voice-controller", () => ({
  amyVoiceController: {
    playPreparedUrl: vi.fn(async () => ({ success: true })),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/use-auth-fetch", () => ({
  useAuthFetch: () =>
    vi.fn(async (url: string) => {
      if (url.includes("progress")) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            progress: {
              childId: 1,
              ageGroup: "2-4",
              totalCorrect: 0,
              totalAttempts: 0,
              totalStars: 0,
              currentLevel: 1,
              currentStreak: 0,
              bestStreak: 0,
              badges: [],
            },
          }),
        };
      }
      if (url.includes("leaderboard")) {
        return { ok: true, json: async () => ({ ok: true, leaderboard: [] }) };
      }
      return { ok: true, json: async () => ({ ok: true }) };
    }),
}));

describe("SpellingMastery mount", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders without throwing", () => {
    expect(() =>
      render(<SpellingMastery childId={1} childName="Amy" ageMonths={30} />),
    ).not.toThrow();
  });

  it("survives corrupt retention localStorage", () => {
    localStorage.setItem(
      "amynest:spelling:retention:1",
      JSON.stringify({ collection: null, weekly: null, achievements: null }),
    );
    expect(() =>
      render(<SpellingMastery childId={1} childName="Amy" ageMonths={30} />),
    ).not.toThrow();
  });
});
