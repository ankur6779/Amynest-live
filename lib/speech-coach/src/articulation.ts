// ─────────────────────────────────────────────────────────────────────────────
// Amy Speech Coach — articulation cues (English, mouth-placement hints)
// ─────────────────────────────────────────────────────────────────────────────

export interface ArticulationCue {
  /** Short label shown in UI, e.g. "SH sound". */
  label: string;
  /** Parent- or child-friendly mouth placement tip. */
  tip: string;
  /** Optional slower TTS prefix Amy can speak before the prompt. */
  coachLine: string;
}

const CUE_MAP: Readonly<Record<string, ArticulationCue>> = {
  sh: {
    label: "SH sound",
    tip: "Smile a little, lips forward — blow air like a quiet fan.",
    coachLine: "Watch Amy. Teeth together, blow: shhhh.",
  },
  th: {
    label: "TH sound",
    tip: "Stick your tongue gently between your teeth, then blow.",
    coachLine: "Tongue out softly. Say thhh, not suh.",
  },
  ch: {
    label: "CH sound",
    tip: "Start with t, then push into sh — one quick burst.",
    coachLine: "T then sh: ch-ch, like choo-choo.",
  },
  wh: {
    label: "WH sound",
    tip: "Round your lips like you are blowing out a candle.",
    coachLine: "Round lips: whhh, like what.",
  },
  bl: {
    label: "BL blend",
    tip: "Press lips for b, then open into l — do not pause.",
    coachLine: "B and L together: bl-bl.",
  },
  cr: {
    label: "CR blend",
    tip: "Back of tongue for k, then roll into r.",
    coachLine: "K then r: cr-cr, like crab.",
  },
  st: {
    label: "ST blend",
    tip: "Teeth together for s, tongue up for t — keep it smooth.",
    coachLine: "S into t: st-st, like star.",
  },
  tr: {
    label: "TR blend",
    tip: "Tongue tip behind teeth for t, then r.",
    coachLine: "T then r: tr-tr, like tree.",
  },
  gr: {
    label: "GR blend",
    tip: "G in the throat, then r at the front.",
    coachLine: "G then r: gr-gr, like green.",
  },
  pr: {
    label: "PR blend",
    tip: "Lips together for p, then r.",
    coachLine: "P then r: pr-pr, like proud.",
  },
};

/** Lookup articulation coaching for a phonic or letter prompt text. */
export function getArticulationCue(
  promptText: string,
  kind?: string,
): ArticulationCue | null {
  const key = promptText.trim().toLowerCase();
  if (CUE_MAP[key]) return CUE_MAP[key]!;
  if (kind === "letter" && key.length === 1) {
    return {
      label: `Letter ${key.toUpperCase()}`,
      tip: "Look at Amy, copy the mouth shape, then say the sound clearly.",
      coachLine: `Big slow letter: ${key.toUpperCase()}.`,
    };
  }
  return null;
}
