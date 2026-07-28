/**
 * Emotion-first Pixar storycraft for Golden Scripts.
 * Product never appears before the parent’s feeling is earned.
 */

import type { GoldenSeed } from "./seeds.js";

const PRODUCT_PATTERN =
  /\b(amynest|study zone|learning zone|speech coach|health lab|worksheet studio|birth sky|discovery worlds|abacus|nutrition hub|audio lessons|ask amy|ai coach|amy coach|premium|google play|app store)\b/i;

export function mentionsProduct(text: string): boolean {
  return PRODUCT_PATTERN.test(text);
}

/** Concrete parenting cold-open — no product, no feature names. */
export function buildParentingSituation(seed: GoldenSeed): string {
  if (seed.parentingSituation) return assertNoProduct(seed.parentingSituation, "parentingSituation");
  return assertNoProduct(defaultSituation(seed), "parentingSituation");
}

/** First 3 seconds: scroll-stop image + line. */
export function buildFirstThreeSeconds(seed: GoldenSeed, situation: string): string {
  if (seed.firstThreeSeconds) {
    return assertNoProduct(seed.firstThreeSeconds, "firstThreeSeconds");
  }
  return assertNoProduct(
    `VISUAL: ${openingVisual(seed)}. LINE (parent, almost to themselves): “${situationSplit(situation)}”`,
    "firstThreeSeconds",
  );
}

/** Hope in the final 3 seconds — emotion before download. */
export function buildHopeClose(seed: GoldenSeed): string {
  if (seed.hopeClose) return seed.hopeClose;
  return `The room feels lighter. The parent doesn’t feel alone in this anymore — just quietly hopeful for tomorrow.`;
}

export function buildEmotionFirstOpeningScene(seed: GoldenSeed, situation: string): string {
  return assertNoProduct(
    `${situation} No logo yet. No app UI yet. Just a real parent moment the audience recognizes in one breath.`,
    "openingScene",
  );
}

export function buildHopeEndingScene(seed: GoldenSeed, hopeClose: string): string {
  return `${hopeClose} Soft smile. Hold the feeling. Then — gently — AmyNest end card with app icon and store badges.`;
}

export function buildProductEntryBeat(seed: GoldenSeed): string {
  return `Only now does Amy appear — as a warm guide, not a pitch. ${seed.amynestSolution}`;
}

/** 10 scroll-stopping hooks rooted in parenting situations — never product. */
export function generateSituationHooks(seed: GoldenSeed, situation: string): string[] {
  const moment = shortMoment(situation);
  const feeling = feelingWord(seed);
  return [
    moment,
    `It’s 8:47 PM. ${capitalize(feeling)} sits with you at the table.`,
    `You promised yourself tonight would be different.`,
    `Your child looks at you like the answer should be obvious.`,
    `This is the part of parenting nobody posts.`,
    `You’re not out of love — just out of ideas for tonight.`,
    `One small moment. One tired parent. One familiar knot in the chest.`,
    `Before the advice… sit with this scene.`,
    `What if this exact evening could end softer?`,
    `Remember this feeling — then watch what changes.`,
  ].map((h) => assertNoProduct(h, "hook"));
}

export function emotionFirstStoryFlow(input: {
  hook: string;
  situation: string;
  problem: string;
  emotionBeat: string;
  productEntry: string;
  transformation: string;
  hopeClose: string;
}): string[] {
  const early = [input.hook, input.situation, input.problem, input.emotionBeat];
  for (const beat of early) {
    if (mentionsProduct(beat)) {
      throw new Error(`Product leaked before emotion was earned: "${beat}"`);
    }
  }
  return [
    input.hook,
    input.situation,
    input.problem,
    input.emotionBeat,
    input.productEntry,
    input.transformation,
    input.hopeClose,
  ];
}

function defaultSituation(seed: GoldenSeed): string {
  const map: Record<string, string> = {
    Learning:
      "The workbook is open. The pencil is still. Your child has already decided tonight will be a fight.",
    Speech:
      "They try the word again. It comes out tangled. You smile too quickly — and they notice.",
    Health:
      "After school energy is everywhere except where you need it. “Calm down” only makes the storm louder.",
    Games:
      "Five more minutes becomes forty. Ending play feels like starting a war.",
    Astro:
      "You’re holding their birth story in your hands — wanting meaning, not another scary prediction.",
    "Routine Technology":
      "Shoes, tiffin, sibling tears, a clock that won’t slow down. The day is already louder than your plan.",
    "Amy Coach":
      "You know what you’re struggling with. You just don’t want another tip that doesn’t know your house.",
    "Audio Lessons":
      "The car is moving. Little eyes are tired. You wish the quiet could still be useful — and kind.",
    "Parent Tips":
      "You open your phone for one answer and leave with twenty opinions — none of them for your Tuesday.",
    "Premium Features":
      "The habit finally started working… and then the free limit closed the door mid-week.",
  };
  return map[seed.category] ?? seed.problem;
}

function openingVisual(seed: GoldenSeed): string {
  const map: Record<string, string> = {
    Learning: "Kitchen table, half-finished page, parent’s hand hovering",
    Speech: "Close-up: child’s mouth mid-word, parent’s hopeful eyes",
    Health: "Doorway after school; backpack drops; energy spills into the room",
    Games: "Tablet glow on a child’s face; parent in the doorway checking the time",
    Astro: "Parent alone at night with a soft lamp and a child’s photo",
    "Routine Technology": "Morning hallway chaos in one wide shot",
    "Amy Coach": "Parent sitting on the bed edge, shoulders heavy, phone face-down",
    "Audio Lessons": "Car interior; streetlights sliding past; child leaning on the window",
    "Parent Tips": "Thumb scrolling; tips blurring; parent’s eyes tired",
    "Premium Features": "A progress streak on screen… then a soft lock wall",
  };
  return map[seed.category] ?? "Intimate parent-child domestic frame";
}

function situationSplit(situation: string): string {
  const first = situation.split(/[.!?]/)[0]?.trim();
  return first && first.length > 0 ? first : situation.slice(0, 72);
}

function shortMoment(situation: string): string {
  const first = situation.split(/[.!?]/)[0]?.trim() ?? situation;
  return first.length > 90 ? `${first.slice(0, 87).trim()}…` : first + ".";
}

function feelingWord(seed: GoldenSeed): string {
  switch (seed.suggestedEmotion) {
    case "Hope":
      return "hope";
    case "Confidence":
      return "doubt";
    case "Curiosity":
      return "curiosity";
    case "Family Bonding":
      return "longing";
    case "Routine":
      return "urgency";
    case "Emotional Growth":
      return "tenderness";
    case "Achievement":
      return "pride — waiting";
    case "Learning":
      return "frustration";
    default:
      return "the weight of love";
  }
}

function capitalize(value: string): string {
  return value.length ? value[0]!.toUpperCase() + value.slice(1) : value;
}

function assertNoProduct(text: string, field: string): string {
  if (mentionsProduct(text)) {
    throw new Error(`${field} must not mention product/feature names before emotion is earned: ${text}`);
  }
  return text;
}
