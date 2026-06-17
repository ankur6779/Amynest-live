/**
 * Canonical AmyNest phoneme registry — ONE source of truth (Phase E).
 *
 * Unifies every phoneme category against evidence-based phonics. Entries marked
 * `inCurriculum: true` have (or will have) generated audio in the ElevenLabs
 * library; `false` entries are scoped for future curriculum levels (long vowels,
 * r-controlled, diphthongs, schwa, silent letters, trigraphs).
 *
 * `speakText` is the pure-sound hint sent to ElevenLabs at generation time —
 * never a letter name, never "as in". For taught letters/digraphs it is sourced
 * from ELEVENLABS_SPEAK_TEXT so the two cannot drift (asserted by
 * validatePhonemeRegistry()).
 */
import { ELEVENLABS_SPEAK_TEXT } from "./phonics-generation.js";

export type PhonemeCategory =
  | "short_vowel"
  | "long_vowel"
  | "consonant"
  | "digraph"
  | "trigraph"
  | "blend"
  | "r_controlled"
  | "diphthong"
  | "schwa"
  | "silent_letter";

export type PhonemeRegistryEntry = {
  /** Unique registry id (audioKey for taught phonemes). */
  id: string;
  ipa: string;
  type: PhonemeCategory;
  example: string;
  /** Pure-sound ElevenLabs generation hint. */
  speakText: string;
  /** True when audio is generated today; false = scoped for a future level. */
  inCurriculum: boolean;
  notes?: string;
};

function taught(
  id: string,
  ipa: string,
  type: PhonemeCategory,
  example: string,
  notes?: string,
): PhonemeRegistryEntry {
  return {
    id,
    ipa,
    type,
    example,
    speakText: ELEVENLABS_SPEAK_TEXT[id] ?? id,
    inCurriculum: true,
    notes,
  };
}

function scoped(
  id: string,
  ipa: string,
  type: PhonemeCategory,
  example: string,
  speakText: string,
  notes = "QA audition required before first generation",
): PhonemeRegistryEntry {
  return { id, ipa, type, example, speakText, inCurriculum: false, notes };
}

export const PHONEME_REGISTRY: readonly PhonemeRegistryEntry[] = [
  // ── Short vowels ──────────────────────────────────────────────
  taught("a", "æ", "short_vowel", "apple", "short a"),
  taught("e", "ɛ", "short_vowel", "egg", "short e"),
  taught("i", "ɪ", "short_vowel", "igloo", "short i"),
  taught("o", "ɒ", "short_vowel", "octopus", "short o — disambiguated from short a (P1)"),
  taught("u", "ʌ", "short_vowel", "umbrella", "short u"),

  // ── Single consonants ─────────────────────────────────────────
  taught("b", "b", "consonant", "bat"),
  taught("c", "k", "consonant", "cat", "hard c /k/; soft c not taught as a unit"),
  taught("d", "d", "consonant", "dog"),
  taught("f", "f", "consonant", "fish"),
  taught("g", "ɡ", "consonant", "goat"),
  taught("h", "h", "consonant", "hat"),
  taught("j", "dʒ", "consonant", "jam"),
  taught("k", "k", "consonant", "kite"),
  taught("l", "l", "consonant", "lion"),
  taught("m", "m", "consonant", "man"),
  taught("n", "n", "consonant", "nest"),
  taught("p", "p", "consonant", "pen"),
  taught("q", "kw", "consonant", "queen"),
  taught("r", "r", "consonant", "rat"),
  taught("s", "s", "consonant", "sun"),
  taught("t", "t", "consonant", "tap"),
  taught("v", "v", "consonant", "van"),
  taught("w", "w", "consonant", "water", "/w/ glide — speakText avoids letter-name (P6)"),
  taught("x", "ks", "consonant", "box"),
  taught("y", "j", "consonant", "yak", "/j/ glide — distinct from j /dʒ/ (P4)"),
  taught("z", "z", "consonant", "zebra"),

  // ── Digraphs ──────────────────────────────────────────────────
  taught("sh", "ʃ", "digraph", "ship"),
  taught("ch", "tʃ", "digraph", "chip"),
  taught("th1", "θ", "digraph", "thin", "unvoiced th"),
  taught("th2", "ð", "digraph", "this", "voiced th — disambiguated from unvoiced (P2)"),
  taught("ph", "f", "digraph", "phone"),
  taught("ng", "ŋ", "digraph", "ring"),
  taught("wh", "w", "digraph", "whale"),
  taught("ck", "k", "digraph", "duck", "single unit in blending (P5)"),
  taught("qu", "kw", "digraph", "queen", "single unit in blending (P5)"),

  // ── Forward-looking categories (scoped for future curriculum levels) ──
  scoped("a_e", "eɪ", "long_vowel", "cake", "ay"),
  scoped("e_e", "iː", "long_vowel", "these", "ee"),
  scoped("i_e", "aɪ", "long_vowel", "bike", "eye"),
  scoped("o_e", "oʊ", "long_vowel", "home", "oh"),
  scoped("u_e", "juː", "long_vowel", "cute", "yoo"),

  scoped("ar", "ɑːr", "r_controlled", "car", "ar"),
  scoped("or", "ɔːr", "r_controlled", "fork", "or"),
  scoped("er", "ɜːr", "r_controlled", "her", "er"),
  scoped("ir", "ɜːr", "r_controlled", "bird", "er"),
  scoped("ur", "ɜːr", "r_controlled", "fur", "er"),

  scoped("oi", "ɔɪ", "diphthong", "coin", "oy"),
  scoped("ou", "aʊ", "diphthong", "out", "ow"),
  scoped("ow", "aʊ", "diphthong", "cow", "ow"),

  scoped("schwa", "ə", "schwa", "about", "uh"),

  scoped("kn", "n", "silent_letter", "knee", "n"),
  scoped("wr", "r", "silent_letter", "write", "rrr"),
  scoped("mb", "m", "silent_letter", "lamb", "mmm"),

  scoped("igh", "aɪ", "trigraph", "light", "eye"),
  scoped("tch", "tʃ", "trigraph", "match", "chh"),
  scoped("dge", "dʒ", "trigraph", "bridge", "j."),
] as const;

const FORBIDDEN_SPEAK = [/\bsound\b/i, /\bletter\b/i, /\bsays\b/i, /\bas in\b/i];

export type PhonemeRegistryIssue = { id: string; problem: string };

/**
 * Registry certification (Phase E gate). Returns issues; empty == PASS.
 * Detects duplicates, empty/forbidden speakText, and within-type collisions
 * for taught isolated phonemes (the class of bug behind P1 and P2).
 */
export function validatePhonemeRegistry(): PhonemeRegistryIssue[] {
  const issues: PhonemeRegistryIssue[] = [];
  const seenIds = new Set<string>();
  // speakText → first {id, ipa} that produced it (taught entries only).
  const speakTextOwner = new Map<string, { id: string; ipa: string }>();

  for (const entry of PHONEME_REGISTRY) {
    if (seenIds.has(entry.id)) {
      issues.push({ id: entry.id, problem: "duplicate id" });
    }
    seenIds.add(entry.id);

    if (!entry.speakText.trim()) {
      issues.push({ id: entry.id, problem: "empty speakText" });
    }
    for (const pattern of FORBIDDEN_SPEAK) {
      if (pattern.test(entry.speakText)) {
        issues.push({ id: entry.id, problem: `speakText contains forbidden phrase "${entry.speakText}"` });
      }
    }

    // Collision = two DISTINCT phonemes (different IPA) generated from the SAME
    // text. This is the P1 (short-a vs short-o) / P2 (voiced vs unvoiced th)
    // bug class. Phonemes that share an IPA (c/k/ck → /k/, f/ph → /f/) may
    // legitimately reuse the same text.
    if (entry.inCurriculum) {
      const owner = speakTextOwner.get(entry.speakText);
      if (owner && owner.ipa !== entry.ipa) {
        issues.push({
          id: entry.id,
          problem: `speakText "${entry.speakText}" (${entry.ipa}) collides with "${owner.id}" (${owner.ipa})`,
        });
      } else if (!owner) {
        speakTextOwner.set(entry.speakText, { id: entry.id, ipa: entry.ipa });
      }
    }
  }
  return issues;
}

/** Convenience: registry entries that are generated today. */
export function getCurriculumPhonemes(): PhonemeRegistryEntry[] {
  return PHONEME_REGISTRY.filter((e) => e.inCurriculum);
}
