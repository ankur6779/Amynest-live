import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { v2BooleanFlagEnvKey } from "@/lib/feature-flags";
import { clearSoftSaveForTests, V2_PREMIUM_ACCOUNT_REQUIRED_MESSAGE } from "@/v2/guest";
import PremiumPaywallPage from "./PremiumPaywallPage";

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
}));

describe("Premium guest account required", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearSoftSaveForTests();
  });

  it("guest Premium → account required, no journey purchase UI", () => {
    vi.stubEnv(v2BooleanFlagEnvKey("premium_v2"), "1");
    render(<PremiumPaywallPage />);
    expect(screen.getByTestId("v2-premium-account-required")).toBeInTheDocument();
    expect(screen.getByTestId("v2-premium-account-required-message")).toHaveTextContent(
      V2_PREMIUM_ACCOUNT_REQUIRED_MESSAGE,
    );
    expect(
      screen.getByTestId("v2-premium-account-required-message").textContent?.toLowerCase(),
    ).not.toMatch(/subscription|billing|checkout/);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Stay with Amy/i);
    expect(screen.getByTestId("v2-premium-create-account")).toHaveTextContent(
      /Let Amy stay/i,
    );
    expect(screen.getByTestId("v2-premium-sign-in")).toHaveTextContent(
      /Return to your place/i,
    );
    expect(screen.queryByTestId("v2-premium-journey")).toBeNull();
    expect(screen.getByTestId("v2-premium-sign-in")).toHaveAttribute("href", "/sign-in");
    expect(screen.getByTestId("v2-premium-create-account")).toHaveAttribute(
      "href",
      "/sign-up",
    );
  });
});
