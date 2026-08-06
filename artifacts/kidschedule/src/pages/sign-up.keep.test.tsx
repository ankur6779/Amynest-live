import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { v2BooleanFlagEnvKey } from "@/lib/feature-flags";
import {
  clearGuestSession,
  ensureGuestSession,
  setGuestChildName,
  setGuestWorry,
} from "@/v2/guest";

vi.mock("@/lib/firebase-auth-hooks", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: false }),
  useUser: () => ({ user: null }),
}));

vi.mock("@/lib/firebase", () => ({
  firebaseAuth: {},
}));

vi.mock("@/lib/auth-feature-flags", () => ({
  shouldShowAppleSignIn: () => false,
  shouldShowGoogleSignIn: () => false,
  shouldShowFacebookSignIn: () => false,
  shouldShowPhoneOtp: () => false,
}));

vi.mock("@/lib/pre-signup-reengagement/orchestrator", () => ({
  onPreSignupSignupStarted: () => undefined,
}));

vi.mock("@/lib/pre-signup-reengagement/storage", () => ({
  markPreSignupSignupFlowActive: () => undefined,
}));

vi.mock("wouter", async () => {
  const actual = await vi.importActual<typeof import("wouter")>("wouter");
  return {
    ...actual,
    useLocation: () => ["/", vi.fn()],
  };
});

import SignUpPage from "./sign-up";

describe("Keep — Safe Keeping recovery", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearGuestSession();
  });

  it("is Nest Keep — not Meet AMY / create-account portal", () => {
    render(<SignUpPage />);
    expect(screen.getByTestId("v2-keep-shell")).toHaveAttribute(
      "data-v2-room",
      "keep",
    );
    expect(screen.queryByText(/meet\s*amy/i)).toBeNull();
    expect(screen.queryByText(/create account/i)).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /protect today's care/i,
    );
    expect(screen.getByTestId("v2-keep-save")).toHaveTextContent(
      /keep this safe/i,
    );
    expect(screen.getByTestId("v2-keep-back")).toBeInTheDocument();
    expect(screen.queryByText(/continue with google/i)).toBeNull();
  });

  it("names the child's care when guest journey exists", () => {
    vi.stubEnv(v2BooleanFlagEnvKey("guest_mode_v2"), "1");
    ensureGuestSession();
    setGuestChildName("Aria");
    setGuestWorry("speech_talking");

    render(<SignUpPage />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(
      /protect aria's care today/i,
    );
    expect(screen.getByTestId("v2-signup-continuity-subline").textContent).toMatch(
      /speech/i,
    );
  });
});
