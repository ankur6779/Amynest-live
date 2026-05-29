import type { CampaignDefinition, NotificationGoal } from "./types.js";

export const CAMPAIGN_DEFINITIONS: CampaignDefinition[] = [
  {
    id: "healthy_eating_7d",
    name: "Healthy Eating Challenge",
    durationDays: 7,
    goal: "GOAL_PARENT_ENGAGEMENT",
    steps: [
      { day: 1, title: "Day 1: Colorful plate 🥗", body: "Add one new vegetable to today's snack.", deepLink: "/meals" },
      { day: 2, title: "Day 2: Hydration check 💧", body: "Offer water before the next snack.", deepLink: "/meals" },
      { day: 3, title: "Day 3: Protein power", body: "Include protein at lunch today.", deepLink: "/meals" },
      { day: 4, title: "Day 4: Family meal", body: "Eat one meal together without screens.", deepLink: "/meals" },
      { day: 5, title: "Day 5: Smart swap", body: "Swap one processed snack for fruit.", deepLink: "/meals" },
      { day: 6, title: "Day 6: Prep together", body: "Let your child help prep tomorrow's snack.", deepLink: "/meals" },
      { day: 7, title: "Day 7: Celebrate! 🎉", body: "You completed the Healthy Eating Challenge.", deepLink: "/hub" },
    ],
  },
  {
    id: "reading_7d",
    name: "Reading Challenge",
    durationDays: 7,
    goal: "GOAL_LEARNING_COMPLETION",
    steps: [
      { day: 1, title: "Day 1: 5-minute read 📖", body: "Read together for 5 minutes before bed.", deepLink: "/story-time" },
      { day: 2, title: "Day 2: Picture walk", body: "Look at pictures and ask what might happen next.", deepLink: "/story-time" },
      { day: 3, title: "Day 3: Sound hunt", body: "Find 3 words starting with the same letter.", deepLink: "/study-zone" },
      { day: 4, title: "Day 4: Retell", body: "Ask your child to retell yesterday's story.", deepLink: "/story-time" },
      { day: 5, title: "Day 5: New genre", body: "Try a story from a genre you haven't read.", deepLink: "/story-time" },
      { day: 6, title: "Day 6: Read aloud", body: "Take turns reading sentences.", deepLink: "/story-time" },
      { day: 7, title: "Day 7: Reading star ⭐", body: "One week of reading — celebrate the habit.", deepLink: "/hub" },
    ],
  },
  {
    id: "phonics_14d",
    name: "Phonics Challenge",
    durationDays: 14,
    goal: "GOAL_LEARNING_COMPLETION",
    steps: [
      { day: 1, title: "Phonics Day 1 🔤", body: "Practice today's letter sound in Study Zone.", deepLink: "/study-zone" },
      { day: 3, title: "Phonics Day 3", body: "Find 5 objects that start with today's sound.", deepLink: "/study-zone" },
      { day: 5, title: "Phonics Day 5", body: "Blend two sounds into a simple word.", deepLink: "/study-zone" },
      { day: 7, title: "Phonics Week 1 done", body: "Halfway through — keep the daily sound habit.", deepLink: "/study-zone" },
      { day: 10, title: "Phonics Day 10", body: "Write today's letter together.", deepLink: "/study-zone" },
      { day: 14, title: "Phonics graduate 🎓", body: "Two weeks of phonics — amazing consistency.", deepLink: "/hub" },
    ],
  },
  {
    id: "screen_free_3d",
    name: "Screen-Free Challenge",
    durationDays: 3,
    goal: "GOAL_PARENT_ENGAGEMENT",
    steps: [
      { day: 1, title: "Screen-free hour 📵", body: "One hour before dinner — no screens.", deepLink: "/hub" },
      { day: 2, title: "Outdoor play", body: "15 minutes outside instead of a screen break.", deepLink: "/hub" },
      { day: 3, title: "Screen-free win 🌟", body: "Three days of mindful screen time.", deepLink: "/hub" },
    ],
  },
  {
    id: "routine_consistency_30d",
    name: "30-Day Routine Program",
    durationDays: 30,
    goal: "GOAL_ROUTINE_COMPLETION",
    steps: [
      { day: 1, title: "Routine program starts", body: "Complete 3 routine tasks today.", deepLink: "/routine" },
      { day: 7, title: "Week 1 check-in", body: "One week in — how is the routine feeling?", deepLink: "/routine" },
      { day: 14, title: "Halfway milestone", body: "14 days of showing up — adjust if needed.", deepLink: "/routine" },
      { day: 21, title: "Three weeks strong", body: "Routines are becoming automatic.", deepLink: "/routine" },
      { day: 30, title: "30-day routine graduate 🏆", body: "A full month of consistency.", deepLink: "/hub" },
    ],
  },
];

export function getCampaignById(id: string): CampaignDefinition | undefined {
  return CAMPAIGN_DEFINITIONS.find((c) => c.id === id);
}

export interface CampaignProgress {
  campaignId: string;
  currentStep: number;
  startedAt: Date;
  completedAt: Date | null;
  stepCompletedAt: Record<string, string>;
}

export function nextCampaignStep(
  campaign: CampaignDefinition,
  progress: CampaignProgress | null,
): { step: CampaignDefinition["steps"][number]; stepIndex: number } | null {
  if (progress?.completedAt) return null;
  const completedDays = new Set(
    Object.keys(progress?.stepCompletedAt ?? {}).map(Number),
  );
  for (let i = 0; i < campaign.steps.length; i++) {
    const step = campaign.steps[i]!;
    if (!completedDays.has(step.day)) {
      return { step, stepIndex: i + 1 };
    }
  }
  return null;
}

export function suggestCampaign(signals: {
  routineCompletionRate7d: number;
  lessonsCompleted7d: number;
  weakSubjects: string[];
}): CampaignDefinition | null {
  if (signals.routineCompletionRate7d < 0.4) {
    return getCampaignById("routine_consistency_30d") ?? null;
  }
  if (signals.lessonsCompleted7d < 2 && signals.weakSubjects.includes("english")) {
    return getCampaignById("reading_7d") ?? null;
  }
  if (signals.weakSubjects.some((s) => s.includes("phonics") || s === "english")) {
    return getCampaignById("phonics_14d") ?? null;
  }
  return getCampaignById("healthy_eating_7d") ?? null;
}

export function campaignNotification(
  campaign: CampaignDefinition,
  step: CampaignDefinition["steps"][number],
  childName: string,
): { title: string; body: string; deepLink: string; goal: NotificationGoal } {
  return {
    title: step.title.replace("Day", `${childName}'s Day`),
    body: step.body,
    deepLink: step.deepLink,
    goal: campaign.goal,
  };
}
