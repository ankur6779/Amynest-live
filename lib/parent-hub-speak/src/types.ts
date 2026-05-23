export type AgeGroup =
  | "infant"
  | "toddler"
  | "preschool"
  | "early_school"
  | "pre_teen";

export type DailyStoryCategory = "moral" | "fun" | "animal" | "learning";

export type DailyStory = {
  id: string;
  emoji: string;
  category: DailyStoryCategory;
  ageMin: number;
  ageMax: number;
  title: string;
  preview: string;
  story: string;
  moral: string;
};

export type HubFactCategory = "animal" | "science" | "gk";

export type HubFact = {
  id: string;
  emoji: string;
  text: string;
  textHi: string;
  category: HubFactCategory;
  ageGroups: AgeGroup[];
};

export type HubPuzzle = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  difficulty: "easy" | "medium" | "hard";
  visual?: string;
  audioQ?: string;
};

export type HubOrigamiStep = {
  fold: string;
  instruction: string;
};

export type HubOrigami = {
  id: string;
  title: string;
  emoji: string;
  bg: string;
  accent: string;
  difficulty: "Easy" | "Medium" | "Fun";
  steps: HubOrigamiStep[];
  ageMin: number;
  ageMax: number;
  guideUrl?: string;
};

export type HubShortStory = {
  emoji: string;
  title: string;
  story: string;
  moral: string;
};

export type AgeGroupStory = {
  title: string;
  story: string;
  moral: string;
  emoji: string;
};
