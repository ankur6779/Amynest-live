import { computeSkillBreakdown, dailySeed, WORKSHEET_LEVEL_LABEL_KEYS } from "@workspace/math-playground";
import type {
  GeneratedWorksheet,
  PlaygroundLearningState,
  SkillBreakdown,
  WorksheetCategory,
} from "@workspace/math-playground";
import {
  generateAdditionProblems,
  generateCountingProblems,
  generateDivisionProblems,
  generateMultiplicationProblems,
  generatePatternProblems,
  generateSubtractionProblems,
} from "./generators";
import {
  masteryForCategory,
  pickWorksheetCategory,
  selectWorksheetLevel,
  tierForWorksheet,
} from "./level-selector";

const PROBLEMS_BY_LEVEL: Record<1 | 2 | 3 | 4, number> = {
  1: 6,
  2: 8,
  3: 10,
  4: 12,
};

const TITLE_KEYS: Record<WorksheetCategory, string> = {
  counting: "ws_title_counting",
  addition: "ws_title_addition",
  subtraction: "ws_title_subtraction",
  multiplication: "ws_title_multiplication",
  division: "ws_title_division",
  patterns: "ws_title_patterns",
};

function generateProblems(
  category: WorksheetCategory,
  seed: number,
  level: GeneratedWorksheet["level"],
  count: number,
) {
  switch (category) {
    case "counting":
      return generateCountingProblems(seed, level, count);
    case "addition":
      return generateAdditionProblems(seed, level, count);
    case "subtraction":
      return generateSubtractionProblems(seed, level, count);
    case "multiplication":
      return generateMultiplicationProblems(seed, level, count);
    case "division":
      return generateDivisionProblems(seed, level, count);
    case "patterns":
      return generatePatternProblems(seed, level, count);
  }
}

export interface WorksheetGenerationInput {
  childId: number;
  ageYears: number;
  learning: PlaygroundLearningState;
  category?: WorksheetCategory;
  /** Override seed for deterministic tests */
  seedOverride?: number;
}

export function generateWorksheet(input: WorksheetGenerationInput): GeneratedWorksheet {
  const category = pickWorksheetCategory(input.learning, input.ageYears, input.category);
  const breakdown = computeSkillBreakdown(input.learning);
  const mastery = masteryForCategory(breakdown, category);
  const tier = tierForWorksheet(input.learning, category);
  const level = selectWorksheetLevel(mastery, tier);
  const problemCount = PROBLEMS_BY_LEVEL[level];
  const seed =
    input.seedOverride ??
    dailySeed(input.childId) +
      category.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) +
      input.learning.sessionHistory.length;

  const focusSkills: (keyof SkillBreakdown)[] = [category];
  if (mastery < 60) {
    const secondary = (Object.keys(breakdown) as (keyof SkillBreakdown)[]).find(
      (k) => k !== category && breakdown[k] > 0 && breakdown[k] < mastery,
    );
    if (secondary) focusSkills.push(secondary);
  }

  const problems = generateProblems(category, seed, level, problemCount);

  return {
    id: `ws_${input.childId}_${category}_${seed}`,
    childId: input.childId,
    category,
    level,
    levelLabelKey: WORKSHEET_LEVEL_LABEL_KEYS[level],
    titleKey: TITLE_KEYS[category],
    difficultyLabelKey: WORKSHEET_LEVEL_LABEL_KEYS[level],
    focusSkills,
    problems,
    problemCount,
    adaptivityTier: tier,
    generatedAt: Date.now(),
    seed,
  };
}

/** Worksheet generation engine entry point. */
export const WorksheetGenerator = {
  generate: generateWorksheet,
};
