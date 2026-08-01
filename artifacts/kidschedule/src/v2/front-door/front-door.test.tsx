import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { v2BooleanFlagEnvKey } from "@/lib/feature-flags";
import { clearGuestSession } from "@/v2/guest";
import FrontDoorPage from "./FrontDoorPage";
import { FrontDoorState } from "./state-machine";

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

  /**
   * Golden: Flags OFF → manual /front-door → redirect /
   * (deep-link protection — review P1)
   */
  it("golden: flags OFF and /front-door redirects to /", () => {
    // Simulate visiting /front-door with production defaults (all flags off).
    render(<FrontDoorPage />);
    const redirect = screen.getByTestId("redirect");
    expect(redirect).toHaveAttribute("data-to", "/");
    expect(screen.queryByRole("heading", { name: /take a breath/i })).toBeNull();
  });

  it("walks BREATH → AGE → NAME → WORRY → COMPLETE via state machine", async () => {
    enableFrontDoorFlags();
    const user = userEvent.setup();
    const { container } = render(<FrontDoorPage />);

    expect(
      await screen.findByRole("heading", { name: /take a breath/i }),
    ).toBeInTheDocument();
    expect(container.querySelector("[data-front-door-state]")).toHaveAttribute(
      "data-front-door-state",
      FrontDoorState.BREATH,
    );

    await user.click(screen.getByRole("button", { name: /i'm ready/i }));
    expect(container.querySelector("[data-front-door-state]")).toHaveAttribute(
      "data-front-door-state",
      FrontDoorState.AGE,
    );

    await user.click(screen.getByRole("button", { name: /3–5 years/i }));
    expect(container.querySelector("[data-front-door-state]")).toHaveAttribute(
      "data-front-door-state",
      FrontDoorState.NAME,
    );

    await user.click(screen.getByRole("button", { name: /skip for now/i }));
    expect(container.querySelector("[data-front-door-state]")).toHaveAttribute(
      "data-front-door-state",
      FrontDoorState.WORRY,
    );

    await user.click(screen.getByRole("button", { name: /speech & talking/i }));
    expect(container.querySelector("[data-front-door-state]")).toHaveAttribute(
      "data-front-door-state",
      FrontDoorState.COMPLETE,
    );
    expect(
      screen.getByRole("heading", { name: /amy heard you/i }),
    ).toBeInTheDocument();
  });
});
