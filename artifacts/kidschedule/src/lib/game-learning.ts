/**
 * Phase 7 — Learning science map for Gaming Hub.
 * Presentation / educational clarity only — no mechanic or scoring changes.
 *
 * Informed by DAP, play-based learning, Montessori prepared-environment ideas,
 * and executive-function practice (working memory, attention, inhibition, flexibility).
 */
import type { GameDef } from "@/lib/games";

export type AgeBand = "3-4" | "5-6" | "7-8";

export type ExecutiveFunction =
  | "working-memory"
  | "attention"
  | "inhibitory-control"
  | "cognitive-flexibility"
  | "planning"
  | "visual-processing"
  | "processing-speed"
  | "problem-solving";

export interface GameLearningProfile {
  primary: string;
  secondary: string;
  /** Parent-facing skill name (clear, non-jargon). */
  skillName: string;
  /** Short EF label for parents. */
  efLabel: string;
  ef: ExecutiveFunction[];
  /** Best-fit ages (display). */
  ageLabel: string;
  /** Bands this game supports well with current Easy/Normal/Hard + session ramp. */
  ageBands: AgeBand[];
  /** One-sentence "why this matters" for parents. */
  whyItMatters: string;
  /** Real-world connection (home/school). */
  realWorld: string;
  /** Child instruction — short, positive, ≤ ~12 words when possible. */
  childHowTo: string;
  /** Gentle parent tip (scaffolding, not pressure). */
  parentTip: string;
  /** Educational risk to watch (copy-only guidance). */
  riskNote: string;
}

const PROFILES: Record<string, GameLearningProfile> = {
  "pattern-match": {
    primary: "Recognise and extend visual patterns",
    secondary: "Predict what comes next",
    skillName: "Pattern thinking",
    efLabel: "Flexible thinking",
    ef: ["cognitive-flexibility", "visual-processing", "problem-solving"],
    ageLabel: "Ages 5–8",
    ageBands: ["5-6", "7-8"],
    whyItMatters: "Pattern skills support early maths, reading readiness, and logical prediction.",
    realWorld: "Helps with spotting routines, sorting toys, and noticing sequences in stories.",
    childHowTo: "Look at the pattern. What comes next?",
    parentTip: "Say the pattern out loud together on early rounds.",
    riskNote: "Younger 5s may need Easy and adult co-play for longer patterns.",
  },
  "odd-one-out": {
    primary: "Compare items and find the mismatch",
    secondary: "Categorise by shared features",
    skillName: "Sorting & categories",
    efLabel: "Flexible thinking",
    ef: ["cognitive-flexibility", "attention", "visual-processing"],
    ageLabel: "Ages 5–8",
    ageBands: ["5-6", "7-8"],
    whyItMatters: "Comparing and grouping builds vocabulary and early science thinking.",
    realWorld: "Useful for tidy-up sorting, packing bags, and noticing what’s different.",
    childHowTo: "Which one does not belong?",
    parentTip: "Ask “why?” after a correct pick to deepen language.",
    riskNote: "Avoid rushing — reasoning matters more than speed.",
  },
  "card-flip": {
    primary: "Hold locations in working memory",
    secondary: "Match pairs with focus",
    skillName: "Working memory",
    efLabel: "Working memory",
    ef: ["working-memory", "attention", "inhibitory-control"],
    ageLabel: "Ages 4–7",
    ageBands: ["3-4", "5-6", "7-8"],
    whyItMatters: "Working memory underpins following directions and early reading.",
    realWorld: "Helps remember where things are and complete two-step tasks.",
    childHowTo: "Flip two cards. Find the matching pair!",
    parentTip: "Ages 3–4: play slowly and celebrate each match.",
    riskNote: "Too many pairs can overwhelm; session ramp keeps early rounds gentle.",
  },
  sequence: {
    primary: "Encode and replay an ordered sequence",
    secondary: "Sustain attention across steps",
    skillName: "Order memory",
    efLabel: "Working memory",
    ef: ["working-memory", "attention", "processing-speed"],
    ageLabel: "Ages 5–8",
    ageBands: ["5-6", "7-8"],
    whyItMatters: "Sequencing supports counting, storytelling, and following multi-step instructions.",
    realWorld: "Like remembering a dance step, recipe order, or getting-ready routine.",
    childHowTo: "Watch the lights. Tap them in the same order.",
    parentTip: "Use Easy for first sessions; clap the sequence together.",
    riskNote: "Processing-speed pressure rises later — Easy difficulty reduces flash pace.",
  },
  "color-memory": {
    primary: "Recall a colour sequence in order",
    secondary: "Colour naming & focus",
    skillName: "Colour memory",
    efLabel: "Working memory",
    ef: ["working-memory", "attention", "visual-processing"],
    ageLabel: "Ages 5–8",
    ageBands: ["5-6", "7-8"],
    whyItMatters: "Links visual memory with language (colour names) for stronger recall.",
    realWorld: "Helps remember ordered steps — brushing teeth, packing school bag.",
    childHowTo: "Watch the colours. Tap them back in order.",
    parentTip: "Name each colour aloud during the show phase.",
    riskNote: "Long sequences are for 7–8; start Easy for 5–6.",
  },
  "speed-math": {
    primary: "Practise mental arithmetic fluency",
    secondary: "Calm focus under light time pressure",
    skillName: "Number facts",
    efLabel: "Processing speed",
    ef: ["processing-speed", "working-memory", "attention"],
    ageLabel: "Ages 6–8",
    ageBands: ["7-8"],
    whyItMatters: "Quick number sense frees brain space for word problems later.",
    realWorld: "Counting change, sharing snacks, reading clocks and scores.",
    childHowTo: "Solve the sum. Pick the answer!",
    parentTip: "Choose Easy for ages 6–7; praise effort, not speed.",
    riskNote: "Timers can stress sensitive children — Easy adds time; Reduce Motion slows further.",
  },
  "number-match": {
    primary: "Connect quantity (dots) to numerals",
    secondary: "One-to-one counting",
    skillName: "Counting sense",
    efLabel: "Visual processing",
    ef: ["visual-processing", "attention", "working-memory"],
    ageLabel: "Ages 3–6",
    ageBands: ["3-4", "5-6"],
    whyItMatters: "Subitising and counting-to-number are foundations of early maths.",
    realWorld: "Setting the table, counting stairs, sharing toys fairly.",
    childHowTo: "Count the dots. Tap the matching number.",
    parentTip: "Ages 3–4: count aloud together, touching each dot.",
    riskNote: "Higher counts appear later in the session — stay supportive.",
  },
  "find-mistake": {
    primary: "Scan a set and detect the odd item",
    secondary: "Sustained visual attention",
    skillName: "Careful looking",
    efLabel: "Attention",
    ef: ["attention", "inhibitory-control", "visual-processing"],
    ageLabel: "Ages 6–8",
    ageBands: ["5-6", "7-8"],
    whyItMatters: "Detail scanning supports proofreading, safety awareness, and focus stamina.",
    realWorld: "Finding a missing sock, spotting a typo, checking homework carefully.",
    childHowTo: "Look closely. Tap the one that is different.",
    parentTip: "Encourage slow scanning left-to-right.",
    riskNote: "Dense grids can frustrate — celebrate near-misses warmly.",
  },
  "target-tap": {
    primary: "Respond quickly to visual targets",
    secondary: "Hand–eye coordination",
    skillName: "Focus & timing",
    efLabel: "Inhibitory control",
    ef: ["inhibitory-control", "attention", "processing-speed"],
    ageLabel: "Ages 5–8",
    ageBands: ["5-6", "7-8"],
    whyItMatters: "Builds intentional tapping and impulse control in a playful way.",
    realWorld: "Waiting for a turn, catching a ball, reacting safely in play.",
    childHowTo: "When you see a target, tap it!",
    parentTip: "Sit beside younger children; Reduce Motion gives more time.",
    riskNote: "Motor + speed demand — not ideal for all 3–4s.",
  },
  "what-should-you-do": {
    primary: "Choose kind, safe social responses",
    secondary: "Perspective-taking & calm decisions",
    skillName: "Kind choices",
    efLabel: "Inhibitory control",
    ef: ["inhibitory-control", "cognitive-flexibility", "problem-solving"],
    ageLabel: "Ages 6–8",
    ageBands: ["5-6", "7-8"],
    whyItMatters: "Practises social problem-solving before real conflicts happen.",
    realWorld: "Sharing, apologising, asking for help, waiting patiently.",
    childHowTo: "Read the situation. Pick the kindest choice.",
    parentTip: "Talk about “why” after each choice — builds empathy language.",
    riskNote: "Reading load is higher; co-read with 5–6 year olds.",
  },
  "spot-difference": {
    primary: "Compare two scenes for visual changes",
    secondary: "Sustained observation",
    skillName: "Observation",
    efLabel: "Attention",
    ef: ["attention", "visual-processing", "working-memory"],
    ageLabel: "Ages 6–8",
    ageBands: ["5-6", "7-8"],
    whyItMatters: "Side-by-side comparison strengthens careful looking and patience.",
    realWorld: "Noticing changes in a room, finding differences in pictures/books.",
    childHowTo: "Compare both pictures. Tap what changed.",
    parentTip: "Start with one difference at a time; cheer each find.",
    riskNote: "Visual load is high — short sessions work best.",
  },
  "hidden-objects": {
    primary: "Search a scene for named targets",
    secondary: "Goal-directed attention",
    skillName: "Visual search",
    efLabel: "Attention",
    ef: ["attention", "visual-processing", "working-memory"],
    ageLabel: "Ages 5–8",
    ageBands: ["5-6", "7-8"],
    whyItMatters: "Visual search supports classroom scavenger tasks and safety scanning.",
    realWorld: "Finding shoes, keys, or a favourite book on a busy shelf.",
    childHowTo: "Find each item on the list in the picture.",
    parentTip: "Read the list first; let the child lead the search.",
    riskNote: "Busy scenes can overwhelm — pause and name one target at a time.",
  },
  "color-fill": {
    primary: "Match colours to a model pattern",
    secondary: "Fine planning & colour naming",
    skillName: "Colour matching",
    efLabel: "Planning",
    ef: ["planning", "visual-processing", "attention"],
    ageLabel: "Ages 4–7",
    ageBands: ["3-4", "5-6", "7-8"],
    whyItMatters: "Matching to a model builds planning and careful checking.",
    realWorld: "Colouring within a guide, matching clothes, following a craft sample.",
    childHowTo: "Pick a colour. Fill the cells to match the picture.",
    parentTip: "Ages 3–4: do one colour at a time together.",
    riskNote: "Checking errors should feel helpful, never critical.",
  },
  "shape-match": {
    primary: "Link shapes to their names",
    secondary: "Visual discrimination",
    skillName: "Shape names",
    efLabel: "Visual processing",
    ef: ["visual-processing", "attention", "working-memory"],
    ageLabel: "Ages 3–6",
    ageBands: ["3-4", "5-6"],
    whyItMatters: "Shape vocabulary supports geometry readiness and describing the world.",
    realWorld: "Naming plates (circle), books (rectangle), road signs.",
    childHowTo: "Pick a shape. Tap its name!",
    parentTip: "Trace the shape in the air while naming it.",
    riskNote: "Keep language playful; avoid drilling.",
  },
  "maze-escape": {
    primary: "Plan a path and update it while moving",
    secondary: "Spatial reasoning & persistence",
    skillName: "Path planning",
    efLabel: "Planning",
    ef: ["planning", "problem-solving", "inhibitory-control"],
    ageLabel: "Ages 5–8",
    ageBands: ["5-6", "7-8"],
    whyItMatters: "Planning ahead and adjusting mid-way are core problem-solving skills.",
    realWorld: "Finding a route in a park, packing a bag in order, puzzle persistence.",
    childHowTo: "Guide the friend to the finish. Plan your path!",
    parentTip: "Ask “what’s your plan?” before the first move.",
    riskNote: "Move budgets can frustrate — Easy difficulty helps; celebrate retries.",
  },
};

const FALLBACK: GameLearningProfile = {
  primary: "Practise focus through play",
  secondary: "Build confidence with gentle challenge",
  skillName: "Learning play",
  efLabel: "Attention",
  ef: ["attention"],
  ageLabel: "Ages 3–8",
  ageBands: ["3-4", "5-6", "7-8"],
  whyItMatters: "Short playful practice grows focus and confidence.",
  realWorld: "Everyday noticing, trying, and trying again.",
  childHowTo: "Follow the picture clues. You’ve got this!",
  parentTip: "Stay nearby and keep the tone warm.",
  riskNote: "Follow the child’s energy — stop while it’s still fun.",
};

export function getGameLearning(game: GameDef | string): GameLearningProfile {
  const id = typeof game === "string" ? game : game.id;
  return PROFILES[id] ?? FALLBACK;
}

/** Parent card line: skill · time · ages */
export function formatLearningMetaLine(game: GameDef, minutes: number): string {
  const L = getGameLearning(game);
  return `${L.skillName} · ~${minutes} min · ${L.ageLabel}`;
}

/** Result-screen parent block — effort + why + real world. */
export function getLearningPracticeSummary(
  game: GameDef,
  score: number,
  total: number,
): { headline: string; body: string; tip: string } {
  const L = getGameLearning(game);
  const ratio = total > 0 ? score / total : 0;
  const effort =
    ratio >= 0.95
      ? "Strong accuracy today — confidence is growing."
      : ratio >= 0.6
        ? "Steady practice — this is how skills stick."
        : "Brave trying — another short round will help confidence.";
  return {
    headline: `Practised: ${L.skillName}`,
    body: `${L.primary}. ${L.whyItMatters} ${effort}`,
    tip: `${L.realWorld} Tip: ${L.parentTip}`,
  };
}

/** Child-facing result reflection (no scores language as punishment). */
export function getChildLearningReflection(game: GameDef): string {
  const L = getGameLearning(game);
  return `You practised ${L.skillName.toLowerCase()} — that helps in real life!`;
}

export function listLearningProfiles(): { id: string; profile: GameLearningProfile }[] {
  return Object.entries(PROFILES).map(([id, profile]) => ({ id, profile }));
}
