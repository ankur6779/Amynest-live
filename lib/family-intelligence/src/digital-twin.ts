import type { DigitalTwin, FamilyIntelligenceInput, MemoryEntry } from "./types.js";

export function buildDigitalTwin(
  input: FamilyIntelligenceInput,
  memory: MemoryEntry[],
): DigitalTwin {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const habits: string[] = [];

  if (input.routineCompletionRate7d >= 0.7) strengths.push("consistent_routines");
  else if (input.routineCompletionRate7d < 0.4) weaknesses.push("routine_consistency");

  if (input.strongSubjects.length > 0) strengths.push(...input.strongSubjects.map((s) => `strong_${s}`));
  if (input.weakSubjects.length > 0) weaknesses.push(...input.weakSubjects.map((s) => `weak_${s}`));

  if (input.currentStreakDays >= 3) habits.push("daily_check_in");
  if (input.lessonsCompleted7d >= 3) habits.push("regular_learning");
  if (input.notificationsOpened7d >= 3) habits.push("notification_responsive");

  const positiveLearningMemory = memory.find(
    (m) => m.category === "learning_style" && m.outcome === "positive",
  );
  const learningStyle = positiveLearningMemory?.key ?? inferLearningStyle(input);

  const positiveNotifMemory = memory.find(
    (m) => m.category === "notification" && m.outcome === "positive",
  );
  const engagementStyle = positiveNotifMemory?.key ?? inferEngagementStyle(input);

  const preferredTimes = inferPreferredTimes(input);

  return {
    strengths: [...new Set(strengths)],
    weaknesses: [...new Set(weaknesses)],
    habits: [...new Set(habits)],
    learningStyle,
    engagementStyle,
    preferredTimes,
    updatedAt: new Date().toISOString(),
  };
}

function inferLearningStyle(input: FamilyIntelligenceInput): string {
  if (input.lessonsCompleted7d >= 5) return "self_paced_consistent";
  if (input.weakSubjects.includes("english")) return "needs_reading_scaffolding";
  if (input.parentGoals.includes("improve_focus")) return "short_focused_sessions";
  return "exploratory";
}

function inferEngagementStyle(input: FamilyIntelligenceInput): string {
  if (input.notificationsOpened7d >= 4) return "notification_driven";
  if (input.sessionsLast7d >= 5) return "app_native";
  return "needs_nudge";
}

function inferPreferredTimes(input: FamilyIntelligenceInput): string[] {
  const times: string[] = [];
  if (input.routineCompletionRate7d >= 0.5) times.push("morning_routine");
  if (input.lessonsCompleted7d >= 2) times.push("after_school");
  if (input.sleepQualityAvg7d != null && input.sleepQualityAvg7d >= 3) times.push("evening_wind_down");
  return times.length > 0 ? times : ["morning", "evening"];
}

export function applyMemoryToTwin(
  twin: DigitalTwin,
  memory: MemoryEntry[],
): DigitalTwin {
  for (const m of memory) {
    if (m.outcome !== "positive") continue;
    if (m.category === "learning_style" && !twin.strengths.includes(m.key)) {
      twin.learningStyle = m.key;
    }
    if (m.category === "notification" && m.outcome === "positive") {
      twin.engagementStyle = m.key;
    }
    if (m.category === "intervention" && m.outcome === "positive") {
      twin.habits.push(m.key);
    }
  }
  twin.habits = [...new Set(twin.habits)];
  return twin;
}
