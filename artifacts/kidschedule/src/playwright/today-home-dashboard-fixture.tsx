/**
 * Visual fixture for living /dashboard Home composition.
 * Open: /playwright-today-home-dashboard.html?panel=empty|plan
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import "../index.css";
import "../i18n";
import { TodayHomeHero } from "@/components/today-home/today-home-hero";
import { TodayHomeShell } from "@/components/today-home/today-home-shell";
import { TodayProgressStrip } from "@/components/today-home/today-progress-strip";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { livingDashboardEmptyBody, livingDashboardEmptyTitle, livingDashboardFamilyHint } from "@/lib/routine-generation/living-dashboard";
import type { TodayNrtDecision } from "@/lib/today-home/resolve-today-nrt";

const params = new URLSearchParams(window.location.search);
const panel = params.get("panel") === "plan" ? "plan" : "empty";

const emptyDecision: TodayNrtDecision = {
  title: "Prepare Aria's day",
  why: "Amy needs a clear day plan before the next right step can open.",
  detail: "One gentle plan for meals, rest, play, and bedtime — shaped around your child.",
  minutes: null,
  source: "decide_next",
  childName: "Aria",
  childId: 1,
  cta: { kind: "generate", label: "Build today's plan" },
  basedOn: ["A clear day comes first."],
  lawPassed: true,
};

const planDecision: TodayNrtDecision = {
  title: "Outdoor sensory play",
  why: "Next at 10:00 AM. Aria already has a plan for today.",
  detail: "About 15 minutes — begin when you are ready.",
  minutes: 15,
  source: "routine_next",
  childName: "Aria",
  childId: 1,
  cta: { kind: "begin_routine", label: "Begin today", routineId: 9 },
  basedOn: ["Next at 10:00 AM."],
  lawPassed: true,
};

function FamilyChips() {
  return (
    <div className="th-family" data-testid="today-home-family">
      <p className="th-family-label">{livingDashboardFamilyHint()}</p>
      <div className="th-family-row">
        <button type="button" className="th-family-chip" data-active="true">
          Aria
        </button>
        <button type="button" className="th-family-chip" data-active="false">
          Leo
        </button>
      </div>
    </div>
  );
}

function Fixture() {
  const empty = panel === "empty";
  return (
    <Router hook={() => ["/dashboard", () => {}]}>
      <div className="app-scroll min-h-screen">
      <div
        data-on-dark
        className="dashboard-page th-living-page w-full min-w-0 max-w-full"
        data-testid="today-home-living-fixture"
        data-panel={panel}
      >
        <div className="flex flex-col gap-4">
          <TodayHomeShell>
            <FamilyChips />
            <TodayHomeHero
              decision={empty ? emptyDecision : planDecision}
              insight={
                empty
                  ? {
                      kind: "weather",
                      text: "Air quality is poor — keep today’s step short and sheltered.",
                    }
                  : null
              }
              onBegin={() => undefined}
            />
            <TodayProgressStrip done={empty ? 0 : 2} total={empty ? 0 : 5} />
          </TodayHomeShell>
          <div className="th-living-floor">
            <div className="th-timeline-slot">
              {empty ? (
                <div className="th-timeline-card">
                  <div className="th-timeline-empty" data-testid="today-home-plan-state">
                    <p className="th-timeline-empty-title">{livingDashboardEmptyTitle()}</p>
                    <p className="th-timeline-empty-body">{livingDashboardEmptyBody("Aria")}</p>
                  </div>
                </div>
              ) : (
                <div className="th-timeline-card" data-testid="today-home-plan-state">
                  <div className="px-4 py-3">
                    <p className="text-sm font-medium text-white/55">Also today</p>
                    <p className="mt-2 text-sm text-white/85">10:00 · Outdoor sensory play</p>
                    <p className="mt-1 text-sm text-white/60">11:00 · Quiet lunch</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <MobileTabBar visible />
      </div>
      </div>
    </Router>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);
