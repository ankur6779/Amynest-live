export * from "./types";
export * from "./engagement";
export * from "./adaptive";
export { PLAY_CATEGORIES } from "./content/play";
export { BASIC_SUBJECTS } from "./content/basic";
export { ADVANCED_SUBJECTS } from "./content/advanced";

import type { PlayCategory, SubjectPack, StudyTopic, PlayItem, PlayCategoryId } from "./types";
import { PLAY_CATEGORIES } from "./content/play";
import { BASIC_SUBJECTS } from "./content/basic";
import { ADVANCED_SUBJECTS } from "./content/advanced";

export function getPlayCategory(id: string): PlayCategory | undefined {
  return PLAY_CATEGORIES.find((c) => c.id === (id as PlayCategoryId));
}

export function getPlayItem(categoryId: string, itemId: string): PlayItem | undefined {
  return getPlayCategory(categoryId)?.items.find((i) => i.id === itemId);
}

export function getBasicSubject(id: string): SubjectPack | undefined {
  return BASIC_SUBJECTS.find((s) => s.id === id);
}

export function getAdvancedSubject(id: string): SubjectPack | undefined {
  return ADVANCED_SUBJECTS.find((s) => s.id === id);
}

export function getTopic(mode: "basic" | "advanced", subjectId: string, topicId: string): StudyTopic | undefined {
  const subj = mode === "basic" ? getBasicSubject(subjectId) : getAdvancedSubject(subjectId);
  return subj?.topics.find((t) => t.id === topicId);
}
