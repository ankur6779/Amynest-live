import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { v2BooleanFlagEnvKey } from "@/lib/feature-flags";
import { clearGuestSession } from "@/v2/guest";
import FrontDoorPage from "./FrontDoorPage";

vi.mock("wouter", async () => {
  const actual = await vi.importActual<typeof import("wouter")>("wouter");
  return {
    ...actual,
    Redirect: ({ to }: { to: string }) => (
      <div data-testid="redirect" data-to={to} />
    ),
  };
});

function enableFrontDoorFlags() {
  vi.stubEnv(v2BooleanFlagEnvKey("new_front_door"), "1");
  vi.stubEnv(v2BooleanFlagEnvKey("guest_mode_v2"), "1");
}

describe("Front Door V2 (S1-T02–T05)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearGuestSession();
  });

  it("redirects away when flags are off", () => {
    render(<FrontDoorPage />);
    expect(screen.getByTestId("redirect")).toHaveAttribute("data-to", "/");
  });

  it("walks breath → age → name skip → worry → foundation complete", async () => {
    enableFrontDoorFlags();
    const user = userEvent.setup();
    render(<FrontDoorPage />);

    expect(
      await screen.findByRole("heading", { name: /take a breath/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /i'm ready/i }));
    expect(
      screen.getByRole("heading", { name: /how old is your child/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /3–5 years/i }));
    expect(
      screen.getByRole("heading", { name: /what do you call them/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/child's name/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /skip for now/i }));
    expect(
      screen.getByRole("heading", { name: /what's on your mind/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /speech & talking/i }));
    expect(
      screen.getByRole("heading", { name: /amy heard you/i }),
    ).toBeInTheDocument();
  });
});
