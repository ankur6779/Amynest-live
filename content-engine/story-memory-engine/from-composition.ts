/**
 * Bridge Story Memory Engine → creative-composition Veo prompts.
 */

import type { CompositionShotPlan } from "../creative-composition/types.js";
import { enrichVeoPromptWithStoryMemory } from "./format.js";
import { gateStoryScene } from "./quality-gate.js";
import type { SceneStoryMemory } from "./types.js";

function roleFromShot(shot: CompositionShotPlan): string {
  switch (shot.role) {
    case "hook":
      return "hook";
    case "amy-host":
    case "amy-girl-learn":
      return "feature";
    case "amy-boy-celebrate":
      return "transformation";
    case "cta":
      return "cta";
    default:
      return "bridge";
  }
}

function stageForCompositionRole(role: string): SceneStoryMemory["beatStage"] {
  if (role === "hook" || role === "problem") return "problem";
  if (role === "emotion" || role === "bridge") return "notice";
  if (role === "feature") return "help";
  if (role === "transformation") return "success";
  if (role === "cta") return "invite";
  return "help";
}

export function storyPlanForCompositionShot(
  shot: CompositionShotPlan,
  previous: SceneStoryMemory | null = null,
): SceneStoryMemory {
  const role = roleFromShot(shot);
  let beatStage = stageForCompositionRole(role);
  if (
    previous &&
    role === "cta" &&
    (previous.beatStage === "success" || previous.beatStage === "celebration")
  ) {
    beatStage = "invite";
  } else if (previous) {
    const order = [
      "problem",
      "notice",
      "help",
      "success",
      "celebration",
      "invite",
    ] as const;
    const prevIdx = order.indexOf(previous.beatStage as (typeof order)[number]);
    const nextIdx = order.indexOf(beatStage as (typeof order)[number]);
    if (prevIdx >= 0 && nextIdx > prevIdx + 1) {
      beatStage = order[Math.min(prevIdx + 1, order.length - 1)]!;
    } else if (prevIdx >= 0 && nextIdx < prevIdx && role !== "cta") {
      beatStage = previous.beatStage;
    }
  }

  const goals = previous?.goals.map((g) => ({ ...g })) ?? [
    {
      character: "amy-ai" as const,
      goal: "Help the child through the stuck moment with warmth.",
      status: "active" as const,
    },
    {
      character: "amy-girl" as const,
      goal: "Understand the lesson and feel capable again.",
      status: "active" as const,
    },
    {
      character: "amy-boy" as const,
      goal: "Explore the challenge with playful curiosity.",
      status: "active" as const,
    },
  ];

  if (beatStage === "success" || beatStage === "invite") {
    for (const g of goals) {
      if (g.status === "active") g.status = "completed";
    }
  }

  const draft: SceneStoryMemory = {
    sceneId: shot.id,
    index: 0,
    role,
    whatJustHappened: previous
      ? `${previous.beatStage}: ${previous.emotionThread}`
      : `Cold open — ${shot.caption}`,
    whyItHappened: previous
      ? `Because ${previous.whatMustHappenNext}`
      : "Story opens on a recognizable parenting struggle.",
    emotionalPromise:
      previous?.emotionalPromise ??
      "Parents will feel hope: struggle can become understanding with AmyNest.",
    whatMustHappenNext:
      role === "cta"
        ? "Settle on brand — feeling already earned."
        : beatStage === "problem"
          ? "Someone must notice the confusion with care."
          : beatStage === "notice"
            ? "Help must arrive — Amy guides the next step."
            : beatStage === "help"
              ? "Understanding must land — child shows progress."
              : "Celebrate, then invite gently.",
    beatStage,
    emotionThread:
      shot.emotionBeat ??
      (beatStage === "problem"
        ? "Girl confused — struggle recognized"
        : beatStage === "help"
          ? "Amy helps — understanding begins"
          : beatStage === "success"
            ? "Child succeeds — pride lands"
            : beatStage === "invite"
              ? "Soft invite — natural ending"
              : "Amy notices — warmth without judgment"),
    previousEmotionThread: previous?.emotionThread ?? null,
    goals,
    visualCallbacks: previous?.visualCallbacks.map((c) => ({ ...c })) ?? [
      {
        id: "purple-book",
        element: "small purple story/workbook",
        firstSeenSceneId: role === "hook" ? shot.id : "",
        state: "in story",
        recallSceneRoles: ["hook", "feature", "transformation", "cta"],
      },
    ],
    callbackNote:
      role === "feature" || role === "transformation"
        ? "VISUAL CALLBACK: purple book returns / closes proudly with the emotional payoff."
        : role === "hook"
          ? "VISUAL CALLBACK SEED: open the purple book — it will return."
          : "Carry story objects — continuous narrative.",
    endingNote:
      role === "cta"
        ? "CTA is the natural conclusion of earned hope — never a bolted-on ad."
        : "",
    inheritsFromSceneId: previous?.sceneId ?? null,
    ok: true,
    rejects: [],
  };

  return gateStoryScene(draft, previous);
}

export function enrichCompositionWithStoryMemory(
  shot: CompositionShotPlan,
  prompt: string,
  negativePrompt: string,
  previous: SceneStoryMemory | null = null,
): { prompt: string; negativePrompt: string; story: SceneStoryMemory } {
  const story = storyPlanForCompositionShot(shot, previous);
  const enriched = enrichVeoPromptWithStoryMemory(prompt, negativePrompt, story);
  return { ...enriched, story };
}
