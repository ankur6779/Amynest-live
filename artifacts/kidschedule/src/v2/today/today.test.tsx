import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { v2BooleanFlagEnvKey } from "@/lib/feature-flags";
import TodayPage from "./TodayPage";

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

describe("Today shell (S2-T01)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("golden: flags OFF → /today redirects to /dashboard", () => {
    render(<TodayPage />);
    expect(screen.getByTestId("redirect")).toHaveAttribute("data-to", "/dashboard");
  });

  it("renders header, mission placeholder, Ask Amy entry when today_v2 on", () => {
    vi.stubEnv(v2BooleanFlagEnvKey("today_v2"), "1");
    render(<TodayPage />);
    expect(screen.getByTestId("v2-today-shell")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /hello/i })).toBeInTheDocument();
    expect(screen.getByTestId("v2-today-mission-placeholder")).toBeInTheDocument();
    expect(screen.getByTestId("v2-today-ask-amy-entry")).toHaveAttribute(
      "href",
      "/ask-amy",
    );
  });
});
