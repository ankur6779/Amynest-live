/**
 * AmyNest Philosophy — Company DNA
 *
 * Visual systems are frozen. This module is the permanent voice contract.
 * Every feature, notification, premium surface, and memory must satisfy
 * these principles or it does not ship.
 *
 * Emotional states allowed in product language (only four):
 *   Notice · Guide · Remember · Support
 *
 * Forbidden product emotions:
 *   score · judge · push · artificial celebrate · FOMO · urgency · guilt
 */

/** The Five Immutable Principles of AmyNest */
export const AMYNEST_PRINCIPLES = [
  {
    id: "understand",
    belief: "We help parents know the next right thing — never more than they need.",
  },
  {
    id: "trust-first",
    belief: "Trust precedes every request. Value before account, permission, or premium.",
  },
  {
    id: "remember-kindly",
    belief: "We remember only what parents shared, completed, or saved — never surveillance.",
  },
  {
    id: "life-continues",
    belief: "Returns continue life. Never restart, interrupt, or demand attention.",
  },
  {
    id: "calm-companionship",
    belief: "AmyNest supports exhausted parents with relief and restraint — never pressure.",
  },
] as const;

export type AmyNestPrincipleId = (typeof AMYNEST_PRINCIPLES)[number]["id"];

export type AmyNestEmotionalState = "notice" | "guide" | "remember" | "support";

/** Patterns that contradict AmyNest voice — for audits and tests. */
export const FORBIDDEN_VOICE_PATTERNS: RegExp[] = [
  /\bunlock\b/i,
  /\bbuy now\b/i,
  /\blimited time\b/i,
  /\bending soon\b/i,
  /\bdon't miss\b/i,
  /\bmiss you\b/i,
  /\bwe've missed you\b/i,
  /\bprotect your .{0,20}streak\b/i,
  /\byou missed yesterday\b/i,
  /\bkeep going!\b/i,
  /\bbonus stars\b/i,
  /\bi'?ve been thinking about\b/i,
  /\bspecially for you\b/i,
  /\bjoin thousands\b/i,
  /\bone step away\b/i,
  /\bact now\b/i,
];

export function violatesAmyNestVoice(text: string): boolean {
  return FORBIDDEN_VOICE_PATTERNS.some((re) => re.test(text));
}

/** Premium voice — relief, never interruption. */
export const PREMIUM_VOICE = {
  invitation: "We can support you further whenever you're ready.",
  continueCta: "Continue with AmyNest",
  includesLabel: "What Premium includes",
} as const;

/** Notification litmus — every push must make a tired parent feel lighter. */
export function notificationFeelsLighter(body: string): boolean {
  if (!body.trim()) return false;
  if (violatesAmyNestVoice(body)) return false;
  return true;
}
