import type { AbVariant } from "./types";

export type PreSignupMessage = {
  title: string;
  body: string;
};

/** Full notification set — rotated per send. */
export const PRE_SIGNUP_MESSAGES: PreSignupMessage[] = [
  {
    title: "🎯 Something is waiting for you",
    body: "Complete signup and unlock your personalized experience.",
  },
  {
    title: "🚀 You are just one step away",
    body: "Create your account and access all app features.",
  },
  {
    title: "⏳ Your setup is not complete",
    body: "Finish signup and start using everything the app offers.",
  },
  {
    title: "⭐ Join thousands of users",
    body: "Create your free account and get started today.",
  },
  {
    title: "🎁 Your welcome experience is ready",
    body: "Sign up now and unlock personalized recommendations.",
  },
  {
    title: "🤖 Your AI assistant is waiting",
    body: "Create your account and start your personalized journey.",
  },
];

/** A = value, B = FOMO, C = AI assistant — message indices into PRE_SIGNUP_MESSAGES. */
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
