import type { MathTrickVisual } from "./types.js";
import type { VisualSequenceSpec } from "./visual-engine.js";

export type MathTrickMeta = {
  exampleSteps: string[];
  parentTip: string;
  visual: MathTrickVisual;
  /** For number-line tricks: show ticks from `from` to `to` and optional jump highlight. */
  numberLine?: { from: number; to: number; jumps?: Array<{ at: number; label: string }> };
  /**
   * Declarative spec for the animated visual-math scene. When present, the
   * renderer plays a step-by-step object animation instead of the static
   * visual. Kept small (≤ MAX_SCENE_OBJECTS) so younger children aren't
   * overwhelmed.
   */
  visualSequence?: VisualSequenceSpec;
};

const DEFAULT: MathTrickMeta = {
  exampleSteps: [],
  parentTip: "Practice once after dinner — short and fun beats long drills.",
  visual: "none",
};

export const MATH_TRICK_META: Record<string, MathTrickMeta> = {
  t01: {
    exampleSteps: ["Look at 23", "Tens digit 2 → 3", "23 + 10 = 33"],
    parentTip: "Use real objects: 23 blocks, add a group of ten.",
    visual: "numberline",
    numberLine: { from: 20, to: 40, jumps: [{ at: 23, label: "+10 → 33" }] },
  },
  t02: {
    exampleSteps: ["Start at 24", "Add 10 → 34", "Subtract 1 → 33"],
    parentTip: "Say: 'Nine is ten minus one' — kids love the shortcut.",
    visual: "numberline",
    numberLine: { from: 20, to: 40, jumps: [{ at: 24, label: "+9" }] },
  },
  t03: {
    exampleSteps: ["Pick 6", "6 + 6", "= 12 (double!)"],
    parentTip: "Hold up fingers on both hands — same number each side.",
    visual: "fingers",
    visualSequence: { kind: "double", n: 6, object: "dot" },
  },
  t04: {
    exampleSteps: ["Numbers 6 and 7", "Double the smaller: 6+6=12", "Add 1 → 13"],
    parentTip: "When numbers are neighbors, double-then-plus-one works every time.",
    visual: "fingers",
    visualSequence: { kind: "near_double", small: 6, object: "dot" },
  },
  t05: {
    exampleSteps: ["12 + 5", "Add 10 → 22", "Subtract 5 → 17"],
    parentTip: "Link to the Add 9 trick: five is half of ten.",
    visual: "numberline",
    numberLine: { from: 10, to: 25, jumps: [{ at: 12, label: "+5" }] },
  },
  m01: {
    exampleSteps: ["9 × 7", "10 × 7 = 70", "70 − 7 = 63"],
    parentTip: "Finger trick for 9× works too — this backup is great for big numbers.",
    visual: "none",
  },
  m02: {
    exampleSteps: ["23 × 11", "2 + 3 = 5", "Put 5 in middle → 253"],
    parentTip: "Only for two-digit numbers; celebrate when they spot the pattern.",
    visual: "none",
  },
  m03: {
    exampleSteps: ["25²", "2 × 3 = 6", "Attach 25 → 625"],
    parentTip: "Works for 15², 25², 35² — pattern feels like magic.",
    visual: "none",
  },
  m04: {
    exampleSteps: ["8 × 5", "8 × 10 = 80", "Half of 80 = 40"],
    parentTip: "Connect to coins: five is half of ten.",
    visual: "none",
  },
  m05: {
    exampleSteps: ["6 × 4", "Double → 12", "Double again → 24"],
    parentTip: "Doubling twice is easier than counting by fours.",
    visual: "fingers",
    visualSequence: { kind: "multiplication", rows: 4, per: 6, object: "star" },
  },
  m06: {
    exampleSteps: ["8 × 25", "8 ÷ 4 = 2", "2 × 100 = 200"],
    parentTip: "Quarters and money help — four quarters make a dollar.",
    visual: "none",
  },
  m07: {
    exampleSteps: ["6 × 50", "6 × 100 = 600", "÷ 2 = 300"],
    parentTip: "Fifty is half of one hundred — same idea as ×5.",
    visual: "none",
  },
  m08: {
    exampleSteps: ["100 − 47", "9−4 = 5", "10−7 = 3 → 53"],
    parentTip: "Write digits in columns — one neat trick for change from £1.",
    visual: "none",
  },
  m09: {
    exampleSteps: ["98 + 36", "Round 98 → 100", "Add, then fix −2"],
    parentTip: "Shopping math: round prices, then adjust the change.",
    visual: "numberline",
    numberLine: { from: 90, to: 140, jumps: [{ at: 98, label: "→100" }] },
  },
  m10: {
    exampleSteps: ["9 × 2", "Double 9", "= 18"],
    parentTip: "Easiest multiply — always start here.",
    visual: "fingers",
    visualSequence: { kind: "double", n: 9, object: "block" },
  },
  m11: {
    exampleSteps: ["7 × 3", "Double 7 = 14", "14 + 7 = 21"],
    parentTip: "Triple = double plus one more group.",
    visual: "fingers",
    visualSequence: { kind: "multiplication", rows: 3, per: 7, object: "star" },
  },
  m12: {
    exampleSteps: ["20 ÷ 2", "Share into 2", "= 10 each"],
    parentTip: "Share snacks in two equal piles — instant half.",
    visual: "none",
    visualSequence: { kind: "division", total: 20, groups: 2, object: "candy" },
  },
  m13: {
    exampleSteps: ["7 × 10", "Add a zero", "= 70"],
    parentTip: "Place-value blocks make 'add a zero' obvious.",
    visual: "numberline",
    numberLine: { from: 0, to: 80, jumps: [{ at: 7, label: "×10" }] },
  },
  m14: {
    exampleSteps: ["7 × 100", "Add two zeros", "= 700"],
    parentTip: "Pair with ×10 first — same idea, one more zero.",
    visual: "none",
  },
  m15: {
    exampleSteps: ["45 + 99", "+100 → 145", "−1 → 144"],
    parentTip: "Same family as Add 9 — friendly numbers first.",
    visual: "numberline",
    numberLine: { from: 40, to: 160, jumps: [{ at: 45, label: "+99" }] },
  },
  m16: {
    exampleSteps: ["56 − 9", "−10 → 46", "+1 → 47"],
    parentTip: "Mirror of Add 9 — subtract ten, give one back.",
    visual: "numberline",
    numberLine: { from: 40, to: 60, jumps: [{ at: 56, label: "−9" }] },
  },
  m17: {
    exampleSteps: ["5 × 8", "×2 → 10", "×2 → 20", "×2 → 40"],
    parentTip: "Three doubles in a row — count the doublings on fingers.",
    visual: "fingers",
  },
  m18: {
    exampleSteps: ["8 × 6", "8 × 3 = 24", "Double → 48"],
    parentTip: "If ×3 is solid, ×6 is just double that.",
    visual: "none",
  },
  m19: {
    exampleSteps: ["7 × 8", "5×8 = 40", "2×8 = 16", "40+16 = 56"],
    parentTip: "Splitting into 5s and 2s builds number sense.",
    visual: "none",
  },
  m20: {
    exampleSteps: ["11 × 11", "1+1 = 2", "Answer 121"],
    parentTip: "Chant 'one-two-one' — rhythm helps memory.",
    visual: "none",
  },
  m21: {
    exampleSteps: ["12 × 12", "10×12 = 120", "+2×12 = 24", "= 144"],
    parentTip: "Break apart like 11 — check with ten and two.",
    visual: "none",
  },
};

export function getMathTrickMeta(trickId: string): MathTrickMeta {
  const m = MATH_TRICK_META[trickId];
  if (!m) return { ...DEFAULT, exampleSteps: [] };
  return { ...DEFAULT, ...m };
}
