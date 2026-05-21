export type AssistantTabId = "parenting" | "teach" | "practice" | "quiz" | "doubt";

/** i18n keys — one unique topic list per tab intent. */
export const TAB_TOPICS: Record<AssistantTabId, readonly string[]> = {
  parenting: [
    "ai.tab_topics.parenting.bedtime",
    "ai.tab_topics.parenting.screen_time",
    "ai.tab_topics.parenting.tantrums",
    "ai.tab_topics.parenting.food",
    "ai.tab_topics.parenting.study",
    "ai.tab_topics.parenting.confidence",
  ],
  teach: [
    "ai.tab_topics.teach.alphabets",
    "ai.tab_topics.teach.math",
    "ai.tab_topics.teach.reading",
    "ai.tab_topics.teach.fun_learning",
    "ai.tab_topics.teach.memory",
    "ai.tab_topics.teach.creative_thinking",
  ],
  practice: [
    "ai.tab_topics.practice.habit_checklist",
    "ai.tab_topics.practice.focus",
    "ai.tab_topics.practice.speech",
    "ai.tab_topics.practice.listening",
    "ai.tab_topics.practice.discipline",
    "ai.tab_topics.practice.emotional_control",
  ],
  quiz: [
    "ai.tab_topics.quiz.general",
    "ai.tab_topics.quiz.math",
    "ai.tab_topics.quiz.english",
    "ai.tab_topics.quiz.science",
    "ai.tab_topics.quiz.logic",
    "ai.tab_topics.quiz.memory",
  ],
  doubt: [
    "ai.tab_topics.doubt.not_listening",
    "ai.tab_topics.doubt.mobile_addiction",
    "ai.tab_topics.doubt.not_eating",
    "ai.tab_topics.doubt.aggression",
    "ai.tab_topics.doubt.school_anxiety",
    "ai.tab_topics.doubt.sleep",
  ],
};
