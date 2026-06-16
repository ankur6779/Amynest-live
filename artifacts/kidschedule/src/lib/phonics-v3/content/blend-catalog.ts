import type { CurriculumLevel } from "@workspace/phonics-curriculum";
import { isBlendPathwayAvailable as isBlendAvailable } from "@workspace/phonics-curriculum";
import { BLEND_IDS, BLEND_WORD_IDS } from "@workspace/phonics-sounds";
import type { DecodableStoryMeta } from "./story-catalog";

export type BlendWord = { word: string; blend: string; emoji: string };

const BLEND_EMOJI: Record<string, string> = {
  flag: "🚩",
  clap: "👏",
  glad: "😊",
  frog: "🐸",
  trip: "✈️",
  drum: "🥁",
  brag: "💪",
  stop: "🛑",
  crab: "🦀",
  snap: "📸",
  spin: "🌀",
  stem: "🌱",
  plot: "📖",
  grin: "😁",
  plan: "🗺️",
  blue: "🔵",
  tree: "🌳",
};

const BLEND_STORIES: Array<{
  word: string;
  title: string;
  emoji: string;
  lines: string[];
}> = [
  { word: "flag", title: "Flag on the Mast", emoji: "🚩", lines: ["Wind whipped the flag.", "Sam raised it high.", "Red stripes glowed."] },
  { word: "clap", title: "Clap for Joy", emoji: "👏", lines: ["Kim gave a loud clap.", "Echo filled the hall.", "Crowd joined in."] },
  { word: "glad", title: "Glad to Help", emoji: "😊", lines: ["Pat was glad to help.", "Meg needed a hand.", "Teamwork won."] },
  { word: "frog", title: "Frog by the Pond", emoji: "🐸", lines: ["A frog leapt from moss.", "Ben watched it land.", "Splash in the pond."] },
  { word: "trip", title: "Trip to the Hill", emoji: "✈️", lines: ["Ann planned a short trip.", "Pack held snacks.", "Map led the way."] },
  { word: "drum", title: "Drum Beat Loud", emoji: "🥁", lines: ["Tom struck the drum.", "Rhythm shook the floor.", "Band played on."] },
  { word: "brag", title: "No Need to Brag", emoji: "💪", lines: ["Jen did not brag.", "Skill spoke for her.", "Trophy on the shelf."] },
  { word: "stop", title: "Stop at the Sign", emoji: "🛑", lines: ["Rob hit the stop sign.", "Waited for the van.", "Safe to cross."] },
  { word: "crab", title: "Crab on the Sand", emoji: "🦀", lines: ["Eva spotted a crab.", "It scuttled sideways.", "Shell glinted red."] },
  { word: "snap", title: "Snap of the Twig", emoji: "📸", lines: ["Snap! Broke the twig.", "Dan heard a fox.", "Fox ran off fast."] },
  { word: "spin", title: "Spin the Top", emoji: "🌀", lines: ["Liz gave it a spin.", "Colors blurred round.", "Top wobbled, fell."] },
  { word: "stem", title: "Stem of the Rose", emoji: "🌱", lines: ["Thorns lined the stem.", "Sam cut with care.", "Rose in a vase."] },
  { word: "plot", title: "Plot the Garden", emoji: "📖", lines: ["Kim drew a plot map.", "Rows for beans.", "Seeds in the soil."] },
  { word: "grin", title: "Grin at Dawn", emoji: "😁", lines: ["Pat woke with a grin.", "Sun on the sill.", "Good day ahead."] },
  { word: "plan", title: "Plan for Rain", emoji: "🗺️", lines: ["Meg made a plan.", "Boots by the door.", "Rain did not wait."] },
];

export function getBlendWordBank(): BlendWord[] {
  return BLEND_WORD_IDS.map((word) => {
    const blend = BLEND_IDS.find((b) => word.startsWith(b)) ?? word.slice(0, 2);
    return { word, blend, emoji: BLEND_EMOJI[word] ?? "🔤" };
  });
}

export function getBlendStories(): DecodableStoryMeta[] {
  return BLEND_STORIES.map((s, index) => ({
    id: `blend-${String(index + 1).padStart(2, "0")}`,
    title: s.title,
    emoji: s.emoji,
    level: 4 as const,
    requiredSounds: [s.word.slice(0, 2)],
    requiredFamilies: [],
    difficulty: 6,
    estimatedMinutes: 2,
    lines: s.lines.map((text) => ({
      text,
      highlightWords: text.replace(/[.!?,]/g, "").split(/\s+/).filter((w) =>
        w.toLowerCase().includes(s.word) || w.length <= 4,
      ),
    })),
    comprehensionQuestion: `What ${s.word} word did you read?`,
  }));
}

export function isBlendPathwayAvailable(
  masteryAvg: number,
  currentLevel: CurriculumLevel = 1,
): boolean {
  return isBlendAvailable(currentLevel, masteryAvg);
}
