/**
 * Campaign mode — connected video arcs instead of isolated uploads.
 */

import type { TopicCategory } from "../../types/index.js";
import type { CampaignModeDefinition, CampaignModeId } from "../types.js";

const MODES: CampaignModeDefinition[] = [
  {
    id: "none",
    label: "No active campaign",
    durationDays: 0,
    seriesIds: [],
    preferCategories: [],
    connectedArc: [],
    objective: "Balanced evergreen editorial calendar",
  },
  {
    id: "7-day-reading-challenge",
    label: "7-Day Reading Challenge",
    durationDays: 7,
    seriesIds: ["study-zone-mastery", "audio-adventures", "brain-boost"],
    preferCategories: ["Learning", "Brain Development", "Speech"],
    connectedArc: [
      "Day 1: Spark curiosity",
      "Day 2: Short reading win",
      "Day 3: Parent coaching tip",
      "Day 4: Speech + story link",
      "Day 5: Streak motivation",
      "Day 6: Family reading moment",
      "Day 7: Celebrate progress + CTA",
    ],
    objective: "Build a week-long reading habit with AmyNest",
  },
  {
    id: "30-day-routine-reset",
    label: "30-Day Routine Reset",
    durationDays: 30,
    seriesIds: ["routine-reset", "healthy-habits", "amy-coach-tips"],
    preferCategories: ["Routines", "Parenting", "Sleep", "Nutrition"],
    connectedArc: [
      "Week 1: Diagnose friction",
      "Week 2: Morning reset",
      "Week 3: Evening calm",
      "Week 4: Lock the habit + premium guide",
    ],
    objective: "Help families rebuild calm daily structure",
  },
  {
    id: "healthy-habit-week",
    label: "Healthy Habit Week",
    durationDays: 7,
    seriesIds: ["healthy-habits", "routine-reset"],
    preferCategories: ["Nutrition", "Sleep", "Baby Care", "Safety"],
    connectedArc: [
      "Hydration",
      "Sleep wind-down",
      "Movement play",
      "Screen-time balance",
      "Meal calm",
      "Weekend wellness",
      "Celebrate the streak",
    ],
    objective: "One healthy habit focus per day",
  },
  {
    id: "confidence-building-month",
    label: "Confidence Building Month",
    durationDays: 30,
    seriesIds: ["amy-coach-tips", "speech-journey", "brain-boost"],
    preferCategories: [
      "Emotional Intelligence",
      "Speech",
      "Parenting",
      "Daily Motivation",
    ],
    connectedArc: [
      "Week 1: Name the feeling",
      "Week 2: Small brave steps",
      "Week 3: Speech confidence",
      "Week 4: Family celebration",
    ],
    objective: "Grow child confidence with warm coaching",
  },
  {
    id: "back-to-school-series",
    label: "Back to School Series",
    durationDays: 21,
    seriesIds: [
      "study-zone-mastery",
      "routine-reset",
      "speech-journey",
      "amy-coach-tips",
    ],
    preferCategories: ["Learning", "Routines", "Speech", "Parenting"],
    connectedArc: [
      "School bag calm",
      "Morning launch pad",
      "Homework without tears",
      "Speech readiness",
      "Weekend catch-up learning",
      "Parent pep talk",
    ],
    objective: "Support families through school reopening",
  },
];

const BY_ID = new Map(MODES.map((m) => [m.id, m]));

export function getCampaignMode(id: CampaignModeId): CampaignModeDefinition {
  return BY_ID.get(id) ?? MODES[0]!;
}

export function listCampaignModes(): CampaignModeDefinition[] {
  return MODES.filter((m) => m.id !== "none");
}

export function campaignPrefersCategory(
  modeId: CampaignModeId,
  category: TopicCategory,
): boolean {
  const mode = getCampaignMode(modeId);
  if (mode.id === "none") return true;
  return mode.preferCategories.includes(category);
}
