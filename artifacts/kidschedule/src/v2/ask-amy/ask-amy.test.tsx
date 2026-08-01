import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { v2BooleanFlagEnvKey } from "@/lib/feature-flags";
import AskAmyPage from "./AskAmyPage";

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

vi.mock("@/pages/assistant", () => ({
  default: () => <div data-testid="assistant-black-box">Assistant black box</div>,
}));

describe("Ask Amy shell (S2-T02)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("golden: flags OFF → /ask-amy redirects to /assistant", () => {
    render(<AskAmyPage />);
    expect(screen.getByTestId("redirect")).toHaveAttribute("data-to", "/assistant");
  });

  it("shows entry, prompts, back link; opens conversation container", async () => {
    vi.stubEnv(v2BooleanFlagEnvKey("ask_amy_v2"), "1");
    const user = userEvent.setup();
    render(<AskAmyPage />);

    expect(screen.getByTestId("v2-ask-amy-shell")).toBeInTheDocument();
    expect(screen.getByTestId("v2-ask-amy-back")).toHaveAttribute("href", "/today");
    expect(screen.getAllByTestId("v2-ask-amy-prompt-placeholder").length).toBeGreaterThan(
      0,
    );

    await user.click(screen.getByTestId("v2-ask-amy-start"));
    expect(await screen.findByTestId("v2-ask-amy-conversation")).toBeInTheDocument();
    expect(screen.getByTestId("assistant-black-box")).toBeInTheDocument();
  });
});
