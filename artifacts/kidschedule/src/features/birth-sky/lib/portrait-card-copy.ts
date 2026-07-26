/**
 * Presentation enrichments for Cosmic Portrait cards.
 * Pure UI copy helpers — do not change chart math or APIs.
 */

export type QualityCardModel = {
  title: string;
  emoji: string;
  explanation: string;
};

export type ReminderCardModel = {
  headline: string;
  explanation: string;
  whyItMatters: string;
  emoji: string;
};

export type CosmicInsightCardModel = {
  id: string;
  title: string;
  emoji: string;
  body: string;
};

const QUALITY_META: Array<{ match: RegExp; emoji: string; explanation: string }> = [
  {
    match: /empathy|feeling|deep/i,
    emoji: "💛",
    explanation: "Quietly understands emotions around them — and answers with care.",
  },
  {
    match: /courage|brave|initiative/i,
    emoji: "🏔️",
    explanation: "Brave enough to try new things, one gentle step at a time.",
  },
  {
    match: /bridge|between/i,
    emoji: "🌊",
    explanation: "Balances sensitivity with curiosity — water heart, explorer spirit.",
  },
  {
    match: /curiosity|questions|noticing/i,
    emoji: "✨",
    explanation: "Learns by wondering out loud — questions are their compass.",
  },
  {
    match: /steady|reliab|hands-on|presence/i,
    emoji: "🌱",
    explanation: "Grows through practice and presence — steady roots, soft blooms.",
  },
  {
    match: /social|sparkle|playful/i,
    emoji: "🌟",
    explanation: "Lights up with connection — play is how they belong.",
  },
  {
    match: /imagin|tide/i,
    emoji: "🌙",
    explanation: "Carries a rich inner world — stories arrive before answers.",
  },
  {
    match: /self-knowing/i,
    emoji: "🕊️",
    explanation: "Already learning the shape of their own heart — gently, over time.",
  },
];

const REMINDER_META: Array<{
  match: RegExp;
  emoji: string;
  explanation: string;
  whyItMatters: string;
}> = [
  {
    match: /repair|storm/i,
    emoji: "💗",
    explanation: "Connection first, solutions later — warmth repairs what hurry cannot.",
    whyItMatters: "After big feelings, closeness teaches safety more than lectures.",
  },
  {
    match: /effort|celebrate/i,
    emoji: "⭐",
    explanation: "Praise their trying, not just the result — glow follows courage.",
    whyItMatters: "Children risk more when effort itself feels loved.",
  },
  {
    match: /noticing|labeling/i,
    emoji: "🍃",
    explanation: "See them. Believe in them. Let them grow into themselves.",
    whyItMatters: "Labels can shrink a sky — noticing keeps the door open.",
  },
  {
    match: /near|weather|goodnight/i,
    emoji: "🌙",
    explanation: "Stay close in emotional weather — soft presence steadies the night.",
    whyItMatters: "Regulation is co-created; your calm is their landing place.",
  },
  {
    match: /question|conversation|ideas/i,
    emoji: "💬",
    explanation: "Let wonder wander a little longer — conversation is comfort.",
    whyItMatters: "Curiosity thrives when answers arrive without rush.",
  },
  {
    match: /practice|routine|hands/i,
    emoji: "🪴",
    explanation: "Protect unhurried practice — routine can feel like love.",
    whyItMatters: "Mastery grows in quiet repetition, not pressure.",
  },
  {
    match: /stage|enthusiasm|spotlight/i,
    emoji: "🎭",
    explanation: "Offer a small stage, not a spotlight — let joy lead the landing.",
    whyItMatters: "Safe visibility builds confidence without overwhelm.",
  },
];

export function enrichQuality(title: string): QualityCardModel {
  const hit = QUALITY_META.find((m) => m.match.test(title));
  return {
    title,
    emoji: hit?.emoji ?? "✨",
    explanation:
      hit?.explanation ??
      "A luminous strength already living in their sky — waiting for soft space to grow.",
  };
}

export function enrichReminder(headline: string): ReminderCardModel {
  const hit = REMINDER_META.find((m) => m.match.test(headline));
  return {
    headline: headline.replace(/\.$/, ""),
    emoji: hit?.emoji ?? "✦",
    explanation:
      hit?.explanation ??
      "Meet them with presence — small, loving choices shape the whole day.",
    whyItMatters:
      hit?.whyItMatters ??
      "These moments become the emotional weather of childhood.",
  };
}

export function buildCosmicInsightCards(input: {
  childName: string;
  sunSign: string;
  moonSign: string;
  qualities: string[];
  amyReflection: string;
}): CosmicInsightCardModel[] {
  const child = input.childName.trim() || "your child";
  const q0 = input.qualities[0] ?? "Soft empathy";
  const q1 = input.qualities[1] ?? "Bright curiosity";
  return [
    {
      id: "emotion",
      title: "Emotional Superpower",
      emoji: "💛",
      body: `${q0} colors how ${child} meets the world — feeling first, then finding words.`,
    },
    {
      id: "learning",
      title: "Learning Style",
      emoji: "📚",
      body: `${input.sunSign} light favors learning through warm curiosity — try, notice, glow.`,
    },
    {
      id: "social",
      title: "Social Style",
      emoji: "🤝",
      body: `With a ${input.moonSign} Moon, belonging often steadies bravery before they step into the room.`,
    },
    {
      id: "curiosity",
      title: "Curiosity Pattern",
      emoji: "🔍",
      body: `${q1} invites exploration — questions are invitations, not interruptions.`,
    },
    {
      id: "imagination",
      title: "Imagination",
      emoji: "🌈",
      body: input.amyReflection.split(".")[0] + ".",
    },
  ];
}

/** Split signature paragraph into story beats for the intro card. */
export function storyBeatsFromParagraph(paragraph: string): string[] {
  const lines = paragraph
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^every child arrives/i.test(l));

  // Prefer short poetic lines; collapse trailing commas into clean beats.
  return lines.map((l) => l.replace(/[,.…]+$/, "").trim()).filter(Boolean);
}
