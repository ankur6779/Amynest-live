/**
 * Rotating personalized greetings — every revisit feels different.
 */

import { moonPhasePhrase, moonPhasePhraseLower } from "./sky-copy";

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

  const hellos = parentName
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

  const skyLines = [
    `Today ${child}'s sky feels ${ctx.daySky ? "soft and open" : "quietly complete"}.`,
    `${child}'s universe is listening again.`,
    `The day carries ${ctx.sunSign} light for ${child}.`,
    `${phase} light hangs over ${child}'s story.`,
  ];

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
