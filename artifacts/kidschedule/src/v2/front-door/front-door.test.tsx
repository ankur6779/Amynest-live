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

/** Avoid AnimatePresence exit races in jsdom — presentation timing only. */
vi.mock("@/lib/reduced-motion", () => ({
  useReducedMotion: () => true,
}));

function enableFrontDoorFlags() {
  vi.stubEnv(v2BooleanFlagEnvKey("new_front_door"), "1");
  vi.stubEnv(v2BooleanFlagEnvKey("guest_mode_v2"), "1");
  vi.stubEnv(v2BooleanFlagEnvKey("today_v2"), "1");
}

describe("Vestibule — Front Door welcome (P0.2)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearGuestSession();
  });

  it("golden: flags OFF and /front-door redirects to /", () => {
    render(<FrontDoorPage />);
    const redirect = screen.getByTestId("redirect");
    expect(redirect).toHaveAttribute("data-to", "/");
    expect(
      screen.queryByRole("heading", { name: /you're welcome here/i }),
    ).toBeNull();
  });

  it("walks welcome moments without wizard meter or onboarding copy", async () => {
    enableFrontDoorFlags();
    const user = userEvent.setup();
    const { container } = render(<FrontDoorPage />);

    expect(
      await screen.findByRole("heading", { name: /you're welcome here/i }),
    ).toBeInTheDocument();
    expect(container.querySelector("[data-v2-room='vestibule']")).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByText(/step \d/i)).toBeNull();
    expect(screen.queryByText(/i'm ready/i)).toBeNull();
    expect(screen.getByTestId("v2-vestibule-understanding")).toHaveTextContent(
      /amy is with you/i,
    );
    expect(screen.queryByText(/^welcome$/i)).toBeNull();

    await user.click(screen.getByRole("button", { name: /i'm here/i }));
    expect(container.querySelector("[data-front-door-state]")).toHaveAttribute(
      "data-front-door-state",
      FrontDoorState.AGE,
    );
    expect(
      await screen.findByRole("heading", {
        name: /amy is beginning to picture your child/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/how old/i)).toBeNull();

    await user.click(screen.getByRole("button", { name: /3–5 years/i }));
    expect(container.querySelector("[data-front-door-state]")).toHaveAttribute(
      "data-front-door-state",
      FrontDoorState.NAME,
    );

    await user.click(
      await screen.findByRole("button", { name: /prefer not to say/i }),
    );
    expect(container.querySelector("[data-front-door-state]")).toHaveAttribute(
      "data-front-door-state",
      FrontDoorState.WORRY,
    );

    await user.click(
      await screen.findByRole("button", { name: /speech & talking/i }),
    );
    expect(container.querySelector("[data-front-door-state]")).toHaveAttribute(
      "data-front-door-state",
      FrontDoorState.COMPLETE,
    );
    expect(
      await screen.findByRole("heading", {
        name: /amy already understands/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /come into today/i }),
    ).toHaveAttribute("href", "/today");
    expect(screen.queryByText(/onboarding/i)).toBeNull();
    expect(screen.queryByText(/continue to today/i)).toBeNull();
  });
});
