/**
 * Deterministic intent classification — keyword / pattern rules only.
 */

import type { ConversationIntent } from "./types.js";

type Rule = {
  intent: ConversationIntent;
  weight: number;
  patterns: RegExp[];
};

const RULES: Rule[] = [
  {
    intent: "sleep_guidance",
    weight: 1.2,
    patterns: [
      /\bsleep\b/i,
      /\bnap\b/i,
      /\bbedtime\b/i,
      /\bwake\s*up\b/i,
      /\binsomnia\b/i,
      /\bnight\s*waking\b/i,
    ],
  },
  {
    intent: "learning_guidance",
    weight: 1.15,
    patterns: [
      /\blearn(ing)?\b/i,
      /\bfocus\b/i,
      /\bhomework\b/i,
      /\bstudy\b/i,
      /\bschool\b/i,
      /\battention\b/i,
      /\breading\b/i,
    ],
  },
  {
    intent: "routine_help",
    weight: 1.1,
    patterns: [
      /\broutine\b/i,
      /\bschedule\b/i,
      /\bmorning\b/i,
      /\bhabit\b/i,
      /\btransition\b/i,
      /\bconsistency\b/i,
    ],
  },
  {
    intent: "emotional_support",
    weight: 1.15,
    patterns: [
      /\bemotion(al)?\b/i,
      /\banxious\b/i,
      /\bfeelings?\b/i,
      /\boverwhelm(ed)?\b/i,
      /\bmeltdown\b/i,
      /\bco-?regulat/i,
      /\bsensitive\b/i,
      /\bcalm(ing)?\b/i,
    ],
  },
  {
    intent: "behaviour_guidance",
    weight: 1.1,
    patterns: [
      /\bbehaviou?r\b/i,
      /\btantrum\b/i,
      /\bdefian/i,
      /\bdiscipline\b/i,
      /\blistening\b/i,
      /\bact\s*out\b/i,
      /\bboundaries\b/i,
    ],
  },
  {
    intent: "milestone_question",
    weight: 1.1,
    patterns: [
      /\bmilestone\b/i,
      /\bwalking\b/i,
      /\btalking\b/i,
      /\bfirst\s+words?\b/i,
      /\bdevelopment(al)?\b/i,
      /\bage[- ]?appropriate\b/i,
    ],
  },
  {
    intent: "astrology_insight",
    weight: 1.05,
    patterns: [
      /\bsun\b/i,
      /\bmoon\b/i,
      /\brising\b/i,
      /\bchart\b/i,
      /\bsign\b/i,
      /\bnakshatra\b/i,
      /\bdasha\b/i,
      /\bstrology\b/i,
      /\bsky\b/i,
      /\bhoroscope\b/i,
    ],
  },
  {
    intent: "parent_question",
    weight: 0.9,
    patterns: [
      /\bhow\s+(can|do|should)\s+i\b/i,
      /\bwhat\s+should\s+i\b/i,
      /\bhelp\s+me\b/i,
      /\badvice\b/i,
      /\bsupport\b/i,
    ],
  },
  {
    intent: "general_conversation",
    weight: 0.7,
    patterns: [
      /\bhello\b/i,
      /\bhi\b/i,
      /\bthanks?\b/i,
      /\bwhat\s+stands\s+out\b/i,
      /\btell\s+me\b/i,
    ],
  },
];

const ENTRY_BOOST: Partial<Record<string, ConversationIntent>> = {
  sky: "astrology_insight",
  reflect: "emotional_support",
  routine: "routine_help",
  learn: "learning_guidance",
  sleep: "sleep_guidance",
};

export function classifyIntent(input: {
  userQuestion: string;
  entryPoint?: string | null;
}): { intent: ConversationIntent; confidence: number } {
  const q = (input.userQuestion ?? "").trim();
  if (!q) {
    return { intent: "unknown", confidence: 0.35 };
  }

  const scores = new Map<ConversationIntent, number>();

  for (const rule of RULES) {
    let hits = 0;
    for (const p of rule.patterns) {
      if (p.test(q)) hits += 1;
    }
    if (hits > 0) {
      scores.set(
        rule.intent,
        (scores.get(rule.intent) ?? 0) + hits * rule.weight,
      );
    }
  }

  const entry = (input.entryPoint ?? "").toLowerCase().trim();
  const entryIntent = ENTRY_BOOST[entry];
  if (entryIntent) {
    scores.set(entryIntent, (scores.get(entryIntent) ?? 0) + 0.4);
  }

  if (scores.size === 0) {
    // Short greetings / thin questions
    if (q.length < 24) {
      return { intent: "general_conversation", confidence: 0.5 };
    }
    return { intent: "parent_question", confidence: 0.45 };
  }

  // Prefer specific intents over generic parent_question / general_conversation.
  const specific = [...scores.entries()].filter(
    ([intent]) =>
      intent !== "parent_question" && intent !== "general_conversation",
  );
  const pool = specific.length > 0 ? specific : [...scores.entries()];
  const ranked = pool.sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  const [intent, top] = ranked[0]!;
  const second = ranked[1]?.[1] ?? 0;
  const margin = top - second;
  const confidence = Math.min(
    0.95,
    Math.round((0.55 + Math.min(0.35, top * 0.08) + Math.min(0.15, margin * 0.1)) * 100) /
      100,
  );

  return { intent, confidence };
}
