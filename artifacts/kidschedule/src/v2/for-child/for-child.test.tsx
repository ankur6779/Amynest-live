import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { v2BooleanFlagEnvKey } from "@/lib/feature-flags";
import {
  clearGuestSession,
  ensureGuestSession,
  GuestAccountRequiredSheetHost,
  resetGuestAccountRequiredSheetForTests,
  setGuestChildName,
  setGuestWorry,
} from "@/v2/guest";
import ForChildPage from "./ForChildPage";

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
    useLocation: () => ["/for-child", vi.fn()],
  };
});

const authState = {
  isSignedIn: false as boolean,
  user: null as { id: string; isAnonymous?: boolean } | null,
};

vi.mock("@/lib/firebase-auth-hooks", () => ({
  useAuth: () => ({
    isSignedIn: authState.isSignedIn,
    isLoaded: true,
    authStatus: authState.isSignedIn ? "authenticated" : "unauthenticated",
    userId: authState.user?.id ?? null,
  }),
  useUser: () => ({ user: authState.user }),
}));

vi.mock("@/lib/anonymous-auth", () => ({
  isAnonymousUser: (user: { isAnonymous?: boolean } | null | undefined) =>
    Boolean(user?.isAnonymous),
}));

describe("Child's Room (For Child)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearGuestSession();
    resetGuestAccountRequiredSheetForTests();
    authState.isSignedIn = false;
    authState.user = null;
  });

  it("golden: flags OFF → /for-child redirects to /parenting-hub", () => {
    render(<ForChildPage />);
    expect(screen.getByTestId("redirect")).toHaveAttribute(
      "data-to",
      "/parenting-hub",
    );
  });

  it("expectant room — hope + living discovery; never empty / locked", async () => {
    vi.stubEnv(v2BooleanFlagEnvKey("for_child_v2"), "1");
    vi.stubEnv(v2BooleanFlagEnvKey("guest_mode_v2"), "1");
    ensureGuestSession();
    setGuestChildName("Aria");
    setGuestWorry("speech_talking");
    const user = userEvent.setup();
    render(
      <>
        <ForChildPage />
        <GuestAccountRequiredSheetHost />
      </>,
    );

    expect(screen.getByTestId("v2-for-child-shell")).toHaveAttribute(
      "data-guest",
      "true",
    );
    expect(screen.getByText(/A place waiting/i)).toBeInTheDocument();
    expect(screen.getByTestId("v2-for-child-heading")).toHaveTextContent(
      /For Aria/i,
    );
    expect(screen.getByTestId("v2-for-child-hope")).toHaveTextContent(
      /already growing/i,
    );
    expect(screen.getByTestId("v2-for-child-hope")).toHaveTextContent(
      /quietly preparing/i,
    );
    expect(screen.getByTestId("v2-for-child-hope").textContent?.toLowerCase()).not.toMatch(
      /empty|nothing here|coming soon|getting started|locked|no activities/,
    );
    expect(screen.getByText(/Small discovery/i)).toBeInTheDocument();
    expect(screen.getByTestId("v2-for-child-living")).toBeInTheDocument();
    expect(screen.getByTestId("v2-for-child-discover")).toHaveAttribute(
      "href",
      "/today/mission",
    );
    expect(screen.getByTestId("v2-for-child-discover")).toHaveTextContent(
      /See what's waiting for Aria/i,
    );
    expect(screen.queryByText(/Play, Learn, and Care/i)).toBeNull();
    expect(
      screen.queryByText(/placeholder|TODO|coming soon|nothing here|no activities/i),
    ).toBeNull();

    expect(screen.getByTestId("v2-for-child-guest-gate")).toBeInTheDocument();
    expect(screen.getByTestId("v2-for-child-save-cta")).toHaveTextContent(
      /Protect Aria's place/i,
    );
    expect(screen.getByTestId("v2-for-child-save-cta").className).not.toMatch(
      /bg-primary/,
    );

    await user.click(screen.getByTestId("v2-for-child-save-cta"));
    expect(screen.getByTestId("v2-guest-account-sheet")).toHaveAttribute(
      "data-sheet-intent",
      "for_child",
    );
    expect(screen.getByTestId("v2-guest-account-sheet-title")).toHaveTextContent(
      /For Aria/i,
    );
    expect(screen.getByTestId("v2-guest-account-sheet")).toHaveTextContent(
      /Protect this place/i,
    );
    expect(screen.getByTestId("v2-guest-account-sheet")).not.toHaveTextContent(
      /Play, Learn, and Care|coming soon|Create your account/i,
    );
  });

  it("signed-in still has a living discovery object", () => {
    vi.stubEnv(v2BooleanFlagEnvKey("for_child_v2"), "1");
    authState.isSignedIn = true;
    authState.user = { id: "u1", isAnonymous: false };
    ensureGuestSession();
    setGuestChildName("Riya");
    render(<ForChildPage />);

    expect(screen.getByTestId("v2-for-child-living")).toBeInTheDocument();
    expect(screen.getByTestId("v2-for-child-discover")).toHaveAttribute(
      "href",
      "/today/mission",
    );
    expect(screen.queryByTestId("v2-for-child-guest-gate")).toBeNull();
  });
});
