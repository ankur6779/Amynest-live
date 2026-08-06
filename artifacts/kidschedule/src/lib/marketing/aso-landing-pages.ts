/**
 * ASO-optimized landing page configurations for Play Store acquisition funnels.
 */

export type AsOLandingPageConfig = {
  slug: string;
  path: string;
  title: string;
  metaDescription: string;
  keywords: string;
  headline: string;
  headlineAccent: string;
  subheadline: string;
  heroImage: string;
  heroImageAlt: string;
  screenshotHeadline: string;
  benefits: { title: string; body: string }[];
  faqs: { question: string; answer: string }[];
  primaryKeyword: string;
};

export const ASO_LANDING_PAGES: AsOLandingPageConfig[] = [
  {
    slug: "amy",
    path: "/amy",
    title: "Meet AMY — Your AI Parenting Coach | AmyNest AI",
    metaDescription:
      "Meet AMY, your 24/7 AI parenting coach. Get personalized advice on routines, sleep, nutrition, speech, and learning — free on Google Play.",
    keywords:
      "AI parenting coach, AMY parenting assistant, smart parenting app, AI child development, parenting chatbot, global parenting app",
    headline: "Meet AMY — Your",
    headlineAccent: "AI Parenting Coach",
    subheadline:
      "Ask anything about routines, sleep, picky eating, speech, or school prep. AMY learns your family and gives practical answers — not generic blog posts.",
    heroImage: "/promo/get-app/screenshots/amy-coach.png",
    heroImageAlt: "AmyNest AMY AI parenting coach chat interface",
    screenshotHeadline: "24/7 parenting guidance tailored to your child",
    benefits: [
      {
        title: "Context-aware answers",
        body: "AMY knows your child's age, routines, and preferences — so advice fits your household, not a textbook.",
      },
      {
        title: "Covers the full parenting stack",
        body: "Infant care, toddler tantrums, school mornings, nutrition, speech practice, and study help in one conversation.",
      },
      {
        title: "Safe for families",
        body: "No ads shown to children. Privacy-first design built for modern families worldwide.",
      },
      {
        title: "Free to start",
        body: "Download on Google Play and chat with AMY today — upgrade when you want premium features.",
      },
    ],
    faqs: [
      {
        question: "What can I ask AMY?",
        answer:
          "Anything from 'why won't my toddler nap?' to 'help me plan a school morning routine' or 'speech practice ideas for a 4-year-old.' AMY adapts to your child's profile.",
      },
      {
        question: "Is AMY a replacement for a doctor?",
        answer:
          "No. AMY provides practical parenting guidance. Always consult your pediatrician for medical decisions.",
      },
      {
        question: "How do I get started?",
        answer:
          "Download AmyNest AI from Google Play, create a free account, and complete the 2-minute onboarding. AMY is ready on your dashboard.",
      },
    ],
    primaryKeyword: "AI parenting coach",
  },
  {
    slug: "parenting-app",
    path: "/parenting-app",
    title: "Best Parenting App for Modern Families | AmyNest AI",
    metaDescription:
      "AmyNest AI — the global all-in-one parenting app with AI coach AMY, daily routines, infant care, speech coach, nutrition, and study zone. Free on Google Play.",
    keywords:
      "parenting app, best parenting app, family organizer app, smart parenting, child development app, global parenting app",
    headline: "The Parenting App That",
    headlineAccent: "Grows With Your Child",
    subheadline:
      "From newborn feeds to school mornings — routines, nutrition, speech, learning, and an AI coach in one app parents actually use daily.",
    heroImage: "/promo/get-app/screenshots/ecosystem.png",
    heroImageAlt: "AmyNest parenting app ecosystem overview",
    screenshotHeadline: "One app for every parenting stage",
    benefits: [
      {
        title: "AI-powered daily routines",
        body: "Adaptive schedules that adjust to your child's age, energy, and feedback — not static templates.",
      },
      {
        title: "Infant to school-age",
        body: "Infant Hub, Speech Coach, Nutrition Hub, Study Zone, and rewards — all connected in one family dashboard.",
      },
      {
        title: "Built for families worldwide",
        body: "Multi-cuisine meal ideas, flexible school timings, and local context that adapts to your household — not a one-size-fits-all template.",
      },
      {
        title: "Trusted by growing families",
        body: "Join parents who switched from juggling 5 apps to one calm daily system.",
      },
    ],
    faqs: [
      {
        question: "What makes AmyNest different from other parenting apps?",
        answer:
          "AmyNest combines an AI coach (AMY) with actionable tools — routines you can complete, speech practice, meal planning, and progress tracking — not just articles.",
      },
      {
        question: "Is it free?",
        answer: "Yes. Core features are free. Premium unlocks advanced AI, unlimited routines, and family features.",
      },
      {
        question: "Available on Android?",
        answer: "Yes — download AmyNest AI on Google Play. iOS is also available on the App Store.",
      },
    ],
    primaryKeyword: "parenting app",
  },
  {
    slug: "speech-coach-app",
    path: "/speech-coach-app",
    title: "Speech Coach App for Kids — Pronunciation Practice | AmyNest",
    metaDescription:
      "Help your child speak clearly with Amy Speech Coach. AI pronunciation feedback, word drills, and conversation practice for toddlers through school age. Google Play.",
    keywords:
      "speech coach for kids, pronunciation app, toddler speech development, kids speaking practice, speech therapy at home",
    headline: "Speech Coach for Kids Who",
    headlineAccent: "Want to Be Heard",
    subheadline:
      "Guided pronunciation practice, word drills, and conversation coaching — with streaks and parent progress summaries.",
    heroImage: "/promo/get-app/screenshots/speech-coach.png",
    heroImageAlt: "AmyNest Speech Coach pronunciation practice for kids",
    screenshotHeadline: "Build clear speech with daily practice",
    benefits: [
      {
        title: "AI pronunciation feedback",
        body: "Your child hears words, practices speaking, and gets gentle corrections — like a patient coach at home.",
      },
      {
        title: "Age-appropriate drills",
        body: "From first words to school presentations — content adapts to your child's developmental stage.",
      },
      {
        title: "Streak motivation",
        body: "Daily practice streaks keep kids engaged without pressure or gamified addiction loops.",
      },
      {
        title: "Parent dashboard",
        body: "See progress, streak days, and areas to focus on — without sitting through every session.",
      },
    ],
    faqs: [
      {
        question: "Is this a replacement for speech therapy?",
        answer:
          "No. Amy Speech Coach supports home practice. Consult a speech-language pathologist for clinical needs.",
      },
      {
        question: "What age is it for?",
        answer: "Designed for toddlers through early school age (roughly 2–10 years), with content that scales by level.",
      },
      {
        question: "Does it work offline?",
        answer: "Core practice works with bundled audio. Full AI feedback requires an internet connection.",
      },
    ],
    primaryKeyword: "speech coach for kids",
  },
  {
    slug: "child-routine-planner",
    path: "/child-routine-planner",
    title: "Child Routine Planner — Daily Schedules for Kids | AmyNest AI",
    metaDescription:
      "Plan calm daily routines for your child with AmyNest. AI-generated schedules for wake, meals, play, learning, and bedtime — personalized by age. Free on Google Play.",
    keywords:
      "child routine planner, daily schedule for kids, toddler routine app, morning routine planner, bedtime routine app",
    headline: "Child Routine Planner for",
    headlineAccent: "Calmer Days",
    subheadline:
      "AI-built daily schedules that adapt to your feedback — wake windows, meals, learning blocks, and bedtime targets parents can actually follow.",
    heroImage: "/promo/get-app/screenshots/routines.png",
    heroImageAlt: "AmyNest child daily routine planner screen",
    screenshotHeadline: "Personalized routines that evolve with your child",
    benefits: [
      {
        title: "Age-smart templates",
        body: "Routines generated for your child's age band — infant wake windows to school morning flows.",
      },
      {
        title: "Learns what works",
        body: "Mark activities as 'worked well' or 'too tiring' and AmyNest adjusts tomorrow's plan.",
      },
      {
        title: "Visual timeline",
        body: "See the full day at a glance — no more mental load of remembering what's next.",
      },
      {
        title: "Multi-child support",
        body: "Separate routines per child with a unified family dashboard for busy households.",
      },
    ],
    faqs: [
      {
        question: "How is this different from a static schedule template?",
        answer:
          "AmyNest routines are AI-generated and adapt based on your feedback, child's age, and completed activities — they improve over time.",
      },
      {
        question: "Can I customize activities?",
        answer: "Yes. Edit, reorder, skip, or regenerate any routine item. You're always in control.",
      },
      {
        question: "Works for school mornings?",
        answer: "Absolutely — including dedicated school morning flow templates with prep checklists.",
      },
    ],
    primaryKeyword: "child routine planner",
  },
  {
    slug: "kids-nutrition-app",
    path: "/kids-nutrition-app",
    title: "Kids Nutrition Planner — Meal Plans & Tracking | AmyNest AI",
    metaDescription:
      "Plan balanced meals for picky eaters with AmyNest Nutrition Hub. Weekly meal plans, grocery lists, tiffin ideas, and daily nutrition tracking. Google Play.",
    keywords:
      "kids nutrition planner, meal plan for kids, picky eater app, child nutrition tracker, family meal planning, multi cuisine kids meals",
    headline: "Kids Nutrition Planner for",
    headlineAccent: "Real Families",
    subheadline:
      "Weekly meal plans, grocery lists, lunchbox ideas, and daily nutrition scoring — built for real kitchens and picky eaters worldwide.",
    heroImage: "/promo/get-app/screenshots/nutrition-hub.png",
    heroImageAlt: "AmyNest Nutrition Hub meal planning for kids",
    screenshotHeadline: "Meal plans that fit your kitchen",
    benefits: [
      {
        title: "Weekly meal plans",
        body: "Age-appropriate meal ideas with iron-rich foods, textures, and portions guidance matched to your family's cuisine.",
      },
      {
        title: "Grocery & lunchbox lists",
        body: "One-tap grocery lists and school lunch suggestions — stop reinventing lunch every morning.",
      },
      {
        title: "Daily nutrition score",
        body: "Track whether your child hit protein, veg, and hydration goals without calorie obsession.",
      },
      {
        title: "Achievement streaks",
        body: "Celebrate consistent nourishing weeks — motivation for parents, not pressure on kids.",
      },
    ],
    faqs: [
      {
        question: "Does it handle picky eaters?",
        answer:
          "Yes. Meal suggestions include texture transitions and familiar foods from your family's cuisine that picky eaters are more likely to accept.",
      },
      {
        question: "Is this medical nutrition advice?",
        answer:
          "AmyNest provides practical meal planning guidance. Consult your pediatrician for allergies, deficiencies, or medical diets.",
      },
      {
        question: "Can I share meal plans with caregivers?",
        answer: "Yes — generate shareable caregiver links so grandparents or nannies follow the same plan.",
      },
    ],
    primaryKeyword: "kids nutrition planner",
  },
];

export function getAsOLandingPage(pathOrSlug: string): AsOLandingPageConfig | undefined {
  const normalized = pathOrSlug.startsWith("/") ? pathOrSlug : `/${pathOrSlug}`;
  return ASO_LANDING_PAGES.find((p) => p.path === normalized || p.slug === pathOrSlug);
}

export function listAsOLandingPaths(): string[] {
  return ASO_LANDING_PAGES.map((p) => p.path);
}
