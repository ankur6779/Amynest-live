/** English number words for voice answer parsing (1–20). */

const WORD_TO_NUMBER: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
};

export function wordToNumber(word: string): number | null {
  const key = word.toLowerCase().replace(/[^a-z]/g, "");
  return WORD_TO_NUMBER[key] ?? null;
}

export function numberToWords(n: number): string[] {
  const entries = Object.entries(WORD_TO_NUMBER);
  const match = entries.find(([, v]) => v === n);
  return match ? [match[0]] : [];
}
