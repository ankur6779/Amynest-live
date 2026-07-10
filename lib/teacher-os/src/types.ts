/** AmyNest Teacher OS v8 — shared types */

import type {
  ClassroomPack,
  HomeworkPack,
  WorksheetClass,
  WorksheetDifficulty,
  WorksheetDocument,
  WorksheetGenerateRequest,
  WorksheetSubject,
} from "@workspace/worksheet-studio";

export type TeacherOsModuleId =
  | "dashboard"
  | "teaching_pack"
  | "daily_planner"
  | "weekly_planner"
  | "curriculum"
  | "studio"
  | "lesson_chat"
  | "search"
  | "analytics"
  | "monthly_curriculum"
  | "yearly_curriculum"
  | "classroom_assistant"
  | "parent_communication"
  | "classroom_resources"
  | "student_assessment"
  | "school_events"
  | "admin_dashboard"
  | "knowledge_base";

export type CurriculumFramework =
  | "cbse"
  | "icse"
  | "state_board"
  | "nep_2020"
  | "montessori"
  | "playway"
  | "phonics"
  | "custom_lps";

export type ParentMessageLanguage = "english" | "hindi" | "bilingual";

export interface LessonTimelineSlot {
  id: string;
  label: string;
  durationMinutes: number;
  description: string;
  materials?: string[];
}

export interface DailyLessonPlan {
  id: string;
  date: string;
  classLevel: WorksheetClass;
  subject: WorksheetSubject;
  topic: string;
  difficulty: WorksheetDifficulty;
  timeline: LessonTimelineSlot[];
  learningObjectives: string[];
  materialsRequired: string[];
  circleTimeQuestions: string[];
  blackboardNotes: string[];
  oralQuestions: string[];
  reflectionPrompt: string;
  estimatedMinutes: number;
  createdAt: string;
}

export interface TeachingPack {
  id: string;
  topic: string;
  classLevel: WorksheetClass;
  subject: WorksheetSubject;
  difficulty: WorksheetDifficulty;
  lessonPlan: DailyLessonPlan;
  homeworkPack: HomeworkPack;
  classroomPack: ClassroomPack;
  parentMessages: ParentMessageSet;
  worksheets: {
    printable: WorksheetDocument;
    homework: WorksheetDocument;
    assessment: WorksheetDocument;
    revision: WorksheetDocument;
    answerKey: WorksheetDocument;
  };
  createdAt: string;
}

export interface ParentMessageSet {
  homework: string;
  whatsapp: string;
  weeklyUpdate: string;
  homeActivity: string;
  language: ParentMessageLanguage;
}

export interface CurriculumMemory {
  completedTopics: string[];
  pendingTopics: string[];
  weakAreas: string[];
  revisionRequired: string[];
  repeatedConcepts: string[];
  lastTopic?: string;
  framework: CurriculumFramework;
  updatedAt: string;
}

export interface TeacherOsRecommendation {
  id: string;
  label: string;
  description: string;
  module: TeacherOsModuleId;
  priority: "high" | "medium" | "low";
}

export interface TeacherOsSearchResult {
  id: string;
  type: "lesson_plan" | "worksheet" | "flashcard" | "homework" | "assessment" | "parent_message" | "activity";
  title: string;
  topic: string;
  module: TeacherOsModuleId;
  snippet: string;
}

export interface TeacherOsAnalytics {
  lessonsCreated: number;
  worksheetsGenerated: number;
  homeworkPacks: number;
  assessments: number;
  topicsCompleted: number;
  packsGenerated: number;
  aiAcceptanceRate: number;
  updatedAt: string;
}

export interface LessonChatIntent {
  action:
    | "create_lesson"
    | "reduce_difficulty"
    | "increase_writing"
    | "montessori"
    | "activity_based"
    | "blooms_taxonomy"
    | "easier_assessment"
    | "generate_worksheet"
    | "unknown";
  topic?: string;
  classLevel?: WorksheetClass;
  rawMessage: string;
}

export interface TeacherOsContext {
  classLevel: WorksheetClass;
  subject: WorksheetSubject;
  topic: string;
  difficulty: WorksheetDifficulty;
  date?: string;
}

export type GenerateTeachingPackInput = WorksheetGenerateRequest & {
  date?: string;
  framework?: CurriculumFramework;
  parentLanguage?: ParentMessageLanguage;
};

export interface KnowledgeBaseEntry {
  id: CurriculumFramework;
  label: string;
  description: string;
  ageRange: string;
}
