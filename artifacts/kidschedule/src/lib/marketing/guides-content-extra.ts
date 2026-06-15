import type { GuideArticle, GuideSection } from "@/lib/marketing/guides-content";

type GuideDraft = Omit<GuideArticle, "sections"> & {
  sections: GuideSection[];
};

function guide(draft: GuideDraft): GuideArticle {
  return {
    authorId: "amynest-editorial",
    reviewedById: draft.keywords.includes("speech") ? "speech-review" : "pediatric-review",
    updatedAt: "2026-06-15",
    relatedGuideSlugs: [],
    faqs: [
      {
        question: "When should I change our routine?",
        answer: "Adjust when sleep, appetite, or school demands shift for more than 5–7 days — not after one hard night.",
      },
      {
        question: "Can AmyNest automate this?",
        answer: "Yes. AmyNest builds age-aware routines and adapts them when you log sleep, meals, or school schedules.",
      },
    ],
    ...draft,
  };
}

/** 20 additional SEO guides — merged into GUIDE_ARTICLES via guides-content.ts */
export const EXTRA_GUIDE_ARTICLES: GuideArticle[] = [
  guide({
    slug: "four-month-sleep-regression-guide",
    title: "4-Month Sleep Regression: What It Is and How to Cope",
    metaDescription:
      "Understand the four-month sleep regression — why it happens, how long it lasts, and gentle strategies to protect everyone's rest.",
    keywords: "4 month sleep regression, baby sleep changes, infant sleep cycles, newborn sleep tips",
    publishedAt: "2026-06-15",
    readMinutes: 7,
    excerpt: "Sleep regressions feel sudden but are often developmental milestones in disguise.",
    relatedFeatureSlug: "infant-care",
    relatedGuideSlugs: ["baby-sleep-schedule-by-age", "bedtime-routine-for-toddlers"],
    sections: [
      {
        type: "paragraph",
        text: "Around four months, many babies move from newborn-style sleep to adult-like sleep cycles. More night wakings don't mean you did something wrong — it means your baby's brain is maturing.",
      },
      { type: "heading", text: "Signs it's the 4-month regression" },
      {
        type: "list",
        items: [
          "Sudden increase in night wakings after a stable period.",
          "Shorter naps and harder settling.",
          "Baby seems more alert and easily overstimulated.",
        ],
      },
      { type: "heading", text: "What helps" },
      {
        type: "list",
        items: [
          "Protect daytime sleep — overtired babies wake more at night.",
          "Keep a short, repeatable bedtime routine.",
          "Practice putting down drowsy but awake when possible.",
          "Track patterns for 3–5 days before major changes.",
        ],
      },
    ],
  }),
  guide({
    slug: "toddler-nap-transition-guide",
    title: "Toddler Nap Transition: From Two Naps to One",
    metaDescription:
      "Signs your toddler is ready to drop a nap, how to transition safely, and sample schedules for 12–24 months.",
    keywords: "toddler nap transition, drop to one nap, 18 month schedule, toddler sleep",
    publishedAt: "2026-06-15",
    readMinutes: 6,
    excerpt: "Moving to one nap is a process — not a single calendar date.",
    relatedFeatureSlug: "infant-care",
    relatedGuideSlugs: ["toddler-daily-routine-template", "four-month-sleep-regression-guide"],
    sections: [
      { type: "heading", text: "Readiness signs" },
      {
        type: "list",
        items: [
          "Consistently fights the second nap for 10+ days.",
          "Second nap shortens bedtime or causes long night wakings.",
          "Morning nap stays solid while afternoon nap fails.",
        ],
      },
      { type: "heading", text: "Transition plan" },
      {
        type: "list",
        items: [
          "Shift morning nap later by 15 minutes every few days.",
          "Use early bedtime (30–60 min) during transition weeks.",
          "Offer quiet rest instead of forced second nap on hard days.",
        ],
      },
    ],
  }),
  guide({
    slug: "bedtime-routine-for-toddlers",
    title: "Bedtime Routine for Toddlers: A Calm 30-Minute Script",
    metaDescription:
      "Build a toddler bedtime routine that reduces battles — bath, book, bed sequence with timing tips for Indian households.",
    keywords: "toddler bedtime routine, bedtime battles, sleep routine kids India",
    publishedAt: "2026-06-15",
    readMinutes: 5,
    excerpt: "Predictable steps beat perfect timing every time.",
    relatedFeatureSlug: "daily-routines",
    relatedGuideSlugs: ["toddler-daily-routine-template", "toddler-nap-transition-guide"],
    sections: [
      { type: "heading", text: "The 30-minute script" },
      {
        type: "list",
        items: [
          "T-30: dim lights, no new exciting play.",
          "T-20: wash/teeth with same song daily.",
          "T-10: one short book, same chair.",
          "T-0: goodnight phrase and leave.",
        ],
      },
    ],
  }),
  guide({
    slug: "baby-led-weaning-starter-guide",
    title: "Baby-Led Weaning Starter Guide for Indian Families",
    metaDescription:
      "Safe baby-led weaning with Indian foods — gagging vs choking, first finger foods, and family meal integration.",
    keywords: "baby led weaning India, BLW starter foods, infant finger foods, complementary feeding",
    publishedAt: "2026-06-15",
    readMinutes: 8,
    excerpt: "BLW works when safety rules and family meals align.",
    relatedFeatureSlug: "nutrition-hub",
    relatedGuideSlugs: ["newborn-feeding-log-basics", "iron-rich-foods-for-toddlers"],
    sections: [
      { type: "heading", text: "Safe first foods" },
      {
        type: "list",
        items: [
          "Soft steamed carrot sticks, banana spears, well-cooked potato wedges.",
          "Avoid whole grapes, popcorn, whole nuts, and hard raw apple.",
          "Always supervise upright seated feeding.",
        ],
      },
    ],
  }),
  guide({
    slug: "iron-rich-foods-for-toddlers",
    title: "Iron-Rich Foods for Toddlers: Practical Indian Meal Ideas",
    metaDescription:
      "Prevent iron gaps with dal, egg, ragi, and leafy greens — portion ideas and pairing with vitamin C foods.",
    keywords: "iron rich foods toddlers, anemia prevention kids, toddler nutrition India",
    publishedAt: "2026-06-15",
    readMinutes: 6,
    excerpt: "Iron needs rise fast between 6–24 months — food first, supplements only with your doctor.",
    relatedFeatureSlug: "nutrition-hub",
    relatedGuideSlugs: ["baby-led-weaning-starter-guide", "picky-eater-strategies"],
    sections: [
      {
        type: "list",
        items: [
          "Daily targets: lentils, egg, chicken, fortified cereal, spinach in khichdi.",
          "Pair with citrus or amla to improve absorption.",
          "Limit excessive milk close to meals — it blocks iron uptake.",
        ],
      },
    ],
  }),
  guide({
    slug: "healthy-snacks-for-preschoolers",
    title: "Healthy Snacks for Preschoolers Without the Sugar Spike",
    metaDescription:
      "Low-prep snack ideas for 3–5 year olds — protein + fiber combos that hold energy until the next meal.",
    keywords: "healthy snacks preschoolers, toddler snack ideas India, low sugar kids snacks",
    publishedAt: "2026-06-15",
    readMinutes: 5,
    excerpt: "Snacks should bridge meals, not replace them.",
    relatedFeatureSlug: "nutrition-hub",
    relatedGuideSlugs: ["picky-eater-strategies", "iron-rich-foods-for-toddlers"],
    sections: [
      {
        type: "list",
        items: [
          "Roasted makhana + fruit.",
          "Curd with banana and chia.",
          "Whole-wheat paratha roll with paneer.",
          "Vegetable idli with coconut chutney.",
        ],
      },
    ],
  }),
  guide({
    slug: "late-talking-when-to-worry",
    title: "Late Talking in Toddlers: When to Wait and When to Act",
    metaDescription:
      "Red flags for delayed speech, milestones by age, and home strategies before specialist referral.",
    keywords: "late talking toddler, speech delay signs, when to worry speech development",
    publishedAt: "2026-06-15",
    readMinutes: 7,
    excerpt: "Variation is normal; persistent gaps across domains need follow-up.",
    relatedFeatureSlug: "speech-coach",
    relatedGuideSlugs: ["speech-development-at-home", "bilingual-speech-development"],
    sections: [
      { type: "heading", text: "Consult your pediatrician if" },
      {
        type: "list",
        items: [
          "No babbling by 12 months.",
          "No single words by 16 months.",
          "Loss of words previously used.",
          "Limited eye contact or social response.",
        ],
      },
    ],
  }),
  guide({
    slug: "phonics-at-home-for-beginners",
    title: "Phonics at Home for Beginners: A 10-Minute Daily Plan",
    metaDescription:
      "Simple phonics routine for 4–6 year olds — letter sounds, blending, and multisensory play without worksheets overload.",
    keywords: "phonics at home, letter sounds practice, early reading India, preschool phonics",
    publishedAt: "2026-06-15",
    readMinutes: 6,
    excerpt: "Short, daily beats long weekend cram sessions.",
    relatedFeatureSlug: "study-zone",
    relatedGuideSlugs: ["reading-readiness-signs", "learning-through-play-activities"],
    sections: [
      {
        type: "list",
        items: [
          "Day 1–3: one sound, three objects, one motion.",
          "Day 4–5: blend two sounds in CVC words (cat, mat).",
          "Keep sessions under 10 minutes to protect motivation.",
        ],
      },
    ],
  }),
  guide({
    slug: "bilingual-speech-development",
    title: "Bilingual Speech Development: Hindi, English, and Hinglish at Home",
    metaDescription:
      "Myths vs facts about raising bilingual kids in India — consistency models and when mixing languages is fine.",
    keywords: "bilingual speech development, Hindi English kids, raising bilingual child India",
    publishedAt: "2026-06-15",
    readMinutes: 7,
    excerpt: "Bilingualism does not cause speech delay — but inconsistent exposure can slow vocabulary in each language.",
    relatedFeatureSlug: "speech-coach",
    relatedGuideSlugs: ["speech-development-at-home", "late-talking-when-to-worry"],
    sections: [
      {
        type: "paragraph",
        text: "Choose a household pattern: one parent-one language, time blocks, or domain-based language (Hindi at home, English for books). Consistency matters more than perfection.",
      },
    ],
  }),
  guide({
    slug: "kindergarten-readiness-checklist",
    title: "Kindergarten Readiness Checklist: Skills Beyond ABCs",
    metaDescription:
      "Social, motor, and self-care readiness for school entry — a practical checklist for Indian parents.",
    keywords: "kindergarten readiness checklist, school readiness India, preschool skills",
    publishedAt: "2026-06-15",
    readMinutes: 6,
    excerpt: "Teachers value self-help and emotional regulation as much as academics.",
    relatedFeatureSlug: "study-zone",
    relatedGuideSlugs: ["reading-readiness-signs", "school-morning-routine-checklist"],
    sections: [
      {
        type: "list",
        items: [
          "Toilet independence or asking for help.",
          "Opening lunchbox and water bottle.",
          "Sitting for short group activities.",
          "Naming feelings and asking for turns.",
        ],
      },
    ],
  }),
  guide({
    slug: "homework-routine-for-elementary",
    title: "Homework Routine for Elementary School: Focus Without Fights",
    metaDescription:
      "After-school homework structure for ages 6–10 — movement first, timed focus blocks, and parent role clarity.",
    keywords: "homework routine elementary, study habits kids, after school schedule",
    publishedAt: "2026-06-15",
    readMinutes: 6,
    excerpt: "Homework works when the body is regulated first.",
    relatedFeatureSlug: "study-zone",
    relatedGuideSlugs: ["school-morning-routine-checklist", "screen-time-and-learning-balance"],
    sections: [
      {
        type: "list",
        items: [
          "Snack + 15 minutes movement before desk time.",
          "25-minute focus block, 5-minute break (repeat twice max for younger grades).",
          "Parent reviews effort, not perfection.",
        ],
      },
    ],
  }),
  guide({
    slug: "toddler-tantrum-de-escalation",
    title: "Toddler Tantrum De-Escalation: Scripts That Work in Public",
    metaDescription:
      "Calm-down strategies for toddler meltdowns — validation language, boundary holding, and post-tantrum repair.",
    keywords: "toddler tantrums, meltdown strategies, toddler behaviour parenting",
    publishedAt: "2026-06-15",
    readMinutes: 7,
    excerpt: "Tantrums are communication under stress — not manipulation.",
    relatedFeatureSlug: "daily-routines",
    relatedGuideSlugs: ["positive-discipline-for-preschoolers", "separation-anxiety-at-dropoff"],
    sections: [
      {
        type: "list",
        items: [
          "Get low, slow voice: 'You're upset. I'm here.'",
          "Hold boundary without debate: 'Shoes stay on.'",
          "Repair after calm: name feeling + next step.",
        ],
      },
    ],
  }),
  guide({
    slug: "positive-discipline-for-preschoolers",
    title: "Positive Discipline for Preschoolers: Limits With Connection",
    metaDescription:
      "Replace punishment loops with natural consequences, choices, and routines that teach — not shame.",
    keywords: "positive discipline preschoolers, gentle parenting limits, behaviour guidance",
    publishedAt: "2026-06-15",
    readMinutes: 6,
    excerpt: "Connection before correction — especially for kids under five.",
    relatedFeatureSlug: "daily-routines",
    relatedGuideSlugs: ["toddler-tantrum-de-escalation", "toddler-daily-routine-template"],
    sections: [
      {
        type: "paragraph",
        text: "Preschoolers need hundreds of repetitions. Visual routines and predictable consequences outperform lectures.",
      },
    ],
  }),
  guide({
    slug: "screen-free-morning-routine",
    title: "Screen-Free Morning Routine for School-Age Kids",
    metaDescription:
      "Reduce morning chaos without screens — checklist, outfit prep, and breakfast timing for busy Indian school days.",
    keywords: "screen free morning routine, school morning without screens, kids morning checklist",
    publishedAt: "2026-06-15",
    readMinutes: 5,
    excerpt: "Screens delay executive function — save them for after the bus.",
    relatedFeatureSlug: "daily-routines",
    relatedGuideSlugs: ["school-morning-routine-checklist", "screen-time-and-learning-balance"],
    sections: [
      {
        type: "list",
        items: [
          "Pack bag and outfit the night before.",
          "Playlist instead of video during breakfast.",
          "Reward streaks for screen-free mornings.",
        ],
      },
    ],
  }),
  guide({
    slug: "learning-through-play-activities",
    title: "Learning Through Play: 15-Minute Activities That Build Skills",
    metaDescription:
      "Play-based learning for 3–7 year olds — sorting, counting, storytelling, and fine motor games using home items.",
    keywords: "learning through play, play based learning activities, preschool learning at home",
    publishedAt: "2026-06-15",
    readMinutes: 6,
    excerpt: "Play is the curriculum before formal school.",
    relatedFeatureSlug: "study-zone",
    relatedGuideSlugs: ["math-at-home-for-young-kids", "reading-readiness-signs"],
    sections: [
      {
        type: "list",
        items: [
          "Laundry sort by color (classification).",
          "Rice bin scoop and pour (fine motor).",
          "Story retell with three picture cards (sequencing).",
        ],
      },
    ],
  }),
  guide({
    slug: "math-at-home-for-young-kids",
    title: "Math at Home for Young Kids: Number Sense Without Worksheets",
    metaDescription:
      "Build early math through cooking, stairs, and games — number sense for ages 4–8 without drill pressure.",
    keywords: "math at home kids, early numeracy activities, number sense preschool",
    publishedAt: "2026-06-15",
    readMinutes: 6,
    excerpt: "Numbers live in the kitchen, not only in textbooks.",
    relatedFeatureSlug: "study-zone",
    relatedGuideSlugs: ["learning-through-play-activities", "homework-routine-for-elementary"],
    sections: [
      {
        type: "list",
        items: [
          "Count steps, spoons, and chapati batches.",
          "Compare more/less with snacks.",
          "Use dice games for subitizing to six.",
        ],
      },
    ],
  }),
  guide({
    slug: "reading-readiness-signs",
    title: "Reading Readiness Signs: Is Your Child Ready for Books?",
    metaDescription:
      "Phonological awareness, print motivation, and motor signs of reading readiness — without rushing early readers.",
    keywords: "reading readiness signs, when child ready to read, early literacy checklist",
    publishedAt: "2026-06-15",
    readMinutes: 5,
    excerpt: "Readiness is a cluster of skills — not a birthday.",
    relatedFeatureSlug: "study-zone",
    relatedGuideSlugs: ["phonics-at-home-for-beginners", "kindergarten-readiness-checklist"],
    sections: [
      {
        type: "list",
        items: [
          "Enjoys rhymes and repeats sound patterns.",
          "Tracks left-to-right with finger on picture books.",
          "Shows curiosity about letters in environment.",
        ],
      },
    ],
  }),
  guide({
    slug: "separation-anxiety-at-dropoff",
    title: "Separation Anxiety at Drop-Off: Daycare and School Transitions",
    metaDescription:
      "Reduce clingy goodbyes with short rituals, teacher partnership, and gradual exposure plans.",
    keywords: "separation anxiety drop off, daycare crying goodbye, school transition anxiety",
    publishedAt: "2026-06-15",
    readMinutes: 6,
    excerpt: "Quick, confident goodbyes beat long negotiations.",
    relatedFeatureSlug: "daily-routines",
    relatedGuideSlugs: ["kindergarten-readiness-checklist", "toddler-tantrum-de-escalation"],
    sections: [
      {
        type: "list",
        items: [
          "Same 20-second goodbye script daily.",
          "Transitional object for first weeks.",
          "Teacher shares one positive detail at pickup.",
        ],
      },
    ],
  }),
  guide({
    slug: "potty-training-readiness-signs",
    title: "Potty Training Readiness: Signs Your Toddler Is Ready",
    metaDescription:
      "Physical and cognitive readiness for potty training — timing, regressions, and realistic timelines.",
    keywords: "potty training readiness, toilet training signs, toddler potty tips",
    publishedAt: "2026-06-15",
    readMinutes: 6,
    excerpt: "Readiness beats calendar age — usually between 22–30 months for many toddlers.",
    relatedFeatureSlug: "infant-care",
    relatedGuideSlugs: ["toddler-daily-routine-template", "positive-discipline-for-preschoolers"],
    sections: [
      {
        type: "list",
        items: [
          "Dry diaper for 2+ hours sometimes.",
          "Shows interest in toilet or copying.",
          "Can follow two-step instructions.",
        ],
      },
    ],
  }),
  guide({
    slug: "sibling-adjustment-new-baby",
    title: "Sibling Adjustment When a New Baby Arrives",
    metaDescription:
      "Prepare your firstborn for a new baby — jealousy, regression, and one-on-one time strategies.",
    keywords: "sibling adjustment new baby, jealousy new sibling, preparing toddler for baby",
    publishedAt: "2026-06-15",
    readMinutes: 7,
    excerpt: "Regression and big feelings are normal — plan connection, not perfection.",
    relatedFeatureSlug: "infant-care",
    relatedGuideSlugs: ["newborn-feeding-log-basics", "positive-discipline-for-preschoolers"],
    sections: [
      {
        type: "list",
        items: [
          "Give toddler a concrete helper role.",
          "Protect 10 minutes daily one-on-one time.",
          "Expect temporary sleep or potty regressions.",
        ],
      },
    ],
  }),
  guide({
    slug: "co-sleeping-vs-crib-sleep-safety",
    title: "Co-Sleeping vs Crib Sleep: Safety-First Guidance for Indian Families",
    metaDescription:
      "Room-sharing vs bed-sharing risks, safe sleep surfaces, and cultural realities — practical safety framing.",
    keywords: "co sleeping safety India, crib sleep newborn, safe sleep baby",
    publishedAt: "2026-06-15",
    readMinutes: 7,
    excerpt: "Safety principles matter more than ideology — discuss your setup with your pediatrician.",
    relatedFeatureSlug: "infant-care",
    relatedGuideSlugs: ["baby-sleep-schedule-by-age", "four-month-sleep-regression-guide"],
    sections: [
      {
        type: "list",
        items: [
          "Firm flat surface, no loose bedding near face.",
          "Avoid bed-sharing if either parent is excessively tired or smoked.",
          "Room-sharing without bed-sharing reduces SIDS risk per major guidelines.",
        ],
      },
    ],
  }),
  guide({
    slug: "winter-illness-prevention-kids",
    title: "Winter Illness Prevention for Kids: Practical Habits That Help",
    metaDescription:
      "Hand hygiene, sleep, nutrition, and school illness policies — reduce (not eliminate) seasonal sick days.",
    keywords: "winter illness prevention kids, cold season parenting, keep kids healthy school",
    publishedAt: "2026-06-15",
    readMinutes: 5,
    excerpt: "No strategy prevents every virus — but habits reduce spread and severity.",
    relatedFeatureSlug: "infant-care",
    relatedGuideSlugs: ["healthy-snacks-for-preschoolers", "baby-sleep-schedule-by-age"],
    sections: [
      {
        type: "list",
        items: [
          "Hand wash at door after school.",
          "Prioritize sleep over extra activities during outbreaks.",
          "Keep child home when feverish — protects classmates and recovery.",
        ],
      },
    ],
  }),
];
