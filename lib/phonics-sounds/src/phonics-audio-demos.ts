/**
 * Phonics audio demo presets — for human review before changing production mastering.
 */

export type PhonicsAudioDemoVariant = {
  id: string;
  label: string;
  /** Short Hindi hint for parents reviewing on dev page. */
  labelHi: string;
  description: string;
  /** FFmpeg -af chain; empty = use production file as-is. */
  filterChain: string | null;
};

/** Subset covering consonant, vowel, stop, nasal, fricative, digraph. */
export const PHONICS_DEMO_PREVIEW_KEYS = [
  "b",
  "a",
  "c",
  "e",
  "f",
  "m",
  "sh",
  "t",
] as const;

export type PhonicsDemoPreviewKey = (typeof PHONICS_DEMO_PREVIEW_KEYS)[number];

export const PHONICS_AUDIO_DEMO_VARIANTS: PhonicsAudioDemoVariant[] = [
  {
    id: "production",
    label: "Current (live)",
    labelHi: "Abhi production wali",
    description: "Same MP3s kids hear today — may sound quiet or muffled on some phones.",
    filterChain: null,
  },
  {
    id: "bright",
    label: "Bright & clear",
    labelHi: "Tez aur saaf",
    description: "Louder target, no silence trim, slight high-mid boost — clearer on phone speakers.",
    filterChain: [
      "highpass=f=90",
      "equalizer=f=2600:t=q:w=1.5:g=4",
      "loudnorm=I=-13:TP=-1:LRA=8",
      "alimiter=limit=-0.8dB",
      "afade=t=in:st=0:d=0.012",
      "areverse,afade=t=in:st=0:d=0.022,areverse",
    ].join(","),
  },
  {
    id: "minimal",
    label: "Minimal mastering",
    labelHi: "Halka processing",
    description: "Only loudness normalize + light limiter — keeps more natural ElevenLabs tone.",
    filterChain: "loudnorm=I=-14:TP=-1:LRA=11,alimiter=limit=-1dB",
  },
  {
    id: "crisp",
    label: "Crisp (gentle trim)",
    labelHi: "Crisp / thoda zyada volume",
    description: "Softer silence trim (-50dB) with slightly louder norm — less squashed than current.",
    filterChain: [
      "silenceremove=1:0:-50dB",
      "loudnorm=I=-14:TP=-1:LRA=9",
      "alimiter=limit=-1dB",
      "afade=t=in:st=0:d=0.015",
      "areverse,afade=t=in:st=0:d=0.025,areverse",
    ].join(","),
  },
  {
    id: "warm",
    label: "Warm & full",
    labelHi: "Garam / bhari awaaz",
    description: "Less treble cut, warmer body — good if bright sounds too sharp.",
    filterChain: [
      "highpass=f=70",
      "equalizer=f=180:t=q:w=1:g=2",
      "loudnorm=I=-14:TP=-1:LRA=10",
      "alimiter=limit=-1dB",
    ].join(","),
  },
];

export function getPhonicsDemoVariant(id: string): PhonicsAudioDemoVariant | undefined {
  return PHONICS_AUDIO_DEMO_VARIANTS.find((v) => v.id === id);
}

export function getPhonicsDemoAudioUrl(variantId: string, audioKey: string): string {
  const key = audioKey.trim().toLowerCase();
  if (variantId === "production") {
    return `/phonics-audio/${key}.mp3`;
  }
  return `/phonics-audio/demos/${variantId}/${key}.mp3`;
}
