/**
 * Deterministic golden evaluation scenarios across age bands and question types.
 */

import type { GoldenScenario } from "./types.js";

export const GOLDEN_SCENARIOS: GoldenScenario[] = [
  {
    id: "newborn_sleep",
    category: "newborn",
    label: "Newborn sleep guidance",
    astronomy: {
      sunSign: "Cancer",
      moonSign: "Taurus",
      risingSign: "Pisces",
      planetHouseMap: { sun: 4, moon: 2 },
    },
    ageMonths: 3,
    parentGoals: ["better_sleep"],
    routines: [{ kind: "sleep" }, { kind: "wind_down" }],
    userQuestion: "How can I support better sleep and bedtime for my baby?",
    entryPoint: "reflect",
    expectedIntent: "sleep_guidance",
    requiredAvoidTopics: ["fatalistic_prediction", "medical_diagnosis"],
  },
  {
    id: "toddler_behaviour",
    category: "toddler",
    label: "Toddler behaviour support",
    astronomy: {
      sunSign: "Aries",
      moonSign: "Leo",
      risingSign: "Sagittarius",
      planetHouseMap: { sun: 1, moon: 5 },
    },
    ageMonths: 28,
    parentGoals: ["self_regulation", "emotional_resilience"],
    routines: [{ kind: "play" }, { kind: "meal" }],
    userQuestion: "Help with tantrums and behaviour boundaries at home",
    entryPoint: "reflect",
    expectedIntent: "behaviour_guidance",
    requiredAvoidTopics: ["fear_based_framing", "medical_diagnosis"],
  },
  {
    id: "preschool_learning",
    category: "preschool",
    label: "Preschool learning habits",
    astronomy: {
      sunSign: "Gemini",
      moonSign: "Virgo",
      risingSign: "Libra",
      planetHouseMap: { sun: 3, moon: 6 },
    },
    ageMonths: 48,
    parentGoals: ["learning_habits", "better_focus"],
    routines: [{ kind: "reading" }, { kind: "play" }, { kind: "outdoor" }],
    adaptiveHistory: {
      sessionFrequency: { sessionsPerWeek: 4, avgSessionMinutes: 12 },
      activities: [
        { type: "reading", completed: 5, repeated: 2 },
        { type: "play", completed: 6, skipped: 1 },
      ],
      parentFeedback: [{ signal: "child_enjoyed", targetType: "reading", count: 2 }],
    },
    userQuestion: "How can I support learning and focus before school?",
    entryPoint: "sky",
    expectedIntent: "learning_guidance",
  },
  {
    id: "school_age_routine",
    category: "school_age",
    label: "School-age routine help",
    astronomy: {
      sunSign: "Capricorn",
      moonSign: "Scorpio",
      risingSign: "Virgo",
      planetHouseMap: { sun: 10, moon: 8 },
    },
    ageMonths: 84,
    parentGoals: ["learning_habits", "better_focus"],
    routines: [{ kind: "morning" }, { kind: "focus" }, { kind: "sleep" }],
    adaptiveHistory: {
      sessionFrequency: { sessionsPerWeek: 5, avgSessionMinutes: 18 },
      completedRoutines: [
        { kind: "focus", count: 8 },
        { kind: "sleep", count: 10 },
      ],
      skippedRoutines: [{ kind: "focus", count: 2 }],
      activities: [{ type: "focus", completed: 8, skipped: 2, repeated: 3 }],
    },
    userQuestion: "Help fix our morning routine schedule and daily transitions",
    entryPoint: "sky",
    expectedIntent: "routine_help",
  },
  {
    id: "teen_emotional",
    category: "teen",
    label: "Teen emotional support",
    astronomy: {
      sunSign: "Aquarius",
      moonSign: "Pisces",
      risingSign: "Scorpio",
      planetHouseMap: { sun: 11, moon: 12 },
    },
    ageMonths: 168,
    parentGoals: ["emotional_resilience", "communication"],
    routines: [{ kind: "wind_down" }, { kind: "social" }],
    userQuestion: "They seem overwhelmed and anxious — how can I offer emotional support?",
    entryPoint: "reflect",
    expectedIntent: "emotional_support",
    requiredAvoidTopics: ["deterministic_future", "medical_diagnosis"],
  },
  {
    id: "routine_question",
    category: "routine",
    label: "Generic routine question",
    astronomy: {
      sunSign: "Taurus",
      moonSign: "Cancer",
      risingSign: "Virgo",
    },
    ageMonths: 60,
    parentGoals: ["better_sleep"],
    routines: [{ kind: "sleep" }],
    userQuestion: "What routine habits should we keep consistent?",
    entryPoint: "sky",
    expectedIntent: "routine_help",
  },
  {
    id: "sleep_question",
    category: "sleep",
    label: "Sleep-focused question",
    astronomy: {
      sunSign: "Pisces",
      moonSign: "Cancer",
      risingSign: "Taurus",
    },
    ageMonths: 36,
    parentGoals: ["better_sleep"],
    userQuestion: "Night waking is hard — any sleep guidance for bedtime?",
    entryPoint: "reflect",
    expectedIntent: "sleep_guidance",
  },
  {
    id: "behaviour_question",
    category: "behaviour",
    label: "Behaviour-focused question",
    astronomy: {
      sunSign: "Leo",
      moonSign: "Aries",
      risingSign: "Sagittarius",
    },
    ageMonths: 54,
    parentGoals: ["self_regulation"],
    userQuestion: "How do I respond when they act out and push boundaries?",
    entryPoint: "reflect",
    expectedIntent: "behaviour_guidance",
  },
  {
    id: "astrology_question",
    category: "astrology",
    label: "Astrology insight question",
    astronomy: {
      sunSign: "Leo",
      moonSign: "Cancer",
      risingSign: "Scorpio",
      planetHouseMap: { sun: 5, moon: 4 },
    },
    ageMonths: 72,
    userQuestion: "What stands out in their Sun Moon Rising sky chart?",
    entryPoint: "sky",
    expectedIntent: "astrology_insight",
    requiredAvoidTopics: ["fatalistic_prediction", "deterministic_future"],
  },
];

export function getScenarioById(id: string): GoldenScenario | undefined {
  return GOLDEN_SCENARIOS.find((s) => s.id === id);
}

export function listScenarioIds(): string[] {
  return GOLDEN_SCENARIOS.map((s) => s.id);
}
