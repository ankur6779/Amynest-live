import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { v2BooleanFlagEnvKey } from "@/lib/feature-flags";
import {
  clearGuestSession,
  ensureGuestSession,
  setGuestAgeBand,
  setGuestChildName,
  setGuestWorry,
  getGuestSession,
  GuestAccountRequiredSheetHost,
  resetGuestAccountRequiredSheetForTests,
} from "@/v2/guest";
import { clearMissionCompletion } from "./mission/completion";
import TodayPage, { TODAY_SECTION_IDS } from "./TodayPage";
import MissionPlayPage from "./mission/MissionPlayPage";

vi.mock("wouter", async () => {
  const actual = await vi.importActual<typeof import("wouter")>("wouter");
  return {
    ...actual,
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
    isSignedIn: false,
    isLoaded: true,
    authStatus: "unauthenticated",
    userId: null,
  }),
  useUser: () => ({ user: null }),
}));

vi.mock("@/hooks/use-amy-coach-check-in", () => ({
  useAmyCoachCheckIn: () => ({
    primarySession: null,
    loading: false,
  }),
}));

vi.mock("@/hooks/use-coach-journey", () => ({
  useCoachJourney: () => ({
    completedGoalIds: [],
    isLoading: false,
  }),
}));

function enableTodayAndGuest() {
  vi.stubEnv(v2BooleanFlagEnvKey("today_v2"), "1");
  vi.stubEnv(v2BooleanFlagEnvKey("guest_mode_v2"), "1");
}

describe("Today shell regression + Sprint 3A", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearGuestSession();
    clearMissionCompletion();
    resetGuestAccountRequiredSheetForTests();
  });

  it("golden: flags OFF → /today redirects to /dashboard", () => {
    render(<TodayPage />);
    expect(screen.getByTestId("redirect")).toHaveAttribute("data-to", "/dashboard");
  });

  it("renders greeting, message, one mission, Ask Amy entry from guest", () => {
    enableTodayAndGuest();
    ensureGuestSession();
    setGuestAgeBand("preschool_3_5");
    setGuestChildName("Aarav");
    setGuestWorry("speech_talking");

    render(<TodayPage />);

    expect(screen.getByTestId("v2-today-shell")).toHaveAttribute(
      "id",
      TODAY_SECTION_IDS.shell,
    );
    expect(screen.getByTestId("v2-today-greeting")).toHaveTextContent(
      "Today for Aarav · Speech & talking",
    );
    expect(screen.getByTestId("v2-today-greeting-subline")).toHaveTextContent(
      /3–5 years/i,
    );
    expect(screen.getByTestId("v2-today-message")).toHaveTextContent(/Aarav/);
    expect(document.getElementById(TODAY_SECTION_IDS.message)).toBeTruthy();
    // Focus chip deleted — worry lives in hero
    expect(screen.queryByTestId("v2-today-focus-banner")).toBeNull();

    const mission = screen.getByTestId("v2-today-mission");
    expect(mission).toHaveAttribute("data-mission-domain", "speech");
    expect(mission).toHaveAttribute("data-completed", "false");
    // A9.4: flag OFF ⇒ legacy hero source (no visual redesign)
    expect(mission).toHaveAttribute("data-hero-source", "legacy");
    expect(mission).toHaveAttribute(
      "data-mission-id",
      "speech_preschool_name_it",
    );
    expect(screen.getByTestId("v2-today-mission-start")).toHaveAttribute(
      "href",
      "/today/mission",
    );
    expect(screen.queryByText("Right now")).toBeNull();
    expect(screen.getByTestId("v2-today-mission-meta")).not.toHaveTextContent(
      /easy|hard|medium/i,
    );

    // Exactly one start CTA (one mission)
    expect(screen.getAllByTestId("v2-today-mission-start")).toHaveLength(1);

    // Guest Ask Amy navigates to experience — whisper, never Sign-in wall
    const askAmy = screen.getByTestId("v2-today-ask-amy-entry");
    expect(askAmy.closest("a") ?? askAmy).toHaveAttribute("href", "/ask-amy");
    expect(askAmy).toHaveTextContent(/Ask about today's speech practice/i);
    expect(screen.queryByText(/Open Ask Amy/i)).toBeNull();
    expect(screen.queryByTestId("v2-today-ask-amy-support")).toBeNull();
    expect(screen.queryByText(/Quick help/i)).toBeNull();
    expect(screen.queryByTestId("v2-today-mission-focus-chip")).toBeNull();
    expect(screen.queryByTestId("v2-today-mission-why")).toBeNull();
    expect(screen.queryByText(/placeholder/i)).toBeNull();
  });

  it("Law of Three: Mission CTA primary · Coach/Ask Amy/Premium whisper", () => {
    enableTodayAndGuest();
    vi.stubEnv(v2BooleanFlagEnvKey("premium_v2"), "1");
    ensureGuestSession();
    setGuestWorry("sleep");
    render(<TodayPage />);

    const shell = screen.getByTestId("v2-today-shell");
    const mission = screen.getByTestId("v2-today-mission");
    const premium = screen.getByTestId("v2-today-premium");
    const askAmy = screen.getByTestId("v2-today-ask-amy");
    const coach = screen.getByTestId("v2-today-coach");
    expect(
      mission.compareDocumentPosition(coach) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      coach.compareDocumentPosition(askAmy) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      askAmy.compareDocumentPosition(premium) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const missionStart = within(mission).getByTestId("v2-today-mission-start");
    expect(missionStart).toHaveAttribute("data-v2-law", "primary");
    expect(missionStart.className).toMatch(/bg-primary/);
    expect(mission.className).toMatch(/--v2-fill-soft-plate/);
    expect(mission.className).not.toMatch(/ring-/);
    expect(screen.getByTestId("v2-today-greeting")).toHaveAttribute(
      "data-v2-law",
      "hero",
    );
    expect(screen.getByTestId("v2-today-message")).toHaveAttribute(
      "data-v2-law",
      "support",
    );
    expect(coach).toHaveAttribute("data-v2-law", "recede");
    expect(coach.className).toMatch(/opacity-60/);
    expect(coach.className).not.toMatch(/bg-foreground\/\[0\.08\]/);
    expect(askAmy).toHaveAttribute("data-v2-law", "recede");
    expect(premium).toHaveAttribute("data-v2-law", "recede");
    expect(screen.getByTestId("v2-today-ask-amy-entry").className).not.toMatch(
      /bg-primary/,
    );
    expect(screen.getByTestId("v2-today-premium-entry")).toHaveTextContent(
      /Save progress & continue/i,
    );
    expect(screen.queryByText("View Premium")).toBeNull();
    expect(screen.queryByText(/Keep going with Amy/i)).toBeNull();
    expect(screen.queryByText(/Amy Coach/i)).toBeNull();
    expect(shell.querySelector("#v2-today-ask-amy")).toBeTruthy();
  });

  it("guest Ask Amy CTA navigates to /ask-amy (experience before auth)", () => {
    enableTodayAndGuest();
    ensureGuestSession();
    setGuestWorry("sleep");
    render(
      <>
        <TodayPage />
        <GuestAccountRequiredSheetHost />
      </>,
    );

    const entry = screen.getByTestId("v2-today-ask-amy-entry");
    expect(entry.closest("a") ?? entry).toHaveAttribute("href", "/ask-amy");
    expect(screen.queryByTestId("v2-guest-account-sheet")).toBeNull();
  });

  it("accessibility: landmark, headings, mission start label", () => {
    enableTodayAndGuest();
    ensureGuestSession();
    setGuestChildName("Riya");
    render(<TodayPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Today's step for Riya|Today for Riya|Here's today's step/,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: /mission|name three/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("v2-today-mission-start").getAttribute("aria-label"),
    ).toMatch(/start mission/i);
  });
});

describe("Mission completion UI + back navigation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearGuestSession();
    clearMissionCompletion();
    resetGuestAccountRequiredSheetForTests();
  });

  it("play → complete → success → back to Today; refresh keeps complete", async () => {
    enableTodayAndGuest();
    ensureGuestSession();
    setGuestAgeBand("preschool_3_5");
    setGuestChildName("Aarav");
    setGuestWorry("speech_talking");
    const guestId = getGuestSession()!.guestId;

    const user = userEvent.setup();
    const { unmount } = render(
      <>
        <MissionPlayPage />
        <GuestAccountRequiredSheetHost />
      </>,
    );

    expect(screen.getByTestId("v2-today-mission-play")).toBeInTheDocument();
    expect(screen.getByTestId("v2-today-mission-back")).toHaveAttribute(
      "href",
      "/today",
    );
    expect(screen.getByTestId("v2-today-mission-back")).toHaveTextContent(
      /Back to today/i,
    );
    expect(
      screen.getByTestId("v2-today-mission-steps").querySelectorAll("p").length,
    ).toBeGreaterThan(0);

    expect(screen.getByTestId("v2-today-mission-mark-complete")).toHaveTextContent(
      /We're still together/i,
    );
    expect(screen.queryByText("Speech")).toBeNull();
    expect(screen.queryByText(/Mark complete/i)).toBeNull();
    expect(screen.queryByText(/We're done/i)).toBeNull();
    await user.click(screen.getByTestId("v2-today-mission-mark-complete"));
    expect(await screen.findByTestId("v2-today-mission-success")).toBeInTheDocument();
    expect(screen.getByTestId("v2-today-mission-success-panel")).toBeInTheDocument();
    expect(screen.getByTestId("v2-today-mission-success-presence")).toBeInTheDocument();
    expect(screen.queryByTestId("v2-today-mission-success-icon")).toBeNull();
    expect(screen.getByTestId("v2-today-mission-back-to-today")).toHaveAttribute(
      "href",
      "/today",
    );
    expect(screen.getByTestId("v2-today-mission-back-to-today")).toHaveAttribute(
      "data-v2-law",
      "primary",
    );
    // Ask Amy deleted from Practice close — Help stays elsewhere
    expect(screen.queryByTestId("v2-today-mission-ask-amy")).toBeNull();
    expect(
      screen.getByRole("heading", { name: /you're still with/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/always yours/i)).toBeInTheDocument();
    expect(screen.queryByText(/streak|reward|confetti|points/i)).toBeNull();
    expect(screen.queryByText(/that was a real step/i)).toBeNull();
    expect(screen.queryByText(/what amy remembers/i)).toBeNull();

    unmount();

    // Refresh Today — completed badge
    render(<TodayPage />);
    expect(screen.getByTestId("v2-today-mission")).toHaveAttribute(
      "data-completed",
      "true",
    );
    expect(screen.getByTestId("v2-today-mission-complete-badge")).toBeInTheDocument();
    expect(screen.queryByTestId("v2-today-mission-start")).toBeNull();
    expect(guestId).toBeTruthy();
  });

  it("mission play redirects when today_v2 off", () => {
    render(<MissionPlayPage />);
    expect(screen.getByTestId("redirect")).toHaveAttribute("data-to", "/dashboard");
  });
});
