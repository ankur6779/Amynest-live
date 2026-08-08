/**
 * Amy Audio Phase 2 — living room helpers.
 * Presentation only. Playback engine / assets / APIs / entitlements untouched.
 *
 * Emotional target: PRESENCE · CALM · GUIDANCE · CONNECTION
 * Never Spotify player, podcast app, audio marketplace, catalogue, SaaS shelf.
 */

export type AmyAudioRecommend = {
  id: "listen";
  label: string;
  title: string;
  purpose: string;
};

export type AmyAudioQuietPath = {
  id: "listen" | "calm" | "continue";
  title: string;
  purpose: string;
};

export type AmyAudioLivingOpen = {
  eyebrow: string;
  title: string;
  purpose: string;
  companionship: string;
};

/** Quiet ways to begin — never a playlist wall. */
export const AMY_AUDIO_QUIET_PATHS: readonly AmyAudioQuietPath[] = [
  {
    id: "listen",
    title: "A quiet listen",
    purpose: "A few calm minutes with Amy",
  },
  {
    id: "calm",
    title: "Need a calm minute",
    purpose: "Soft support when the moment is hard",
  },
  {
    id: "continue",
    title: "Where we left off",
    purpose: "Return quietly to your place",
  },
] as const;

/** One natural invitation — not a catalogue. */
export function recommendAmyAudioAction(
  childName = "your child",
): AmyAudioRecommend {
  return {
    id: "listen",
    label: "Start here",
    title: `A quiet listen with ${childName}`,
    purpose: "Stay for a few calm minutes — Amy is with you",
  };
}

/** Companionship open — same house as Moments / Amy Coach. */
export function amyAudioLivingOpen(childName = "your child"): AmyAudioLivingOpen {
  return {
    eyebrow: "Quiet presence",
    title: `I'm here with you and ${childName}.`,
    purpose: "Presence through sound — calm guidance when hands are full.",
    companionship: `Amy is with you and ${childName} through sound.`,
  };
}

export function livingAmyAudioProductName(): string {
  return isAmyAudioLivingV1Enabled() ? "Quiet listen" : "Amy Audio Lessons";
}

export function livingAmyAudioNavLabel(): string {
  return isAmyAudioLivingV1Enabled() ? "Quiet listen" : "Amy Audio Lessons";
}

export function livingAmyAudioHubTitle(): string {
  return isAmyAudioLivingV1Enabled() ? "Quiet listen" : "Amy Audio Lessons";
}

export function livingAmyAudioHubDesc(): string {
  return isAmyAudioLivingV1Enabled()
    ? "A few calm minutes with Amy"
    : "3–5 min parenting lessons · hands-free";
}

export function livingAmyAudioTagline(): string {
  return isAmyAudioLivingV1Enabled()
    ? "Stay for a few quiet minutes — Amy is with you"
    : "Choose your child's age to explore curated audio lessons";
}

export function livingUnlockBanner(): string {
  return "Continue with AmyNest whenever you're ready";
}

export function livingPreviewNote(): string {
  return "One gentle sample in each age. We can keep supporting this whenever you're ready.";
}

export function livingFreeBadge(): string {
  return "Start free";
}

export function livingPremiumBadge(): string {
  return "Whenever you're ready";
}

export function livingExploreCta(): string {
  return "Listen gently";
}

export function livingNowPlaying(): string {
  return "Listening with Amy";
}

export function livingQuickPlay(): string {
  return "A quiet start";
}

export function livingDailyPick(): string {
  return "Today's quiet pick";
}

export function livingSeriesTitle(): string {
  return "Gentle paths";
}

export function livingSeriesSubtitle(): string {
  return "Short guided parts — your place is saved. The next part continues when you're ready.";
}

export function livingEmergencyCta(): string {
  return "Need a calm minute?";
}

export function livingMoreAgesLabel(): string {
  return "More ages when you're ready";
}

/** Flag — Amy Audio living room manufacturing. Default ON. */
export function isAmyAudioLivingV1Enabled(): boolean {
  const raw = import.meta.env.VITE_FF_AMY_AUDIO_LIVING_V1;
  if (raw === undefined || raw === "") return true;
  return raw === "true" || raw === "1";
}
