/**
 * Signature insight — one unforgettable story per child.
 * Chart-informed noticing language only; never predictive.
 */

import { moonPhasePhraseLower, withIndefiniteArticle } from "./sky-copy";

export type SignatureInsightInput = {
  childName: string;
  sunSign: string;
  moonSign: string;
  moonPhaseLabel: string;
  risingSign: string | null;
  daySky: boolean;
};

export type CosmicPortraitContent = {
  signatureParagraph: string;
  signatureSentence: string;
  qualities: [string, string, string];
  parentingReminders: [string, string, string];
  currentSkyInfluence: string;
  amyReflection: string;
  /** Display helpers — same chart facts already used to build the portrait. */
  sunSign: string;
  moonSign: string;
};

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const ELEMENT: Record<string, "fire" | "earth" | "air" | "water"> = {
  Aries: "fire",
  Leo: "fire",
  Sagittarius: "fire",
  Taurus: "earth",
  Virgo: "earth",
  Capricorn: "earth",
  Gemini: "air",
  Libra: "air",
  Aquarius: "air",
  Cancer: "water",
  Scorpio: "water",
  Pisces: "water",
};

const QUALITY_POOL: Record<"fire" | "earth" | "air" | "water", string[]> = {
  fire: ["Warm initiative", "Bright curiosity", "Courage in small steps"],
  earth: ["Steady presence", "Hands-on learning", "Quiet reliability"],
  air: ["Quick noticing", "Playful questions", "Social sparkle"],
  water: ["Deep feeling", "Soft empathy", "Imaginative tides"],
};

const REMINDER_POOL: Record<"fire" | "earth" | "air" | "water", string[]> = {
  fire: [
    "Celebrate effort before outcome.",
    "Offer a small stage, not a spotlight.",
    "Let enthusiasm lead; guide the landing.",
  ],
  earth: [
    "Protect unhurried practice time.",
    "Name what their hands already know.",
    "Routine can feel like love.",
  ],
  air: [
    "Answer one more question than you planned.",
    "Let ideas wander before they land.",
    "Conversation is often their comfort.",
  ],
  water: [
    "Stay near during emotional weather.",
    "Repair after storms without hurry.",
    "Soft goodnights matter more than perfect days.",
  ],
};

export function buildCosmicPortrait(input: SignatureInsightInput): CosmicPortraitContent {
  const child = input.childName.trim() || "your child";
  const sunEl = ELEMENT[input.sunSign] ?? "air";
  const moonEl = ELEMENT[input.moonSign] ?? "water";
  const seed = hashSeed(
    `${input.sunSign}|${input.moonSign}|${input.moonPhaseLabel}|${input.risingSign ?? "day"}`,
  );

  const patterns = [
    {
      paragraph: `Every child arrives with a unique sky.\n\n${child} shines with a gentle heart,\na curious spirit,\nand quiet courage.\n\nAmy discovered beautiful strengths waiting to bloom.`,
      sentence: `${child}'s universe blends a gentle heart with an explorer spirit — your steady love is their safest launchpad.`,
    },
    {
      paragraph: `Every child arrives with a unique sky.\n\n${child} carries ${input.sunSign} warmth\nand a ${input.moonSign} Moon's soft belonging.\n\nAmy noticed how curiosity gathers into confidence — explore first, then believe.`,
      sentence: `${child} often gathers confidence after curiosity — explore gently, then believe together.`,
    },
    {
      paragraph: `Every child arrives with a unique sky.\n\nWith ${input.moonSign} feeling and ${input.sunSign} light,\n${child} often senses the room before stepping forward.\n\nAmy found a soft thread of belonging that steadies bravery.`,
      sentence: `Belonging may steady ${child} before bravery — stay near, then invite the next small step.`,
    },
    {
      paragraph: `Every child arrives with a unique sky.\n\n${child} meets the world with wonder\nbefore words arrive.\n\nAmy saw how noticing becomes love — they see, then name what they treasure.`,
      sentence: `Wonder arrives before words for ${child} — notice first, then name what they love.`,
    },
    {
      paragraph: `Every child arrives with a unique sky.\n\nUnder ${input.sunSign} warmth, ${child} glows when someone stays near.\nThey try.\nThen they shine.\n\nAmy discovered play that teaches trust — experiment gently, then invite you in.`,
      sentence: `Play teaches trust for ${child} — experiment gently, then invite you in.`,
    },
  ];

  const pick = patterns[seed % patterns.length]!;
  const qSun = QUALITY_POOL[sunEl];
  const qMoon = QUALITY_POOL[moonEl];
  const qualities: [string, string, string] = [
    qSun[seed % qSun.length]!,
    qMoon[(seed + 1) % qMoon.length]!,
    sunEl === moonEl
      ? "Gentle self-knowing"
      : `A bridge between ${sunEl} light and ${moonEl} feeling`,
  ];

  const rSun = REMINDER_POOL[sunEl];
  const rMoon = REMINDER_POOL[moonEl];
  const parentingReminders: [string, string, string] = [
    rSun[seed % rSun.length]!,
    rMoon[(seed + 2) % rMoon.length]!,
    "Offer noticing without labeling who they must become.",
  ];

  const risingBit =
    input.daySky || !input.risingSign
      ? "Rising waits softly — their Day Sky remains complete."
      : `Rising ${input.risingSign} may feel like a soft doorway into new rooms.`;

  const currentSkyInfluence = `In their birth chart: ${withIndefiniteArticle(moonPhasePhraseLower(input.moonPhaseLabel))} in ${input.moonSign}, with ${input.sunSign} as daylight themes. ${risingBit} These are birth-sky facts for reflection — not today's live weather.`;

  const amyReflection = `I notice ${child}'s sky favors presence over pressure. When you meet them where curiosity begins — not where mastery ends — something tender opens. This is a lens for love, never a map of fate.`;

  return {
    signatureParagraph: pick.paragraph,
    signatureSentence: pick.sentence,
    qualities,
    parentingReminders,
    currentSkyInfluence,
    amyReflection,
    sunSign: input.sunSign,
    moonSign: input.moonSign,
  };
}
