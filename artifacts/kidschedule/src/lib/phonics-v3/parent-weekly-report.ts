/**
 * Weekly parent reading report — encouraging, actionable, visual-ready data.
 */
import type { ReadingAcademyLevelId } from "./reading-academy-levels";
import { getReadingAcademyLevel } from "./reading-academy-levels";
import type { FluencyBand } from "./ai-reading-coach";
import { fluencyBandLabel } from "./ai-reading-coach";

export type ParentWeeklyReport = {
  weekKey: string;
  readingLevel: ReadingAcademyLevelId;
  readingLevelName: string;
  storiesCompleted: number;
  wordsRead: number;
  pronunciationTrend: number;
  fluencyTrend: number;
  fluencyBand: FluencyBand;
  comprehensionScore: number;
  vocabularyGrowth: number;
  achievementsThisWeek: string[];
  homeActivities: string[];
  summaryLine: string;
};

export function buildParentWeeklyReport(opts: {
  letterGroupIndex: number;
  academyLevel: ReadingAcademyLevelId;
  storiesCompleted: number;
  wordsRead: number;
  pronunciationAvg: number;
  fluencyAvgAccuracy: number;
  fluencyBand: FluencyBand;
  comprehensionAvg: number;
  vocabularyTotal: number;
  newAchievements?: string[];
  childName?: string;
}): ParentWeeklyReport {
  const level = getReadingAcademyLevel(opts.academyLevel);
  const weekKey = weekKeyUtc();
  const name = opts.childName?.trim() || "Your child";

  const homeActivities = buildHomeActivities({
    academyLevel: opts.academyLevel,
    fluencyBand: opts.fluencyBand,
    comprehensionScore: opts.comprehensionAvg,
  });

  const summaryLine =
    opts.storiesCompleted > 0
      ? `${name} is on ${level.name} — ${opts.storiesCompleted} stor${opts.storiesCompleted === 1 ? "y" : "ies"} and ${opts.wordsRead} words this journey. Keep celebrating every page!`
      : `${name} is exploring ${level.name}. Short, joyful sessions beat long ones — even five minutes helps.`;

  return {
    weekKey,
    readingLevel: opts.academyLevel,
    readingLevelName: level.name,
    storiesCompleted: opts.storiesCompleted,
    wordsRead: opts.wordsRead,
    pronunciationTrend: Math.round(opts.pronunciationAvg),
    fluencyTrend: Math.round(opts.fluencyAvgAccuracy),
    fluencyBand: opts.fluencyBand,
    comprehensionScore: Math.round(opts.comprehensionAvg),
    vocabularyGrowth: opts.vocabularyTotal,
    achievementsThisWeek: opts.newAchievements ?? [],
    homeActivities,
    summaryLine,
  };
}

function weekKeyUtc(d = new Date()): string {
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function buildHomeActivities(opts: {
  academyLevel: ReadingAcademyLevelId;
  fluencyBand: FluencyBand;
  comprehensionScore: number;
}): string[] {
  const acts: string[] = [];
  if (opts.academyLevel <= 2) {
    acts.push("Play 'I spy' with beginning sounds for 3 minutes.");
    acts.push("Let your child teach you one letter sound.");
  } else if (opts.academyLevel <= 4) {
    acts.push("Read a short AmyNest book together — child reads, you cheer.");
    acts.push("Point to each word as you go — no rush.");
  } else {
    acts.push("Ask one feeling question after a story: 'How did they feel?'");
    acts.push("Re-read a favourite book for fluency (fun, not a test).");
  }
  if (opts.fluencyBand === "emerging" || opts.fluencyBand === "developing") {
    acts.push("Use slow playback once, then try at normal speed.");
  }
  if (opts.comprehensionScore > 0 && opts.comprehensionScore < 60) {
    acts.push("After reading, retell the story with toys or drawings.");
  }
  acts.push(`Fluency band: ${fluencyBandLabel(opts.fluencyBand)} — celebrate progress, not perfection.`);
  return acts.slice(0, 4);
}
