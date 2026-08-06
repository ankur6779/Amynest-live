import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { v2BooleanFlagEnvKey } from "@/lib/feature-flags";
import {
  GuestAccountRequiredSheetHost,
  resetGuestAccountRequiredSheetForTests,
} from "@/v2/guest";
import { V2MobileTabBar } from "./V2MobileTabBar";

const locationRef = { current: "/today" };

const authState = {
  isSignedIn: true as boolean,
  user: { id: "u1", isAnonymous: false } as {
    id: string;
    isAnonymous?: boolean;
  } | null,
};

vi.mock("wouter", () => ({
  useLocation: () => [locationRef.current, vi.fn()],
}));

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

vi.mock("@/components/app-link", () => ({
  AppLink: ({
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
}));

describe("V2 navigation (S2-T04)", () => {
  beforeEach(() => {
    locationRef.current = "/today";
    authState.isSignedIn = true;
    authState.user = { id: "u1", isAnonymous: false };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetGuestAccountRequiredSheetForTests();
  });

  it("does not render when new_navigation is off", () => {
    render(<V2MobileTabBar visible />);
    expect(screen.queryByTestId("v2-mobile-tab-bar")).toBeNull();
  });

  it("renders Today · Help · Child whisper labels when new_navigation is on", () => {
    vi.stubEnv(v2BooleanFlagEnvKey("new_navigation"), "1");
    render(<V2MobileTabBar visible />);
    expect(screen.getByTestId("v2-mobile-tab-bar")).toBeInTheDocument();
    expect(screen.getByTestId("v2-nav-today")).toHaveAttribute("href", "/today");
    expect(screen.getByTestId("v2-nav-ask-amy")).toHaveAttribute("href", "/ask-amy");
    expect(screen.getByTestId("v2-nav-ask-amy")).toHaveTextContent(/^Help$/);
    expect(screen.getByTestId("v2-nav-for-child")).toHaveAttribute(
      "href",
      "/for-child",
    );
    expect(screen.getByTestId("v2-nav-for-child")).toHaveTextContent(/^Child$/);
    expect(screen.getByLabelText(/amynest v2 navigation/i)).toBeInTheDocument();
    expect(
      screen.getByTestId("v2-mobile-tab-bar").querySelector("[data-nav-language='whisper']"),
    ).toBeTruthy();
  });

  it("guest Ask Amy + For Child soft-navigate (no hard gate / no sheet)", () => {
    vi.stubEnv(v2BooleanFlagEnvKey("new_navigation"), "1");
    authState.isSignedIn = false;
    authState.user = null;
    render(
      <>
        <V2MobileTabBar visible />
        <GuestAccountRequiredSheetHost />
      </>,
    );

    expect(screen.getByTestId("v2-nav-ask-amy")).toHaveAttribute(
      "href",
      "/ask-amy",
    );
    expect(screen.getByTestId("v2-nav-ask-amy")).not.toHaveAttribute(
      "data-guest-gated",
    );
    expect(screen.getByTestId("v2-nav-for-child")).toHaveAttribute(
      "href",
      "/for-child",
    );
    expect(screen.getByTestId("v2-nav-for-child")).not.toHaveAttribute(
      "data-guest-gated",
    );
    expect(screen.getByTestId("v2-nav-today")).toHaveAttribute("href", "/today");
    expect(screen.queryByTestId("v2-guest-account-sheet")).toBeNull();
  });
});

describe("V2 active tab highlighting regression", () => {
  beforeEach(() => {
    authState.isSignedIn = true;
    authState.user = { id: "u1", isAnonymous: false };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function expectOnlyActive(activeTestId: string) {
    const tabs = [
      "v2-nav-today",
      "v2-nav-ask-amy",
      "v2-nav-for-child",
    ] as const;
    for (const id of tabs) {
      const el = screen.getByTestId(id);
      const active = id === activeTestId;
      expect(el).toHaveAttribute("data-active", active ? "true" : "false");
      // Soft-fill active — no underline indicator nodes
      expect(screen.queryByTestId(`${id}-indicator`)).toBeNull();
      if (active) {
        expect(el).toHaveAttribute("aria-current", "page");
        expect(el.className).toMatch(/bg-foreground\/\[0\.06\]/);
      } else {
        expect(el).not.toHaveAttribute("aria-current");
        expect(el.className).not.toMatch(/bg-foreground\/\[0\.06\]/);
      }
    }
  }

  it("highlights Today on /today", () => {
    locationRef.current = "/today";
    vi.stubEnv(v2BooleanFlagEnvKey("new_navigation"), "1");
    render(<V2MobileTabBar visible />);
    expectOnlyActive("v2-nav-today");
  });

  it("highlights Ask Amy on /ask-amy", () => {
    locationRef.current = "/ask-amy";
    vi.stubEnv(v2BooleanFlagEnvKey("new_navigation"), "1");
    render(<V2MobileTabBar visible />);
    expectOnlyActive("v2-nav-ask-amy");
  });

  it("highlights For Child on /for-child", () => {
    locationRef.current = "/for-child";
    vi.stubEnv(v2BooleanFlagEnvKey("new_navigation"), "1");
    render(<V2MobileTabBar visible />);
    expectOnlyActive("v2-nav-for-child");
  });
});
