/**
 * Assign speaking / listening / reacting roles with SCENE COMPLEXITY caps.
 * 70% duo · 20% solo · 10% trio (celebration/ending only).
 * One speaker · one listener · optional reactor.
 */

import type { BrandCharacterId } from "../brand/types.js";
import type { DirectorBeatRole } from "../ai-director/types.js";
import type {
  CharacterPerformanceCast,
  DominantEmotion,
  LipSyncStrategy,
  ScenePerformancePlan,
} from "./types.js";

export type ComplexityTier = "solo" | "duo" | "trio";

const ALL: BrandCharacterId[] = ["amy-ai", "amy-girl", "amy-boy"];

export function dominantEmotionForRole(role: DirectorBeatRole): DominantEmotion {
  switch (role) {
    case "hook":
      return "Curiosity";
    case "problem":
      return "Confusion";
    case "emotion":
      return "Hope";
    case "feature":
      return "Hope";
    case "transformation":
      return "Achievement";
    case "cta":
      return "Joy";
    case "end-card":
      return "Pride";
    case "bridge":
      return "Relief";
  }
}

export function relationshipNoteForRole(role: DirectorBeatRole): string {
  switch (role) {
    case "hook":
      return "Single emotional focus — child thinking; one visual objective.";
    case "problem":
      return "Amy + Girl only — mentor beside learner; one speaker energy max.";
    case "emotion":
      return "Amy + Girl hope beat — one speaker energy; face and eyes carry the moment.";
    case "feature":
      return "Amy + Girl teach/learn pair — one active speaker, one listener.";
    case "transformation":
      return "Celebration may include three — still one speaker; others react.";
    case "cta":
      return "Amy + one child invite — solve-feeling, not ad pile-up.";
    case "end-card":
      return "Brand settle — no dialogue-heavy trio.";
    case "bridge":
      return "Solo discovery/reaction bridge — keep generation simple.";
  }
}

/** Complexity tier from story role — targets ~70% duo / ~20% solo / ~10% trio. */
export function complexityTierForRole(role: DirectorBeatRole): ComplexityTier {
  // ~20% solo emotional (hook / bridge discovery / brand settle)
  if (role === "hook" || role === "bridge" || role === "end-card") return "solo";
  // ~10% trio — celebration / family ending only (never dialogue-heavy feature)
  if (role === "transformation") return "trio";
  // ~70% duo (problem / emotion / feature / cta)
  return "duo";
}

export function castScenePerformance(input: {
  sceneId: string;
  index: number;
  role: DirectorBeatRole;
  narration: string;
  durationSeconds: number;
  existingCharacters: BrandCharacterId[];
}): ScenePerformancePlan {
  const emotion = dominantEmotionForRole(input.role);
  const dialogueBeat = (input.narration || "").trim().slice(0, 140);
  const tier = complexityTierForRole(input.role);

  if (input.role === "end-card") {
    return {
      sceneId: input.sceneId,
      index: input.index,
      cast: [],
      speaker: "none",
      listeners: [],
      reactors: [],
      movers: [],
      thinkers: [],
      waiters: [],
      dominantEmotion: emotion,
      relationshipNote: relationshipNoteForRole(input.role),
      microActing: [],
      lipSyncStrategy: "external-narration-reactions",
      cameraMotivation: "Settle on brand — one visual objective.",
      framingPreference: "wide-group",
      groupScene: false,
      dialogueBeat,
    };
  }

  const speaker = pickSpeaker(input.role, dialogueBeat);
  const group = pickCastForTier(tier, input.role, speaker, input.existingCharacters);
  const cast = assignRoles(group, speaker, input.role);
  const byRole = (r: CharacterPerformanceCast["role"]) =>
    cast.filter((c) => c.role === r).map((c) => c.character);

  const lipSyncStrategy = resolveLipSyncStrategy(speaker, input.role);
  const framingPreference =
    lipSyncStrategy === "speaking-beat-ots"
      ? "over-the-shoulder"
      : lipSyncStrategy === "speaking-beat-medium"
        ? "medium"
        : lipSyncStrategy === "listening-reaction"
          ? "medium"
          : "close-up-safe";

  return {
    sceneId: input.sceneId,
    index: input.index,
    cast,
    speaker,
    listeners: byRole("listening"),
    reactors: byRole("reacting"),
    movers: byRole("moving"),
    thinkers: byRole("thinking"),
    waiters: byRole("waiting"),
    dominantEmotion: emotion,
    relationshipNote: relationshipNoteForRole(input.role),
    microActing: [],
    lipSyncStrategy,
    cameraMotivation: `ONE visual objective for ${input.role}: ${emotion}. No multi-speaker pile-up. Camera follows that single emotion.`,
    framingPreference,
    groupScene: group.length >= 2,
    dialogueBeat,
  };
}

function pickSpeaker(
  role: DirectorBeatRole,
  dialogue: string,
): BrandCharacterId | "external-narration" {
  if (role === "hook" || role === "problem" || role === "emotion" || role === "bridge") {
    if (/parents?|today|struggle|homework feels/i.test(dialogue) || role !== "problem") {
      if (role === "problem" && !/parents?|today|struggle/i.test(dialogue)) {
        return "amy-girl";
      }
      if (role === "hook" || role === "emotion" || role === "bridge") {
        return "external-narration";
      }
      return "external-narration";
    }
  }
  if (role === "feature" || role === "cta") return "amy-ai";
  if (role === "transformation") {
    if (/boy|celebrate|jump|fist/i.test(dialogue)) return "amy-boy";
    return "amy-girl";
  }
  return "amy-girl";
}

function pickCastForTier(
  tier: ComplexityTier,
  role: DirectorBeatRole,
  speaker: BrandCharacterId | "external-narration" | "none",
  existing: BrandCharacterId[],
): BrandCharacterId[] {
  if (tier === "solo") {
    if (role === "bridge") return ["amy-boy"];
    if (role === "hook" || role === "emotion") return ["amy-girl"];
    if (speaker !== "external-narration" && speaker !== "none") return [speaker];
    return ["amy-girl"];
  }

  if (tier === "trio") {
    // Celebration / family ending only
    return ["amy-ai", "amy-girl", "amy-boy"];
  }

  // Duo — prefer Amy+Girl or Amy+Boy; never three
  if (role === "cta") return ["amy-ai", "amy-girl"];
  if (role === "feature" || role === "problem") return ["amy-ai", "amy-girl"];
  const fromExisting = existing.filter((c) => ALL.includes(c)).slice(0, 2);
  if (fromExisting.length >= 2) return uniqueTwo(fromExisting);
  if (speaker === "amy-boy") return ["amy-ai", "amy-boy"];
  return ["amy-ai", "amy-girl"];
}

function uniqueTwo(ids: BrandCharacterId[]): BrandCharacterId[] {
  const order: BrandCharacterId[] = ["amy-ai", "amy-girl", "amy-boy"];
  return order.filter((id) => ids.includes(id)).slice(0, 2);
}

/**
 * One active speaker, one listener, optional reactor.
 * Never three speaking characters.
 */
function assignRoles(
  group: BrandCharacterId[],
  speaker: BrandCharacterId | "external-narration",
  role: DirectorBeatRole,
): CharacterPerformanceCast[] {
  if (group.length === 1) {
    const only = group[0]!;
    const soloRole =
      speaker !== "external-narration" && speaker === only
        ? "speaking"
        : role === "hook"
          ? "thinking"
          : "reacting";
    return [
      {
        character: only,
        role: soloRole,
        beat:
          soloRole === "speaking"
            ? speakingBeat(only)
            : soloRole === "thinking"
              ? "Solo thinking beat — face + eyes only; one emotion; mouth soft"
              : "Solo discovery/reaction — one emotion; natural child micro-motion",
      },
    ];
  }

  const casts: CharacterPerformanceCast[] = [];
  const others = group.filter(
    (c) => speaker === "external-narration" || c !== speaker,
  );

  if (speaker !== "external-narration" && group.includes(speaker)) {
    casts.push({
      character: speaker,
      role: "speaking",
      beat: speakingBeat(speaker),
    });
  }

  // Exactly one listener
  const listener =
    others.find((c) => c === "amy-girl" || c === "amy-ai") ?? others[0];
  if (listener) {
    casts.push({
      character: listener,
      role: speaker === "external-narration" ? "listening" : "listening",
      beat:
        speaker === "external-narration"
          ? "Active listener — eyes alive, mouth soft/closed; ONE focus"
          : `Listens to ${speaker} — eyes on speaker; mouth soft; no second dialogue`,
    });
  }

  // Optional single reactor (trio only)
  const reactor = others.find((c) => c !== listener);
  if (reactor && group.length >= 3) {
    casts.push({
      character: reactor,
      role: "reacting",
      beat: "Optional reactor only — smile/glance; NEVER a second speaker",
    });
  } else if (reactor && group.length === 2 && speaker === "external-narration") {
    // Duo under external VO: second character reacts, not a second speaker
    const existing = casts.find((c) => c.character === reactor);
    if (!existing) {
      casts.push({
        character: reactor,
        role: "reacting",
        beat: "Soft reaction partner — one emotion; no dialogue mouth",
      });
    }
  }

  // Ensure every group member appears exactly once
  for (const character of group) {
    if (!casts.some((c) => c.character === character)) {
      casts.push({
        character,
        role: "listening",
        beat: "Supportive presence — eyes on the active beat; not speaking",
      });
    }
  }

  // Hard cap: at most one speaking role
  let seenSpeaker = false;
  return casts.map((c) => {
    if (c.role !== "speaking") return c;
    if (!seenSpeaker) {
      seenSpeaker = true;
      return c;
    }
    return {
      ...c,
      role: "reacting",
      beat: "Demoted from speaker — only one active speaker allowed",
    };
  });
}

function speakingBeat(character: BrandCharacterId): string {
  if (character === "amy-ai") {
    return "ONLY speaker: mouth + eyes + one mentor gesture — partners only listen/react";
  }
  if (character === "amy-girl") {
    return "ONLY speaker: child mouth cadence; tiny pause; partners watch";
  }
  return "ONLY speaker: playful line energy; partners watch/react — no second speaker";
}

function resolveLipSyncStrategy(
  speaker: BrandCharacterId | "external-narration",
  role: DirectorBeatRole,
): LipSyncStrategy {
  if (speaker === "external-narration") return "external-narration-reactions";
  if (role === "feature") return "speaking-beat-ots";
  if (role === "cta" || role === "transformation") return "speaking-beat-medium";
  return "listening-reaction";
}

export function charactersForPerformance(
  plan: ScenePerformancePlan,
): BrandCharacterId[] {
  return plan.cast.map((c) => c.character);
}

/** Stats helper for reports/tests. */
export function summarizeCastComplexity(plans: ScenePerformancePlan[]): {
  soloRatio: number;
  duoRatio: number;
  trioRatio: number;
  avgCharacters: number;
  living: number;
} {
  const living = plans.filter((p) => p.cast.length > 0);
  if (living.length === 0) {
    return { soloRatio: 0, duoRatio: 0, trioRatio: 0, avgCharacters: 0, living: 0 };
  }
  const solo = living.filter((p) => p.cast.length === 1).length;
  const duo = living.filter((p) => p.cast.length === 2).length;
  const trio = living.filter((p) => p.cast.length >= 3).length;
  const avgCharacters =
    living.reduce((s, p) => s + p.cast.length, 0) / living.length;
  return {
    soloRatio: solo / living.length,
    duoRatio: duo / living.length,
    trioRatio: trio / living.length,
    avgCharacters,
    living: living.length,
  };
}
