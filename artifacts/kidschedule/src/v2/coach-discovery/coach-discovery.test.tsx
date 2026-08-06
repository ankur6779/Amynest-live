import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { v2BooleanFlagEnvKey } from "@/lib/feature-flags";
import {
  clearGuestSession,
  clearSoftSaveForTests,
  ensureGuestSession,
  setGuestAgeBand,
  setGuestWorry,
  tryResolveV2PostAuthPath,
} from "@/v2/guest";
import { peekPostAuthReturnPath } from "@/v2/guest/soft-save";
import TodayPage from "@/v2/today/TodayPage";
import {
  clearCoachDiscoveryForTests,
  consumeCoachDiscoverGoal,
  peekCoachDiscoverGoal,
  readPreparedCoachPlan,
} from "./prepared-plan";
import CoachDiscoveryPage from "./CoachDiscoveryPage";

const locationRef = { current: "/today" };
const setLocation = vi.fn((path: string) => {
  locationRef.current = path;
});

const authState = {
  isSignedIn: false as boolean,
  userId: null as string | null,
};

const coachCheckInState = {
  primarySession: null as { sessionId: string } | null,
};

const coachJourneyState = {
  completedGoalIds: [] as string[],
};

vi.mock("wouter", async () => {
  const actual = await vi.importActual<typeof import("wouter")>("wouter");
  return {
    ...actual,
    useLocation: () => [locationRef.current, setLocation],
    Redirect: ({ to }: { to: string }) => (
      <div data-testid="redirect" data-to={to} />
    ),
    Link: ({
      href,
      children,
      ...rest
    }: {
      href: string;
      children?: React.ReactNode;
    }) => (
      <a href={href} {...rest}>
        {children}
      </a>
    ),
  };
});

vi.mock("@/lib/firebase-auth-hooks", () => ({
  useAuth: () => ({
    isSignedIn: authState.isSignedIn,
    isLoaded: true,
    authStatus: authState.isSignedIn ? "authenticated" : "unauthenticated",
    userId: authState.userId,
  }),
  useUser: () => ({
    user: authState.isSignedIn
      ? { uid: authState.userId, isAnonymous: false }
      : null,
  }),
}));

vi.mock("@/hooks/use-amy-coach-check-in", () => ({
  useAmyCoachCheckIn: () => ({
    primarySession: coachCheckInState.primarySession,
    loading: false,
  }),
}));

vi.mock("@/hooks/use-coach-journey", () => ({
  useCoachJourney: () => ({
    completedGoalIds: coachJourneyState.completedGoalIds,
    isLoading: false,
  }),
}));

vi.mock("@/pages/coach-understanding-screen", () => ({
  CoachUnderstandingScreen: ({
    onGenerate,
    onBack,
    goalTitle,
  }: {
    onGenerate: () => void;
    onBack: () => void;
    goalTitle: string;
  }) => (
    <div>
      <p>{goalTitle}</p>
      <button type="button" data-testid="coach-generate-plan" onClick={onGenerate}>
        Generate
      </button>
      <button type="button" onClick={onBack}>
        Back
      </button>
    </div>
  ),
  CoachGeneratingScreen: ({ userMessage }: { userMessage?: string }) => (
    <div data-testid="mock-coach-generating">{userMessage}</div>
  ),
  COACH_LOADING_MESSAGES: [],
}));

function enableGuestToday() {
  vi.stubEnv(v2BooleanFlagEnvKey("today_v2"), "1");
  vi.stubEnv(v2BooleanFlagEnvKey("guest_mode_v2"), "1");
}

describe("Amy Coach discovery journey", () => {
  beforeEach(() => {
    locationRef.current = "/today";
    setLocation.mockClear();
    authState.isSignedIn = false;
    authState.userId = null;
    coachCheckInState.primarySession = null;
    coachJourneyState.completedGoalIds = [];
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearGuestSession();
    clearSoftSaveForTests();
    clearCoachDiscoveryForTests();
  });

  it("shows earned Coach card for behavior worry — not for speech", () => {
    enableGuestToday();
    ensureGuestSession();
    setGuestAgeBand("preschool_3_5");
    setGuestWorry("speech_talking");
    const { unmount } = render(<TodayPage />);
    expect(screen.queryByTestId("v2-today-coach")).toBeNull();
    unmount();

    setGuestWorry("behavior");
    render(<TodayPage />);
    expect(screen.getByTestId("v2-today-coach")).toBeInTheDocument();
    expect(screen.getByTestId("v2-today-coach-cta")).toHaveAttribute(
      "href",
      "/today/coach-plan",
    );
    expect(screen.getByTestId("v2-today-coach-cta")).toHaveTextContent(
      "Continue with Amy",
    );
    // Speech mission stays filled primary; Coach whisper is not Bloom
    const mission = screen.getByTestId("v2-today-mission");
    expect(within(mission).getByTestId("v2-today-mission-start").className).toMatch(
      /(?:^|\s)bg-primary(?:\s|\/90|$)/,
    );
    expect(screen.getByTestId("v2-today-coach-cta").className).not.toMatch(
      /(?:^|\s)bg-primary(?:\s|\/90|$)/,
    );
  });

  it("confirm → ready → Continue soft-saves Coach path (no wizard)", async () => {
    enableGuestToday();
    ensureGuestSession();
    setGuestAgeBand("preschool_3_5");
    setGuestWorry("behavior");
    const user = userEvent.setup();
    render(<CoachDiscoveryPage />);

    expect(screen.getByTestId("v2-coach-discovery-confirm")).toBeInTheDocument();
    expect(screen.queryByText(/Long-term/i)).toBeNull();
    await user.click(screen.getByTestId("v2-coach-discovery-confirm-cta"));

    expect(screen.getByTestId("v2-coach-discovery-ready")).toBeInTheDocument();
    expect(screen.queryByTestId("v2-coach-discovery-understanding")).toBeNull();
    expect(screen.queryByTestId("v2-coach-discovery-preparing")).toBeNull();
    expect(screen.queryByTestId("coach-generate-plan")).toBeNull();
    expect(screen.queryByText(/Generate My First Win/i)).toBeNull();

    expect(screen.getByTestId("v2-coach-discovery-ready")).toHaveTextContent(
      /already understands/i,
    );
    expect(screen.getByTestId("v2-coach-discovery-ready")).toHaveTextContent(
      /care is taking shape/i,
    );
    expect(screen.queryByText(/Your parenting plan is ready/i)).toBeNull();
    expect(screen.queryByText(/Create your account to save progress/i)).toBeNull();
    expect(screen.queryByText(/\bpath\b/i)).toBeNull();
    expect(screen.queryByText(/generate|configure|quietly thinking|see what amy sees/i)).toBeNull();
    expect(screen.getByText(/Save this place when you're ready/i)).toBeInTheDocument();
    expect(screen.getByTestId("v2-coach-discovery-continue")).toHaveTextContent(
      /Stay with Amy/i,
    );

    expect(readPreparedCoachPlan()?.goalId).toBe("toddler-tantrums");
    await user.click(screen.getByTestId("v2-coach-discovery-continue"));
    expect(setLocation).toHaveBeenCalledWith("/sign-up");
    expect(peekPostAuthReturnPath()).toBe("/amy-coach");
    expect(peekCoachDiscoverGoal()).toBe("toddler-tantrums");
    expect(tryResolveV2PostAuthPath()).toBe("/amy-coach");
    expect(consumeCoachDiscoverGoal()).toBe("toddler-tantrums");
  });

  it("Not now returns to Today and keeps path resumable", async () => {
    enableGuestToday();
    ensureGuestSession();
    setGuestAgeBand("child_6_8");
    setGuestWorry("sleep");
    const user = userEvent.setup();
    render(<CoachDiscoveryPage />);

    await user.click(screen.getByTestId("v2-coach-discovery-confirm-cta"));
    expect(screen.getByTestId("v2-coach-discovery-ready")).toBeInTheDocument();

    await user.click(screen.getByTestId("v2-coach-discovery-not-now"));
    expect(setLocation).toHaveBeenCalledWith("/today");
    expect(readPreparedCoachPlan()?.gateDismissed).toBe(true);

    render(<TodayPage />);
    expect(screen.getByTestId("v2-today-coach")).toHaveAttribute(
      "data-resumable",
      "true",
    );
    expect(screen.getByTestId("v2-today-coach-cta")).toHaveTextContent(
      "Continue with Amy",
    );
  });

  it("signed-in: Begin / Continue with Amy / When you're ready", () => {
    enableGuestToday();
    ensureGuestSession();
    setGuestAgeBand("preschool_3_5");
    setGuestWorry("behavior");
    authState.isSignedIn = true;
    authState.userId = "user-1";

    const { unmount } = render(<TodayPage />);
    expect(screen.getByTestId("v2-today-coach-cta")).toHaveTextContent(
      "Begin with Amy",
    );
    expect(screen.getByTestId("v2-today-coach-cta")).toHaveAttribute(
      "href",
      "/amy-coach",
    );
    unmount();

    coachCheckInState.primarySession = { sessionId: "sess-9" };
    const { unmount: u2 } = render(<TodayPage />);
    expect(screen.getByTestId("v2-today-coach-cta")).toHaveTextContent(
      "Continue with Amy",
    );
    expect(screen.getByTestId("v2-today-coach-cta")).toHaveAttribute(
      "href",
      "/amy-coach?resume=sess-9",
    );
    u2();

    coachCheckInState.primarySession = null;
    coachJourneyState.completedGoalIds = ["toddler-tantrums"];
    render(<TodayPage />);
    expect(screen.getByTestId("v2-today-coach-cta")).toHaveTextContent(
      "When you're ready",
    );
  });
});
