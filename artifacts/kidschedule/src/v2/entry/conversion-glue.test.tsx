import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { v2BooleanFlagEnvKey } from "@/lib/feature-flags";
import {
  clearGuestSession,
  clearSoftSaveForTests,
  ensureGuestSession,
  resolveV2PostAuthPath,
  setGuestAgeBand,
  setGuestWorry,
  setPostAuthReturnPath,
  tryResolveV2PostAuthPath,
  V2_PREMIUM_ACCOUNT_REQUIRED_MESSAGE,
} from "@/v2/guest";
import FrontDoorPage from "@/v2/front-door/FrontDoorPage";
import { FrontDoorState } from "@/v2/front-door/state-machine";
import TodayPage from "@/v2/today/TodayPage";
import MissionPlayPage from "@/v2/today/mission/MissionPlayPage";
import { clearMissionCompletion } from "@/v2/today/mission/completion";
import {
  isGuestFrontDoorComplete,
  isGuestV2TodayAccessAllowed,
  shouldLandGuestOnToday,
  shouldShowGuestFrontDoor,
} from "./guest-access";

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
      onClick,
      ...rest
    }: {
      href: string;
      children?: React.ReactNode;
      onClick?: () => void;
    }) => (
      <a href={href} onClick={onClick} {...rest}>
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
  useClerk: () => ({ signOut: vi.fn() }),
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

/** Avoid AnimatePresence exit races on Front Door walkthrough. */
vi.mock("@/lib/reduced-motion", () => ({
  useReducedMotion: () => true,
}));

function enableGuestToday() {
  vi.stubEnv(v2BooleanFlagEnvKey("new_front_door"), "1");
  vi.stubEnv(v2BooleanFlagEnvKey("guest_mode_v2"), "1");
  vi.stubEnv(v2BooleanFlagEnvKey("today_v2"), "1");
}

describe("Phase 4B conversion glue", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearGuestSession();
    clearSoftSaveForTests();
    clearMissionCompletion();
  });

  it("guest access helpers — Today only when flags + guest mode", () => {
    expect(isGuestV2TodayAccessAllowed()).toBe(false);
    enableGuestToday();
    expect(isGuestV2TodayAccessAllowed()).toBe(true);
  });

  it("reopen — incomplete guest shows Front Door; complete lands Today", () => {
    enableGuestToday();
    ensureGuestSession();
    expect(shouldShowGuestFrontDoor()).toBe(true);
    expect(shouldLandGuestOnToday()).toBe(false);

    setGuestWorry("speech_talking");
    expect(isGuestFrontDoorComplete()).toBe(true);
    expect(shouldLandGuestOnToday()).toBe(true);
    expect(shouldShowGuestFrontDoor()).toBe(false);
  });

  it("Front Door COMPLETE → Continue to Today (no sprint copy)", async () => {
    enableGuestToday();
    const user = userEvent.setup();
    const { container } = render(<FrontDoorPage />);

    await user.click(await screen.findByRole("button", { name: /i'm ready/i }));
    await user.click(await screen.findByRole("button", { name: /3–5 years/i }));
    await user.click(await screen.findByRole("button", { name: /skip for now/i }));
    await user.click(
      await screen.findByRole("button", { name: /speech & talking/i }),
    );

    expect(
      await screen.findByTestId("v2-front-door-continue-today"),
    ).toHaveTextContent("Continue to Today");
    expect(container.querySelector("[data-front-door-state]")).toHaveAttribute(
      "data-front-door-state",
      FrontDoorState.COMPLETE,
    );
    expect(screen.queryByText(/sprint 1 foundation/i)).toBeNull();
    expect(screen.queryByText(/later release/i)).toBeNull();
  });

  it("reopen COMPLETE deep-link /front-door → redirect Today", () => {
    enableGuestToday();
    ensureGuestSession();
    setGuestAgeBand("preschool_3_5");
    setGuestWorry("speech_talking");
    render(<FrontDoorPage />);
    expect(screen.getByTestId("redirect")).toHaveAttribute("data-to", "/today");
  });

  it("Guest → Today renders without account", () => {
    enableGuestToday();
    ensureGuestSession();
    setGuestWorry("speech_talking");
    render(<TodayPage />);
    expect(screen.getByTestId("v2-today-shell")).toBeInTheDocument();
  });

  it("Guest → Mission renders without account", () => {
    enableGuestToday();
    ensureGuestSession();
    setGuestWorry("speech_talking");
    render(<MissionPlayPage />);
    expect(screen.getByTestId("v2-today-mission-play")).toBeInTheDocument();
  });

  it("sole Premium entry on Today when premium_v2 on", () => {
    enableGuestToday();
    vi.stubEnv(v2BooleanFlagEnvKey("premium_v2"), "1");
    ensureGuestSession();
    setGuestWorry("speech_talking");
    render(<TodayPage />);
    expect(screen.getByTestId("v2-today-premium-entry")).toHaveAttribute(
      "href",
      "/premium",
    );
    expect(screen.getByTestId("v2-today-premium-entry")).toHaveTextContent(
      /Save progress & continue/i,
    );
    expect(screen.queryByText("View Premium")).toBeNull();
    expect(screen.queryByText(/Continue with Premium/i)).toBeNull();
  });

  it("soft-save — signup continue resolves to Today", () => {
    enableGuestToday();
    ensureGuestSession();
    setGuestAgeBand("preschool_3_5");
    setGuestWorry("speech_talking");
    expect(tryResolveV2PostAuthPath()).toBe("/today");
  });

  it("Guest → Premium return path after auth", () => {
    enableGuestToday();
    ensureGuestSession();
    setGuestWorry("speech_talking");
    setPostAuthReturnPath("/premium");
    expect(resolveV2PostAuthPath("/")).toBe("/premium");
  });

  it("account-required message is continuity / care — never billing", () => {
    expect(V2_PREMIUM_ACCOUNT_REQUIRED_MESSAGE.toLowerCase()).toMatch(
      /save your progress|continue care/,
    );
    expect(V2_PREMIUM_ACCOUNT_REQUIRED_MESSAGE.toLowerCase()).not.toMatch(
      /subscription|billing|checkout/,
    );
  });
});
