import type { DifficultyLevel } from "../types.js";

/** Age bands aligned with Life Skills / Parent Hub (years). */
export type LearnAmyAgeGroup = "toddler" | "preschool" | "kid" | "teen";

export type BankQuestion = {
  id: string;
  topic: string;
  difficulty: DifficultyLevel;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
};

export function resolveLearnAmyAgeGroup(ageYears: number): LearnAmyAgeGroup {
  if (ageYears <= 4) return "toddler";
  if (ageYears <= 6) return "preschool";
  if (ageYears <= 10) return "kid";
  return "teen";
}

export const LEARN_AMY_QUESTION_BANK: Record<LearnAmyAgeGroup, BankQuestion[]> = {
  toddler: [
    {
      id: "t_phonics_a",
      topic: "phonics",
      difficulty: "easy",
      prompt: "What sound does the letter A make?",
      options: ["Ah", "Eh", "Oh", "Mmm"],
      correctIndex: 0,
    },
    {
      id: "t_colors_red",
      topic: "cognitive",
      difficulty: "easy",
      prompt: "Which color is an apple usually?",
      options: ["Red", "Blue", "Green", "Purple"],
      correctIndex: 0,
    },
    {
      id: "t_count_2",
      topic: "cognitive",
      difficulty: "easy",
      prompt: "How many eyes do you have?",
      options: ["Two", "One", "Four", "Ten"],
      correctIndex: 0,
    },
    {
      id: "t_animals_moo",
      topic: "cognitive",
      difficulty: "easy",
      prompt: "What sound does a cow make?",
      options: ["Moo", "Woof", "Meow", "Quack"],
      correctIndex: 0,
    },
    {
      id: "t_shapes_circle",
      topic: "cognitive",
      difficulty: "medium",
      prompt: "Which shape is round like a ball?",
      options: ["Circle", "Square", "Triangle", "Star"],
      correctIndex: 0,
    },
    {
      id: "t_motor_clap",
      topic: "motor_skills",
      difficulty: "easy",
      prompt: "Can you clap your hands?",
      options: ["Yes, clap clap!", "I hop instead", "I whisper", "I sleep"],
      correctIndex: 0,
    },
    {
      id: "t_big_small",
      topic: "cognitive",
      difficulty: "medium",
      prompt: "Which animal is bigger: elephant or mouse?",
      options: ["Elephant", "Mouse", "Both same", "Neither"],
      correctIndex: 0,
    },
    {
      id: "t_phonics_b",
      topic: "phonics",
      difficulty: "medium",
      prompt: "Which word starts with the B sound?",
      options: ["Ball", "Cat", "Sun", "Fish"],
      correctIndex: 0,
    },
  ],
  preschool: [
    {
      id: "p_phonics_a",
      topic: "phonics",
      difficulty: "easy",
      prompt: "What sound does the letter A make?",
      options: ["Ah", "Buh", "Sss", "Tuh"],
      correctIndex: 0,
    },
    {
      id: "p_rhyme_cat",
      topic: "phonics",
      difficulty: "medium",
      prompt: "Which word rhymes with cat?",
      options: ["Hat", "Dog", "Tree", "Cup"],
      correctIndex: 0,
    },
    {
      id: "p_count_fingers",
      topic: "cognitive",
      difficulty: "easy",
      prompt: "How many fingers on one hand?",
      options: ["Five", "Three", "Eight", "Two"],
      correctIndex: 0,
    },
    {
      id: "p_seasons_sun",
      topic: "cognitive",
      difficulty: "medium",
      prompt: "When do we wear shorts and play outside a lot?",
      options: ["Summer", "Winter", "Only at night", "Never"],
      correctIndex: 0,
    },
    {
      id: "p_blend_cat",
      topic: "phonics",
      difficulty: "hard",
      prompt: "Which word is C-A-T blended together?",
      options: ["Cat", "Car", "Cap", "Can"],
      correctIndex: 0,
    },
    {
      id: "p_motor_hop",
      topic: "motor_skills",
      difficulty: "medium",
      prompt: "What do you do when you jump on one foot?",
      options: ["Hop", "Sleep", "Whisper", "Draw"],
      correctIndex: 0,
    },
    {
      id: "p_pattern_red",
      topic: "cognitive",
      difficulty: "medium",
      prompt: "What comes next: red, blue, red, blue, ___?",
      options: ["Red", "Green", "Yellow", "Pink"],
      correctIndex: 0,
    },
    {
      id: "p_phonics_start_b",
      topic: "phonics",
      difficulty: "medium",
      prompt: "Which word starts with the B sound: ball or cat?",
      options: ["Ball", "Cat", "Sun", "Map"],
      correctIndex: 0,
    },
  ],
  kid: [
    {
      id: "k_math_add",
      topic: "cognitive",
      difficulty: "easy",
      prompt: "What is 2 + 3?",
      options: ["5", "4", "6", "23"],
      correctIndex: 0,
    },
    {
      id: "k_phonics_vowel",
      topic: "phonics",
      difficulty: "medium",
      prompt: "Which word has a short A vowel sound?",
      options: ["Cat", "Cake", "Team", "Bike"],
      correctIndex: 0,
    },
    {
      id: "k_science_plants",
      topic: "cognitive",
      difficulty: "medium",
      prompt: "What do plants need from the sun?",
      options: ["Light", "Shoes", "Music", "Paint"],
      correctIndex: 0,
    },
    {
      id: "k_logic_next",
      topic: "cognitive",
      difficulty: "medium",
      prompt: "What comes next: 2, 4, 6, ___?",
      options: ["8", "7", "5", "10"],
      correctIndex: 0,
    },
    {
      id: "k_grammar_noun",
      topic: "cognitive",
      difficulty: "hard",
      prompt: "Which word is a person, place, or thing (a noun)?",
      options: ["School", "Run", "Quickly", "Happy"],
      correctIndex: 0,
    },
    {
      id: "k_math_multiply",
      topic: "cognitive",
      difficulty: "hard",
      prompt: "What is 3 × 4?",
      options: ["12", "7", "34", "9"],
      correctIndex: 0,
    },
    {
      id: "k_geography_capital",
      topic: "cognitive",
      difficulty: "medium",
      prompt: "Which is a country (not a city street)?",
      options: ["India", "Main Street", "Bedroom", "Playground"],
      correctIndex: 0,
    },
    {
      id: "k_phonics_blend",
      topic: "phonics",
      difficulty: "hard",
      prompt: "Can you blend the sounds in C-A-T?",
      options: ["Cat", "Cut", "Kit", "Coat"],
      correctIndex: 0,
    },
  ],
  teen: [
    {
      id: "tn_fraction_half",
      topic: "cognitive",
      difficulty: "easy",
      prompt: "What is half of 10?",
      options: ["5", "2", "8", "20"],
      correctIndex: 0,
    },
    {
      id: "tn_grammar_verb",
      topic: "cognitive",
      difficulty: "medium",
      prompt: "Which word is a verb (an action)?",
      options: ["Jump", "Table", "Blue", "Happiness"],
      correctIndex: 0,
    },
    {
      id: "tn_science_water",
      topic: "cognitive",
      difficulty: "medium",
      prompt: "What is H₂O commonly called?",
      options: ["Water", "Air", "Sand", "Light"],
      correctIndex: 0,
    },
    {
      id: "tn_logic_percent",
      topic: "cognitive",
      difficulty: "hard",
      prompt: "What is 50% of 20?",
      options: ["10", "5", "15", "25"],
      correctIndex: 0,
    },
    {
      id: "tn_geography_continent",
      topic: "cognitive",
      difficulty: "medium",
      prompt: "Which is a continent?",
      options: ["Asia", "Pacific Ocean", "Sahara", "Mount Everest"],
      correctIndex: 0,
    },
    {
      id: "tn_reading_main_idea",
      topic: "cognitive",
      difficulty: "hard",
      prompt: "If a paragraph is about how bees make honey, the main idea is about…",
      options: ["Bees and honey", "Cars and roads", "Winter clothes", "Video games"],
      correctIndex: 0,
    },
    {
      id: "tn_math_ratio",
      topic: "cognitive",
      difficulty: "hard",
      prompt: "If you split 12 stickers equally among 3 friends, each gets…",
      options: ["4", "3", "6", "9"],
      correctIndex: 0,
    },
    {
      id: "tn_critical_bias",
      topic: "cognitive",
      difficulty: "medium",
      prompt: "When checking a fact online, what helps most?",
      options: ["Use trusted sources", "Pick the first guess", "Ignore dates", "Share without reading"],
      correctIndex: 0,
    },
  ],
};

export function pickBankQuestion(args: {
  ageYears: number;
  topic: string;
  moduleId: string;
  difficulty: DifficultyLevel;
  excludeIds?: string[];
}): BankQuestion {
  const group = resolveLearnAmyAgeGroup(args.ageYears);
  const pool = LEARN_AMY_QUESTION_BANK[group];
  const topicKey = args.moduleId in TOPIC_ALIASES ? args.moduleId : args.topic;
  const normalizedTopic =
    topicKey === "learning" || !topicKey ? "phonics" : topicKey.toLowerCase();

  let candidates = pool.filter((q) => {
    if (args.excludeIds?.includes(q.id)) return false;
    if (q.difficulty !== args.difficulty) return false;
    return q.topic === normalizedTopic || normalizedTopic === "learning";
  });

  if (candidates.length === 0) {
    candidates = pool.filter(
      (q) => q.difficulty === args.difficulty && !args.excludeIds?.includes(q.id),
    );
  }
  if (candidates.length === 0) {
    candidates = pool.filter((q) => !args.excludeIds?.includes(q.id));
  }
  if (candidates.length === 0) {
    return pool[0]!;
  }

  return candidates[Math.floor(Math.random() * candidates.length)]!;
}

const TOPIC_ALIASES: Record<string, string> = {
  phonics: "phonics",
  motor_skills: "motor_skills",
  cognitive: "cognitive",
};
