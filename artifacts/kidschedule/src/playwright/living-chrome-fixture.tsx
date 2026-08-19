/**
 * Visual fixture — living global chrome continuity (header + bottom tab bar).
 * Open: /playwright-living-chrome.html
 */
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import "../index.css";
import "../i18n";
import { ThemeProvider } from "@/contexts/theme-context";
import { BrandLogo } from "@/components/brand-logo";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { syncAmynestLivingUniverseDocumentClass } from "@/lib/amynest-living-universe";

function Fixture() {
  useEffect(() => {
    document.documentElement.classList.add("amynest-living-universe");
    document.body.classList.add("amynest-living-universe", "has-tabbar");
    syncAmynestLivingUniverseDocumentClass();
    document.documentElement.classList.add("amynest-living-universe");
    document.body.classList.add("amynest-living-universe");
  }, []);

  return (
    <Router hook={() => ["/dashboard", () => {}]}>
      <div className="app-shell main-container relative w-full max-w-full min-w-0 overflow-x-clip box-border min-h-screen">
        <header
          className="app-header header w-full max-w-full min-w-0 shrink-0 lg:hidden"
          data-testid="living-chrome-header"
        >
          <div className="app-header__bar">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <BrandLogo size="sm" showTagline={false} />
              <AmyMascotLogo size={34} />
            </div>
          </div>
        </header>
        <main className="app-shell-main flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col">
          <div
            className="dashboard-page th-living-page w-full min-w-0 max-w-full flex-1"
            data-testid="living-chrome-room"
            style={{
              minHeight: "70vh",
              padding: "1rem 1rem 8rem",
              background:
                "radial-gradient(ellipse 80% 55% at 50% 8%, rgba(232, 212, 184, 0.18) 0%, transparent 55%), linear-gradient(180deg, #100d16 0%, #0a0810 42%, #030208 100%)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "rgba(244,238,230,0.94)",
                fontFamily: "Quicksand, ui-sans-serif, system-ui, sans-serif",
                fontSize: "1.15rem",
                fontWeight: 650,
              }}
            >
              Living chrome continuity
            </p>
            <p
              style={{
                margin: "0.4rem 0 0",
                color: "rgba(244,238,230,0.62)",
                fontSize: "0.9rem",
                lineHeight: 1.45,
                maxWidth: "22rem",
              }}
            >
              Header and bottom navigation should share this sanctuary night floor —
              no cool-navy seams.
            </p>
          </div>
        </main>
        <MobileTabBar visible />
      </div>
    </Router>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <Fixture />
    </ThemeProvider>
  </StrictMode>,
);
