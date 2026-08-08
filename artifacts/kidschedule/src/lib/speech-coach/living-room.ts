/**
 * Speech Coach Phase 2 — living room hierarchy helpers.
 * Presentation only. No API / entitlement / engine changes.
 */

export type SpeechCoachRecommendKind = "deepen";

export type SpeechCoachRecommend = {
  kind: SpeechCoachRecommendKind;
  sectionId: SpeechCoachQuietId;
  label: string;
  title: string;
  purpose: string;
};

/** Primary quiet destinations — Framework opening target set. */
export const SPEECH_COACH_QUIET_DESTINATIONS = [
  "speech-section-practice",
  "speech-section-games",
  "speech-section-guidance",
  "speech-section-affirmations",
  "speech-section-reports",
] as const;

export type SpeechCoachQuietId = (typeof SPEECH_COACH_QUIET_DESTINATIONS)[number];

export type SpeechCoachQuietPath = {
  sectionId: SpeechCoachQuietId;
  title: string;
  purpose: string;
};

export const SPEECH_COACH_QUIET_PATHS: readonly SpeechCoachQuietPath[] = [
  {
    sectionId: "speech-section-practice",
    title: "Sounds & words",
    purpose: "Gentle pronunciation together",
  },
  {
    sectionId: "speech-section-games",
    title: "Play & speak",
    purpose: "Light practice without pressure",
  },
  {
    sectionId: "speech-section-guidance",
    title: "Parent guidance",
    purpose: "Calm help for how to support",
  },
  {
    sectionId: "speech-section-affirmations",
    title: "Confidence",
    purpose: "Warm words before practice",
  },
  {
    sectionId: "speech-section-reports",
    title: "Progress",
    purpose: "Notice growth gently",
  },
] as const;

/** More-nest session chips — human labels, never raw tool keys as product truth. */
export const SPEECH_COACH_MORE_SESSIONS = [
  { key: "quick", label: "Quick practice", purpose: "A few gentle minutes" },
  { key: "bedtime", label: "Bedtime words", purpose: "Soft close to the day" },
  { key: "school", label: "School readiness", purpose: "Calm words for school" },
  { key: "pronounce", label: "Sounds & words", purpose: "Gentle pronunciation" },
  { key: "warmup", label: "Warm-up", purpose: "Ease into speaking" },
  { key: "emotion", label: "Feelings & words", purpose: "Name feelings together" },
] as const;

export function isSpeechCoachQuietId(id: string): id is SpeechCoachQuietId {
  return (SPEECH_COACH_QUIET_DESTINATIONS as readonly string[]).includes(id);
}

/**
 * One recommended Help-room act for a tired parent.
 * Stays inside the room (deepen) — never launches neon session catalogue first.
 * V2 / live / talk remain available under More when configured.
 */
export function recommendSpeechCoachAction(opts: {
  ageMonths: number;
  hour?: number;
  /** Accepted for call-site stability; does not divert the living open to V2. */
  v2Enabled?: boolean;
}): SpeechCoachRecommend {
  const hour = opts.hour ?? new Date().getHours();

  if (hour >= 19 || hour < 7) {
    return {
      kind: "deepen",
      sectionId: "speech-section-affirmations",
      label: "Tonight's help",
      title: "Confidence",
      purpose: "Warm words before rest",
    };
  }

  if (opts.ageMonths < 36) {
    return {
      kind: "deepen",
      sectionId: "speech-section-games",
      label: "Start here",
      title: "Play & speak",
      purpose: "Light practice for little voices",
    };
  }

  return {
    kind: "deepen",
    sectionId: "speech-section-practice",
    label: "Start here",
    title: "Sounds & words",
    purpose: "Practice gently together",
  };
}

/** Flag — Speech Coach living room manufacturing. Default ON. */
export function isSpeechCoachLivingV1Enabled(): boolean {
  const raw = import.meta.env.VITE_FF_SPEECH_COACH_LIVING_V1;
  if (raw === undefined || raw === "") return true;
  return raw === "true" || raw === "1";
}

/** Portfolio P0-2 — session chrome labels (scoring side-effects untouched). */
export function livingSpeechSessionPresenceLabel(): string {
  return "Together";
}

export function livingSpeechSessionCompleteBody(score: number, bestStreak: number): string {
  void score;
  void bestStreak;
  return "You practiced gently together. That is enough for now.";
}

export function livingSpeechLiveEyebrow(): string {
  return "Voice together";
}
