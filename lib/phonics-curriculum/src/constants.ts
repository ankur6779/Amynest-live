/** Shared curriculum constants (no cross-module imports). */
export const SIGHT_WORDS = ["the", "and", "is", "it", "to"] as const;

export const WORD_FAMILY_IDS = ["at", "an", "og", "in", "ip"] as const;

export type WordFamilyId = (typeof WORD_FAMILY_IDS)[number];

export const DIGRAPH_IDS = ["sh", "ch", "th", "wh", "ck", "ng"] as const;
