import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { v2BooleanFlagEnvKey } from "@/lib/feature-flags";
import { GuestAccountCta } from "./GuestAccountCta";
import {
  GuestAccountRequiredSheetHost,
  GUEST_ACCOUNT_SHEET_COPY,
} from "./GuestAccountRequiredSheet";
import { shouldUseGuestAccountSheet } from "./guest-account-gate";
import {
  closeGuestAccountRequiredSheet,
  getGuestAccountSheetIntent,
  isGuestAccountRequiredSheetOpen,
  openGuestAccountRequiredSheet,
  resetGuestAccountRequiredSheetForTests,
} from "./guest-account-sheet-store";
import {
  clearGuestSession,
  clearSoftSaveForTests,
  ensureGuestSession,
  setGuestWorry,
  tryResolveV2PostAuthPath,
} from "./index";

const locationRef = { current: "/today" };
const setLocation = vi.fn((path: string) => {
  locationRef.current = path;
});

vi.mock("wouter", () => ({
  useLocation: () => [locationRef.current, setLocation],
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
}));

const authState = {
  isSignedIn: false as boolean | undefined,
  user: null as null | { id: string; isAnonymous?: boolean },
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

describe("guest account sheet gate", () => {
  afterEach(() => {
    authState.isSignedIn = false;
    authState.user = null;
    resetGuestAccountRequiredSheetForTests();
    clearSoftSaveForTests();
    clearGuestSession();
    vi.unstubAllEnvs();
    locationRef.current = "/today";
    setLocation.mockClear();
  });

  it("gates unsigned and anonymous users", () => {
    expect(
      shouldUseGuestAccountSheet({ isSignedIn: false, user: null }),
    ).toBe(true);
    expect(
      shouldUseGuestAccountSheet({
        isSignedIn: true,
        user: { id: "anon", isAnonymous: true } as never,
      }),
    ).toBe(true);
    expect(
      shouldUseGuestAccountSheet({
        isSignedIn: true,
        user: { id: "u1", isAnonymous: false } as never,
      }),
    ).toBe(false);
  });

  it("guest Ask Amy CTA navigates to experience — never Sign In wall", () => {
    vi.stubEnv(v2BooleanFlagEnvKey("guest_mode_v2"), "1");
    ensureGuestSession();
    setGuestWorry("sleep");
    render(
      <>
        <GuestAccountCta href="/ask-amy" testId="cta" sheetIntent="ask_amy">
          Ask about bedtime
        </GuestAccountCta>
        <GuestAccountRequiredSheetHost />
      </>,
    );

    const cta = screen.getByTestId("cta");
    expect(cta.closest("a") ?? cta).toHaveAttribute("href", "/ask-amy");
    expect(screen.queryByTestId("v2-guest-account-sheet")).toBeNull();
  });

  it("forceAccountSheet opens soft sheet for save-progress CTA", async () => {
    vi.stubEnv(v2BooleanFlagEnvKey("guest_mode_v2"), "1");
    ensureGuestSession();
    setGuestWorry("sleep");
    const user = userEvent.setup();
    render(
      <>
        <GuestAccountCta
          href="/ask-amy"
          testId="cta"
          sheetIntent="ask_amy"
          forceAccountSheet
        >
          Save & get quick help
        </GuestAccountCta>
        <GuestAccountRequiredSheetHost />
      </>,
    );

    await user.click(screen.getByTestId("cta"));
    expect(screen.getByTestId("v2-guest-account-sheet")).toHaveAttribute(
      "data-sheet-intent",
      "ask_amy",
    );
    expect(getGuestAccountSheetIntent()).toBe("ask_amy");
    expect(screen.queryByText(GUEST_ACCOUNT_SHEET_COPY)).toBeNull();
  });

  it("Not now dismisses and stays on the same screen", async () => {
    const user = userEvent.setup();
    openGuestAccountRequiredSheet("ask_amy");
    render(<GuestAccountRequiredSheetHost />);

    await user.click(screen.getByTestId("v2-guest-account-sheet-not-now"));
    await waitFor(() => {
      expect(screen.queryByTestId("v2-guest-account-sheet")).toBeNull();
    });
    expect(isGuestAccountRequiredSheetOpen()).toBe(false);
    expect(locationRef.current).toBe("/today");
    expect(setLocation).not.toHaveBeenCalled();
  });

  it("Ask Amy Continue soft-saves /ask-amy then opens Sign up", async () => {
    const user = userEvent.setup();
    locationRef.current = "/today";
    openGuestAccountRequiredSheet("ask_amy");
    render(<GuestAccountRequiredSheetHost />);

    await user.click(screen.getByTestId("v2-guest-account-sheet-continue"));
    expect(tryResolveV2PostAuthPath()).toBe("/ask-amy");
    expect(setLocation).toHaveBeenCalledWith("/sign-up");
    expect(isGuestAccountRequiredSheetOpen()).toBe(false);
  });

  it("default intent Continue soft-saves current path", async () => {
    const user = userEvent.setup();
    locationRef.current = "/today";
    openGuestAccountRequiredSheet("default");
    render(<GuestAccountRequiredSheetHost />);

    await user.click(screen.getByTestId("v2-guest-account-sheet-continue"));
    expect(tryResolveV2PostAuthPath()).toBe("/today");
    expect(setLocation).toHaveBeenCalledWith("/sign-up");
  });

  it("signed-in CTA navigates as a normal link", () => {
    authState.isSignedIn = true;
    authState.user = { id: "u1", isAnonymous: false };
    render(
      <GuestAccountCta href="/ask-amy" testId="cta">
        Ask about today's speech practice
      </GuestAccountCta>,
    );
    expect(screen.getByTestId("cta").closest("a") ?? screen.getByTestId("cta")).toHaveAttribute(
      "href",
      "/ask-amy",
    );
  });

  it("close helper resets open state", () => {
    openGuestAccountRequiredSheet("ask_amy");
    expect(isGuestAccountRequiredSheetOpen()).toBe(true);
    closeGuestAccountRequiredSheet();
    expect(isGuestAccountRequiredSheetOpen()).toBe(false);
    expect(getGuestAccountSheetIntent()).toBe("default");
  });
});
