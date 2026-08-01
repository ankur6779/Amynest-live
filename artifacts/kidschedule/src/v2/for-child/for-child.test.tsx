import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { v2BooleanFlagEnvKey } from "@/lib/feature-flags";
import ForChildPage from "./ForChildPage";

vi.mock("wouter", async () => {
  const actual = await vi.importActual<typeof import("wouter")>("wouter");
  return {
    ...actual,
    Redirect: ({ to }: { to: string }) => (
      <div data-testid="redirect" data-to={to} />
    ),
  };
});

describe("For [Child] shell (S2-T03)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("golden: flags OFF → /for-child redirects to /parenting-hub", () => {
    render(<ForChildPage />);
    expect(screen.getByTestId("redirect")).toHaveAttribute(
      "data-to",
      "/parenting-hub",
    );
  });

  it("renders treasury shell sections when for_child_v2 on", () => {
    vi.stubEnv(v2BooleanFlagEnvKey("for_child_v2"), "1");
    render(<ForChildPage />);
    expect(screen.getByTestId("v2-for-child-shell")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /for your child/i })).toBeInTheDocument();
    expect(
      screen.getByTestId("v2-for-child-section-with-child-today"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("v2-for-child-section-play")).toBeInTheDocument();
    expect(screen.getByTestId("v2-for-child-section-learn")).toBeInTheDocument();
    expect(screen.getByTestId("v2-for-child-section-care")).toBeInTheDocument();
  });
});
