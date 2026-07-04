import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DailyCheckInCard } from "@/components/retention/daily-check-in-card";
import type { RetentionStatus } from "@/lib/retention/retention-api";

function mockRetentionStatus(overrides?: Partial<RetentionStatus>): RetentionStatus {
  return {
    ok: true,
    state: {
      currentStreak: 3,
      longestStreak: 5,
      totalStars: 10,
      totalCoins: 20,
      parentXp: 45,
      dailyGoals: { routine: false, story: true, activity: false, speech: false },
      achievements: [],
      inactiveDays: 0,
      winbackLevel: 0,
    },
    shieldAvailable: true,
    canUseShield: false,
    parentingScore: 72,
    goalsComplete: 1,
    goalsTotal: 4,
    checkedInToday: true,
    resumeItems: [],
    preferences: {},
    weeklySummary: null,
    trialPremiumFeature: null,
    ...overrides,
  };
}

const useRetentionMock = vi.fn();

vi.mock("@/hooks/use-retention", () => ({
  useRetention: () => useRetentionMock(),
}));

vi.mock("@/lib/activation-resume", () => ({
  readActivationResume: () => null,
}));

vi.mock("@/lib/retention/retention-analytics", () => ({
  trackRetentionEvent: vi.fn(),
}));

vi.mock("wouter", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => true,
  motion: {
    circle: (props: React.SVGProps<SVGCircleElement>) => <circle {...props} />,
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock("@/components/study-engagement", () => ({
  ConfettiBurst: () => null,
}));

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("DailyCheckInCard fail-safe rendering", () => {
  beforeEach(() => {
    useRetentionMock.mockReset();
  });

  it("renders when retention status is valid", () => {
    useRetentionMock.mockReturnValue({
      data: mockRetentionStatus(),
      isLoading: false,
      isError: false,
      error: null,
      checkIn: vi.fn(),
      isCheckingIn: false,
    });

    wrap(
      <DailyCheckInCard
        hasTodayRoutine
        onGenerateRoutine={vi.fn()}
      />,
    );

    expect(screen.getByTestId("daily-check-in-card")).toBeTruthy();
  });

  it("returns null for missing state (partial payload)", () => {
    useRetentionMock.mockReturnValue({
      data: { ok: true },
      isLoading: false,
      isError: false,
      error: null,
      checkIn: vi.fn(),
      isCheckingIn: false,
    });

    const { container } = wrap(
      <DailyCheckInCard
        hasTodayRoutine
        onGenerateRoutine={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("daily-check-in-card")).toBeNull();
  });

  it("returns null for null state", () => {
    useRetentionMock.mockReturnValue({
      data: { ok: true, state: null },
      isLoading: false,
      isError: false,
      error: null,
      checkIn: vi.fn(),
      isCheckingIn: false,
    });

    const { container } = wrap(
      <DailyCheckInCard
        hasTodayRoutine
        onGenerateRoutine={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("returns null when API failed (isError)", () => {
    useRetentionMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("retention status 500"),
      checkIn: vi.fn(),
      isCheckingIn: false,
    });

    const { container } = wrap(
      <DailyCheckInCard
        hasTodayRoutine
        onGenerateRoutine={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("returns null while loading without valid data", () => {
    useRetentionMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      checkIn: vi.fn(),
      isCheckingIn: false,
    });

    const { container } = wrap(
      <DailyCheckInCard
        hasTodayRoutine
        onGenerateRoutine={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("returns null for empty retention object", () => {
    useRetentionMock.mockReturnValue({
      data: {},
      isLoading: false,
      isError: false,
      error: null,
      checkIn: vi.fn(),
      isCheckingIn: false,
    });

    const { container } = wrap(
      <DailyCheckInCard
        hasTodayRoutine
        onGenerateRoutine={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("does not throw for malformed cache-shaped payload", () => {
    useRetentionMock.mockReturnValue({
      data: { ok: true, state: { currentStreak: 1 } },
      isLoading: false,
      isError: false,
      error: null,
      checkIn: vi.fn(),
      isCheckingIn: false,
    });

    expect(() =>
      wrap(
        <DailyCheckInCard
          hasTodayRoutine
          onGenerateRoutine={vi.fn()}
        />,
      ),
    ).not.toThrow();
    expect(screen.queryByTestId("daily-check-in-card")).toBeNull();
  });
});
