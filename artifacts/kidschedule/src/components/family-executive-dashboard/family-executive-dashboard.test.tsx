import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FamilyExecutiveDashboard } from "./family-executive-dashboard";

const mockAction = {
  actionTarget: "routine",
  entityId: null,
  href: "/routines",
  fallbackTarget: "parent_hub",
};

const mockDashboard = {
  childName: "Ava",
  computedAt: new Date().toISOString(),
  healthScore: 72,
  healthTrend7d: 3,
  healthTrendLabel: "stable",
  narration: "Here's your family operating picture.",
  primaryAction: {
    id: "primary_0",
    title: "Rebuild bedtime routine",
    description: "Shorten the wind-down window",
    why: "Routine completion is 55% this week.",
    href: "/routines",
    surface: "routine",
    action: mockAction,
  },
  weeklyWins: ["Completed 3 lessons this week."],
  currentRisks: ["Routine consistency may slip."],
  goals: { goals: [], overallProgress: 0 },
  learningProgressPct: 68,
  routineConsistencyPct: 55,
  learningMetric: { label: "Learning", pct: 68, action: { ...mockAction, href: "/learn-with-amy", actionTarget: "learning_subject" } },
  routineMetric: { label: "Routine", pct: 55, action: mockAction },
  familyHealthAction: { ...mockAction, actionTarget: "family_health", href: "/parenting-hub" },
  amyRecommendation: {
    title: "Try a 5-minute reading streak",
    why: "Learning success is at 68% this week.",
    suggestedQuestion: "How can we improve reading?",
    action: { ...mockAction, href: "/assistant?q=reading", actionTarget: "amy_chat" },
  },
  activeCampaigns: [],
  timelineHighlights: [],
  suggestedQuestions: ["How are we doing?"],
  engineVersion: "1.0.0",
};

const navigateAction = vi.fn();

vi.mock("@/hooks/use-hub-dashboard", () => ({
  useHubDashboard: vi.fn(),
}));

vi.mock("@/hooks/use-action-navigation", () => ({
  useActionNavigation: () => ({ navigateAction }),
}));

vi.mock("@/hooks/use-auth-fetch", () => ({
  useAuthFetch: () => vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
}));

vi.mock("wouter", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  useLocation: () => ["/parenting-hub", vi.fn()],
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? _key,
  }),
}));

import { useHubDashboard } from "@/hooks/use-hub-dashboard";

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("FamilyExecutiveDashboard", () => {
  beforeEach(() => {
    navigateAction.mockClear();
    vi.mocked(useHubDashboard).mockReturnValue({
      data: mockDashboard,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useHubDashboard>);
  });

  it("renders health score and primary action on tile", () => {
    wrap(<FamilyExecutiveDashboard childId={1} childName="Ava" />);
    expect(screen.getByTestId("hub-executive-tile")).toBeTruthy();
    expect(screen.getByText("72")).toBeTruthy();
    expect(screen.getByText("Rebuild bedtime routine")).toBeTruthy();
  });

  it("navigates on primary action in modal", () => {
    wrap(<FamilyExecutiveDashboard childId={1} childName="Ava" />);
    fireEvent.click(screen.getByTestId("hub-executive-tile"));
    fireEvent.click(screen.getByText("Do this now"));
    expect(navigateAction).toHaveBeenCalled();
  });
});
