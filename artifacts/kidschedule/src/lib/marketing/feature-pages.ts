export type FeaturePageConfig = {
  slug: string;
  title: string;
  metaDescription: string;
  keywords: string;
  headline: string;
  headlineAccent: string;
  subheadline: string;
  heroImage: string;
  heroImageAlt: string;
  benefits: { title: string; body: string }[];
  faqs: { question: string; answer: string }[];
  relatedGuideSlugs: string[];
};

export const FEATURE_PAGES: FeaturePageConfig[] = [
  {
    slug: "infant-care",
    title: "Infant Parenting Hub — Baby Care Guidance | AmyNest AI",
    metaDescription:
      "Track feeds, sleep, growth, vaccines, and cry patterns with AmyNest Infant Hub. AI-powered baby care guidance for new parents from birth to 12 months.",
    keywords:
      "infant care app, baby tracker, newborn sleep schedule, baby feeding log, vaccine reminder app, cry analysis parenting",
    headline: "Confident Baby Care From",
    headlineAccent: "Day One",
    subheadline:
      "Log feeds, sleep, diapers, and milestones. Get cry insights, growth charts, and vaccine reminders — all in one infant parenting hub built for tired new parents.",
    heroImage: "/promo/get-app/screenshots/infant-hub.jpg",
    heroImageAlt: "AmyNest Infant Parenting Hub showing baby today dashboard",
    benefits: [
      {
        title: "Cry insight & soothing tips",
        body: "Understand what your baby might need with guided cry analysis and calm, practical next steps.",
      },
      {
        title: "Sleep & feed tracking",
        body: "See patterns across naps, night wakes, and feeds without juggling five different apps.",
      },
      {
        title: "Growth & vaccine timeline",
        body: "Track height, weight, and immunization schedules with reminders you can share with your pediatrician.",
      },
      {
        title: "Weekly share for co-parents",
        body: "Send a simple weekly summary so partners, grandparents, or caregivers stay aligned.",
      },
    ],
    faqs: [
      {
        question: "What age range does the Infant Hub cover?",
        answer:
          "AmyNest Infant Hub is designed for newborns through 12 months, with guidance that adapts as your baby grows week by week.",
      },
      {
        question: "Can I log feeds and sleep quickly?",
        answer:
          "Yes. One-tap logging for feeds, sleep, diapers, and tummy time keeps tracking fast even during middle-of-the-night wake-ups.",
      },
      {
        question: "Is infant data private?",
        answer:
          "Your family's data stays in your account. AmyNest does not show ads to children and follows a privacy-first approach.",
      },
    ],
    relatedGuideSlugs: ["baby-sleep-schedule-by-age", "newborn-feeding-log-basics"],
  },
  {
    slug: "speech-coach",
    title: "Speech Coach for Kids — Pronunciation Practice | AmyNest AI",
    metaDescription:
      "Help your child speak clearly with Amy Speech Coach. AI pronunciation feedback, word practice, and conversation drills for toddlers through school age.",
    keywords:
      "speech coach app for kids, pronunciation practice, speech therapy at home, toddler speech development, kids speaking app",
    headline: "Build Clear Speech With",
    headlineAccent: "Amy Speech Coach",
    subheadline:
      "Interactive pronunciation practice, word drills, and conversation coaching — designed for parents who want confident speakers, not hours of searching.",
    heroImage: "/promo/get-app/screenshots/speech-coach.png",
    heroImageAlt: "AmyNest Speech Coach pronunciation practice screen",
    benefits: [
      {
        title: "Pronunciation feedback",
        body: "Your child hears words, repeats them, and gets gentle AI feedback on clarity and effort.",
      },
      {
        title: "Age-appropriate word lists",
        body: "Practice sets adapt to toddlers, preschoolers, and early readers so sessions stay engaging.",
      },
      {
        title: "Conversation drills",
        body: "Short speaking exercises build confidence for shy talkers and early language learners.",
      },
      {
        title: "Progress you can see",
        body: "Track sessions over time and celebrate small wins that add up to real fluency.",
      },
    ],
    faqs: [
      {
        question: "Is Amy Speech Coach a replacement for speech therapy?",
        answer:
          "No. It is a daily practice companion for families. If your child has a clinical speech delay, work with a licensed speech-language pathologist alongside the app.",
      },
      {
        question: "What ages is Speech Coach for?",
        answer:
          "Speech Coach works best for children roughly 2–10 years old, with content that scales from first words to early reading vocabulary.",
      },
      {
        question: "Does it work on phone and tablet?",
        answer:
          "Yes. AmyNest runs on Android, iOS, and web — use whichever device your child is most comfortable speaking into.",
      },
    ],
    relatedGuideSlugs: ["speech-development-at-home", "toddler-daily-routine-template"],
  },
  {
    slug: "daily-routines",
    title: "AI Daily Routine Generator for Kids | AmyNest AI",
    metaDescription:
      "Create personalized daily routines for your child in seconds. AI plans wake-up, meals, study, play, and bedtime based on age, school schedule, and your goals.",
    keywords:
      "kids daily routine app, AI routine generator, toddler schedule planner, after school routine, bedtime routine app, parenting schedule",
    headline: "Personalized Daily Routines in",
    headlineAccent: "Minutes, Not Hours",
    subheadline:
      "Tell AmyNest about your child — age, school timing, and what you want to focus on — and get a ready-to-use daily plan with rewards that kids actually follow.",
    heroImage: "/promo/get-app/screenshots/daily-routine.jpg",
    heroImageAlt: "AmyNest AI daily routine generator dashboard",
    benefits: [
      {
        title: "AI-generated day plans",
        body: "Wake-up, meals, study blocks, chores, play, and bedtime — structured for your child's age and your family's rhythm.",
      },
      {
        title: "Today & tomorrow views",
        body: "Switch days without losing context. Regenerate when plans change or moods shift.",
      },
      {
        title: "Reward points kids love",
        body: "Task completion earns points that turn cooperation into a habit, not a negotiation.",
      },
      {
        title: "Multi-child support",
        body: "Manage routines for siblings from one parent dashboard without duplicate work.",
      },
    ],
    faqs: [
      {
        question: "How is AmyNest different from a paper schedule?",
        answer:
          "AmyNest adapts when school times, weekends, or your availability change. You edit or regenerate instead of rewriting everything from scratch.",
      },
      {
        question: "Can kids see their own routine?",
        answer:
          "Yes. Children get a clear, visual plan so they know what comes next — reducing the constant 'what should I do now?' questions.",
      },
      {
        question: "Does it handle weekends and school days differently?",
        answer:
          "AmyNest detects school-day vs weekend patterns and adjusts activity blocks automatically.",
      },
    ],
    relatedGuideSlugs: ["toddler-daily-routine-template", "school-morning-routine-checklist"],
  },
  {
    slug: "study-zone",
    title: "Smart Study Zone — Phonics, Spelling & Math | AmyNest AI",
    metaDescription:
      "AmyNest Smart Study Zone combines phonics, spelling mastery, abacus, and worksheets in one learning hub. Adaptive practice for ages 4–10+.",
    keywords:
      "kids learning app, phonics app, spelling practice, abacus for children, study zone app, homework help app",
    headline: "Learning That Fits",
    headlineAccent: "Your Child's Pace",
    subheadline:
      "Phonics, spelling, abacus, worksheets, and discovery worlds — one study hub that adapts to what your child is ready for next.",
    heroImage: "/promo/get-app/screenshots/smart-study-zone.jpg",
    heroImageAlt: "AmyNest Smart Study Zone learning dashboard",
    benefits: [
      {
        title: "Phonics & spelling mastery",
        body: "Structured practice paths from letter sounds to grade-level spelling with audio support.",
      },
      {
        title: "Abacus & mental math",
        body: "Visual math drills that build number sense without turning homework into a battle.",
      },
      {
        title: "Printable worksheets",
        body: "Download and complete offline when screen time needs a break.",
      },
      {
        title: "Progress tracking",
        body: "See streaks, completed levels, and areas that need a little extra attention.",
      },
    ],
    faqs: [
      {
        question: "What grades does Study Zone cover?",
        answer:
          "Study Zone supports early learners through roughly age 10+, with content paths for pre-readers up through upper elementary skills.",
      },
      {
        question: "Is content aligned to school?",
        answer:
          "Practice sets cover foundational literacy and numeracy skills used in most curricula. You can focus on what your child's teacher recommends.",
      },
      {
        question: "Can I limit daily study time?",
        answer:
          "Yes. Parents control session length and which modules are available from the parent dashboard.",
      },
    ],
    relatedGuideSlugs: ["speech-development-at-home", "screen-time-and-learning-balance"],
  },
  {
    slug: "nutrition-hub",
    title: "Kids Nutrition Hub — Meal Plans & Recipes | AmyNest AI",
    metaDescription:
      "Age-appropriate meal ideas, Indian family-friendly recipes, and picky-eater strategies in AmyNest Nutrition Hub. Plan better meals with less daily stress.",
    keywords:
      "kids meal planner, toddler meal ideas, picky eater app, child nutrition app, family meal planning, Indian kids recipes",
    headline: "Better Meals, Less",
    headlineAccent: "Daily Guesswork",
    subheadline:
      "Get age-appropriate meal suggestions, recipe ideas, and picky-eater tips woven into your family's daily routine — not another Pinterest board you'll never open.",
    heroImage: "/promo/social/reels/nutrition-hub.png",
    heroImageAlt: "AmyNest Nutrition Hub meal planning screen",
    benefits: [
      {
        title: "Age-based meal suggestions",
        body: "Breakfast, lunch, snack, and dinner ideas matched to your child's stage and appetite.",
      },
      {
        title: "Family-friendly recipes",
        body: "Practical dishes parents actually cook — including options common in Indian households.",
      },
      {
        title: "Picky-eater strategies",
        body: "Gentle guidance for texture issues, food refusals, and stress-free mealtimes.",
      },
      {
        title: "Routine integration",
        body: "Meals appear in your child's daily plan so nutrition and schedule stay connected.",
      },
    ],
    faqs: [
      {
        question: "Does Nutrition Hub replace a dietitian?",
        answer:
          "No. It offers everyday meal inspiration and parenting strategies. For medical nutrition needs, consult a pediatric dietitian or your doctor.",
      },
      {
        question: "Can I customize for allergies?",
        answer:
          "You can note dietary preferences and restrictions in your child's profile so suggestions stay relevant.",
      },
      {
        question: "Are recipes quick enough for weeknights?",
        answer:
          "Most suggestions prioritize 20–30 minute meals busy parents can actually make after work.",
      },
    ],
    relatedGuideSlugs: ["picky-eater-strategies", "toddler-daily-routine-template"],
  },
];

const FEATURE_BY_SLUG = new Map(FEATURE_PAGES.map((page) => [page.slug, page]));

export function getFeaturePage(slug: string): FeaturePageConfig | undefined {
  return FEATURE_BY_SLUG.get(slug);
}

export function listFeaturePageSlugs(): string[] {
  return FEATURE_PAGES.map((page) => page.slug);
}
