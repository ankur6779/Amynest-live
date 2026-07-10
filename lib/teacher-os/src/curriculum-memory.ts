import {
  CURRICULUM_TOPICS,
  getCurriculumProgress,
  markTopicCompleted,
  suggestNextTopics,
  type WorksheetClass,
} from "@workspace/worksheet-studio";
import type { CurriculumFramework, CurriculumMemory } from "./types.js";

const MEMORY_KEY = "teacher-os-curriculum-memory-v1";

function canUseStorage(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage != null;
  } catch {
    return false;
  }
}

export function loadCurriculumMemory(framework: CurriculumFramework = "custom_lps"): CurriculumMemory {
  const progress = getCurriculumProgress();
  const completed = progress.completed.map((c) => c.topicId);
  const allTopics = CURRICULUM_TOPICS.map((t) => t.id);
  const pending = allTopics.filter((id) => !completed.includes(id));

  let stored: Partial<CurriculumMemory> = {};
  if (canUseStorage()) {
    try {
      const raw = localStorage.getItem(MEMORY_KEY);
      if (raw) stored = JSON.parse(raw) as Partial<CurriculumMemory>;
    } catch { /* */ }
  }

  return {
    completedTopics: completed,
    pendingTopics: pending,
    weakAreas: stored.weakAreas ?? [],
    revisionRequired: stored.revisionRequired ?? [],
    repeatedConcepts: stored.repeatedConcepts ?? [],
    lastTopic: stored.lastTopic,
    framework,
    updatedAt: new Date().toISOString(),
  };
}

export function saveCurriculumMemory(memory: CurriculumMemory): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
  } catch { /* */ }
}

export function recordTopicTaught(
  topic: string,
  classLevel: WorksheetClass,
  weakArea?: boolean,
): CurriculumMemory {
  const topicEntry = CURRICULUM_TOPICS.find(
    (t) => t.label.toLowerCase() === topic.toLowerCase() || t.id === topic.toLowerCase().replace(/\s+/g, "_"),
  );
  if (topicEntry) markTopicCompleted(topicEntry.id, classLevel);

  const memory = loadCurriculumMemory();
  const updated: CurriculumMemory = {
    ...memory,
    lastTopic: topic,
    updatedAt: new Date().toISOString(),
  };
  if (weakArea && !updated.weakAreas.includes(topic)) {
    updated.weakAreas = [...updated.weakAreas, topic];
    updated.revisionRequired = [...updated.revisionRequired, topic];
  }
  saveCurriculumMemory(updated);
  return updated;
}

export function suggestNextTopic(classLevel: WorksheetClass, limit = 3): string[] {
  const suggestions = suggestNextTopics(classLevel, limit);
  return suggestions.map((t) => t.label);
}

export function parseNaturalLessonRequest(message: string): {
  topic?: string;
  classLevel?: WorksheetClass;
  date?: string;
} {
  const l = message.toLowerCase();
  let classLevel: WorksheetClass | undefined;
  if (l.includes("nursery")) classLevel = "nursery";
  else if (l.includes("lkg")) classLevel = "lkg";
  else if (l.includes("ukg")) classLevel = "ukg";
  else if (l.includes("grade 2") || l.includes("grade2")) classLevel = "grade2";
  else if (l.includes("grade 1") || l.includes("grade1")) classLevel = "grade1";

  const topicMatch = message.match(/teach\s+(.+?)\s+(?:tomorrow|today|to\s+)/i)
    ?? message.match(/(?:on|about)\s+([A-Za-z0-9\s]+?)(?:\s+tomorrow|\s+to\s+|\s+for\s+|$)/i);
  const topic = topicMatch?.[1]?.trim().replace(/\s+to\s+\w+$/i, "").trim();

  const tomorrow = /tomorrow/i.test(message);
  const date = tomorrow
    ? new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return { topic, classLevel, date };
}
