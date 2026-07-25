/**
 * Rotating personalized greetings — every revisit feels different.
 */

export type GreetingContext = {
  parentFirstName: string | null;
  childName: string;
  moonPhaseLabel: string;
  sunSign: string;
  moonSign: string;
  daySky: boolean;
  greetingIndex: number;
  hour?: number;
};

function dayPart(hour: number): "morning" | "afternoon" | "evening" | "night" {
  if (hour < 5) return "night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

export function buildPersonalizedGreeting(ctx: GreetingContext): {
  hello: string;
  skyLine: string;
  moonLead: string;
  cta: string;
} {
  const hour = ctx.hour ?? new Date().getHours();
  const part = dayPart(hour);
  const parent = ctx.parentFirstName?.trim() || "there";
  const child = ctx.childName.trim() || "your child";
  const i = Math.abs(ctx.greetingIndex);

  const hellos = [
    `Good ${part}, ${parent}.`,
    `${part === "night" ? "Quiet" : part === "morning" ? "Gentle" : "Warm"} ${part}, ${parent}.`,
    `Welcome back, ${parent}.`,
    `${parent} — ${child}'s sky is waiting.`,
  ];

  const skyLines = [
    `Today ${child}'s sky feels ${ctx.daySky ? "soft and open" : "quietly complete"}.`,
    `${child}'s universe is listening again.`,
    `The day carries ${ctx.sunSign} light for ${child}.`,
    `A ${ctx.moonPhaseLabel.toLowerCase()} hangs over ${child}'s story.`,
  ];

  const moonLeads = [
    `In their birth chart, the Moon in ${ctx.moonSign} still offers a soft noticing lens.`,
    `Their birth Moon (${ctx.moonSign}) often pairs with belonging themes — a pattern to notice, not a forecast.`,
    `A ${ctx.moonPhaseLabel.toLowerCase()} Moon at birth invites softer noticing in how you meet them.`,
    `Birth-chart Moon themes in ${ctx.moonSign} can frame reflection — never today's live sky.`,
  ];

  const ctas = [
    "Continue your journey →",
    "Step back into their universe →",
    "Open today's chapter →",
    "Wander a little deeper →",
  ];

  return {
    hello: hellos[i % hellos.length]!,
    skyLine: skyLines[i % skyLines.length]!,
    moonLead: moonLeads[i % moonLeads.length]!,
    cta: ctas[i % ctas.length]!,
  };
}
