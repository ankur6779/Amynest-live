import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Router } from "wouter";
import { AmyFab } from "@/components/amy-fab";

const srcDir = resolve(import.meta.dirname, "..");

function cssSource() {
  return [
    readFileSync(resolve(srcDir, "index.css"), "utf8"),
    readFileSync(resolve(srcDir, "styles/amynest-viewport.css"), "utf8"),
  ].join("\n");
}

function fabSource() {
  return readFileSync(resolve(srcDir, "components/amy-fab.tsx"), "utf8");
}

function wrap(ui: React.ReactNode) {
  return render(<Router hook={() => ["/dashboard", () => {}]}>{ui}</Router>);
}

describe("Amy FAB responsive positioning contract", () => {
  it("uses a viewport-driven gutter with safe-area insets, not a 10px edge glue", () => {
    const css = cssSource();
    expect(css).toContain("--amy-fab-gutter-inline");
    expect(css).toContain("--amy-fab-gutter-inline-start");
    expect(css).toContain("--amy-fab-nav-gap");
    expect(css).toContain("--app-tabbar-height");
    expect(css).toContain("env(safe-area-inset-right, 0px)");
    expect(css).toContain("env(safe-area-inset-left, 0px)");
    expect(css).toContain("env(safe-area-inset-bottom, 0px)");
    expect(css).toContain("clamp(");
    expect(css).toContain("100dvh");
    expect(css).not.toMatch(/right:\s*max\(\s*10px/);
    expect(css).not.toMatch(/@media[^{]*Samsung/i);
    expect(css).not.toMatch(/user-agent/i);
    expect(css).not.toMatch(/right:\s*137px/);
  });

  it("treats the Amy label and icon as one in-flow cluster", () => {
    const fab = fabSource();
    expect(fab).toContain("amy-fab-cluster");
    expect(fab).toContain("amy-fab-hit");
    expect(fab).toContain("amy-fab-label");
    expect(fab).toContain('data-testid="amy-fab-floating"');
    expect(fab).toContain('data-testid="amy-fab-label"');
    expect(fab).not.toContain("-right-1");
    expect(fab).not.toContain("absolute -top-2");
  });

  it("keeps the FAB above the tab bar without raising z-index past sheets", () => {
    const css = cssSource();
    const cancelAgent = readFileSync(
      resolve(srcDir, "components/amy-cancel-agent.tsx"),
      "utf8",
    );
    expect(css).toMatch(/#amy-fab-floating\.amy-fab-in-footer[\s\S]*?z-index:\s*2001/);
    expect(css).toContain("bottom: calc(100% + var(--amy-fab-nav-gap))");
    expect(cancelAgent).toContain("z-[4000]");
  });

  it("does not hide Health Lab immersive suppression of the FAB", () => {
    const css = cssSource();
    expect(css).toContain("html.health-lab-immersive #amy-fab-floating");
    expect(css).toContain("pointer-events: none !important");
  });

  it("renders the Ask Amy control with an accessible name and visible label", async () => {
    wrap(<AmyFab embedded />);
    const control = await screen.findByRole("link", { name: "Ask Amy AI" });
    expect(control).toHaveAttribute("href", "/assistant");
    expect(screen.getByTestId("amy-fab-label")).toHaveTextContent("Amy AI");
    expect(screen.getByTestId("amy-fab-floating")).toHaveClass("amy-fab-in-footer");
  });

  it("stays hidden on the assistant conversation route", () => {
    render(
      <Router hook={() => ["/assistant", () => {}]}>
        <AmyFab embedded />
      </Router>,
    );
    expect(screen.queryByTestId("amy-fab-floating")).toBeNull();
  });
});
