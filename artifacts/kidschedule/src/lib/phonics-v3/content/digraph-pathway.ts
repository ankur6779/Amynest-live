/**
 * Digraph pathway — isolated from beginner CVC path.
 * sh, ch, th, wh, ck, ng — full learning loops in digraph-catalog.ts
 */
import {
  getDigraphWordBank,
  type DigraphId,
  type DigraphWord,
} from "./digraph-catalog";

export type { DigraphId, DigraphWord };

export type DigraphStage = {
  id: DigraphId;
  symbol: string;
  phoneme: string;
  exampleWord: string;
  emoji: string;
  words: DigraphWord[];
  /** Minimum CVC mastery score avg to unlock */
  unlockMasteryAvg: number;
};

const PATHWAY_META: Omit<DigraphStage, "words">[] = [
  { id: "sh", symbol: "sh", phoneme: "sh", exampleWord: "ship", emoji: "🚢", unlockMasteryAvg: 65 },
  { id: "ch", symbol: "ch", phoneme: "ch", exampleWord: "chip", emoji: "🍟", unlockMasteryAvg: 65 },
  { id: "th", symbol: "th", phoneme: "th", exampleWord: "thin", emoji: "👍", unlockMasteryAvg: 70 },
  { id: "wh", symbol: "wh", phoneme: "wh", exampleWord: "when", emoji: "❓", unlockMasteryAvg: 72 },
  { id: "ck", symbol: "ck", phoneme: "ck", exampleWord: "duck", emoji: "🦆", unlockMasteryAvg: 68 },
  { id: "ng", symbol: "ng", phoneme: "ng", exampleWord: "ring", emoji: "💍", unlockMasteryAvg: 75 },
];

export const DIGRAPH_PATHWAY: DigraphStage[] = PATHWAY_META.map((meta) => ({
  ...meta,
  words: getDigraphWordBank(meta.id),
}));

export function getUnlockedDigraphs(avgMasteryScore: number): DigraphStage[] {
  return DIGRAPH_PATHWAY.filter((d) => avgMasteryScore >= d.unlockMasteryAvg);
}

export function isDigraphPathwayAvailable(avgMasteryScore: number): boolean {
  return avgMasteryScore >= 60;
}
