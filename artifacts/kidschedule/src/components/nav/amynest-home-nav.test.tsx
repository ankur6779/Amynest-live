import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Router } from "wouter";
import { NAV_ITEMS } from "@/lib/mobile-menu-config";
import { buildLivingNavSections } from "@/lib/nav-living-ia";
import {
  HomeNavFamilyRow,
  HomeNavHeader,
  HomeNavSections,
  HomeNavSignOut,
} from "@/components/nav/amynest-home-nav";

vi.mock("@/lib/client-logs", () => ({
  queueClientLog: vi.fn(),
}));

function wrap(ui: React.ReactNode) {
  return render(<Router hook={() => ["/dashboard", () => {}]}>{ui}</Router>);
}

describe("AmyNest home navigation chrome", () => {
  it("uses the quiet home identity instead of the legacy product header", () => {
    wrap(<HomeNavHeader onClose={() => undefined} />);
    expect(screen.getByText("AmyNest")).toBeTruthy();
    expect(screen.getByText("Today's next right thing")).toBeTruthy();
    expect(screen.queryByText("AmyNest AI")).toBeNull();
    expect(screen.queryByText("AI for Smart Parenting")).toBeNull();
    expect(screen.getByRole("button", { name: "Close menu" })).toBeTruthy();
  });

  it("renders a calm family row without marketing badges", () => {
    wrap(
      <HomeNavFamilyRow
        displayName="Ankur"
        childName="John"
        extraChildren={0}
        initials="A"
      />,
    );
    expect(screen.getByText("Hi, Ankur")).toBeTruthy();
    expect(screen.getByText("With John")).toBeTruthy();
    expect(screen.queryByTestId("badge-smart-parent")).toBeNull();
    expect(screen.queryByText(/SMART PARENT/i)).toBeNull();
  });

  it("keeps sign out as a quiet secondary action", () => {
    wrap(<HomeNavSignOut onSignOut={() => undefined} testId="button-sign-out-mobile" />);
    const btn = screen.getByTestId("button-sign-out-mobile");
    expect(btn).toHaveTextContent("Sign out");
    expect(btn.className).not.toMatch(/rose|pink|violet|fuchsia/i);
  });

  it("does not render a PRIMARY catalogue or equal-weight product tiles", () => {
    wrap(
      <HomeNavSections
        sections={buildLivingNavSections(NAV_ITEMS)}
        location="/dashboard"
      />,
    );
    expect(screen.queryByText("Primary")).toBeNull();
    expect(screen.queryByText("PRIMARY")).toBeNull();
    expect(screen.queryByText("Parenting assistant & chat")).toBeNull();
    expect(screen.queryByText("Builder & tracking")).toBeNull();
    expect(screen.getByText("Home")).toBeTruthy();
    expect(screen.getByText("Today's plan")).toBeTruthy();
    expect(screen.getByText("Amy")).toBeTruthy();
    expect(screen.getByText("Talk whenever you need")).toBeTruthy();
    const rooms = document.querySelector('[data-nav-section="rooms"]');
    expect(rooms).toBeTruthy();
    expect(within(rooms as HTMLElement).getByText("Help")).toBeTruthy();
    expect(within(rooms as HTMLElement).getByText("Understand")).toBeTruthy();
    expect(within(rooms as HTMLElement).getByText("Care")).toBeTruthy();
    expect(within(rooms as HTMLElement).getByText("Moments")).toBeTruthy();
    expect(screen.getByText("You are not alone.")).toBeTruthy();
    expect(screen.getByText("Birth Sky")).toBeTruthy();
    const more = document.querySelector("details.amynest-home-nav-more");
    expect(more).toBeTruthy();
    expect((more as HTMLDetailsElement).open).toBe(false);
  });

  it("opens More when the current destination is a secondary route", () => {
    wrap(
      <HomeNavSections
        sections={buildLivingNavSections(NAV_ITEMS)}
        location="/nutrition"
      />,
    );
    const more = document.querySelector("details.amynest-home-nav-more") as HTMLDetailsElement;
    expect(more.open).toBe(true);
    expect(screen.getByText("Nutrition")).toBeTruthy();
  });
});
