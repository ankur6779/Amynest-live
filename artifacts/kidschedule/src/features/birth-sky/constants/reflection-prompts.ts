/**
 * Local reflection prompt pack (Pack 5 §4.2) — non-LLM.
 * Rotate by ISO week; prompts are open questions only.
 */

export type ReflectionPromptDef = {
  id: string;
  text: string;
  /** Optional sky topic id for labeling — never fate claims. */
  topicId?: "moon_phase" | "sun" | "moon" | "rising" | "general";
};

export const REFLECTION_PROMPTS: ReflectionPromptDef[] = [
  {
    id: "prompt_notice_soft",
    text: "What do you notice about how {{child}} softens after a busy day?",
    topicId: "general",
  },
  {
    id: "prompt_moon_phase",
    text: "Looking at the Moon’s phase on their birth sky — what feeling does it leave you with tonight?",
    topicId: "moon_phase",
  },
  {
    id: "prompt_sun_warmth",
    text: "Where do you see warmth in {{child}} lately — even in a small moment?",
    topicId: "sun",
  },
  {
    id: "prompt_moon_care",
    text: "What kind of care seems to help {{child}} settle — and how do you know?",
    topicId: "moon",
  },
  {
    id: "prompt_place_memory",
    text: "If you close your eyes to their arrival day, what sensory detail do you still hold?",
    topicId: "general",
  },
  {
    id: "prompt_rising_threshold",
    text: "What threshold are you and {{child}} crossing together this week?",
    topicId: "rising",
  },
  {
    id: "prompt_gratitude_quiet",
    text: "What is one quiet thing you are grateful you get to witness in {{child}}?",
    topicId: "general",
  },
  {
    id: "prompt_tradition_bridge",
    text: "If a traditional story resonated — what part felt human, not predictive?",
    topicId: "general",
  },
];

/** Prompt offered when Tradition card “Reflect on this” is used. */
export const TRADITION_REFLECT_PROMPT: ReflectionPromptDef = {
  id: "prompt_from_tradition",
  text: "What from that traditional story do you want to hold lightly — as culture, not as fate?",
  topicId: "general",
};

export function isoWeekNumber(date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function promptForWeek(date = new Date()): ReflectionPromptDef {
  const idx = isoWeekNumber(date) % REFLECTION_PROMPTS.length;
  return REFLECTION_PROMPTS[idx]!;
}

export function fillPromptChild(text: string, childName: string): string {
  const name = childName.trim() || "your child";
  return text.split("{{child}}").join(name);
}
