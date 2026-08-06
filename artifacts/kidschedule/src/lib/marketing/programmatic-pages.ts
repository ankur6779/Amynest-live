import type { GuideSection } from "@/lib/marketing/guides-content";

export type ProgrammaticPageConfig = {
  slug: string;
  path: string;
  title: string;
  metaDescription: string;
  keywords: string;
  h1: string;
  subheadline: string;
  sections: GuideSection[];
  faqs: { question: string; answer: string }[];
  breadcrumbs: { name: string; path: string }[];
  relatedFeatureSlug?: string;
  relatedGuideSlugs: string[];
  publishedAt: string;
};

function buildRoutinePage(age: number): ProgrammaticPageConfig {
  const slug = String(age);
  const path = `/routine-by-age/${slug}`;
  const wakeWindow =
    age <= 1 ? "45–75 minutes" : age <= 2 ? "2–3 hours" : age <= 4 ? "3–5 hours" : "5–7 hours";
  const napCount = age <= 1 ? "2–3 naps" : age <= 2 ? "1–2 naps" : age <= 4 ? "1 quiet rest" : "no nap most days";

  return {
    slug,
    path,
    title: `Daily Routine for ${age}-Year-Old Child | AmyNest AI`,
    metaDescription: `A practical daily routine template for ${age}-year-olds — wake windows (${wakeWindow}), meals, play, learning blocks, and bedtime targets parents can actually follow.`,
    keywords: `${age} year old daily routine, toddler schedule, child routine template, parenting routine planner`,
    h1: `Daily Routine Template for a ${age}-Year-Old`,
    subheadline: `Age-appropriate wake windows, meal timing, and calm transitions — built for real households worldwide.`,
    publishedAt: "2026-06-15",
    relatedFeatureSlug: age <= 3 ? "infant-care" : "daily-routines",
    relatedGuideSlugs: ["toddler-daily-routine-template", "school-morning-routine-checklist"],
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Routines by Age", path: "/guides" },
      { name: `${age} years`, path },
    ],
    sections: [
      {
        type: "paragraph",
        text: `At age ${age}, your child's energy rhythm matters more than a perfect clock. Use this template as a flexible scaffold — adjust ±30 minutes based on sleep quality, illness, or school days.`,
      },
      { type: "heading", text: "Morning anchor" },
      {
        type: "list",
        items: [
          "Consistent wake time within a 30-minute window.",
          `First meal within 60–90 minutes of waking.`,
          "One movement block (outdoor play or active indoor play).",
        ],
      },
      { type: "heading", text: "Day structure" },
      {
        type: "list",
        items: [
          `Typical wake window before rest: ${wakeWindow}.`,
          `Expected daytime rest: ${napCount}.`,
          "Learning or creative block (15–40 minutes depending on age).",
          "Screen time only after movement + meal (if any).",
        ],
      },
      { type: "heading", text: "Evening wind-down" },
      {
        type: "list",
        items: [
          "Dim lights and reduce stimulation 45–60 minutes before bed.",
          "Repeatable bedtime routine: wash, story, bed.",
          "Keep bedtime within the same 30-minute band nightly.",
        ],
      },
      {
        type: "paragraph",
        text: "AmyNest AI generates routines that adapt to your child's age, school schedule, and weekend patterns — so you spend less time planning and more time present.",
      },
    ],
    faqs: [
      {
        question: `How much sleep does a ${age}-year-old need?`,
        answer: `Most ${age}-year-olds thrive with roughly 10–13 hours in 24 hours including naps, but individual needs vary. Track patterns for two weeks before major schedule changes.`,
      },
      {
        question: "Should routines be identical on weekends?",
        answer: "Keep wake and bed within 60 minutes of weekday times. Flex activities, not sleep anchors — large shifts cause Monday meltdowns.",
      },
    ],
  };
}

function buildFeedingPage(months: number): ProgrammaticPageConfig {
  const slug = `${months}-months`;
  const path = `/feeding-plan/${slug}`;
  const texture =
    months <= 6 ? "smooth purees and breast/formula as primary" : months <= 8 ? "mashed textures + soft finger foods" : "family foods cut safely + self-feeding practice";

  return {
    slug,
    path,
    title: `Feeding Plan for ${months}-Month-Old Baby | AmyNest AI`,
    metaDescription: `Sample feeding plan for ${months}-month-olds — meal frequency, texture (${texture}), iron-rich foods, and hydration cues for families worldwide.`,
    keywords: `${months} month baby feeding schedule, infant meal plan, baby food by age, complementary feeding`,
    h1: `Feeding Plan for ${months}-Month-Olds`,
    subheadline: "Practical meal timing and food ideas — not medical prescriptions. Confirm allergies and portions with your pediatrician.",
    publishedAt: "2026-06-15",
    relatedFeatureSlug: "nutrition-hub",
    relatedGuideSlugs: ["newborn-feeding-log-basics", "picky-eater-strategies"],
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Feeding Plans", path: "/guides" },
      { name: `${months} months`, path },
    ],
    sections: [
      {
        type: "paragraph",
        text: `At ${months} months, feeding is part nutrition, part skill-building. This plan emphasizes responsive feeding — follow hunger cues, stop at fullness, and introduce variety gradually.`,
      },
      { type: "heading", text: "Daily rhythm" },
      {
        type: "list",
        items: [
          months <= 6 ? "5–8 milk feeds with gradual solids introduction." : "3 main meals + 1–2 snacks with milk feeds between.",
          "Offer iron-rich foods daily (lentils, egg, fortified cereal, green leafy vegetables).",
          `Texture target: ${texture}.`,
        ],
      },
      { type: "heading", text: "Sample first foods (adapt to your cuisine)" },
      {
        type: "list",
        items: [
          "Soft banana, stewed apple, well-cooked lentils or beans, soft rice, scrambled egg, avocado.",
          "Avoid honey under 12 months and whole nuts (choking hazard).",
          "Introduce one new food every 3–4 days to watch for reactions.",
        ],
      },
      {
        type: "paragraph",
        text: "AmyNest Nutrition Hub suggests age-appropriate multi-cuisine meal ideas and tracks what your child accepts — reducing repeated mealtime guesswork.",
      },
    ],
    faqs: [
      {
        question: `How many meals per day at ${months} months?`,
        answer: months <= 6
          ? "Start with one small solid meal and increase slowly while milk remains primary nutrition."
          : "Aim for three structured meals plus snacks; let appetite vary day to day.",
      },
      {
        question: "When should I worry about picky eating?",
        answer: "Brief refusals are normal. Consult your pediatrician if weight gain stalls, gagging increases, or your child refuses entire food groups for weeks.",
      },
    ],
  };
}

export const ROUTINE_BY_AGE_PAGES: ProgrammaticPageConfig[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
  buildRoutinePage,
);

export const FEEDING_PLAN_PAGES: ProgrammaticPageConfig[] = [6, 8, 10, 12].map(buildFeedingPage);

const ROUTINE_BY_SLUG = new Map(ROUTINE_BY_AGE_PAGES.map((page) => [page.slug, page]));
const FEEDING_BY_SLUG = new Map(FEEDING_PLAN_PAGES.map((page) => [page.slug, page]));

export function getRoutineByAgePage(slug: string): ProgrammaticPageConfig | undefined {
  return ROUTINE_BY_SLUG.get(slug);
}

export function getFeedingPlanPage(slug: string): ProgrammaticPageConfig | undefined {
  return FEEDING_BY_SLUG.get(slug);
}

export function listRoutineByAgeSlugs(): string[] {
  return ROUTINE_BY_AGE_PAGES.map((page) => page.slug);
}

export function listFeedingPlanSlugs(): string[] {
  return FEEDING_PLAN_PAGES.map((page) => page.slug);
}

export function listAllProgrammaticPages(): ProgrammaticPageConfig[] {
  return [...ROUTINE_BY_AGE_PAGES, ...FEEDING_PLAN_PAGES];
}
