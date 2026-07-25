/**
 * Visit opener — birth-chart noticing + optional layered lenses.
 * Never frames birth astronomy as live "today's sky" weather.
 */

export type TodaysSkyInput = {
  childName: string;
  moonSign: string;
  moonPhaseLabel: string;
  sunSign: string;
  daySky: boolean;
  visitIndex: number;
};

export type TodaysSkyContent = {
  title: string;
  moonPhase: string;
  skyMood: string;
  reflectionPrompt: string;
  parentingSuggestion: string;
  astronomyNote: string;
  traditionNote: string;
  birthChartNote: string;
  reflectionNote: string;
};

const MOODS = [
  "Calm curiosity",
  "Soft belonging",
  "Gentle brightness",
  "Quiet wonder",
  "Tender steadiness",
  "Open listening",
];

const PROMPTS = [
  "What did they explore today before they asked for help?",
  "Where did belonging show up in a small moment?",
  "What made their eyes light up — even briefly?",
  "When did they need a softer landing?",
  "What question are they circling without naming yet?",
];

const SUGGESTIONS = [
  "Offer five unhurried minutes of undivided noticing tonight.",
  "Name one effort you saw — not the outcome.",
  "Let them lead a tiny ritual before bedtime.",
  "Sit beside a feeling without fixing it first.",
  "Invite one more curious question than usual.",
];

export function buildTodaysSky(input: TodaysSkyInput): TodaysSkyContent {
  const i = Math.abs(input.visitIndex);
  const child = input.childName.trim() || "your child";
  const phase = input.moonPhaseLabel;

  return {
    title: "Today's visit",
    moonPhase: phase,
    skyMood: MOODS[i % MOODS.length]!,
    reflectionPrompt: PROMPTS[i % PROMPTS.length]!,
    parentingSuggestion: SUGGESTIONS[i % SUGGESTIONS.length]!,
    astronomyNote: `Birth astronomy on record: ${phase} Moon in ${input.moonSign}, Sun in ${input.sunSign}. ${
      input.daySky
        ? "Rising is unavailable without birth time — Day Sky remains valid."
        : "Full sky context includes Rising when birth time is known."
    } These are birth-chart facts, not today's live sky.`,
    traditionNote: `Traditional storytelling may poetically link a ${phase.toLowerCase()} Moon with emotional rhythm and belonging — cultural metaphor, not diagnosis.`,
    birthChartNote: `${child}'s birth chart is a fixed noticing lens. It does not change with tonight's weather or forecast their day.`,
    reflectionNote: `For ${child}: hold today's mood as weather in your relationship, not identity. Notice without predicting.`,
  };
}
