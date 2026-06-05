export type GuideSection =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] };

export type GuideArticle = {
  slug: string;
  title: string;
  metaDescription: string;
  keywords: string;
  publishedAt: string;
  readMinutes: number;
  excerpt: string;
  relatedFeatureSlug?: string;
  sections: GuideSection[];
};

export const GUIDE_ARTICLES: GuideArticle[] = [
  {
    slug: "baby-sleep-schedule-by-age",
    title: "Baby Sleep Schedule by Age: A Practical Parent Guide",
    metaDescription:
      "Learn realistic wake windows, nap counts, and bedtime targets from newborn to 12 months. A science-informed sleep schedule guide for busy parents.",
    keywords:
      "baby sleep schedule by age, newborn wake windows, infant nap schedule, 4 month sleep regression, baby bedtime routine",
    publishedAt: "2026-06-05",
    readMinutes: 8,
    excerpt:
      "Sleep changes fast in the first year. Use age-based wake windows and flexible routines instead of rigid clocks.",
    relatedFeatureSlug: "infant-care",
    sections: [
      {
        type: "paragraph",
        text: "New parents are told to 'sleep when the baby sleeps,' but nobody explains how much sleep is normal at each stage — or why yesterday's perfect schedule stops working overnight. The truth: infant sleep is developmental, not a fixed timetable.",
      },
      { type: "heading", text: "Newborn to 8 weeks (0–2 months)" },
      {
        type: "list",
        items: [
          "Total sleep: roughly 14–17 hours in 24 hours, in short stretches.",
          "Wake windows: 45–60 minutes between naps early on, stretching toward 60–75 minutes by week 8.",
          "Night feeds are normal every 2–4 hours; focus on safe sleep (back, firm surface, no loose bedding).",
        ],
      },
      { type: "heading", text: "2–4 months" },
      {
        type: "list",
        items: [
          "Wake windows: about 75–90 minutes.",
          "Many babies take 4–5 naps; total daytime sleep often 4–5 hours.",
          "The '4-month regression' is often a permanent shift toward adult-like sleep cycles — consistency helps.",
        ],
      },
      { type: "heading", text: "4–6 months" },
      {
        type: "list",
        items: [
          "Wake windows: 1.5–2 hours.",
          "Naps often consolidate to 3–4; some babies sleep longer stretches at night if daytime sleep is adequate.",
          "Watch for overtired cues: fussiness, arching, difficulty settling.",
        ],
      },
      { type: "heading", text: "6–12 months" },
      {
        type: "list",
        items: [
          "Wake windows: 2–3.5 hours depending on age.",
          "Most babies move to 2–3 naps, then 2 naps, then 1 nap around 12–18 months.",
          "A simple bedtime routine (feed, bath, book, bed) signals the brain that sleep is coming.",
        ],
      },
      { type: "heading", text: "How AmyNest helps" },
      {
        type: "paragraph",
        text: "AmyNest Infant Hub lets you log naps and night wakes so you spot patterns instead of guessing. Combined with AI routine planning, you can align family meals and play around realistic sleep blocks — and adjust when growth spurts or teething disrupt the plan.",
      },
    ],
  },
  {
    slug: "newborn-feeding-log-basics",
    title: "Newborn Feeding Log Basics: What to Track and Why",
    metaDescription:
      "A simple guide to logging breast and bottle feeds, diapers, and weight gain for newborns — without overwhelming yourself with data.",
    keywords:
      "newborn feeding log, breastfeeding tracker, bottle feeding schedule, diaper count newborn, baby feeding app",
    publishedAt: "2026-06-05",
    readMinutes: 6,
    excerpt:
      "You don't need a spreadsheet — just enough tracking to answer your pediatrician's key questions.",
    relatedFeatureSlug: "infant-care",
    sections: [
      {
        type: "paragraph",
        text: "In the first weeks, feeds and diapers tell you more than the clock. Pediatricians often ask: how many feeds in 24 hours? Wet diapers? Weight trend? A lightweight log reduces anxiety and makes appointments more productive.",
      },
      { type: "heading", text: "What to log (minimum viable)" },
      {
        type: "list",
        items: [
          "Feed start time and side (breast) or volume (bottle).",
          "Wet and dirty diaper counts per day.",
          "Optional: sleep stretches — helpful when discussing night feeds.",
        ],
      },
      { type: "heading", text: "Rough benchmarks (term healthy newborns)" },
      {
        type: "list",
        items: [
          "8–12 feeds per 24 hours is common in the early weeks.",
          "By day 4–5, expect at least 6 heavy wet diapers daily once milk supply is established.",
          "Weight checks with your doctor matter more than any app metric.",
        ],
      },
      {
        type: "paragraph",
        text: "AmyNest Infant Hub supports one-tap feed and diaper logging so you can hand your doctor a clear week-at-a-glance instead of reconstructing from memory.",
      },
    ],
  },
  {
    slug: "toddler-daily-routine-template",
    title: "Toddler Daily Routine Template That Actually Works",
    metaDescription:
      "Build a flexible toddler schedule with morning, nap, meal, play, and bedtime blocks. Free template ideas plus how AI routines reduce parent burnout.",
    keywords:
      "toddler daily routine, 2 year old schedule, preschooler routine chart, toddler bedtime routine, daily schedule template",
    publishedAt: "2026-06-05",
    readMinutes: 7,
    excerpt:
      "Toddlers need predictability, not rigidity. Here's a template you can adapt in minutes.",
    relatedFeatureSlug: "daily-routines",
    sections: [
      {
        type: "paragraph",
        text: "Toddler meltdowns often spike when transitions surprise them. A visual daily rhythm — wake, eat, play, rest, eat, play, wind-down, sleep — gives them security while leaving room for real life.",
      },
      { type: "heading", text: "Sample day (age 2–3, one nap)" },
      {
        type: "list",
        items: [
          "7:00 — Wake, potty, get dressed",
          "7:30 — Breakfast",
          "8:30 — Free play or short outdoor time",
          "10:00 — Snack + story",
          "10:30 — Structured activity (puzzles, coloring, life skill task)",
          "12:00 — Lunch",
          "12:45 — Nap (1–2 hours)",
          "3:00 — Snack",
          "3:30 — Active play",
          "5:30 — Dinner",
          "6:30 — Bath, books, calm play",
          "7:30 — Bedtime",
        ],
      },
      { type: "heading", text: "Tips that stick" },
      {
        type: "list",
        items: [
          "Use pictures for pre-readers — they check the routine, not you nagging.",
          "Attach small rewards to completed blocks (sticker, extra story, points in AmyNest).",
          "Regenerate the plan when daycare days differ from weekends.",
        ],
      },
      {
        type: "paragraph",
        text: "AmyNest generates age-specific routines in seconds and lets kids earn reward points for finishing tasks — turning 'what's next?' into something they own.",
      },
    ],
  },
  {
    slug: "speech-development-at-home",
    title: "Speech Development at Home: Daily Practice Ideas for Parents",
    metaDescription:
      "Simple speech-building activities for toddlers and preschoolers — narration, turn-taking, and pronunciation games you can do in 10 minutes a day.",
    keywords:
      "speech development activities, toddler language activities, help child speak clearly, home speech practice, pronunciation games kids",
    publishedAt: "2026-06-05",
    readMinutes: 7,
    excerpt:
      "You don't need flashcards for hours — short, playful reps beat marathon drills.",
    relatedFeatureSlug: "speech-coach",
    sections: [
      {
        type: "paragraph",
        text: "Language grows in conversation, not worksheets. Children need to hear words, try words, and get warm responses when they miss — that's how confidence builds.",
      },
      { type: "heading", text: "Daily habits that help" },
      {
        type: "list",
        items: [
          "Narrate what you're doing: 'I'm stirring the dal' beats silence.",
          "Pause after questions — give them 5 seconds to answer before you fill the gap.",
          "Repeat and expand: child says 'car,' you say 'Yes, a red car going fast.'",
          "Read the same book repeatedly; predictability invites participation.",
        ],
      },
      { type: "heading", text: "When to seek professional help" },
      {
        type: "paragraph",
        text: "Talk to your pediatrician if your child has no words by 18 months, loses language skills, or you cannot understand most of their speech by age 3. Amy Speech Coach complements — not replaces — licensed speech therapy.",
      },
      {
        type: "paragraph",
        text: "AmyNest Speech Coach adds structured pronunciation practice with gentle AI feedback so short daily sessions feel like a game, not homework.",
      },
    ],
  },
  {
    slug: "picky-eater-strategies",
    title: "Picky Eater Strategies That Reduce Mealtime Battles",
    metaDescription:
      "Division of responsibility, exposure without pressure, and routine-based mealtimes — evidence-informed picky eater strategies for toddlers and school-age kids.",
    keywords:
      "picky eater toddler, child won't eat vegetables, mealtime battles, picky eater strategies, toddler nutrition tips",
    publishedAt: "2026-06-05",
    readMinutes: 6,
    excerpt:
      "Pressure backfires. Structure and repeated exposure work better than 'one more bite.'",
    relatedFeatureSlug: "nutrition-hub",
    sections: [
      {
        type: "paragraph",
        text: "Picky eating is common between ages 2 and 6. It rarely means you're failing — it often means your child is asserting autonomy. The goal is a healthy relationship with food, not a clean plate.",
      },
      { type: "heading", text: "Division of responsibility" },
      {
        type: "list",
        items: [
          "Parent decides what, when, and where food is offered.",
          "Child decides whether and how much to eat from what's served.",
          "Avoid short-order cooking — one family meal with a safe side (bread, fruit) they usually accept.",
        ],
      },
      { type: "heading", text: "Exposure without pressure" },
      {
        type: "list",
        items: [
          "It can take 10–15 neutral exposures before a child tries a new food.",
          "Let them touch, smell, or lick without forcing a bite.",
          "Eat the same food yourself — modeling beats lecturing.",
        ],
      },
      {
        type: "paragraph",
        text: "AmyNest Nutrition Hub suggests age-appropriate meals inside your child's daily routine so food planning stops being a separate stressful task every evening.",
      },
    ],
  },
  {
    slug: "school-morning-routine-checklist",
    title: "School Morning Routine Checklist for Stress-Free Starts",
    metaDescription:
      "A printable-style morning checklist for school days — prep the night before, visual cues for kids, and buffer time that prevents lateness meltdowns.",
    keywords:
      "school morning routine, kids morning checklist, get ready for school, morning routine chart, back to school routine",
    publishedAt: "2026-06-05",
    readMinutes: 5,
    excerpt:
      "Mornings go wrong when everything happens at once. Split prep across evening and morning.",
    relatedFeatureSlug: "daily-routines",
    sections: [
      {
        type: "paragraph",
        text: "The fastest way to fix school mornings is to move decisions to the night before. Mornings should execute a plan, not invent one.",
      },
      { type: "heading", text: "Night before" },
      {
        type: "list",
        items: [
          "Lay out clothes and pack bag.",
          "Prep lunch boxes or set breakfast items on the counter.",
          "Review tomorrow's routine with your child — especially if it's a PE or library day.",
        ],
      },
      { type: "heading", text: "Morning checklist (child-facing)" },
      {
        type: "list",
        items: [
          "Wake up, bathroom, wash face",
          "Get dressed",
          "Breakfast",
          "Brush teeth",
          "Shoes, bag, water bottle",
          "Out the door — with 10-minute buffer built in",
        ],
      },
      {
        type: "paragraph",
        text: "AmyNest auto-detects school days, adjusts wake times, and shows kids a clear task list with rewards — so you're not the only reminder system in the house.",
      },
    ],
  },
  {
    slug: "screen-time-and-learning-balance",
    title: "Screen Time and Learning: Finding Balance for School-Age Kids",
    metaDescription:
      "How to combine educational apps, homework, and offline play without endless negotiations — practical screen time rules families can follow.",
    keywords:
      "screen time rules kids, educational apps balance, homework and screen time, healthy screen habits children",
    publishedAt: "2026-06-05",
    readMinutes: 6,
    excerpt:
      "Quality and context matter more than a single daily minute count.",
    relatedFeatureSlug: "study-zone",
    sections: [
      {
        type: "paragraph",
        text: "Screens aren't all equal. Video chat with grandparents, a phonics lesson, and passive scrolling have different effects. Parents get the most leverage by separating 'learning screen time' from 'entertainment screen time.'",
      },
      { type: "heading", text: "Rules that work in practice" },
      {
        type: "list",
        items: [
          "Screens after essentials: dressed, fed, morning tasks done.",
          "Use a visual timer children can see.",
          "Keep devices out of bedrooms at night.",
          "Co-view when possible — especially under age 6.",
        ],
      },
      {
        type: "paragraph",
        text: "AmyNest Study Zone bundles phonics, spelling, and math into structured sessions with printable offline worksheets — so screen time has a clear start and end.",
      },
    ],
  },
];

const GUIDE_BY_SLUG = new Map(GUIDE_ARTICLES.map((guide) => [guide.slug, guide]));

export function getGuideArticle(slug: string): GuideArticle | undefined {
  return GUIDE_BY_SLUG.get(slug);
}

export function listGuideSlugs(): string[] {
  return GUIDE_ARTICLES.map((guide) => guide.slug);
}
