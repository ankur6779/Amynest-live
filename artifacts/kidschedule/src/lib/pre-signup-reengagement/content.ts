import type { AbVariant } from "./types";

export type PreSignupMessage = {
  title: string;
  body: string;
};

/**
 * Pre-signup local notifications — Notice / Guide / Remember / Support only.
 * Never FOMO, urgency, guilt, or “unlock” pressure.
 * Litmus: would this make a tired parent feel lighter?
 */
export const PRE_SIGNUP_MESSAGES: PreSignupMessage[] = [
  {
    title: "Something calm is ready",
    body: "Finish signup when you like — what you’ve started can stay with you.",
  },
  {
    title: "Your setup can wait with you",
    body: "Create an account so AmyNest can remember your family — no hurry.",
  },
  {
    title: "Whenever you want to continue",
    body: "Signup keeps today’s preferences safe for the next quiet moment.",
  },
  {
    title: "A gentle place for your family",
    body: "An account helps tomorrow continue from where today left off.",
  },
  {
    title: "Your welcome path is ready",
    body: "Sign in when it suits you — recommendations will wait.",
  },
  {
    title: "Amy is ready when you are",
    body: "Create an account to keep the next right thing close — whenever you’re ready.",
  },
];

/** A = value, B = continue gently, C = companion — indices into PRE_SIGNUP_MESSAGES. */
export const VARIANT_MESSAGE_POOL: Record<AbVariant, number[]> = {
  A: [0, 3, 4],
  B: [1, 2],
  C: [5, 4],
};

export function assignAbVariant(deviceId: string): AbVariant {
  let hash = 0;
  for (let i = 0; i < deviceId.length; i++) {
    hash = (hash * 31 + deviceId.charCodeAt(i)) >>> 0;
  }
  const bucket = hash % 3;
  if (bucket === 0) return "A";
  if (bucket === 1) return "B";
  return "C";
}

export function pickRotatedMessage(
  variant: AbVariant,
  excludeIndex?: number,
): { message: PreSignupMessage; index: number } {
  const pool = VARIANT_MESSAGE_POOL[variant];
  const candidates =
    excludeIndex != null && pool.length > 1
      ? pool.filter((i) => i !== excludeIndex)
      : pool;
  const index = candidates[Math.floor(Math.random() * candidates.length)] ?? pool[0] ?? 0;
  return { message: PRE_SIGNUP_MESSAGES[index]!, index };
}
