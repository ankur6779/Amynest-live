export * from "./types";
export * from "./engagement";
export * from "./adaptive";
export * from "./levels";
export { PLAY_CATEGORIES } from "./content/play";
export {
  collapseSpeakWhitespace,
  getPlayItemSpeakText,
  getPlayItemCatalogSpeakOpts,
  getTopicNotesSpeakText,
  getTopicAmySpeakText,
  getTopicNotesCatalogSpeakOpts,
  getTopicAmyCatalogSpeakOpts,
  type StudyCatalogSpeakOpts,
} from "./play-speak";
export { BASIC_SUBJECTS } from "./content/basic";
export { ADVANCED_SUBJECTS } from "./content/advanced";
export {
  normalizeStudyCountry,
  parseChildClassNumber,
  topicMatchesClass,
  filterTopicsForClass,
  getBasicSubjectsForCountry,
  getAdvancedSubjectsForCountry,
  getBasicSubjectsForChild,
  getAdvancedSubjectsForChild,
  getSubjectPacksForChild,
  getPlayCategoriesForCountry,
  getPlayCategoriesForChild,
  playCategoryLimitForJourneyDay,
  playUnlocksTomorrowForCategory,
  PLAY_JOURNEY_LIMITS,
  isAdaptivePracticeTopic,
  isAdaptiveMathTopic,
  ADAPTIVE_MATH_TOPIC_IDS,
} from "./resolve-content";
export {
  pickPracticeQuestions,
  pickTopicPracticeQuestions,
  isTopicPracticeSubject,
  isMathPracticeSubject,
  isBasicMathPracticeSubject,
  practicePackForSubject,
  lookupPracticeTitle,
  TOPIC_PRACTICE_SUBJECTS,
  MATH_PRACTICE_SUBJECTS,
} from "./topic-practice";
export {
  pickAdvancedMathQuestions,
  isAdvancedMathPracticeSubject,
  getPracticePickerTopics,
  ADVANCED_MATH_PRACTICE_SUBJECTS,
  ADVANCED_MATH_PRACTICE_TOPICS,
} from "./advanced-math-practice";
export {
  pickBasicMathExtraQuestions,
  isBasicMathExtraPracticeSubject,
  BASIC_MATH_EXTRA_PRACTICE_SUBJECTS,
  BASIC_MATH_EXTRA_PRACTICE_TOPICS,
} from "./basic-math-extra-practice";

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
