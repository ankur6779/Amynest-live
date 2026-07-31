import { entityId } from "./ontology.js";
import type { LearningObservation, LearningSource } from "./types.js";

/** Minimal mastery shape shared by Animal + Discovery Worlds. */
export type ItemMasteryLike = {
  soundsPlayed: number;
  quizzesCorrect: number;
  hearFindCorrect: number;
  hearFindAttempts: number;
};

/**
 * Diff previous vs next mastery into incremental learning observations.
 * Safe to call on every progress save — emits only positive deltas.
 */
export function observationsFromMasteryDelta(
  itemId: string,
  prev: ItemMasteryLike | undefined,
  next: ItemMasteryLike,
  source: LearningSource = "discovery_worlds",
  at?: string,
): LearningObservation[] {
  const p = prev ?? {
    soundsPlayed: 0,
    quizzesCorrect: 0,
    hearFindCorrect: 0,
    hearFindAttempts: 0,
  };
  const nodeId = entityId(itemId);
  const obs: LearningObservation[] = [];
  const stamp = at ?? new Date().toISOString();

  const heardDelta = next.soundsPlayed - p.soundsPlayed;
  for (let i = 0; i < heardDelta; i++) {
    obs.push({ nodeId, modality: "heard", source, at: stamp });
    if (i === 0) {
      obs.push({ nodeId, modality: "seen", source, at: stamp });
    }
  }

  const quizDelta = next.quizzesCorrect - p.quizzesCorrect;
  for (let i = 0; i < quizDelta; i++) {
    obs.push({
      nodeId,
      modality: "recognized",
      source,
      at: stamp,
      score: 90,
    });
  }

  const hfCorrectDelta = next.hearFindCorrect - p.hearFindCorrect;
  for (let i = 0; i < hfCorrectDelta; i++) {
    obs.push({
      nodeId,
      modality: "recognized",
      source,
      at: stamp,
      score: 85,
    });
  }

  const hfAttemptDelta = next.hearFindAttempts - p.hearFindAttempts;
  const hfFailDelta = Math.max(0, hfAttemptDelta - hfCorrectDelta);
  for (let i = 0; i < hfFailDelta; i++) {
    obs.push({
      nodeId,
      modality: "failed",
      source,
      at: stamp,
      score: 30,
    });
  }

  return obs;
}

export function observationsFromMasteryMapDelta(
  prevMap: Record<string, ItemMasteryLike> | undefined,
  nextMap: Record<string, ItemMasteryLike>,
  source: LearningSource = "discovery_worlds",
  at?: string,
): LearningObservation[] {
  const out: LearningObservation[] = [];
  for (const [itemId, next] of Object.entries(nextMap)) {
    out.push(
      ...observationsFromMasteryDelta(
        itemId,
        prevMap?.[itemId],
        next,
        source,
        at,
      ),
    );
  }
  return out;
}

/** Map a speech-coach attempt onto phoneme / word / entity nodes. */
export function observationsFromSpeechAttempt(input: {
  promptText: string;
  score: number;
  soundHints?: string[];
  at?: string;
}): LearningObservation[] {
  const source: LearningSource = "speech_coach";
  const at = input.at ?? new Date().toISOString();
  const modality = input.score >= 70 ? ("spoken" as const) : ("failed" as const);
  const obs: LearningObservation[] = [];
  const word = input.promptText.trim().toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/)[0];
  if (word) {
    obs.push({
      nodeId: `word:${word}`,
      modality,
      source,
      at,
      score: input.score,
    });
    obs.push({
      nodeId: `entity:${word}`,
      modality,
      source,
      at,
      score: input.score,
    });
    const letter = word[0];
    if (letter) {
      obs.push({
        nodeId: `phoneme:${letter}`,
        modality,
        source,
        at,
        score: input.score,
      });
    }
  }
  for (const hint of input.soundHints ?? []) {
    const letter = hint.trim().toLowerCase()[0];
    if (!letter) continue;
    obs.push({
      nodeId: `phoneme:${letter}`,
      modality,
      source,
      at,
      score: input.score,
    });
  }
  return obs;
}
