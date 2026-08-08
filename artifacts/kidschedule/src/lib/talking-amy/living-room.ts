/**
 * Talking Amy Phase 2 — living room helpers.
 * Presentation only. Echo / VAD / mic / avatar / session engines untouched.
 *
 * Emotional target: another living room inside AmyNest —
 * never neon game OS, never toy store, never marketing SKU.
 */

export type TalkingAmyLivingOpen = {
  eyebrow: string;
  title: string;
  purpose: string;
};

/** Soft prompts — companionship play, never toy-store dare list. */
export const TALKING_AMY_LIVING_PROMPTS = [
  "Say hello to Amy",
  "Share a soft sound",
  "Whisper something kind",
  "Say your name gently",
  "Try a little laugh",
  "Hum a tiny tune",
  "Tell Amy one word",
  "Speak slowly — Amy listens",
] as const;

/** Warm mic materials — sanctuary, not fuchsia club light. */
export const TALKING_AMY_LIVING_MIC = {
  idle: "from-amber-200/55 via-stone-200/40 to-rose-200/45",
  recording: "from-amber-100/65 via-rose-200/50 to-stone-300/55",
} as const;

export function isTalkingAmyLivingV1Enabled(): boolean {
  const raw = import.meta.env.VITE_FF_TALKING_AMY_LIVING_V1;
  if (raw === "0" || raw === "false") return false;
  return true;
}

/** Companionship open — same house as Moments / Guidance. */
export function talkingAmyLivingOpen(childName = "your child"): TalkingAmyLivingOpen {
  return {
    eyebrow: "Talking Amy",
    title: `I'm here with ${childName}`,
    purpose: "Speak — Amy answers in a soft voice on this device",
  };
}

/** Soften mode taglines that still carry toy / competitor marketing. */
export function livingModeTagline(modeId: string, fallback: string): string {
  switch (modeId) {
    case "chipmunk":
      return "Bright and playful";
    case "baby":
      return "Soft toddler voice";
    case "robot":
      return "Gentle machine voice";
    case "alien":
      return "Curious faraway voice";
    case "monster":
      return "Big and silly";
    case "ghost":
      return "Whisper-soft echo";
    case "space":
      return "Quiet mission voice";
    case "magic":
      return "Soft sparkle voice";
    case "frog":
      return "Bouncy little voice";
    case "rainbow":
      return "A quiet color voice";
    case "lightning":
      return "A quick bright voice";
    case "galaxy":
      return "A deep night voice";
    default:
      return fallback;
  }
}

/** Soften echo hints — keep delight, remove shouty toy marketing. */
export function livingModeEchoHint(modeId: string, fallback: string): string {
  switch (modeId) {
    case "chipmunk":
      return "Amy repeats you in a bright little voice";
    case "baby":
      return "Amy repeats you softly, like a toddler";
    case "robot":
      return "Amy repeats you in a gentle machine voice";
    case "alien":
      return "Amy repeats you from a little farther away";
    case "monster":
      return "Amy repeats you in a big silly voice";
    case "ghost":
      return "Amy whispers your words back";
    case "space":
      return "Amy sends your words back quietly";
    case "magic":
      return "Amy repeats you with a soft sparkle";
    case "frog":
      return "Amy hops your words back gently";
    case "rainbow":
      return "Amy answers in a soft color voice";
    case "lightning":
      return "Amy answers with a quick bright echo";
    case "galaxy":
      return "Amy answers from a deep quiet night";
    default:
      return fallback;
  }
}

export function livingAchievementEyebrow(): string {
  return "A quiet moment together";
}

export function livingDailyVoiceLabel(emoji: string, label: string): string {
  return `Today's voice · ${emoji} ${label}`;
}

export function livingStreakNote(days: number): string {
  return days >= 2 ? `With Amy · day ${days}` : "";
}

export function livingCollectionNote(unlocked: number, total: number): string {
  return `Voices you've met · ${unlocked} of ${total}`;
}
