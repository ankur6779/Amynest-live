/**
 * Optional global competition framing — fair, no pay-to-win.
 * Uses existing weekly leaderboard points; only presentation + age brackets.
 */

export type AgeBracket = "4-5" | "6-7" | "8-10";

export function ageBracket(ageYears: number): AgeBracket {
  if (ageYears <= 5) return "4-5";
  if (ageYears <= 7) return "6-7";
  return "8-10";
}

export type WeeklyEvent = {
  id: string;
  title: string;
  weekKey: string;
  bracket: AgeBracket;
  blurb: string;
  seasonReward: string;
};

export function currentWeeklyEvent(weekKey: string, ageYears: number): WeeklyEvent {
  const bracket = ageBracket(ageYears);
  return {
    id: `weekly_${weekKey}_${bracket}`,
    title: "Weekly Bead Cup",
    weekKey,
    bracket,
    blurb: `Fair play for ages ${bracket}. Ranked by weekly points — practice earns cups, purchases never do.`,
    seasonReward: "Season Crest (learning only)",
  };
}
