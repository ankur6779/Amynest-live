import type { WorksheetClass, WorksheetSubject } from "./types.js";

export type CurriculumTopicId =
  | "alphabet" | "numbers" | "shapes" | "colors" | "animals" | "transport"
  | "phonics" | "reading" | "writing" | "math" | "evs";

export interface CurriculumTopic {
  id: CurriculumTopicId;
  label: string;
  subject: WorksheetSubject;
  prompts: string[];
  classes: WorksheetClass[];
}

export const CURRICULUM_TOPICS: CurriculumTopic[] = [
  { id: "alphabet", label: "Alphabet", subject: "english", classes: ["nursery", "lkg", "ukg"], prompts: ["Letter tracing A-Z", "Beginning sounds", "Missing letters"] },
  { id: "numbers", label: "Numbers", subject: "math", classes: ["nursery", "lkg", "ukg", "grade1"], prompts: ["Count 1-10", "Number names", "Before and after"] },
  { id: "shapes", label: "Shapes", subject: "math", classes: ["nursery", "lkg", "ukg"], prompts: ["Circle square triangle", "Shape matching", "Draw shapes"] },
  { id: "colors", label: "Colors", subject: "english", classes: ["nursery", "lkg"], prompts: ["Colour the objects", "Name the colours", "Colour mixing"] },
  { id: "animals", label: "Animals", subject: "evs", classes: ["lkg", "ukg", "grade1"], prompts: ["Farm animals", "Sea animals", "Animal homes"] },
  { id: "transport", label: "Transport", subject: "evs", classes: ["lkg", "ukg"], prompts: ["Land transport", "Air and water transport", "Road safety"] },
  { id: "phonics", label: "Phonics", subject: "phonics", classes: ["lkg", "ukg", "grade1"], prompts: ["CVC words", "Rhyming words", "Blends"] },
  { id: "reading", label: "Reading", subject: "english", classes: ["ukg", "grade1", "grade2"], prompts: ["Sight words", "Short sentences", "Picture comprehension"] },
  { id: "writing", label: "Writing", subject: "english", classes: ["ukg", "grade1", "grade2"], prompts: ["Sentence writing", "Copy work", "Creative writing"] },
  { id: "math", label: "Math", subject: "math", classes: ["ukg", "grade1", "grade2"], prompts: ["Addition", "Subtraction", "Word problems"] },
  { id: "evs", label: "EVS", subject: "evs", classes: ["ukg", "grade1", "grade2"], prompts: ["Plants", "My body", "Food and health"] },
];

const PROGRESS_KEY = "worksheet-curriculum-progress";

export interface CurriculumProgress {
  completed: Array<{ topicId: CurriculumTopicId; classLevel: WorksheetClass; completedAt: string }>;
}

export function getCurriculumProgress(): CurriculumProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return JSON.parse(raw) as CurriculumProgress;
  } catch { /* */ }
  return { completed: [] };
}

export function markTopicCompleted(topicId: CurriculumTopicId, classLevel: WorksheetClass): void {
  const progress = getCurriculumProgress();
  if (!progress.completed.some((c) => c.topicId === topicId && c.classLevel === classLevel)) {
    progress.completed.push({ topicId, classLevel, completedAt: new Date().toISOString() });
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }
}

export function suggestNextTopics(classLevel: WorksheetClass, limit = 5): CurriculumTopic[] {
  const progress = getCurriculumProgress();
  const done = new Set(progress.completed.filter((c) => c.classLevel === classLevel).map((c) => c.topicId));
  return CURRICULUM_TOPICS
    .filter((t) => t.classes.includes(classLevel) && !done.has(t.id))
    .slice(0, limit);
}

export function topicPrompt(topic: CurriculumTopic, classLevel: WorksheetClass): string {
  const idx = classLevel.charCodeAt(0) % topic.prompts.length;
  return `${classLevel} ${topic.label}: ${topic.prompts[idx] ?? topic.prompts[0]}`;
}
