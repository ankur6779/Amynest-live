import type { TutorMemory } from "./types.js";
import type { ChildAnswerEvaluation } from "./types.js";

export function createEmptyTutorMemory(): TutorMemory {
  return {
    mistakesHistory: [],
    strengths: [],
    weakAreas: [],
  };
}

const memoryByChild = new Map<string, TutorMemory>();

export function getTutorMemory(childId: string): TutorMemory {
  return memoryByChild.get(childId) ?? createEmptyTutorMemory();
}

export function saveTutorMemory(childId: string, memory: TutorMemory): void {
  memoryByChild.set(childId, memory);
}

export function recordMistake(memory: TutorMemory, topic: string): TutorMemory {
  const entry = topic.slice(0, 80);
  const mistakes = [...memory.mistakesHistory, entry].slice(-20);
  const weakAreas = memory.weakAreas.includes(entry)
    ? memory.weakAreas
    : [...memory.weakAreas, entry].slice(-10);
  return { ...memory, mistakesHistory: mistakes, weakAreas };
}

export function recordStrength(memory: TutorMemory, topic: string): TutorMemory {
  const entry = topic.slice(0, 80);
  const strengths = memory.strengths.includes(entry)
    ? memory.strengths
    : [...memory.strengths, entry].slice(-10);
  return { ...memory, strengths };
}

export function updateMemoryFromEvaluation(
  memory: TutorMemory,
  topic: string,
  evaluation: ChildAnswerEvaluation,
): TutorMemory {
  if (evaluation.correct) return recordStrength(memory, topic);
  if (!evaluation.partial) return recordMistake(memory, topic);
  return memory;
}

export function clearTutorMemory(childId?: string): void {
  if (childId) memoryByChild.delete(childId);
  else memoryByChild.clear();
}
