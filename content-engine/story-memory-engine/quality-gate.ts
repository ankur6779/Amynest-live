/**
 * Story Memory quality gate — narrative continuity rejects (advisory).
 */

import type {
  SceneStoryMemory,
  StoryRejectCode,
  StoryScores,
} from "./types.js";

const BEAT_ORDER = [
  "problem",
  "notice",
  "help",
  "success",
  "celebration",
  "invite",
] as const;

export function gateStoryScene(
  scene: SceneStoryMemory,
  previous: SceneStoryMemory | null,
): SceneStoryMemory {
  if (!previous || scene.role === "end-card") {
    return { ...scene, ok: true, rejects: [] };
  }

  const rejects: SceneStoryMemory["rejects"] = [];

  // Disconnected scene — missing inherit or empty causal links
  if (!scene.inheritsFromSceneId) {
    rejects.push({
      code: "scene-disconnected",
      reason: "Scene has no inherit link from previous story beat",
    });
  }
  if (!scene.whatJustHappened || !scene.whyItHappened || !scene.whatMustHappenNext) {
    rejects.push({
      code: "scene-disconnected",
      reason: "Missing what/why/next story memory fields",
    });
  }

  // Emotion reset / jump
  const prevIdx = BEAT_ORDER.indexOf(
    previous.beatStage as (typeof BEAT_ORDER)[number],
  );
  const nextIdx = BEAT_ORDER.indexOf(
    scene.beatStage as (typeof BEAT_ORDER)[number],
  );
  // Success/celebration may flow straight into soft invite (celebration folded into payoff/CTA).
  const earnedInvite =
    scene.beatStage === "invite" &&
    (previous.beatStage === "success" || previous.beatStage === "celebration");
  if (prevIdx >= 0 && nextIdx >= 0 && nextIdx - prevIdx > 1 && !earnedInvite) {
    rejects.push({
      code: "story-jump",
      reason: `Story jumped ${previous.beatStage} → ${scene.beatStage}`,
    });
  }
  if (
    prevIdx >= 0 &&
    nextIdx >= 0 &&
    nextIdx < prevIdx &&
    scene.role !== "cta"
  ) {
    rejects.push({
      code: "emotion-reset",
      reason: `Emotion thread reset ${previous.beatStage} → ${scene.beatStage}`,
    });
  }

  // Problem disappears without solution path
  if (
    previous.beatStage === "problem" &&
    scene.beatStage === "invite" &&
    scene.role === "cta"
  ) {
    rejects.push({
      code: "problem-unsolved",
      reason: "CTA reached without help/success path after problem",
    });
  }
  if (
    /disappear|forget the struggle|ignore the problem/i.test(scene.emotionThread)
  ) {
    rejects.push({
      code: "problem-unsolved",
      reason: "Problem discarded without emotional solution",
    });
  }

  // Goal reset — active goals must not be rewritten empty
  for (const goal of scene.goals) {
    const prevGoal = previous.goals.find((g) => g.character === goal.character);
    if (prevGoal && prevGoal.goal !== goal.goal) {
      rejects.push({
        code: "goal-reset",
        reason: `${goal.character} goal reset mid-story`,
      });
    }
  }

  // Visual callback — feature/transformation should recall book if seeded
  const book = scene.visualCallbacks.find((c) => c.id === "purple-book");
  if (
    book?.firstSeenSceneId &&
    (scene.role === "feature" || scene.role === "transformation") &&
    !/callback|book/i.test(scene.callbackNote)
  ) {
    rejects.push({
      code: "callback-missing",
      reason: "Purple book callback missing on payoff beat",
    });
  }

  // CTA interrupts emotion — must follow success/celebration energy
  if (scene.role === "cta") {
    if (
      previous.beatStage === "problem" ||
      previous.beatStage === "notice"
    ) {
      rejects.push({
        code: "cta-interrupts",
        reason: "CTA interrupts before help/success — feels bolted on",
      });
    }
    if (!/natural|earned|conclusion|invite/i.test(scene.endingNote + scene.emotionThread)) {
      rejects.push({
        code: "cta-interrupts",
        reason: "CTA missing natural-ending story memory",
      });
    }
  }

  return {
    ...scene,
    ok: rejects.length === 0,
    rejects,
  };
}

export function scoreStoryContinuity(scenes: SceneStoryMemory[]): {
  scores: StoryScores;
  rejects: Array<{ sceneId: string; code: StoryRejectCode; reason: string }>;
  ok: boolean;
  summary: string;
} {
  const living = scenes.filter((s) => s.role !== "end-card" || s.inheritsFromSceneId);
  const rejects = scenes.flatMap((s) =>
    s.rejects.map((r) => ({ sceneId: s.sceneId, code: r.code, reason: r.reason })),
  );

  const pairs = Math.max(1, scenes.length - 1);
  let narrativeOk = 0;
  let emotionOk = 0;
  let cohesionOk = 0;

  for (let i = 1; i < scenes.length; i++) {
    const cur = scenes[i]!;
    const codes = new Set(cur.rejects.map((r) => r.code));
    if (!codes.has("scene-disconnected") && !codes.has("story-jump")) {
      narrativeOk++;
    }
    if (!codes.has("emotion-reset") && !codes.has("story-jump")) {
      emotionOk++;
    }
    if (
      !codes.has("problem-unsolved") &&
      !codes.has("goal-reset") &&
      !codes.has("callback-missing")
    ) {
      cohesionOk++;
    }
  }

  const cta = scenes.find((s) => s.role === "cta" || s.role === "end-card");
  const ctaCodes = new Set(cta?.rejects.map((r) => r.code) ?? []);
  const endingSatisfaction =
    cta && !ctaCodes.has("cta-interrupts") && cta.ok ? 100 : cta ? 70 : 90;

  const scores: StoryScores = {
    narrativeContinuity: Math.round((narrativeOk / pairs) * 100),
    emotionalContinuity: Math.round((emotionOk / pairs) * 100),
    storyCohesion: Math.round((cohesionOk / pairs) * 100),
    endingSatisfaction,
  };

  const ok =
    rejects.length === 0 &&
    scores.narrativeContinuity >= 95 &&
    scores.emotionalContinuity >= 95 &&
    scores.storyCohesion >= 95 &&
    scores.endingSatisfaction >= 95;

  return {
    scores,
    rejects,
    ok,
    summary: ok
      ? `Story Memory accepted — narrative ${scores.narrativeContinuity}% · emotion ${scores.emotionalContinuity}% · cohesion ${scores.storyCohesion}% · ending ${scores.endingSatisfaction}%.`
      : `Story Memory rejects: ${rejects.map((r) => r.code).join(", ") || "score below target"}`,
  };
}
