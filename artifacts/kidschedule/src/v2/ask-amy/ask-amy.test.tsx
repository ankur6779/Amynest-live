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
import AskAmyPage from "./AskAmyPage";

const authState = {
  isSignedIn: false as boolean,
  user: null as { id: string; isAnonymous?: boolean } | null,
};

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

vi.mock("@/pages/assistant", () => ({
  default: () => <div data-testid="assistant-black-box">Assistant black box</div>,
}));

describe("Ask Amy Hearing Room", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearGuestSession();
    resetGuestAccountRequiredSheetForTests();
    authState.isSignedIn = false;
    authState.user = null;
  });

  it("golden: flags OFF → /ask-amy redirects to /assistant", () => {
    render(<AskAmyPage />);
    expect(screen.getByTestId("redirect")).toHaveAttribute("data-to", "/assistant");
  });

  it("guest gets help first — listener room, no ChatGPT lobby", async () => {
    vi.stubEnv(v2BooleanFlagEnvKey("ask_amy_v2"), "1");
    vi.stubEnv(v2BooleanFlagEnvKey("guest_mode_v2"), "1");
    ensureGuestSession();
    setGuestChildName("Aarav");
    setGuestWorry("sleep");
    const user = userEvent.setup();
    render(
      <>
        <AskAmyPage />
        <GuestAccountRequiredSheetHost />
      </>,
    );

    expect(screen.getByTestId("v2-ask-amy-shell")).toHaveAttribute(
      "data-guest",
      "true",
    );
    expect(screen.getByTestId("v2-ask-amy-back")).toHaveAttribute("href", "/today");
    expect(screen.getByTestId("v2-ask-amy-heading")).toHaveTextContent(
      /Amy can help with bedtime right now/i,
    );
    expect(screen.getByText(/No perfect words needed/i)).toBeInTheDocument();
    expect(screen.getByTestId("v2-ask-amy-support")).toHaveTextContent(/Aarav/);
    expect(screen.getByTestId("v2-ask-amy-support")).toHaveTextContent(
      /Messy, brief, or long/i,
    );
    expect(screen.getByTestId("v2-ask-amy-support")).toHaveTextContent(
      /carries the understanding/i,
    );
    expect(screen.getByTestId("v2-ask-amy-support").textContent?.toLowerCase()).not.toMatch(
      /quick help|chatgpt|prompt|perfect question/,
    );
    expect(screen.queryByRole("heading", { name: /^Ask Amy$/i })).toBeNull();
    expect(screen.queryByTestId("v2-ask-amy-prompt-placeholder")).toBeNull();
    expect(screen.getByTestId("v2-ask-amy-start")).toHaveTextContent(
      /Speak about bedtime/i,
    );

    await user.click(screen.getByTestId("v2-ask-amy-start"));
    expect(screen.queryByTestId("v2-guest-account-sheet")).toBeNull();
    expect(await screen.findByTestId("v2-ask-amy-conversation")).toBeInTheDocument();
    expect(screen.getByText(/Just speak — Amy understands/i)).toBeInTheDocument();
    expect(screen.getByTestId("assistant-black-box")).toBeInTheDocument();
    expect(screen.queryByText(/Back to suggestions/i)).toBeNull();
    expect(screen.getByTestId("v2-ask-amy-leave-conversation")).toHaveAttribute(
      "href",
      "/today",
    );

    await user.click(screen.getByTestId("v2-ask-amy-save-whisper"));
    expect(screen.getByTestId("v2-guest-account-sheet")).toHaveAttribute(
      "data-sheet-intent",
      "ask_amy",
    );
    expect(screen.getByTestId("v2-guest-account-sheet")).toHaveTextContent(
      /Keep Aarav's place with Amy/i,
    );
    expect(screen.queryByText(/Save & get quick help/i)).toBeNull();
    expect(screen.queryByText(/Amy Coach/i)).toBeNull();
  });

  it("signed-in start opens conversation container", async () => {
    vi.stubEnv(v2BooleanFlagEnvKey("ask_amy_v2"), "1");
    authState.isSignedIn = true;
    authState.user = { id: "u1", isAnonymous: false };
    const user = userEvent.setup();
    render(<AskAmyPage />);

    await user.click(screen.getByTestId("v2-ask-amy-start"));
    expect(await screen.findByTestId("v2-ask-amy-conversation")).toBeInTheDocument();
    expect(screen.getByTestId("assistant-black-box")).toBeInTheDocument();
    expect(screen.queryByTestId("v2-ask-amy-save-whisper")).toBeNull();
  });
});
