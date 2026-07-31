/**
 * Build the continuous story thread across scenes.
 * Never generate scenes independently — each beat remembers the last.
 */

import type { CharacterMemoryPackage } from "../character-memory-engine/types.js";
import type { BrandCharacterId } from "../brand/types.js";
import type { ComposerSceneIntent } from "../scene-composer/types.js";
import type { ContentPackage } from "../types/content-package.js";
import type {
  CharacterGoalMemory,
  SceneStoryMemory,
  StoryBeatStage,
  VisualCallbackMemory,
} from "./types.js";

const BEAT_ORDER: StoryBeatStage[] = [
  "problem",
  "notice",
  "help",
  "success",
  "celebration",
  "invite",
];

export function buildStoryThread(input: {
  contentPackage: ContentPackage;
  intents: ComposerSceneIntent[];
  characterMemory?: CharacterMemoryPackage | null;
}): SceneStoryMemory[] {
  const problemSeed =
    input.contentPackage.openingQuestion ||
    input.contentPackage.hook ||
    "A child feels stuck on a learning moment";
  const promise = `Parents will feel hope: this struggle can become understanding with AmyNest.`;

  const callbacks = seedVisualCallbacks();
  const scenes: SceneStoryMemory[] = [];
  let previous: SceneStoryMemory | null = null;
  let goals = seedGoals();

  for (let index = 0; index < input.intents.length; index++) {
    const intent = input.intents[index]!;
    const charScene = input.characterMemory?.scenes[index];
    const sceneId =
      charScene?.sceneId ?? `scene_${index + 1}_${intent.role}`;

    if (intent.role === "end-card") {
      const end = buildEndingBeat(sceneId, index, previous, promise);
      scenes.push(end);
      previous = end;
      continue;
    }

    const beatStage = stageForRole(intent.role, previous);
    const emotionThread = emotionForStage(beatStage, previous);
    goals = advanceGoals(goals, beatStage, intent.characters);

    const whatJustHappened = previous
      ? summarizeOutcome(previous)
      : `Cold open: ${truncate(problemSeed, 100)}`;
    const whyItHappened = previous
      ? `Because ${previous.whatMustHappenNext}`
      : `The story opens on the living problem parents recognize.`;
    const whatMustHappenNext = nextPromise(beatStage, intent.role);
    const callbackNote = callbackNoteForRole(intent.role, callbacks, sceneId);
    updateCallbackStates(callbacks, intent.role, sceneId);

    const scene: SceneStoryMemory = {
      sceneId,
      index,
      role: intent.role,
      whatJustHappened,
      whyItHappened,
      emotionalPromise: previous?.emotionalPromise ?? promise,
      whatMustHappenNext,
      beatStage,
      emotionThread,
      previousEmotionThread: previous?.emotionThread ?? null,
      goals: goals.map((g) => ({ ...g })),
      visualCallbacks: callbacks.map((c) => ({ ...c })),
      callbackNote,
      endingNote:
        intent.role === "cta"
          ? "CTA is the natural conclusion of earned hope — never a bolted-on ad."
          : "",
      inheritsFromSceneId: previous?.sceneId ?? null,
      ok: true,
      rejects: [],
    };
    scenes.push(scene);
    previous = scene;
  }

  return scenes;
}

function seedGoals(): CharacterGoalMemory[] {
  return [
    {
      character: "amy-ai",
      goal: "Help the child through the stuck moment with warmth.",
      status: "active",
    },
    {
      character: "amy-girl",
      goal: "Understand the lesson and feel capable again.",
      status: "active",
    },
    {
      character: "amy-boy",
      goal: "Explore the challenge with playful curiosity.",
      status: "active",
    },
  ];
}

function seedVisualCallbacks(): VisualCallbackMemory[] {
  return [
    {
      id: "purple-book",
      element: "small purple story/workbook",
      firstSeenSceneId: "",
      state: "closed / waiting",
      recallSceneRoles: ["hook", "problem", "feature", "transformation", "cta"],
    },
  ];
}

function stageForRole(
  role: string,
  previous: SceneStoryMemory | null,
): StoryBeatStage {
  const mapped = mapRoleToStage(role);
  if (!previous) return mapped;

  // Success / celebration may flow straight into the soft invite (CTA).
  if (
    role === "cta" &&
    (previous.beatStage === "success" || previous.beatStage === "celebration")
  ) {
    return "invite";
  }

  const prevIdx = BEAT_ORDER.indexOf(previous.beatStage);
  const nextIdx = BEAT_ORDER.indexOf(mapped);
  // Never skip more than one emotional story step
  if (nextIdx > prevIdx + 1) {
    return BEAT_ORDER[Math.min(prevIdx + 1, BEAT_ORDER.length - 1)]!;
  }
  if (nextIdx < prevIdx && role !== "cta" && role !== "end-card") {
    return previous.beatStage;
  }
  return mapped;
}

function mapRoleToStage(role: string): StoryBeatStage {
  switch (role) {
    case "hook":
    case "problem":
      return "problem";
    case "emotion":
    case "bridge":
      return "notice";
    case "feature":
      return "help";
    case "transformation":
      return "success";
    case "cta":
      return "invite";
    default:
      return "help";
  }
}

function emotionForStage(
  stage: StoryBeatStage,
  previous: SceneStoryMemory | null,
): string {
  const map: Record<StoryBeatStage, string> = {
    problem: "Girl confused / stuck — audience recognizes the struggle",
    notice: "Amy notices the confusion — warmth without judgment",
    help: "Amy helps — guided understanding begins",
    success: "Girl succeeds — relief and pride land",
    celebration: "Shared celebration — hope fulfilled",
    invite: "Soft invite — story concludes; download feels earned",
  };
  // Celebration sits between success and invite when transformation plays
  if (stage === "success" && previous?.beatStage === "help") {
    return map.success;
  }
  if (stage === "invite" && previous) {
    return `${previous.emotionThread.split("—")[0]?.trim() ?? "Hope"} → soft invite (natural ending)`;
  }
  return map[stage];
}

function nextPromise(stage: StoryBeatStage, role: string): string {
  if (role === "cta") {
    return "Settle on brand end card — feeling already earned.";
  }
  switch (stage) {
    case "problem":
      return "Someone must notice the confusion with care.";
    case "notice":
      return "Help must arrive — Amy guides the next step.";
    case "help":
      return "Understanding must land — child shows progress.";
    case "success":
      return "Celebrate the win together — then invite gently.";
    case "celebration":
      return "Invite parents into the same hopeful path.";
    case "invite":
      return "Brand settle — no new conflict.";
  }
}

function advanceGoals(
  goals: CharacterGoalMemory[],
  stage: StoryBeatStage,
  characters: BrandCharacterId[],
): CharacterGoalMemory[] {
  return goals.map((g) => {
    // Goals stay active until story completes them — never reset per scene.
    if (g.status === "completed") return { ...g, status: "carried" };

    if (
      (stage === "success" || stage === "celebration" || stage === "invite") &&
      (g.character === "amy-girl" || g.character === "amy-ai")
    ) {
      return { ...g, status: "completed" };
    }
    if (
      stage === "success" &&
      g.character === "amy-boy" &&
      characters.includes("amy-boy")
    ) {
      return { ...g, status: "completed" };
    }
    return { ...g, status: "active" };
  });
}

function callbackNoteForRole(
  role: string,
  callbacks: VisualCallbackMemory[],
  sceneId: string,
): string {
  const book = callbacks.find((c) => c.id === "purple-book");
  if (!book) return "No visual callback required.";
  if (!book.firstSeenSceneId && (role === "hook" || role === "problem")) {
    book.firstSeenSceneId = sceneId;
    book.state = "opened / in Girl's hands";
    return "VISUAL CALLBACK SEED: open the purple book — this object will return.";
  }
  if (role === "feature") {
    book.state = "open on desk / in hands during learning";
    return "VISUAL CALLBACK: purple book reappears — same book from the struggle beat.";
  }
  if (role === "transformation") {
    book.state = "closed proudly / set down after success";
    return "VISUAL CALLBACK PAYOFF: purple book closed proudly — problem resolved visually.";
  }
  if (role === "cta") {
    return "VISUAL CALLBACK ECHO: brief soft reminder of the book/learning win before invite.";
  }
  return "Carry story objects — do not invent a disconnected prop world.";
}

function updateCallbackStates(
  callbacks: VisualCallbackMemory[],
  role: string,
  sceneId: string,
): void {
  const book = callbacks.find((c) => c.id === "purple-book");
  if (!book) return;
  if (!book.firstSeenSceneId && (role === "hook" || role === "problem")) {
    book.firstSeenSceneId = sceneId;
  }
}

function summarizeOutcome(previous: SceneStoryMemory): string {
  return `${previous.beatStage}: ${previous.emotionThread}`;
}

function buildEndingBeat(
  sceneId: string,
  index: number,
  previous: SceneStoryMemory | null,
  promise: string,
): SceneStoryMemory {
  return {
    sceneId,
    index,
    role: "end-card",
    whatJustHappened: previous
      ? `CTA completed the emotional promise: ${previous.emotionalPromise}`
      : "Brand settle after story.",
    whyItHappened: "The story earned a quiet conclusion — not an interruption.",
    emotionalPromise: previous?.emotionalPromise ?? promise,
    whatMustHappenNext: "Hold brand — no new plot.",
    beatStage: "invite",
    emotionThread: "Satisfied hope — story complete",
    previousEmotionThread: previous?.emotionThread ?? null,
    goals: (previous?.goals ?? seedGoals()).map((g) => ({
      ...g,
      status: g.status === "active" ? "completed" : g.status,
    })),
    visualCallbacks: previous?.visualCallbacks.map((c) => ({ ...c })) ?? [],
    callbackNote: "Ending inherits story payoff — no new conflict props.",
    endingNote:
      "FINAL CTA/END CARD is the natural last page of the story — never attached afterwards.",
    inheritsFromSceneId: previous?.sceneId ?? null,
    ok: true,
    rejects: [],
  };
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}
