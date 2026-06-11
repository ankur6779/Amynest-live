/**
 * Digraph V3 content catalog — lessons, stories, audio, missions, assessments.
 * Each digraph (sh, ch, th, wh, ck, ng) has a complete learning loop.
 */
import { buildPhonicsAudioCatalog } from "@workspace/phonics-sounds";
export type DigraphId = "sh" | "ch" | "th" | "wh" | "ck" | "ng";

export type DigraphWord = {
  word: string;
  digraph: DigraphId;
  emoji: string;
};

export const CERTIFIED_DIGRAPH_IDS: DigraphId[] = ["sh", "ch", "th", "wh", "ck", "ng"];

export const MIN_DIGRAPH_STORIES = 10;

export type DigraphStoryMeta = {
  id: string;
  title: string;
  emoji: string;
  level: 4;
  requiredSounds: string[];
  requiredFamilies: string[];
  difficulty: number;
  estimatedMinutes: number;
  lines: { text: string; highlightWords: string[] }[];
  comprehensionQuestion?: string;
};

export type DigraphLessonStep = {
  type: "listen" | "blend" | "read";
  word: string;
  audioKey: string;
  label: string;
};

export type DigraphLesson = {
  id: string;
  digraphId: DigraphId;
  title: string;
  intro: string;
  phonemeAudioKey: string;
  steps: DigraphLessonStep[];
};

export type DigraphAudioClip = {
  id: string;
  digraphId: DigraphId;
  type: "phoneme" | "word";
  audioKey: string;
  text: string;
};

export type DigraphMissionTask = {
  id: string;
  emoji: string;
  label: string;
  word: string;
  slot: "listen" | "practice" | "assessment" | "story";
};

export type DigraphMission = {
  id: string;
  digraphId: DigraphId;
  title: string;
  tasks: DigraphMissionTask[];
};

export type DigraphAssessment = {
  id: string;
  digraphId: DigraphId;
  title: string;
  words: string[];
  passThreshold: number;
};

export type DigraphRetentionConfig = {
  digraphId: DigraphId;
  phonemeTrackId: string;
  reviewWords: string[];
};

type WordSeed = { word: string; emoji: string };

const DIGRAPH_WORD_BANK: Record<DigraphId, WordSeed[]> = {
  sh: [
    { word: "ship", emoji: "🚢" },
    { word: "shop", emoji: "🛍️" },
    { word: "fish", emoji: "🐟" },
    { word: "shell", emoji: "🐚" },
    { word: "wish", emoji: "✨" },
    { word: "dish", emoji: "🍽️" },
    { word: "shut", emoji: "🚪" },
    { word: "rush", emoji: "💨" },
    { word: "bush", emoji: "🌿" },
    { word: "cash", emoji: "💵" },
    { word: "mesh", emoji: "🕸️" },
    { word: "bash", emoji: "🥳" },
  ],
  ch: [
    { word: "chip", emoji: "🍟" },
    { word: "chop", emoji: "🪓" },
    { word: "chin", emoji: "😊" },
    { word: "chat", emoji: "💬" },
    { word: "chick", emoji: "🐥" },
    { word: "bench", emoji: "🪑" },
    { word: "lunch", emoji: "🥪" },
    { word: "rich", emoji: "💰" },
    { word: "much", emoji: "📦" },
    { word: "such", emoji: "👍" },
    { word: "arch", emoji: "🏛️" },
    { word: "peach", emoji: "🍑" },
  ],
  th: [
    { word: "thin", emoji: "📏" },
    { word: "this", emoji: "👆" },
    { word: "that", emoji: "👉" },
    { word: "bath", emoji: "🛁" },
    { word: "path", emoji: "🛤️" },
    { word: "math", emoji: "🔢" },
    { word: "with", emoji: "🤝" },
    { word: "moth", emoji: "🦋" },
    { word: "then", emoji: "⏭️" },
    { word: "them", emoji: "👥" },
    { word: "thick", emoji: "📚" },
    { word: "thumb", emoji: "👍" },
  ],
  wh: [
    { word: "when", emoji: "⏰" },
    { word: "whip", emoji: "🎉" },
    { word: "whiz", emoji: "⚡" },
    { word: "wham", emoji: "💥" },
    { word: "which", emoji: "❓" },
    { word: "whisk", emoji: "🥄" },
    { word: "whim", emoji: "💭" },
    { word: "whale", emoji: "🐋" },
    { word: "wheat", emoji: "🌾" },
    { word: "wheel", emoji: "🛞" },
    { word: "whirl", emoji: "🌀" },
    { word: "white", emoji: "🤍" },
  ],
  ck: [
    { word: "duck", emoji: "🦆" },
    { word: "sock", emoji: "🧦" },
    { word: "back", emoji: "🔙" },
    { word: "pack", emoji: "🎒" },
    { word: "sick", emoji: "🤒" },
    { word: "pick", emoji: "⛏️" },
    { word: "kick", emoji: "⚽" },
    { word: "neck", emoji: "👔" },
    { word: "deck", emoji: "🃏" },
    { word: "peck", emoji: "🐦" },
    { word: "rock", emoji: "🪨" },
    { word: "lock", emoji: "🔒" },
  ],
  ng: [
    { word: "ring", emoji: "💍" },
    { word: "sing", emoji: "🎵" },
    { word: "long", emoji: "📏" },
    { word: "song", emoji: "🎶" },
    { word: "bang", emoji: "🎆" },
    { word: "hang", emoji: "🧥" },
    { word: "king", emoji: "👑" },
    { word: "wing", emoji: "🪽" },
    { word: "rang", emoji: "📞" },
    { word: "sung", emoji: "🎤" },
    { word: "lung", emoji: "🫁" },
    { word: "bung", emoji: "🛢️" },
  ],
};

const PHONEME_AUDIO_KEYS: Record<DigraphId, string[]> = {
  sh: ["sh"],
  ch: ["ch"],
  th: ["th1", "th2"],
  wh: ["wh"],
  ck: ["ck"],
  ng: ["ng"],
};

import { DIGRAPH_STORY_SCRIPTS } from "./digraph-story-scripts";

const NAMES = ["Sam", "Kim", "Pat", "Meg", "Ben"];

function digraphWords(id: DigraphId): DigraphWord[] {
  return DIGRAPH_WORD_BANK[id].map((w) => ({ ...w, digraph: id }));
}

export function getDigraphWordBank(id: DigraphId): DigraphWord[] {
  return digraphWords(id);
}

export function getAllDigraphWords(): DigraphWord[] {
  return CERTIFIED_DIGRAPH_IDS.flatMap((id) => digraphWords(id));
}

export function buildDigraphStories(digraphId: DigraphId, scriptOffset = 0): DigraphStoryMeta[] {
  const words = DIGRAPH_WORD_BANK[digraphId];
  const stories: DigraphStoryMeta[] = [];
  const count = Math.max(MIN_DIGRAPH_STORIES, words.length);

  for (let i = 0; i < count; i++) {
    const w = words[i % words.length]!;
    const w2 = words[(i + 1) % words.length]!;
    const name = NAMES[i % NAMES.length]!;
    const script = DIGRAPH_STORY_SCRIPTS[(scriptOffset + i) % DIGRAPH_STORY_SCRIPTS.length]!;
    const built = { title: script.title(w.word, w2.word, name), lines: script.lines(w.word, w2.word, name) };

    stories.push({
      id: `dig-${digraphId}-${String(i + 1).padStart(2, "0")}`,
      title: built.title,
      emoji: w.emoji,
      level: 4,
      requiredSounds: [digraphId],
      requiredFamilies: [],
      difficulty: 5 + (i % 3),
      estimatedMinutes: 2,
      lines: built.lines.map((text) => ({
        text,
        highlightWords: text.replace(/[.!?]/g, "").split(/\s+/),
      })),
      comprehensionQuestion: `What ${digraphId} word did you read?`,
    });
  }

  return stories;
}

export function getAllDigraphStories(): DigraphStoryMeta[] {
  let scriptOffset = 0;
  return CERTIFIED_DIGRAPH_IDS.flatMap((id) => {
    const stories = buildDigraphStories(id, scriptOffset);
    scriptOffset += stories.length;
    return stories;
  });
}

export function getDigraphStories(digraphId: DigraphId): DigraphStoryMeta[] {
  return buildDigraphStories(digraphId);
}

function buildLesson(digraphId: DigraphId): DigraphLesson {
  const words = DIGRAPH_WORD_BANK[digraphId].slice(0, 4);
  const phonemeKey = PHONEME_AUDIO_KEYS[digraphId][0]!;
  const steps: DigraphLessonStep[] = [
    {
      type: "listen",
      word: digraphId,
      audioKey: phonemeKey,
      label: `Listen: ${digraphId}`,
    },
    ...words.map((w) => ({
      type: "blend" as const,
      word: w.word,
      audioKey: w.word,
      label: `Blend: ${w.word}`,
    })),
    {
      type: "read",
      word: words[0]!.word,
      audioKey: words[0]!.word,
      label: `Read: ${words[0]!.word}`,
    },
  ];

  return {
    id: `lesson-${digraphId}`,
    digraphId,
    title: `${digraphId.toUpperCase()} Digraph Lesson`,
    intro: `Learn the ${digraphId} sound and blend ${digraphId} words.`,
    phonemeAudioKey: phonemeKey,
    steps,
  };
}

export function getDigraphLessons(): DigraphLesson[] {
  return CERTIFIED_DIGRAPH_IDS.map((id) => buildLesson(id));
}

export function getDigraphLesson(digraphId: DigraphId): DigraphLesson {
  return buildLesson(digraphId);
}

function buildAudioClips(digraphId: DigraphId): DigraphAudioClip[] {
  const clips: DigraphAudioClip[] = PHONEME_AUDIO_KEYS[digraphId].map((key) => ({
    id: `audio-${digraphId}-phoneme-${key}`,
    digraphId,
    type: "phoneme",
    audioKey: key,
    text: key === "th1" || key === "th2" ? "th" : digraphId,
  }));

  for (const w of DIGRAPH_WORD_BANK[digraphId]) {
    clips.push({
      id: `audio-${digraphId}-word-${w.word}`,
      digraphId,
      type: "word",
      audioKey: w.word,
      text: w.word,
    });
  }
  return clips;
}

export function getDigraphAudioClips(digraphId: DigraphId): DigraphAudioClip[] {
  return buildAudioClips(digraphId);
}

export function getAllDigraphAudioClips(): DigraphAudioClip[] {
  return CERTIFIED_DIGRAPH_IDS.flatMap((id) => buildAudioClips(id));
}

function buildMission(digraphId: DigraphId): DigraphMission {
  const words = DIGRAPH_WORD_BANK[digraphId];
  const w0 = words[0]!;
  const w1 = words[1]!;
  const story = buildDigraphStories(digraphId)[0]!;

  return {
    id: `mission-${digraphId}`,
    digraphId,
    title: `${digraphId.toUpperCase()} Daily Mission`,
    tasks: [
      {
        id: `dig-m-${digraphId}-listen`,
        emoji: "👂",
        label: `Listen: ${digraphId}`,
        word: w0.word,
        slot: "listen",
      },
      {
        id: `dig-m-${digraphId}-practice`,
        emoji: "🎯",
        label: `Practice: ${w1.word}`,
        word: w1.word,
        slot: "practice",
      },
      {
        id: `dig-m-${digraphId}-assess`,
        emoji: "🎤",
        label: `Say: ${w0.word}`,
        word: w0.word,
        slot: "assessment",
      },
      {
        id: `dig-m-${digraphId}-story`,
        emoji: "📖",
        label: `Story: ${story.title}`,
        word: w0.word,
        slot: "story",
      },
    ],
  };
}

export function getDigraphMissions(): DigraphMission[] {
  return CERTIFIED_DIGRAPH_IDS.map((id) => buildMission(id));
}

export function getDigraphMission(digraphId: DigraphId): DigraphMission {
  return buildMission(digraphId);
}

function buildAssessment(digraphId: DigraphId): DigraphAssessment {
  const words = DIGRAPH_WORD_BANK[digraphId].slice(0, 5).map((w) => w.word);
  return {
    id: `assess-${digraphId}`,
    digraphId,
    title: `${digraphId.toUpperCase()} Voice Check`,
    words,
    passThreshold: 0.55,
  };
}

export function getDigraphAssessments(): DigraphAssessment[] {
  return CERTIFIED_DIGRAPH_IDS.map((id) => buildAssessment(id));
}

export function getDigraphAssessment(digraphId: DigraphId): DigraphAssessment {
  return buildAssessment(digraphId);
}

function buildRetention(digraphId: DigraphId): DigraphRetentionConfig {
  return {
    digraphId,
    phonemeTrackId: digraphId,
    reviewWords: DIGRAPH_WORD_BANK[digraphId].slice(0, 6).map((w) => w.word),
  };
}

export function getDigraphRetentionConfigs(): DigraphRetentionConfig[] {
  return CERTIFIED_DIGRAPH_IDS.map((id) => buildRetention(id));
}

export function getDigraphRetentionConfig(digraphId: DigraphId): DigraphRetentionConfig {
  return buildRetention(digraphId);
}

/** Verify clip exists in phonics audio catalog. */
export function isAudioClipAvailable(audioKey: string): boolean {
  const catalog = buildPhonicsAudioCatalog();
  const key = audioKey.trim().toLowerCase();
  return catalog.some(
    (e) =>
      e.id.toLowerCase() === key ||
      e.text.toLowerCase() === key ||
      e.speakText.toLowerCase() === key,
  );
}

export function getDigraphContentCounts(): Record<
  DigraphId,
  {
    stories: number;
    audioClips: number;
    missionTasks: number;
    assessmentWords: number;
    lessonSteps: number;
    retentionWords: number;
  }
> {
  const counts = {} as Record<DigraphId, ReturnType<typeof getDigraphContentCounts>[DigraphId]>;
  for (const id of CERTIFIED_DIGRAPH_IDS) {
    counts[id] = {
      stories: getDigraphStories(id).length,
      audioClips: getDigraphAudioClips(id).length,
      missionTasks: getDigraphMission(id).tasks.length,
      assessmentWords: getDigraphAssessment(id).words.length,
      lessonSteps: getDigraphLesson(id).steps.length,
      retentionWords: getDigraphRetentionConfig(id).reviewWords.length,
    };
  }
  return counts;
}
