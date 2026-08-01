import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { v2BooleanFlagEnvKey } from "@/lib/feature-flags";
import { V2MobileTabBar } from "./V2MobileTabBar";

vi.mock("wouter", () => ({
  useLocation: () => ["/today", vi.fn()],
}));

vi.mock("@/components/app-link", () => ({
  AppLink: ({
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

describe("V2 navigation (S2-T04)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not render when new_navigation is off", () => {
    render(<V2MobileTabBar visible />);
    expect(screen.queryByTestId("v2-mobile-tab-bar")).toBeNull();
  });

  it("renders Today · Ask Amy · For Child when new_navigation is on", () => {
    vi.stubEnv(v2BooleanFlagEnvKey("new_navigation"), "1");
    render(<V2MobileTabBar visible />);
    expect(screen.getByTestId("v2-mobile-tab-bar")).toBeInTheDocument();
    expect(screen.getByTestId("v2-nav-today")).toHaveAttribute("href", "/today");
    expect(screen.getByTestId("v2-nav-ask-amy")).toHaveAttribute("href", "/ask-amy");
    expect(screen.getByTestId("v2-nav-for-child")).toHaveAttribute(
      "href",
      "/for-child",
    );
    expect(screen.getByLabelText(/amynest v2 navigation/i)).toBeInTheDocument();
  });
});
