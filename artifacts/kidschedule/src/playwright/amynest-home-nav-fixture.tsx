/**
 * Visual fixture for living AmyNest home navigation.
 * Open: /playwright-amynest-home-nav.html?panel=drawer|desktop
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import "../index.css";
import "../i18n";
import { NAV_ITEMS } from "@/lib/mobile-menu-config";
import { buildLivingNavSections } from "@/lib/nav-living-ia";
import { LIVING_NAV_CONTAINED_HREFS } from "@/lib/living-leave-containment";
import type { MobileNavItem } from "@/lib/mobile-menu-config";
import {
  HomeNavFamilyRow,
  HomeNavHeader,
  HomeNavSections,
  HomeNavSignOut,
  homeNavShellClass,
} from "@/components/nav/amynest-home-nav";
import { AmyNestLeaveContinuity } from "@/components/amy-nest-leave-continuity";

const params = new URLSearchParams(window.location.search);
const panel = params.get("panel") ?? "drawer";
const moreOpen = params.get("more") === "open";
const fixtureItems: MobileNavItem[] = NAV_ITEMS.filter(
  (item) => !(LIVING_NAV_CONTAINED_HREFS as readonly string[]).includes(item.href),
);
const sections = buildLivingNavSections(fixtureItems);

function Fixture() {
  const desktop = panel === "desktop";
  if (panel === "leave") {
    return (
      <Router hook={() => ["/phonics", () => {}]}>
        <div
          className="min-h-screen bg-background p-4"
          data-testid="amynest-leave-continuity-fixture"
          data-panel="leave"
        >
          <AmyNestLeaveContinuity continueHref="/parenting-hub" continueLabel="Back to rooms" />
        </div>
      </Router>
    );
  }
  return (
    <Router hook={() => ["/dashboard", () => {}]}>
      <div
        className={desktop ? "min-h-screen bg-[#0a0810] lg:flex" : "min-h-screen bg-[#0a0810]"}
        data-testid="amynest-home-nav-fixture"
        data-panel={panel}
      >
        <aside
          className={homeNavShellClass(
            desktop
              ? "h-screen w-[min(320px,26vw)] min-w-[280px] border-r border-[rgba(232,212,184,0.16)]"
              : "drawer shadow-2xl",
          )}
          data-testid={desktop ? "amynest-home-nav-desktop" : "amynest-home-nav"}
          style={desktop ? undefined : { position: "relative", height: "100dvh" }}
        >
          <HomeNavHeader onClose={desktop ? undefined : () => undefined} />
          <HomeNavFamilyRow
            displayName="Ankur"
            childName="John"
            extraChildren={0}
            initials="A"
          />
          <HomeNavSections
            sections={sections}
            location={moreOpen ? "/birth-sky" : "/dashboard"}
          />
          <HomeNavSignOut
            onSignOut={() => undefined}
            testId={desktop ? "button-sign-out" : "button-sign-out-mobile"}
          />
        </aside>
      </div>
    </Router>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);
