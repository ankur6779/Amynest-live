/**
 * Progressive decodable book library — unlock by SATPIN letter group only.
 * Stories never introduce graphemes beyond the child's unlocked set.
 */
import {
  getUnlockedGraphemes,
  wordDecodableWithGraphemes,
} from "@workspace/phonics-curriculum";
import type { ReadingAcademyLevelId } from "./reading-academy-levels";

export type DecodableBookPage = {
  text: string;
  /** Optional emoji illustration cue */
  emoji?: string;
};

export type DecodableBookVocab = {
  word: string;
  emoji: string;
  definition: string;
  example: string;
};

export type DecodableBook = {
  id: string;
  title: string;
  /** Minimum letter group (1–8) required to unlock */
  minLetterGroup: number;
  academyLevel: ReadingAcademyLevelId;
  pages: DecodableBookPage[];
  vocabulary: DecodableBookVocab[];
  /** Comprehension question seeds */
  comprehensionPrompts: {
    question: string;
    options: string[];
    correctIndex: number;
    kind: "who" | "what" | "sequence" | "picture" | "feeling";
  }[];
};

/**
 * Hand-authored progressive library (Science of Reading — decodable only).
 * Glue words allowed: a, I, is, in, the, and, on, at, no, had, can (HF).
 */
export const DECODABLE_BOOK_LIBRARY: readonly DecodableBook[] = [
  {
    id: "book-pat-sat",
    title: "Pat Sat",
    minLetterGroup: 1,
    academyLevel: 4,
    pages: [
      { text: "Pat sat.", emoji: "🪑" },
      { text: "Nan sat.", emoji: "🧘" },
      { text: "Pat is in.", emoji: "🏠" },
      { text: "Nan sat in.", emoji: "😊" },
    ],
    vocabulary: [
      {
        word: "sat",
        emoji: "🪑",
        definition: "Sat means rested on a seat or the floor.",
        example: "Pat sat.",
      },
      {
        word: "in",
        emoji: "📦",
        definition: "In means inside something.",
        example: "Pat is in.",
      },
    ],
    comprehensionPrompts: [
      {
        question: "Who sat?",
        options: ["Pat", "A dog", "The sun"],
        correctIndex: 0,
        kind: "who",
      },
      {
        question: "What did Nan do?",
        options: ["Ran", "Sat", "Hid"],
        correctIndex: 1,
        kind: "what",
      },
    ],
  },
  {
    id: "book-sam-sat",
    title: "Sam Sat",
    minLetterGroup: 2,
    academyLevel: 4,
    pages: [
      { text: "Sam sat.", emoji: "🧘" },
      { text: "Sam sat on a mat.", emoji: "🟩" },
      { text: "Pat sat.", emoji: "🪑" },
      { text: "Sam and Pat sat.", emoji: "❤️" },
    ],
    vocabulary: [
      {
        word: "sat",
        emoji: "🪑",
        definition: "Sat means rested on a seat or the floor.",
        example: "Sam sat on a mat.",
      },
      {
        word: "mat",
        emoji: "🟩",
        definition: "A flat rug on the floor.",
        example: "Sam sat on a mat.",
      },
    ],
    comprehensionPrompts: [
      {
        question: "Who sat on a mat?",
        options: ["Sam", "A dog", "The sun"],
        correctIndex: 0,
        kind: "who",
      },
      {
        question: "What did Pat do?",
        options: ["Ran", "Sat", "Hid"],
        correctIndex: 1,
        kind: "what",
      },
    ],
  },
  {
    id: "book-pat-and-cat",
    title: "Pat and the Cat",
    minLetterGroup: 2,
    academyLevel: 5,
    pages: [
      { text: "Pat sat.", emoji: "🧒" },
      { text: "A cat sat.", emoji: "🐱" },
      { text: "The cat sat on a mat.", emoji: "🧘" },
      { text: "Pat and the cat sat.", emoji: "❤️" },
    ],
    vocabulary: [
      {
        word: "cat",
        emoji: "🐱",
        definition: "A soft pet that says meow.",
        example: "The cat sat.",
      },
      {
        word: "mat",
        emoji: "🟩",
        definition: "A flat rug on the floor.",
        example: "The cat sat on a mat.",
      },
    ],
    comprehensionPrompts: [
      {
        question: "Who sat with Pat?",
        options: ["A dog", "A cat", "A pig"],
        correctIndex: 1,
        kind: "who",
      },
      {
        question: "Where did the cat sit?",
        options: ["On a mat", "In a pot", "On a tip"],
        correctIndex: 0,
        kind: "what",
      },
    ],
  },
  {
    id: "book-big-dog",
    title: "The Big Dog",
    minLetterGroup: 2,
    academyLevel: 5,
    pages: [
      { text: "A dog digs.", emoji: "🐶" },
      { text: "The dog can dig.", emoji: "⛏️" },
      { text: "Tom got a dog.", emoji: "🎁" },
      { text: "The dog sat.", emoji: "🐕" },
    ],
    vocabulary: [
      {
        word: "dog",
        emoji: "🐶",
        definition: "A friendly pet that can dig and run.",
        example: "The dog sat.",
      },
      {
        word: "dig",
        emoji: "⛏️",
        definition: "To make a hole in the ground.",
        example: "The dog can dig.",
      },
    ],
    comprehensionPrompts: [
      {
        question: "What can the dog do?",
        options: ["Dig", "Fly", "Read"],
        correctIndex: 0,
        kind: "what",
      },
      {
        question: "Who got a dog?",
        options: ["Sam", "Tom", "Pat"],
        correctIndex: 1,
        kind: "who",
      },
      {
        question: "Which picture matches the story?",
        options: ["A digging dog", "A flying cat", "A red bus"],
        correctIndex: 0,
        kind: "picture",
      },
    ],
  },
  {
    id: "book-fun-pond",
    title: "Fun at the Pond",
    minLetterGroup: 3,
    academyLevel: 5,
    pages: [
      { text: "A duck is at the pond.", emoji: "🦆" },
      { text: "Ned can run.", emoji: "🏃" },
      { text: "The duck sat.", emoji: "💧" },
      { text: "Ned and the duck sat.", emoji: "😄" },
    ],
    vocabulary: [
      {
        word: "pond",
        emoji: "🏞️",
        definition: "A small lake where ducks like to swim.",
        example: "A duck is at the pond.",
      },
      {
        word: "duck",
        emoji: "🦆",
        definition: "A bird that likes water.",
        example: "The duck sat.",
      },
      {
        word: "run",
        emoji: "🏃",
        definition: "To move fast on your feet.",
        example: "Ned can run.",
      },
    ],
    comprehensionPrompts: [
      {
        question: "Where is the duck?",
        options: ["At the pond", "In a cup", "On a bus"],
        correctIndex: 0,
        kind: "what",
      },
      {
        question: "How do you think Ned felt?",
        options: ["Sad", "Happy", "Sleepy"],
        correctIndex: 1,
        kind: "feeling",
      },
    ],
  },
  {
    id: "book-lost-hat",
    title: "The Lost Hat",
    minLetterGroup: 4,
    academyLevel: 6,
    pages: [
      { text: "Ben had a hat.", emoji: "🎩" },
      { text: "The hat is lost!", emoji: "😮" },
      { text: "Ben can dig.", emoji: "⛏️" },
      { text: "The hat is in the fog.", emoji: "🌫️" },
      { text: "Ben got the hat.", emoji: "😊" },
    ],
    vocabulary: [
      {
        word: "hat",
        emoji: "🎩",
        definition: "Something you wear on your head.",
        example: "Ben had a hat.",
      },
      {
        word: "lost",
        emoji: "🔍",
        definition: "When you cannot find something.",
        example: "The hat is lost!",
      },
      {
        word: "fog",
        emoji: "🌫️",
        definition: "Cloudy air near the ground.",
        example: "The hat is in the fog.",
      },
    ],
    comprehensionPrompts: [
      {
        question: "What was lost?",
        options: ["A hat", "A dog", "A pan"],
        correctIndex: 0,
        kind: "what",
      },
      {
        question: "What happened first?",
        options: ["Ben got the hat", "Ben had a hat", "The hat is in the fog"],
        correctIndex: 1,
        kind: "sequence",
      },
      {
        question: "How do you think Ben felt at the end?",
        options: ["Happy", "Angry", "Hungry"],
        correctIndex: 0,
        kind: "feeling",
      },
    ],
  },
  {
    id: "book-red-bus",
    title: "The Red Bus",
    minLetterGroup: 4,
    academyLevel: 6,
    pages: [
      { text: "A red bus!", emoji: "🚌" },
      { text: "Ben is on the bus.", emoji: "🧒" },
      { text: "The bus can hop… hop? No!", emoji: "😆" },
      { text: "The bus can run.", emoji: "💨" },
    ],
    vocabulary: [
      {
        word: "bus",
        emoji: "🚌",
        definition: "A big vehicle that carries many people.",
        example: "Ben is on the bus.",
      },
      {
        word: "red",
        emoji: "🔴",
        definition: "A bright colour like an apple.",
        example: "A red bus!",
      },
    ],
    comprehensionPrompts: [
      {
        question: "What colour is the bus?",
        options: ["Red", "Tan", "Dim"],
        correctIndex: 0,
        kind: "what",
      },
      {
        question: "Who is on the bus?",
        options: ["A cat", "Ben", "A duck"],
        correctIndex: 1,
        kind: "who",
      },
    ],
  },
] as const;

export function getBookById(id: string): DecodableBook | undefined {
  return DECODABLE_BOOK_LIBRARY.find((b) => b.id === id);
}

/** Books the child may open given their letter group. */
export function getUnlockedBooks(letterGroupIndex: number): DecodableBook[] {
  const g = Math.max(1, Math.min(8, Math.round(letterGroupIndex)));
  return DECODABLE_BOOK_LIBRARY.filter((b) => b.minLetterGroup <= g);
}

export function isBookUnlocked(
  bookId: string,
  letterGroupIndex: number,
): boolean {
  const book = getBookById(bookId);
  if (!book) return false;
  return book.minLetterGroup <= letterGroupIndex;
}

/** Validate every content word is decodable with unlocked graphemes (+ glue). */
export function validateBookDecodability(
  book: DecodableBook,
  letterGroupIndex: number,
): { ok: boolean; offenders: string[] } {
  const unlocked = getUnlockedGraphemes(letterGroupIndex);
  const glue = new Set([
    "a",
    "i",
    "is",
    "in",
    "the",
    "and",
    "on",
    "at",
    "no",
    "had",
    "can",
  ]);
  const offenders: string[] = [];
  for (const page of book.pages) {
    const words = page.text
      .toLowerCase()
      .replace(/[^a-z\s']/g, "")
      .split(/\s+/)
      .filter(Boolean);
    for (const w of words) {
      if (glue.has(w)) continue;
      if (!wordDecodableWithGraphemes(w, unlocked)) offenders.push(w);
    }
  }
  return { ok: offenders.length === 0, offenders: [...new Set(offenders)] };
}

export function countLibraryWords(): number {
  let n = 0;
  for (const b of DECODABLE_BOOK_LIBRARY) {
    for (const p of b.pages) {
      n += p.text.split(/\s+/).filter(Boolean).length;
    }
  }
  return n;
}
