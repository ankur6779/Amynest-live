/**
 * Visual fixture for Routine living dashboard / generate continuity.
 * Open: /playwright-routine-living-dashboard.html?panel=empty|plan|generate|result
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import "../index.css";
import "../i18n";
import { RoutineLivingDashboard } from "@/components/routines/routine-living-dashboard";
import { RoutineLivingOpening } from "@/components/routines/routine-living-opening";
import { RoutineLivingResult } from "@/components/routines/routine-living-result";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { buildRoutineContextChips } from "@/lib/routine-generation/living-entry";

const params = new URLSearchParams(window.location.search);
const panel = params.get("panel") ?? "empty";
const childName = params.get("name") ?? "John";

const childrenList = [
  { id: 1, name: "John" },
  { id: 2, name: "Child 2" },
  { id: 3, name: "Child 3" },
];

const items = [
  { time: "07:30", activity: "Quiet breakfast", duration: 20, category: "meal" },
  { time: "08:00", activity: "Get dressed slowly", duration: 15, category: "care" },
  { time: "08:30", activity: "School run", duration: 25, category: "school" },
  { time: "16:00", activity: "Snack and decompress", duration: 20, category: "rest" },
];

const chips = buildRoutineContextChips({
  childName,
  ageYears: 5,
  ageMonths: 0,
  goals: "Calmer mornings",
  dateIso: "2026-08-15",
  hasSchool: true,
  schoolQuestionRequired: true,
  caregiver: "mom",
  weatherOutdoor: "yes",
  hasExistingRoutine: panel === "plan" || panel === "result",
  priorRoutineCount: 3,
});

function Fixture() {
  const hookPath =
    panel === "generate" || panel === "result" ? "/routines/generate" : "/routines";

  return (
    <Router hook={() => [hookPath, () => {}]}>
      <div className="min-h-screen bg-[#0a0810] text-white" data-testid="routine-living-fixture">
        {panel === "empty" ? (
          <RoutineLivingDashboard
            childName={childName}
            childrenList={childrenList}
            activeChildId={1}
            onSelectChild={() => undefined}
            hasPlan={false}
            onPrimary={() => undefined}
          />
        ) : null}
        {panel === "plan" ? (
          <RoutineLivingDashboard
            childName={childName}
            childrenList={childrenList}
            activeChildId={1}
            onSelectChild={() => undefined}
            childIdsWithTodayRoutine={new Set([1])}
            hasPlan
            firstAction={items[0]}
            arcPreview={items.map((item) => ({ time: item.time, label: item.activity }))}
            onPrimary={() => undefined}
            onRebuild={() => undefined}
          />
        ) : null}
        {panel === "generate" ? (
          <div className="routine-living-page routine-living-shell parent-hub-premium">
            <RoutineLivingOpening childName={childName} chips={chips} />
          </div>
        ) : null}
        {panel === "result" ? (
          <div className="routine-living-page routine-living-shell parent-hub-premium">
            <RoutineLivingResult
              childName={childName}
              dateIso="2026-08-15"
              title="Today with John"
              items={items}
              hasSchool
              mood="calm"
              weatherOutdoor="yes"
              caregiver="mom"
              goals="Calmer mornings"
              onBegin={() => undefined}
              onRebuild={() => undefined}
            />
          </div>
        ) : null}
        {panel === "empty" || panel === "plan" ? <MobileTabBar visible /> : null}
      </div>
    </Router>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);
