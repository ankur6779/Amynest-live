import { LESSONS } from "@workspace/audio-lessons";
import { getPhonicsAudioTextsForStaticCatalog, getCvcPhonemeAudioTextsForStaticCatalog } from "@workspace/phonics-sounds";
import { getPromptSpeakText, PRONUNCIATION_PROMPTS, getArticulationCue, getCoachDialogueAudioTextsForStaticCatalog } from "@workspace/speech-coach";
import {
  ADVANCED_SUBJECTS,
  collapseSpeakWhitespace,
  getBasicSubjectsForCountry,
  getPlayCategoriesForCountry,
  getPlayItemSpeakText,
  getTopicAmySpeakText,
  getTopicNotesSpeakText,
} from "@workspace/study-zone";
import { getStaticAudioHash, getStaticAudioObjectKey } from "./keys.js";
import { normalizeStaticAudioKey } from "./normalize.js";
import {
  getMathTrickAudioTextsForStaticCatalog,
  getMathTrickVisualNarrationTexts,
} from "@workspace/math-tricks";
import { getSpellingAudioTextsForStaticCatalog } from "@workspace/spelling-catalog";
import { getParentHubAudioTextsForStaticCatalog } from "@workspace/parent-hub-speak";
import { getStaticTtsEntries } from "./phrases.js";
import type { StaticAudioMode, StaticTtsEntry } from "./types.js";

export type SpeakablePhraseRecord = {
  text: string;
  mode: StaticAudioMode;
  normalizedKey: string;
  hash: string;
  objectKey: string;
  source: string;
};

/** Extra UI / routine / quiz lines not in getStaticTtsEntries(). */
const EXTRA_DEFAULT_PHRASES: string[] = [
  "Time for your next activity!",
  "Great work today!",
  "Let's practice together.",
  "Tap to hear Amy",
  "Listen to Amy",
  "Correct!",
  "Not quite — try again!",
  "I see it.",
  "Come here.",
  "All done.",
  "Thank you, mama.",
  "I love you.",
  "The little duck sat by the pond.",
];

const EXTRA_PHONICS_PHRASES: string[] = [];

function uniqueRecords(records: SpeakablePhraseRecord[]): SpeakablePhraseRecord[] {
  const seen = new Set<string>();
  const out: SpeakablePhraseRecord[] = [];
  for (const r of records) {
    const k = `${r.mode}\0${r.normalizedKey}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function toRecord(
  text: string,
  mode: StaticAudioMode,
  source: string,
): SpeakablePhraseRecord | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const normalizedKey = normalizeStaticAudioKey(trimmed);
  return {
    text: trimmed,
    mode,
    normalizedKey,
    hash: getStaticAudioHash(trimmed, mode),
    objectKey: getStaticAudioObjectKey(trimmed, mode),
    source,
  };
}

function fromEntries(entries: StaticTtsEntry[], source: string): SpeakablePhraseRecord[] {
  return entries
    .map((e) => toRecord(e.text, e.mode, source))
    .filter((r): r is SpeakablePhraseRecord => r !== null);
}

/** Countries with localized play/GK copy — must match resolve-content SUPPORTED + DEFAULT. */
const STUDY_ZONE_COUNTRIES = ["IN", "US", "UK", "AU", "NZ", "AE", "DEFAULT"] as const;

function collectStudyZonePhrases(): SpeakablePhraseRecord[] {
  const out: SpeakablePhraseRecord[] = [];
  const pushLine = (line: string, source: string) => {
    const r = toRecord(line, "default", source);
    if (r) out.push(r);
    const collapsed = collapseSpeakWhitespace(line);
    if (collapsed !== line.trim()) {
      const c = toRecord(collapsed, "default", `${source}_collapsed`);
      if (c) out.push(c);
    }
  };

  for (const country of STUDY_ZONE_COUNTRIES) {
    const playSource = country === "DEFAULT" ? "study_zone_play" : `study_zone_play_${country}`;
    for (const cat of getPlayCategoriesForCountry(country)) {
      for (const item of cat.items) {
        pushLine(getPlayItemSpeakText(item, cat.id), playSource);
      }
    }
    const notesSource =
      country === "DEFAULT" ? "study_zone_topic_notes" : `study_zone_topic_notes_${country}`;
    const promptSource =
      country === "DEFAULT" ? "study_zone_topic_prompt" : `study_zone_topic_prompt_${country}`;
    for (const subject of getBasicSubjectsForCountry(country)) {
      for (const topic of subject.topics) {
        pushLine(getTopicNotesSpeakText(topic), notesSource);
        pushLine(getTopicAmySpeakText(topic), promptSource);
      }
    }
  }
  for (const subject of ADVANCED_SUBJECTS) {
    for (const topic of subject.topics) {
      pushLine(getTopicNotesSpeakText(topic), "study_zone_topic_notes");
      pushLine(getTopicAmySpeakText(topic), "study_zone_topic_prompt");
    }
  }
  return out;
}

function collectCoachDialoguePhrases(): SpeakablePhraseRecord[] {
  return getCoachDialogueAudioTextsForStaticCatalog()
    .map((t) => toRecord(t, "default", "coach_dialogue"))
    .filter((r): r is SpeakablePhraseRecord => r !== null);
}

function collectSpeechCoachPhrases(): SpeakablePhraseRecord[] {
  const out: SpeakablePhraseRecord[] = [];
  for (const p of PRONUNCIATION_PROMPTS) {
    const text = getPromptSpeakText(p);
    const mode: StaticAudioMode =
      p.kind === "letter" || p.kind === "phonic" ? "phonics" : "default";
    const r = toRecord(text, mode, `speech_coach_${p.kind}`);
    if (r) out.push(r);
    const cue = getArticulationCue(p.text.toLowerCase());
    if (cue?.coachLine) {
      const c = toRecord(cue.coachLine, "default", "speech_coach_articulation");
      if (c) out.push(c);
    }
  }
  return out;
}

function collectAudioLessonPhrases(): SpeakablePhraseRecord[] {
  const out: SpeakablePhraseRecord[] = [];
  for (const lesson of LESSONS) {
    for (const para of lesson.paragraphs.en) {
      const r = toRecord(para, "default", "audio_lessons");
      if (r) out.push(r);
    }
    const title = toRecord(lesson.title.en, "default", "audio_lessons_title");
    if (title) out.push(title);
  }
  return out;
}

function collectMathTrickPhrases(): SpeakablePhraseRecord[] {
  const lines = [
    ...getMathTrickAudioTextsForStaticCatalog(),
    ...getMathTrickVisualNarrationTexts(),
  ];
  return lines
    .map((t) => toRecord(t, "default", "math_tricks"))
    .filter((r): r is SpeakablePhraseRecord => r !== null);
}

function collectSpellingPhrases(): SpeakablePhraseRecord[] {
  return getSpellingAudioTextsForStaticCatalog()
    .map((t) => toRecord(t, "default", "spelling_mastery"))
    .filter((r): r is SpeakablePhraseRecord => r !== null);
}

function collectParentHubPhrases(): SpeakablePhraseRecord[] {
  return getParentHubAudioTextsForStaticCatalog()
    .map((t) => toRecord(t, "default", "parent_hub"))
    .filter((r): r is SpeakablePhraseRecord => r !== null);
}

function collectPhonicsExtras(): SpeakablePhraseRecord[] {
  const lines = [
    ...getPhonicsAudioTextsForStaticCatalog(),
    ...getCvcPhonemeAudioTextsForStaticCatalog(),
    ...EXTRA_PHONICS_PHRASES,
  ];
  return lines
    .map((t) => toRecord(t, "phonics", "phonics_sounds"))
    .filter((r): r is SpeakablePhraseRecord => r !== null);
}

/**
 * Full speakable phrase corpus for pre-generation and registry seeding.
 */
export function collectAllSpeakablePhrases(): SpeakablePhraseRecord[] {
  const records: SpeakablePhraseRecord[] = [
    ...fromEntries(getStaticTtsEntries(), "static_catalog"),
    ...collectStudyZonePhrases(),
    ...collectSpeechCoachPhrases(),
    ...collectCoachDialoguePhrases(),
    ...collectAudioLessonPhrases(),
    ...collectPhonicsExtras(),
    ...collectMathTrickPhrases(),
    ...collectSpellingPhrases(),
    ...collectParentHubPhrases(),
    ...EXTRA_DEFAULT_PHRASES.map((t) => toRecord(t, "default", "extra_default")).filter(
      (r): r is SpeakablePhraseRecord => r !== null,
    ),
  ];
  return uniqueRecords(records);
}

export function buildHashToPhraseIndex(
  records: SpeakablePhraseRecord[] = collectAllSpeakablePhrases(),
): Map<string, SpeakablePhraseRecord> {
  const map = new Map<string, SpeakablePhraseRecord>();
  for (const r of records) {
    map.set(r.hash, r);
  }
  return map;
}
