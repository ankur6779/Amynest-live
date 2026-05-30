/**
 * Age-band activities — single source of truth for Infant Hub + Baby Today.
 */
export type InfantAgeBand =
  | "0-3"
  | "3-6"
  | "6-9"
  | "9-12"
  | "12-18"
  | "18-24";

export type InfantActivity = {
  emoji: string;
  title: string;
  desc: string;
  duration: string;
};

export function getInfantAgeBand(months: number): InfantAgeBand {
  if (months < 3) return "0-3";
  if (months < 6) return "3-6";
  if (months < 9) return "6-9";
  if (months < 12) return "9-12";
  if (months < 18) return "12-18";
  return "18-24";
}

export const INFANT_ACTIVITIES: Record<InfantAgeBand, InfantActivity[]> = {
  "0-3": [
    {
      emoji: "🖤🤍",
      title: "High-Contrast Visuals",
      desc: "Show black-and-white patterns 20–30 cm from baby's eyes.",
      duration: "5 min",
    },
  ],
  "3-6": [
    {
      emoji: "🤸",
      title: "Tummy Time Games",
      desc: "Support chest with a rolled towel; move a toy side to side.",
      duration: "3–5 min",
    },
    {
      emoji: "🪞",
      title: "Mirror Discovery",
      desc: "Hold an unbreakable mirror during tummy time.",
      duration: "2–3 min",
    },
    {
      emoji: "🎵",
      title: "Sing & Bounce",
      desc: "Gentle bounce to a simple rhyme on your lap.",
      duration: "3–5 min",
    },
  ],
  "6-9": [
    {
      emoji: "🛁",
      title: "Bath Play",
      desc: "Cups and soft toys for pouring and splashing.",
      duration: "10–15 min",
    },
  ],
  "9-12": [
    {
      emoji: "⚽",
      title: "Roll the Ball",
      desc: "Soft ball back-and-forth for turn-taking.",
      duration: "5–10 min",
    },
    {
      emoji: "🏡",
      title: "Safe Exploration Crawl",
      desc: "Floor space with cushions and low boxes.",
      duration: "15–20 min",
    },
  ],
  "12-18": [
    {
      emoji: "🎨",
      title: "Finger Painting",
      desc: "Edible paint — messy sensory play.",
      duration: "15 min",
    },
    {
      emoji: "🚶",
      title: "Outdoor Stroll & Name",
      desc: "Walk outside and name what you see.",
      duration: "20 min",
    },
  ],
  "18-24": [
    {
      emoji: "🧩",
      title: "Simple Shape Puzzle",
      desc: "Chunky 2–3 piece puzzle without correcting.",
      duration: "10 min",
    },
    {
      emoji: "📚",
      title: "Picture Book Routine",
      desc: "Same book, same time — point and name objects.",
      duration: "10–15 min",
    },
    {
      emoji: "⚽",
      title: "Kick & Chase",
      desc: "Soft ball near feet or gentle rolling during play.",
      duration: "10 min",
    },
  ],
};

export function pickDailyActivity(
  ageMonths: number,
  seed: string,
): InfantActivity | null {
  const band = getInfantAgeBand(ageMonths);
  const list = INFANT_ACTIVITIES[band] ?? [];
  if (list.length === 0) return null;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return list[Math.abs(h) % list.length] ?? null;
}

export function suggestedFeedIntervalMin(ageMonths: number): number {
  if (ageMonths < 3) return 150;
  if (ageMonths < 6) return 180;
  if (ageMonths < 12) return 210;
  return 240;
}

export type SleepScoreLabel = "excellent" | "good" | "fair" | "building";

export function computeSleepScoreLabel(
  sessionsToday: number,
  totalSleepMin: number,
  ageMonths: number,
): SleepScoreLabel {
  const targetMin =
    ageMonths < 3 ? 960 : ageMonths < 6 ? 900 : ageMonths < 12 ? 840 : 780;
  if (sessionsToday >= 2 && totalSleepMin >= targetMin * 0.85) return "excellent";
  if (sessionsToday >= 1 && totalSleepMin >= targetMin * 0.6) return "good";
  if (sessionsToday >= 1) return "fair";
  return "building";
}

export function formatSleepScoreLabel(label: SleepScoreLabel): string {
  const map: Record<SleepScoreLabel, string> = {
    excellent: "Excellent",
    good: "Good",
    fair: "Fair",
    building: "Building data",
  };
  return map[label];
}
