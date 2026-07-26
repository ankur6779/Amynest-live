/**
 * Contextual Amy greetings — rotate with warmth; never robotic.
 * Continuity lines only reference stored facts (never fabricated).
 */

import { moonPhasePhrase, moonPhasePhraseLower } from "./sky-copy";
import type { ContinuityFacts } from "./emotional-continuity";

export type GreetingContext = {
  parentFirstName: string | null;
  childName: string;
  moonPhaseLabel: string;
  sunSign: string;
  moonSign: string;
  daySky: boolean;
  greetingIndex: number;
  hour?: number;
  /** Skip recently shown hello lines (client reply-memory). */
  avoidHellos?: string[];
  /** Optional real journey facts — only used when present. */
  continuity?: ContinuityFacts | null;
};

function dayPart(hour: number): "morning" | "afternoon" | "evening" | "night" {
  if (hour < 5) return "night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

function pickAvoiding(pool: string[], index: number, avoid: string[] | undefined): string {
  const avoided = new Set((avoid ?? []).map((s) => s.trim()));
  for (let n = 0; n < pool.length; n++) {
    const candidate = pool[(index + n) % pool.length]!;
    if (!avoided.has(candidate)) return candidate;
  }
  return pool[index % pool.length]!;
}

function continuityHellos(
  child: string,
  parentName: string,
  facts: ContinuityFacts,
): string[] {
  const lines: string[] = [];
  const withParent = (s: string) =>
    parentName ? `${s.replace(/\.$/, "")}, ${parentName}.` : s;

  if (facts.familiarity !== "new") {
    lines.push(withParent("I'm glad you're back."));
    lines.push(withParent(`I've been thinking about ${child} since our last journey.`));
  }
  if (facts.daysSinceLastVisit != null && facts.daysSinceLastVisit >= 1) {
    lines.push(withParent("Our stars have changed a little today."));
  }
  if (facts.portraitSaved) {
    lines.push(withParent(`I kept ${child}'s portrait close.`));
  }
  if (facts.pendingMilestone || facts.latestMilestone) {
    lines.push(withParent("I found something beautiful waiting for us."));
  }
  if (facts.lastChapterLabel) {
    lines.push(
      withParent(`Welcome back — “${facts.lastChapterLabel}” still glows for ${child}.`),
    );
  }
  if (facts.aiOpened > 0) {
    lines.push(withParent(`I'm glad you're back into ${child}'s sky.`));
  }
  return lines;
}

function continuitySkyLines(child: string, facts: ContinuityFacts): string[] {
  const lines: string[] = [];
  if (facts.lastPlanet === "moon") {
    lines.push(`Last time we lingered with the Moon in ${child}'s sky.`);
  } else if (facts.lastPlanet === "sun") {
    lines.push(`Last time we stood in ${child}'s daylight with the Sun.`);
  } else if (facts.lastPlanet === "rising") {
    lines.push(`Last time we explored the Rising doorway for ${child}.`);
  }
  if (facts.lastChapterLabel) {
    lines.push(`We left a soft bookmark in “${facts.lastChapterLabel}.”`);
  }
  if (facts.chapterCount > 0) {
    lines.push(
      `You've already opened ${facts.chapterCount} chapter${facts.chapterCount === 1 ? "" : "s"} of ${child}'s story.`,
    );
  }
  if (facts.portraitSaved) {
    lines.push(`The portrait we saved for ${child} is still waiting warmly.`);
  }
  if (facts.pendingMilestone === "reflection_milestone_1") {
    lines.push(`A first quiet note for ${child} made a new star appear.`);
  } else if (facts.pendingMilestone === "reflection_milestone_5") {
    lines.push(`Five quiet notes — ${child}'s constellation is growing.`);
  } else if (facts.pendingMilestone === "reflection_milestone_12") {
    lines.push(`Twelve quiet notes with ${child} — a little galaxy of noticing.`);
  }
  return lines;
}

export function buildPersonalizedGreeting(ctx: GreetingContext): {
  hello: string;
  skyLine: string;
  moonLead: string;
  cta: string;
} {
  const hour = ctx.hour ?? new Date().getHours();
  const part = dayPart(hour);
  const parentName = ctx.parentFirstName?.trim() || "";
  const child = ctx.childName.trim() || "your child";
  const i = Math.abs(ctx.greetingIndex);
  const phase = moonPhasePhrase(ctx.moonPhaseLabel);
  const phaseLower = moonPhasePhraseLower(ctx.moonPhaseLabel);
  const facts = ctx.continuity ?? null;

  const baseHellos = parentName
    ? [
        `Good ${part}, ${parentName}.`,
        `${part === "night" ? "Quiet" : part === "morning" ? "Gentle" : "Warm"} ${part}, ${parentName}.`,
        `Welcome back, ${parentName}.`,
        `${parentName} — ${child}'s sky is waiting.`,
      ]
    : [
        `Good ${part}.`,
        `${part === "night" ? "Quiet" : part === "morning" ? "Gentle" : "Warm"} ${part}.`,
        `Welcome back.`,
        `Welcome back to Amy Astro.`,
      ];

  const hellos =
    facts && facts.familiarity !== "new"
      ? [...continuityHellos(child, parentName, facts), ...baseHellos]
      : baseHellos;

  const baseSky = [
    `Today ${child}'s sky feels ${ctx.daySky ? "soft and open" : "quietly complete"}.`,
    `${child}'s universe is listening again.`,
    `The day carries ${ctx.sunSign} light for ${child}.`,
    `${phase} light hangs over ${child}'s story.`,
  ];
  const skyLines =
    facts && facts.familiarity !== "new"
      ? [...continuitySkyLines(child, facts), ...baseSky]
      : baseSky;

  const moonLeads = [
    `In their birth chart, the Moon in ${ctx.moonSign} still offers a soft noticing lens.`,
    `Their birth Moon (${ctx.moonSign}) often pairs with belonging themes — a pattern to notice, not a forecast.`,
    `A ${phaseLower} at birth invites softer noticing in how you meet them.`,
    `Birth-chart Moon themes in ${ctx.moonSign} can frame reflection — never today's live sky.`,
  ];

  const ctas = [
    "Continue your journey →",
    "Step back into their universe →",
    "Open today's chapter →",
    "Wander a little deeper →",
  ];

  return {
    hello: pickAvoiding(hellos, i, ctx.avoidHellos),
    skyLine: skyLines[i % skyLines.length]!,
    moonLead: moonLeads[i % moonLeads.length]!,
    cta: ctas[i % ctas.length]!,
  };
}
