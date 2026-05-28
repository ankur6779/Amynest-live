import type { LearningProgressProfile } from "./types";
import type { WeeklyParentReport } from "./types";
import type { LearningMemory } from "./learning-memory";

export interface ProactiveTutorLine {
  id: string;
  tone: "celebrate" | "encourage" | "suggest" | "comeback";
  text: string;
}

export function buildProactiveTutorLines(input: {
  profile: LearningProgressProfile;
  memory: LearningMemory;
  weeklyReport?: WeeklyParentReport;
  childName?: string;
  daysInactive?: number;
}): ProactiveTutorLine[] {
  const { profile, memory, weeklyReport, childName, daysInactive = 0 } = input;
  const name = childName ?? "your child";
  const lines: ProactiveTutorLine[] = [];

  if (daysInactive >= 3) {
    lines.push({
      id: "comeback",
      tone: "comeback",
      text: `Welcome back — ${name} can pick up right where it feels good, with a short win today.`,
    });
    return lines;
  }

  if (weeklyReport?.countingImprovement) {
    lines.push({
      id: "counting",
      tone: "celebrate",
      text: `${name} is improving beautifully with numbers this week (${weeklyReport.countingImprovement}).`,
    });
  }

  if (weeklyReport?.pronunciationImprovementPct && weeklyReport.pronunciationImprovementPct > 0) {
    lines.push({
      id: "speech",
      tone: "celebrate",
      text: "Speaking confidence is growing — lovely progress this week. Keep celebrating small tries!",
    });
  }

  if (memory.strugglingSkills.includes("phonics_blending")) {
    lines.push({
      id: "blending",
      tone: "suggest",
      text: `Blending sounds is a perfect focus next — playful repetition helps ${name} feel capable.`,
    });
  }

  if (memory.favoriteModules.includes("story") || memory.strongestCategory === "stories") {
    lines.push({
      id: "stories",
      tone: "encourage",
      text: `${name} lights up around stories — an animal tale tonight could be magical.`,
    });
  }

  if (profile.streakDays >= 5) {
    lines.push({
      id: "streak",
      tone: "celebrate",
      text: `Great consistency this week — ${profile.streakDays} gentle learning days in a row.`,
    });
  }

  if (profile.masteryScore >= 40 && lines.length === 0) {
    lines.push({
      id: "momentum",
      tone: "celebrate",
      text: `${name} is building real learning momentum — you're doing a wonderful job supporting them.`,
    });
  }

  if (lines.length === 0) {
    lines.push({
      id: "default",
      tone: "encourage",
      text: `I'm here for anything — I'll match ${name}'s pace and keep it warm and playful.`,
    });
  }

  return lines.slice(0, 4);
}
