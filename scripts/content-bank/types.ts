export type AgeBand = "2-4" | "4-6" | "6-8" | "8-10" | "10-12";

export type SmartStudyDifficulty =
  | "starter"
  | "easy"
  | "medium"
  | "challenging"
  | "advanced";

export interface SmartStudyLesson {
  id: string;
  ageBand: AgeBand;
  subject: string;
  difficulty: SmartStudyDifficulty;
  learningLevel: number;
  title: string;
  description: string;
  lessonContent: string;
  questions: string[];
  answers: string[];
  funFact: string;
  amyExplanation: string;
  audioText: string;
}

export interface LifeSkillsLesson {
  id: string;
  ageBand: AgeBand;
  skillCategory: string;
  title: string;
  story: string;
  scenario: string;
  question: string;
  choices: string[];
  correctAnswer: string;
  amyTip: string;
  audioText: string;
}

export interface EventPrepActivity {
  id: string;
  eventType: string;
  ageBand: AgeBand;
  confidenceLevel: "gentle" | "building" | "ready";
  title: string;
  eventTheme: string;
  speech: string;
  practiceTips: string[];
  confidenceTips: string[];
  audioText: string;
}

export interface MathProgressionPack {
  id: string;
  stage: string;
  difficulty: SmartStudyDifficulty;
  ageBand: AgeBand;
  learningLevel: number;
  title: string;
  activities: string[];
  practiceQuestions: string[];
  answers: string[];
  amyHints: string[];
  audioText: string;
}

export interface ContentBankManifest {
  version: string;
  generatedAt: string;
  totalItems: number;
  categories: {
    smartStudy: number;
    lifeSkills: number;
    eventPrep: number;
    mathProgression: number;
  };
  shards: {
    smartStudy: string;
    lifeSkills: string;
    eventPrep: string;
    mathProgression: string;
  };
}

export interface ContentBankStats {
  totalContentCount: number;
  categoryCounts: ContentBankManifest["categories"];
  ageBandDistribution: Record<string, number>;
  difficultyDistribution: Record<string, number>;
  estimatedBytesUncompressed: number;
  estimatedBytesGzip: number;
  gcsFolderLayout: string[];
}
