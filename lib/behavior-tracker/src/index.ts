export type LangKey = "en";

export type QuickBehaviorKey =
  | "tantrum"
  | "crying"
  | "not_listening"
  | "good_behavior"
  | "low_energy"
  | "sharing"
  | "calm";

export type TriggerKey =
  | "hunger"
  | "sleep"
  | "screen_time"
  | "environment"
  | "unknown";

export type BehaviorType = "positive" | "negative" | "neutral";

export interface QuickBehaviorDef {
  emoji: string;
  type: BehaviorType;
  color: string;
  label: Record<LangKey, string>;
  behaviorText: Record<LangKey, string>;
}

export const QUICK_BEHAVIORS: Record<QuickBehaviorKey, QuickBehaviorDef> = {
  tantrum: {
    emoji: "😡",
    type: "negative",
    color: "#EF4444",
    label: { en: "Tantrum" },
    behaviorText: {
      en: "Tantrum / Meltdown",
    },
  },
  crying: {
    emoji: "😭",
    type: "negative",
    color: "#F59E0B",
    label: { en: "Crying" },
    behaviorText: {
      en: "Crying Episode",
    },
  },
  not_listening: {
    emoji: "🚫",
    type: "negative",
    color: "#8B5CF6",
    label: { en: "Not Listening" },
    behaviorText: {
      en: "Not Listening",
    },
  },
  good_behavior: {
    emoji: "😊",
    type: "positive",
    color: "#10B981",
    label: { en: "Good Behavior" },
    behaviorText: {
      en: "Good Behavior",
    },
  },
  low_energy: {
    emoji: "😴",
    type: "neutral",
    color: "#6B7280",
    label: { en: "Low Energy" },
    behaviorText: {
      en: "Low Energy / Tired",
    },
  },
  sharing: {
    emoji: "🤝",
    type: "positive",
    color: "#06B6D4",
    label: { en: "Sharing" },
    behaviorText: {
      en: "Shared with others",
    },
  },
  calm: {
    emoji: "😌",
    type: "positive",
    color: "#34D399",
    label: { en: "Calm" },
    behaviorText: {
      en: "Stayed calm",
    },
  },
};

export const TRIGGERS: Record<TriggerKey, { emoji: string; label: Record<LangKey, string> }> = {
  hunger: {
    emoji: "🍽️",
    label: { en: "Hunger" },
  },
  sleep: {
    emoji: "😴",
    label: { en: "Sleepy" },
  },
  screen_time: {
    emoji: "📱",
    label: { en: "Screen Time" },
  },
  environment: {
    emoji: "🏠",
    label: { en: "Environment" },
  },
  unknown: {
    emoji: "❓",
    label: { en: "Not sure" },
  },
};

export const SOLUTIONS: Record<QuickBehaviorKey, Record<LangKey, string[]>> = {
  tantrum: {
    en: [
      "Stay calm — your calm is contagious",
      "Get down to their eye level",
      "Name the emotion: 'I see you're frustrated'",
      "Give them a safe space to feel it out",
    ],
  },
  crying: {
    en: [
      "Validate their feelings — 'It's okay to cry'",
      "Offer a hug without forcing it",
      "Distract with a favorite activity or toy",
      "Check for hunger or tiredness first",
    ],
  },
  not_listening: {
    en: [
      "Make eye contact before speaking",
      "Use short, clear instructions (one at a time)",
      "Get down to their level physically",
      "Give choices: 'Do you want to first or second?'",
    ],
  },
  good_behavior: {
    en: [
      "Praise specifically: 'I loved how you shared your snack!'",
      "Give a small reward or sticker",
      "Tell someone else in front of them",
      "Write it in a 'win book' together",
    ],
  },
  low_energy: {
    en: [
      "Check sleep schedule and adjust bedtime",
      "Offer a nutritious snack",
      "Short outdoor walk can boost energy",
      "Reduce screen time before activity",
    ],
  },
  sharing: {
    en: [
      "Celebrate the moment enthusiastically",
      "Add +10 reward points",
      "Model sharing yourself regularly",
    ],
  },
  calm: {
    en: [
      "Acknowledge: 'You handled that so well!'",
      "Note what helped them stay calm",
      "Reinforce with a sticker or hug",
    ],
  },
};

export interface LogEntry {
  id: number;
  childId?: number;
  type: string;
  behavior: string;
  notes?: string | null;
  date: string;
  createdAt?: string;
}

function hourFromDate(d: string): number {
  return new Date(d).getHours();
}

function triggerFromNotes(notes: string | null | undefined): TriggerKey | null {
  if (!notes) return null;
  const m = notes.match(/\[trigger:(\w+)\]/);
  return m ? (m[1] as TriggerKey) : null;
}

export interface BehaviorInsight {
  text: string;
  icon: string;
}

export function buildAmyInsights(logs: LogEntry[], lang: LangKey): BehaviorInsight[] {
  const insights: BehaviorInsight[] = [];
  if (logs.length === 0) return insights;

  const negLogs = logs.filter((l) => l.type === "negative");
  const posLogs = logs.filter((l) => l.type === "positive");

  if (negLogs.length >= 2) {
    const hours = negLogs.map((l) => hourFromDate(l.createdAt ?? l.date));
    const avgHour = Math.round(hours.reduce((a, b) => a + b, 0) / hours.length);
    const timeLabel =
      avgHour < 12
        ? "morning"
        : avgHour < 17
        ? "afternoon"
        : "evening";

    const insightText = `Challenging behaviors tend to happen in the ${timeLabel}. Consider adjusting routines around this time.`;
    insights.push({ text: insightText, icon: "🕐" });
  }

  const triggerCounts: Partial<Record<TriggerKey, number>> = {};
  logs.forEach((l) => {
    const t = triggerFromNotes(l.notes);
    if (t) triggerCounts[t] = (triggerCounts[t] ?? 0) + 1;
  });
  const topTrigger = (Object.entries(triggerCounts) as [TriggerKey, number][]).sort(
    (a, b) => b[1] - a[1]
  )[0];
  if (topTrigger && topTrigger[1] >= 2) {
    const tLabel = TRIGGERS[topTrigger[0]].label[lang];
    const t = `${tLabel} seems to be a common trigger. Watch for it and prepare in advance.`;
    insights.push({ text: t, icon: "⚡" });
  }

  const total = logs.length;
  const posRatio = posLogs.length / total;
  if (posRatio >= 0.6 && total >= 3) {
    const t = "Great week! Positive behaviors are dominating. Keep the momentum going.";
    insights.push({ text: t, icon: "🌟" });
  } else if (negLogs.length > posLogs.length && total >= 3) {
    const t = "Challenging days — try adding a calming activity before bedtime.";
    insights.push({ text: t, icon: "💡" });
  }

  return insights;
}

export function computeScore(logs: LogEntry[]): number {
  if (logs.length === 0) return 50;
  const pos = logs.filter((l) => l.type === "positive").length;
  const neg = logs.filter((l) => l.type === "negative").length;
  const neu = logs.filter((l) => l.type === "neutral").length;
  const raw = (pos * 15 - neg * 8 + neu * 2) / Math.max(logs.length, 1);
  const norm = Math.min(100, Math.max(0, 50 + raw * 5));
  return Math.round(norm);
}

export function scoreLabel(score: number, lang: LangKey): string {
  if (score >= 80)
    return "Excellent 🌟";
  if (score >= 60)
    return "Good 👍";
  if (score >= 40)
    return "Okay 😐";
  return "Needs attention 💙";
}

export const UI_LABELS: Record<LangKey, {
  quickLog: string;
  todaySummary: string;
  amyInsights: string;
  weeklyTrends: string;
  solutions: string;
  situationMode: string;
  loggedToday: string;
  positive: string;
  challenging: string;
  neutral: string;
  score: string;
  trigger: string;
  selectTrigger: string;
  tap1Log: string;
  childHelp: string;
  childAngry: string;
  childNotListening: string;
  noInsights: string;
  noDataYet: string;
  days: string[];
  pointsEarned: string;
}> = {
  en: {
    quickLog: "Quick Log",
    todaySummary: "Today's Summary",
    amyInsights: "Amy AI Insights",
    weeklyTrends: "Weekly Trends",
    solutions: "Solutions & Tips",
    situationMode: "Quick Help 🆘",
    loggedToday: "Logged today",
    positive: "Positive",
    challenging: "Challenging",
    neutral: "Neutral",
    score: "Score",
    trigger: "Trigger",
    selectTrigger: "What triggered it?",
    tap1Log: "Tap once to log instantly",
    childHelp: "Child crying",
    childAngry: "Child angry",
    childNotListening: "Not listening",
    noInsights: "Log a few behaviors to unlock Amy's pattern insights.",
    noDataYet: "No behaviors logged yet. Start tapping below!",
    days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    pointsEarned: "pts earned",
  },
};

export const SITUATION_HELP: Record<
  "crying" | "angry" | "not_listening",
  Record<LangKey, string[]>
> = {
  crying: {
    en: [
      "Kneel to their level and make gentle eye contact",
      "Say: 'I'm here with you, it's okay to cry'",
      "Offer a quiet hug — don't try to stop the tears",
    ],
  },
  angry: {
    en: [
      "Do NOT match their energy — stay slow and calm",
      "Remove triggers if possible (screen, toy conflict)",
      "After calm: talk about what happened",
    ],
  },
  not_listening: {
    en: [
      "Pause everything — get on their physical level",
      "Use their name once, then wait for eye contact",
      "Give a binary choice: 'Shoes first or jacket first?'",
    ],
  },
};

export const QUICK_BEHAVIOR_KEYS: QuickBehaviorKey[] = [
  "tantrum",
  "crying",
  "not_listening",
  "good_behavior",
  "low_energy",
  "sharing",
  "calm",
];

export const TRIGGER_KEYS: TriggerKey[] = [
  "hunger",
  "sleep",
  "screen_time",
  "environment",
  "unknown",
];

export function encodeTriggerNote(trigger: TriggerKey, extraNote?: string): string {
  return `[trigger:${trigger}]${extraNote ? " " + extraNote : ""}`;
}

export function decodeTrigger(notes: string | null | undefined): TriggerKey | null {
  return triggerFromNotes(notes);
}
