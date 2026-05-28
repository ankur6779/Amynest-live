/** English-only validation for Parent Hub Learning Zone UI + AI payloads. */

export const LEARNING_ZONE_ENGLISH_AI_RULE =
  "Use natural English only. Never use Hindi, Hinglish, Devanagari script, or transliterated Hindi words inside English sentences.";

const DEVANAGARI_RE = /[\u0900-\u097F]/;

/** Common Hinglish / transliterated Hindi tokens in Roman script. */
const HINGLISH_TOKEN_RE =
  /\b(karo|karein|karega|karegi|karna|karke|karte|karti|kiya|kiye|kijiye|karo\b|karo\.|karo!|karo\?|aur\b|se\b|nahi|nahin|aaj|kal|bacche|bachche|bacha|baccha|samjho|samjhe|sikh|sikho|padho|likho|batao|dekho|sun|suno|accha|theek|thik|mushkil|aasan|zara|jaldi|abhi|phir|wala|wali|wale|yeh|ye|woh|wo|kya|kaise|kyun|kyu|matlab|samajh|mein|mai|main|tum|aap|hum|unka|uska|mera|tera|hoga|hogi|honge|hain|hai|ho|gaya|gayi|gaye|jao|aao|chalo|dekhein|karein|kijiye|karo)\b/i;

const ALLOWLIST = new Set([
  "se",
  "the",
  "be",
  "me",
  "we",
  "he",
  "or",
  "as",
  "at",
  "in",
  "on",
  "to",
  "of",
  "is",
  "it",
  "an",
  "am",
  "do",
  "go",
  "no",
  "so",
  "hi",
]);

function normalizeForScan(text: string): string {
  return text.normalize("NFKC").trim();
}

/** True when text likely contains non-English Learning Zone copy. */
export function isNonEnglishLearningZoneText(text: string): boolean {
  const t = normalizeForScan(text);
  if (!t) return false;
  if (DEVANAGARI_RE.test(t)) return true;

  const tokens = t.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  for (const token of tokens) {
    if (ALLOWLIST.has(token)) continue;
    if (HINGLISH_TOKEN_RE.test(` ${token} `)) return true;
  }

  if (/\bamy se aur\b/i.test(t)) return true;
  if (/\bgenerate karo\b/i.test(t)) return true;
  if (/\bkaro\b/i.test(t) && /\b(aur|se|aur generate)\b/i.test(t)) return true;

  return false;
}

export function extractLearningZoneStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    const s = value.trim();
    if (s.length >= 2) out.push(s);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) extractLearningZoneStrings(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      extractLearningZoneStrings(v, out);
    }
  }
  return out;
}

export function validateLearningZonePayload(items: unknown): {
  valid: boolean;
  offenders: string[];
} {
  const strings = extractLearningZoneStrings(items);
  const offenders = strings.filter(isNonEnglishLearningZoneText);
  return { valid: offenders.length === 0, offenders };
}

/** Sanitize a single UI string — returns null if non-English (caller should regenerate). */
export function sanitizeLearningZoneUiText(text: string): string | null {
  if (isNonEnglishLearningZoneText(text)) return null;
  return text;
}
