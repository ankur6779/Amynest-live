import type { FamilyIntelligenceSnapshot } from "@workspace/family-intelligence";
import type { AmyExecutiveMode } from "./types.js";
import { buildGoalCoachState } from "./goal-coach.js";
import { generateProactiveMessages } from "./proactive-amy.js";
import { generateSuccessForecasts } from "./success-forecasting.js";
import { buildFamilyTimeline } from "./family-timeline.js";
import { generateWeeklyReview } from "./weekly-review.js";

export function buildExecutiveMode(
  snapshot: FamilyIntelligenceSnapshot,
  timeline: ReturnType<typeof buildFamilyTimeline>,
): AmyExecutiveMode {
  const weekly = generateWeeklyReview(snapshot);
  const goalCoach = buildGoalCoachState(snapshot);
  const interventions = generateProactiveMessages(snapshot);
  const forecasts = generateSuccessForecasts(snapshot);

  const narration = buildNarration(snapshot, weekly.executiveSummary, interventions);

  return {
    narration,
    healthScore: snapshot.health.score,
    risks: snapshot.risks,
    goals: goalCoach,
    predictions: forecasts,
    interventions,
    weeklySummary: weekly.executiveSummary,
    timeline,
    orchestration: snapshot.orchestration,
  };
}

function buildNarration(
  snapshot: FamilyIntelligenceSnapshot,
  summary: string,
  interventions: { title: string; urgency: string }[],
): string {
  const urgent = interventions.filter((i) => i.urgency === "high");
  let intro = `Here's your family operating picture. ${summary}`;
  if (urgent.length > 0) {
    intro += ` I'd reach out about: ${urgent.map((i) => i.title).join(", ")}.`;
  } else if (snapshot.health.score >= 75) {
    intro += ` Things look steady — protect the habits that are working.`;
  }
  return intro;
}
