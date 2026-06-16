/**
 * Digraph pathway — Level 4 canonical content (sh, ch, th, wh, ck, ng).
 */
import {
  getUnlockedDigraphIds,
  isDigraphPathwayAvailable as isDigraphAvailable,
  type CurriculumLevel,
} from "@workspace/phonics-curriculum";
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

export function getUnlockedDigraphs(
  avgMasteryScore: number,
  currentLevel: CurriculumLevel = 1,
): DigraphStage[] {
  const ids = new Set(getUnlockedDigraphIds(currentLevel, avgMasteryScore));
  return DIGRAPH_PATHWAY.filter((d) => ids.has(d.id));
}

export function isDigraphPathwayAvailable(
  avgMasteryScore: number,
  currentLevel: CurriculumLevel = 1,
): boolean {
  return isDigraphAvailable(currentLevel, avgMasteryScore);
}
