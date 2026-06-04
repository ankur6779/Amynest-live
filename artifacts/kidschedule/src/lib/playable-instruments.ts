/**
 * Maps each Instrument World item to a playable "mini instrument" layout.
 *
 * Pitched instruments are synthesised (see instrument-synth.ts); percussion
 * reuses the recorded clip as one-shot pads. Any instrument without an explicit
 * entry falls back to a sensible layout based on its catalog category, so the
 * whole world is playable.
 */

import type { WorldManifestItem } from "@workspace/world-engine";
import type { InstrumentTimbre } from "@/lib/instrument-synth";

export type PlayableKind = "keyboard" | "bars" | "strings" | "pads" | "wind";

export type PlayableStringDef = { note: string; label: string };
export type PlayablePadDef = { label: string; emoji: string; playbackRate: number };

export type PlayableConfig = {
  kind: PlayableKind;
  timbre: InstrumentTimbre;
  /** Notes for bars / wind keys (low → high). */
  notes?: string[];
  /** Open-string notes for strummable instruments (top → bottom). */
  strings?: PlayableStringDef[];
  /** Tap pads for percussion (reuse the recorded sample, pitch-shifted). */
  pads?: PlayablePadDef[];
  hint: string;
};

/**
 * General MIDI instrument name for the `smplr` Soundfont sampler (real
 * recordings). `null` means "no melodic sampler" — percussion reuses its own
 * recorded clip instead.
 */
const GM_INSTRUMENT: Record<string, string | null> = {
  piano: "acoustic_grand_piano",
  organ: "church_organ",
  accordion: "accordion",
  xylophone: "xylophone",
  kalimba: "kalimba",
  "steel-drum": "steel_drums",
  guitar: "acoustic_guitar_steel",
  ukulele: "acoustic_guitar_nylon",
  "bass-guitar": "electric_bass_finger",
  banjo: "banjo",
  sitar: "sitar",
  harp: "orchestral_harp",
  violin: "violin",
  cello: "cello",
  flute: "flute",
  recorder: "recorder",
  "pan-flute": "pan_flute",
  clarinet: "clarinet",
  saxophone: "alto_sax",
  oboe: "oboe",
  bassoon: "bassoon",
  harmonica: "harmonica",
  bagpipes: "bagpipe",
  trumpet: "trumpet",
  trombone: "trombone",
  tuba: "tuba",
  bugle: "trumpet",
  "french-horn": "french_horn",
};

const GM_BY_CATEGORY: Record<string, string | null> = {
  strings: "acoustic_guitar_steel",
  woodwind: "flute",
  brass: "trumpet",
  percussion: null,
};

/** GM sampler instrument name for an item, or null to use its recorded clip. */
export function getGmInstrument(item: WorldManifestItem): string | null {
  if (item.id in GM_INSTRUMENT) return GM_INSTRUMENT[item.id];
  return GM_BY_CATEGORY[item.category] ?? null;
}

const MAJOR_OCTAVE = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];
const PENTATONIC = ["C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5"];

function bars(timbre: InstrumentTimbre, notes: string[], hint: string): PlayableConfig {
  return { kind: "bars", timbre, notes, hint };
}

function wind(timbre: InstrumentTimbre, hint: string, notes = MAJOR_OCTAVE): PlayableConfig {
  return { kind: "wind", timbre, notes, hint };
}

function strings(
  timbre: InstrumentTimbre,
  defs: PlayableStringDef[],
  hint: string,
): PlayableConfig {
  return { kind: "strings", timbre, strings: defs, hint };
}

function str(note: string, label: string): PlayableStringDef {
  return { note, label };
}

const KEYBOARD: PlayableConfig = {
  kind: "keyboard",
  timbre: "piano",
  hint: "Tap the keys to play a tune",
};

const PER_ID: Record<string, PlayableConfig> = {
  piano: KEYBOARD,
  organ: { ...KEYBOARD, timbre: "organ", hint: "Hold notes for a big organ sound" },
  accordion: { ...KEYBOARD, timbre: "reed", hint: "Tap the keys to squeeze out a tune" },

  xylophone: bars("mallet", MAJOR_OCTAVE, "Tap the colorful bars"),
  kalimba: bars("kalimba", PENTATONIC, "Pluck the metal tines"),
  "steel-drum": bars("mallet", PENTATONIC, "Tap the steel pan notes"),
  triangle: bars("mallet", ["A5"], "Ding the triangle"),

  guitar: strings(
    "pluck",
    [str("E3", "E"), str("A3", "A"), str("D4", "D"), str("G4", "G"), str("B4", "B"), str("E5", "e")],
    "Strum or pluck the strings",
  ),
  ukulele: strings(
    "pluck",
    [str("G4", "G"), str("C4", "C"), str("E4", "E"), str("A4", "A")],
    "Strum the ukulele",
  ),
  "bass-guitar": strings(
    "pluck",
    [str("E2", "E"), str("A2", "A"), str("D3", "D"), str("G3", "G")],
    "Pluck the deep bass strings",
  ),
  banjo: strings(
    "twang",
    [str("G4", "G"), str("D4", "D"), str("G3", "G"), str("B3", "B"), str("D5", "D")],
    "Pluck the banjo strings",
  ),
  sitar: strings(
    "twang",
    [str("C4", "Sa"), str("D4", "Re"), str("E4", "Ga"), str("G4", "Pa"), str("A4", "Dha"), str("C5", "Sa")],
    "Pluck the sitar strings",
  ),
  harp: strings(
    "pluck",
    [
      str("C4", "C"),
      str("D4", "D"),
      str("E4", "E"),
      str("F4", "F"),
      str("G4", "G"),
      str("A4", "A"),
      str("B4", "B"),
      str("C5", "C"),
    ],
    "Sweep across the harp strings",
  ),
  violin: strings(
    "bow",
    [str("G3", "G"), str("D4", "D"), str("A4", "A"), str("E5", "E")],
    "Bow the violin strings",
  ),
  cello: strings(
    "bow",
    [str("C2", "C"), str("G2", "G"), str("D3", "D"), str("A3", "A")],
    "Bow the cello strings",
  ),

  flute: wind("flute", "Tap the holes to play the flute"),
  recorder: wind("flute", "Tap the holes to play the recorder"),
  "pan-flute": wind("flute", "Tap the pipes", PENTATONIC),
  clarinet: wind("reed", "Tap the keys to play the clarinet"),
  saxophone: wind("reed", "Tap the keys to play the sax"),
  oboe: wind("reed", "Tap the keys to play the oboe"),
  bassoon: wind("reed", "Tap the keys to play the bassoon"),
  harmonica: wind("reed", "Tap to blow the harmonica"),
  bagpipes: wind("reed", "Tap to play the bagpipes"),
  trumpet: wind("brass", "Press the valves to play the trumpet"),
  trombone: wind("brass", "Slide and play the trombone"),
  tuba: wind("brass", "Press the valves for big tuba notes"),
  bugle: wind("brass", "Play the bugle call"),
  "french-horn": wind("brass", "Play the french horn"),
};

function fallbackForCategory(item: WorldManifestItem): PlayableConfig {
  switch (item.category) {
    case "percussion":
      return {
        kind: "pads",
        timbre: "mallet",
        pads: [
          { label: "Low", emoji: "🔵", playbackRate: 0.75 },
          { label: "Mid", emoji: "🟢", playbackRate: 1 },
          { label: "High", emoji: "🟡", playbackRate: 1.4 },
        ],
        hint: `Tap the pads to play the ${item.name.toLowerCase()}`,
      };
    case "woodwind":
      return wind("flute", `Tap the keys to play the ${item.name.toLowerCase()}`);
    case "brass":
      return wind("brass", `Press the valves to play the ${item.name.toLowerCase()}`);
    case "strings":
    default:
      return strings(
        "pluck",
        MAJOR_OCTAVE.map((n) => str(n, n.replace(/\d/, ""))),
        `Pluck the ${item.name.toLowerCase()} strings`,
      );
  }
}

/** Resolve the playable layout for an instrument (explicit map → category fallback). */
export function getPlayableConfig(item: WorldManifestItem): PlayableConfig {
  return PER_ID[item.id] ?? fallbackForCategory(item);
}
