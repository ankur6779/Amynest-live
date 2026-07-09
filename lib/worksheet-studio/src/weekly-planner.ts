import type { WorksheetDocument, WorksheetGenerateRequest } from "./types.js";
import { generateWorksheetLocal } from "./local-generator.js";
import { nextId } from "./renderer/page-layout.js";

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

const DAY_FOCUS = [
  "introduction and tracing",
  "matching and recognition",
  "counting and math practice",
  "reading and writing",
  "revision and assessment",
];

export interface WeeklyPlanDay {
  day: (typeof WEEKDAYS)[number];
  request: WorksheetGenerateRequest;
  document: WorksheetDocument;
}

export interface WeeklyPlan {
  id: string;
  topic: string;
  classLevel: WorksheetGenerateRequest["classLevel"];
  days: WeeklyPlanDay[];
  createdAt: string;
}

export function buildWeeklyPlanRequests(
  base: WorksheetGenerateRequest,
  topic?: string,
): WorksheetGenerateRequest[] {
  const t = topic ?? base.prompt;
  return WEEKDAYS.map((day, i) => ({
    ...base,
    prompt: `${t} — ${day}: ${DAY_FOCUS[i]}`,
    difficulty: i < 2 ? "easy" : i < 4 ? "medium" : "hard",
    pageCount: 1,
  }));
}

export function generateWeeklyPlan(base: WorksheetGenerateRequest, topic?: string): WeeklyPlan {
  const requests = buildWeeklyPlanRequests(base, topic);
  const days: WeeklyPlanDay[] = requests.map((request, i) => ({
    day: WEEKDAYS[i]!,
    request,
    document: generateWorksheetLocal(request),
  }));
  return {
    id: nextId("week"),
    topic: topic ?? base.prompt,
    classLevel: base.classLevel,
    days,
    createdAt: new Date().toISOString(),
  };
}
