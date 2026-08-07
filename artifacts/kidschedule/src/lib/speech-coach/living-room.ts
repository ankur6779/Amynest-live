/**
 * Speech Coach Phase 2 — living room hierarchy helpers.
 * Presentation only. No API / entitlement / engine changes.
 */

export type SpeechCoachRecommendKind = "route" | "scroll";

export type SpeechCoachRecommend = {
  kind: SpeechCoachRecommendKind;
  /** Route when kind=route */
  href?: string;
  /** Section anchor when kind=scroll */
  sectionId?: string;
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

/**
 * One recommended Help-room act for a tired parent.
 * Prefers V2 practice when enabled; never scores the parent.
 */
export function recommendSpeechCoachAction(opts: {
  ageMonths: number;
  hour?: number;
  v2Enabled?: boolean;
}): SpeechCoachRecommend {
  const hour = opts.hour ?? new Date().getHours();
  const v2 = Boolean(opts.v2Enabled);

  if (v2) {
    return {
      kind: "route",
      href: "/speech-coach-v2",
      label: "Start here",
      title: "Practice with Amy",
      purpose: "Gentle sounds and words — no pressure",
    };
  }

  if (hour >= 19 || hour < 7) {
    return {
      kind: "scroll",
      sectionId: "speech-section-affirmations",
      label: "Tonight's help",
      title: "Confidence",
      purpose: "Warm words before rest",
    };
  }

  if (opts.ageMonths < 36) {
    return {
      kind: "scroll",
      sectionId: "speech-section-games",
      label: "Start here",
      title: "Play & speak",
      purpose: "Light practice for little voices",
    };
  }

  return {
    kind: "scroll",
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
