import type { AgeBucket, MultiLang } from "./lesson-types.js";

export interface LessonSeries {
  id: string;
  title: MultiLang;
  description: MultiLang;
  emoji: string;
  ageBucket: AgeBucket;
  /** Ordered playlist — typically 3 parts (effort-controlled). */
  lessonIds: string[];
}

/** Curated 3-part series per age — reuses existing lessons, no new recordings. */
export const LESSON_SERIES: LessonSeries[] = [
  {
    id: "newborn-sleep",
    ageBucket: "0-2",
    emoji: "🌙",
    title: { en: "Newborn Sleep" },
    description: { en: "Why sleep is fragmented, safe setup, and evening fussiness." },
    lessonIds: [
      "infant-sleep-foundations",
      "infant-safe-sleep-environment",
      "infant-colic-soothing",
    ],
  },
  {
    id: "feeding-bonding",
    ageBucket: "0-2",
    emoji: "🍼",
    title: { en: "Feeding & Bonding" },
    description: { en: "Hunger cues, language, and tummy-time foundations." },
    lessonIds: [
      "infant-feeding-cues",
      "infant-bonding-language",
      "infant-tummy-time",
    ],
  },
  {
    id: "infant-health-safety",
    ageBucket: "0-2",
    emoji: "🩺",
    title: { en: "Health & Safety" },
    description: { en: "Milestones, vaccines, and when to call the doctor." },
    lessonIds: [
      "health-early-milestones",
      "infant-vaccines-well-visits",
      "infant-when-to-call-doctor",
    ],
  },
  {
    id: "toddler-tantrums",
    ageBucket: "2-4",
    emoji: "🌪️",
    title: { en: "Tantrums & Boundaries" },
    description: { en: "Meltdowns, the \"no\" phase, and hitting or biting." },
    lessonIds: [
      "toddler-tantrums-101",
      "toddler-no-phase",
      "toddler-hitting-biting",
    ],
  },
  {
    id: "toddler-meals-health",
    ageBucket: "2-4",
    emoji: "🥗",
    title: { en: "Meals & Healthy Habits" },
    description: { en: "Picky eating, hidden nutrition gaps, and dental care." },
    lessonIds: [
      "toddler-picky-eating",
      "health-hidden-nutrition-gaps",
      "health-dental-care",
    ],
  },
  {
    id: "toddler-daily-life",
    ageBucket: "2-4",
    emoji: "🏠",
    title: { en: "Daily Routines" },
    description: { en: "Potty readiness, transitions, and daycare adjustment." },
    lessonIds: [
      "toddler-potty-readiness",
      "toddler-routines-transitions",
      "toddler-daycare-transition",
    ],
  },
  {
    id: "toddler-screens-immunity",
    ageBucket: "2-4",
    emoji: "📺",
    title: { en: "Screens, Immunity & Smiles" },
    description: { en: "Screen limits under 5, immunity myths, and cavity-free habits." },
    lessonIds: [
      "toddler-screen-time",
      "health-immunity-truth",
      "health-dental-care",
    ],
  },
  {
    id: "school-emotions",
    ageBucket: "5-7",
    emoji: "💛",
    title: { en: "Feelings & Friendships" },
    description: { en: "Regulation, friends, and sibling rivalry." },
    lessonIds: [
      "early-school-emotional-regulation",
      "early-school-friendship",
      "early-school-sibling-rivalry",
    ],
  },
  {
    id: "school-learning",
    ageBucket: "5-7",
    emoji: "📚",
    title: { en: "School & Learning" },
    description: { en: "Homework habits, growth mindset, and exam worry." },
    lessonIds: [
      "early-school-homework",
      "early-school-growth-mindset",
      "early-school-exam-anxiety",
    ],
  },
  {
    id: "school-tough-topics",
    ageBucket: "5-7",
    emoji: "🛡️",
    title: { en: "Tough Topics" },
    description: { en: "Bullying, lying, and healthy weight conversations." },
    lessonIds: [
      "early-school-bullying",
      "early-school-lying",
      "health-childhood-obesity",
    ],
  },
  {
    id: "school-digital-body-health",
    ageBucket: "5-7",
    emoji: "👀",
    title: { en: "Digital Health & School Stress" },
    description: { en: "Eyes and posture, exam worry, and a healthy weight mindset." },
    lessonIds: [
      "health-digital-eyes-posture",
      "early-school-exam-anxiety",
      "health-childhood-obesity",
    ],
  },
  {
    id: "tween-growing-up",
    ageBucket: "8-10",
    emoji: "🌱",
    title: { en: "Growing Up" },
    description: { en: "Independence, puberty basics, and real conversations." },
    lessonIds: [
      "tween-independence",
      "tween-puberty-basics",
      "tween-talking-to-them",
    ],
  },
  {
    id: "tween-family-peers",
    ageBucket: "8-10",
    emoji: "👫",
    title: { en: "Peers & Family" },
    description: { en: "Sibling fights, cyberbullying, and pocket money." },
    lessonIds: [
      "tween-sibling-fights",
      "tween-cyberbullying",
      "tween-pocket-money",
    ],
  },
  {
    id: "tween-screens-school",
    ageBucket: "8-10",
    emoji: "📱",
    title: { en: "Screens & School Stress" },
    description: { en: "Screen balance, exam pressure, and building independence." },
    lessonIds: [
      "tween-screen-balance",
      "tween-exam-stress",
      "tween-independence",
    ],
  },
  {
    id: "teen-understanding",
    ageBucket: "10+",
    emoji: "🧠",
    title: { en: "Understanding Your Teen" },
    description: { en: "Teen brain, staying connected, and repairing after fights." },
    lessonIds: [
      "teen-brain-101",
      "teen-staying-connected",
      "teen-parent-teen-repair",
    ],
  },
  {
    id: "teen-digital-safety",
    ageBucket: "10+",
    emoji: "🔒",
    title: { en: "Digital Life & Safety" },
    description: { en: "Social media, consent, and substance awareness." },
    lessonIds: [
      "teen-social-media",
      "teen-consent-boundaries",
      "teen-substance-awareness",
    ],
  },
  {
    id: "teen-stress-mental-health",
    ageBucket: "10+",
    emoji: "💚",
    title: { en: "Stress & Mental Health" },
    description: { en: "Board exams, warning signs, and repairing after conflict." },
    lessonIds: [
      "teen-exam-boards-stress",
      "teen-mental-health-signs",
      "teen-parent-teen-repair",
    ],
  },
];
