/**
 * Subscription marketing copy v2 — conversion, annual bias, ecosystem differentiation.
 * Ages 0–12 · family growth system · not a single-feature AI app.
 */

/** Canonical age span for paywall/pricing copy (matches infant 0–2 + hub bands through 12). */
export const PRODUCT_AGE_MIN = 0;
export const PRODUCT_AGE_MAX = 12;
export const PRODUCT_AGE_RANGE = `${PRODUCT_AGE_MIN}–${PRODUCT_AGE_MAX}` as const;
export const PRODUCT_AGE_LABEL = `Ages ${PRODUCT_AGE_RANGE}` as const;

export type PaidPlanId = "monthly" | "six_month" | "yearly";

export const DIFFERENTIATION = {
  oneLiner:
    "Not parenting tips. Not one AI chat. The full growth system for children 0–12—connected in one place.",
  vsOrdinaryApps:
    "Ordinary apps give advice. AmyNest runs your child's routines, learning, speech practice, coaching, and progress—together.",
} as const;

// ─── Hero headlines (10) — primary: 0 ───────────────────────────────────────

export const HERO_HEADLINE_ALTERNATIVES = [
  "The growth system for children 0–12—not another parenting app",
  "One home for learning, speech, routines, and calm parenting",
  "Help your child grow. Parent with a plan—not guesswork.",
  "Routines, learning, and speech—finally in one place",
  "What busy parents use when they want real progress at home",
  "From morning chaos to confident evenings—built for your child",
  "Your child's coach, tutor, and routine partner—in one subscription",
  "Less stress at home. More progress you can see.",
  "The family platform that grows with them ages 0–12",
  "Subscribe once. Support their whole childhood year.",
] as const;

export const HERO_SUBHEADLINE_ALTERNATIVES = [
  "Amy AI, Amy Coach, Speech Coach, adaptive learning, routines, and the Parenting Hub—one ecosystem, tuned to your child. Not scattered apps. Not generic tips.",
  "Parents use AmyNest when they want steadier days, clearer communication, and learning that actually sticks—without adding another job to their plate.",
  "Replace five disconnected tools with one warm system: guidance when you're stuck, structure when you need it, and activities that build confidence week by week.",
  "See routines hold, speech practice pay off, and learning move forward—while you parent with more calm and less second-guessing.",
  "Built for ages 0–12: coaching for real moments, Speech Coach for expression, adaptive activities, behavior insight, and family routines that reduce daily friction.",
  "Most apps send articles. AmyNest helps you act—personalized plans, practice, progress tracking, and AI support in the moments that matter.",
  "One subscription covers Amy AI, Coach, Speech Coach, Hub, routines, and insights—so your child's growth isn't split across apps that don't talk to each other.",
  "Families choose AmyNest for transformation at home: better routines, stronger communication, measurable learning—not feature checklists.",
  "From tantrums to homework to bedtime—get step-by-step coaching plus learning and speech practice your child can feel proud of.",
  "Annual families save most and never break continuity through the school year. Start monthly if you want zero friction—upgrade when you see the change.",
] as const;

export const SUBSCRIPTION_HERO = {
  headline: HERO_HEADLINE_ALTERNATIVES[0],
  subheadline: HERO_SUBHEADLINE_ALTERNATIVES[0],
} as const;

export const PLAN_BADGES: Record<PaidPlanId, string | null> = {
  monthly: null,
  /** CRO default highlight — first paywall visit preselects six_month. */
  six_month: "Most Popular",
  yearly: "Smartest Choice",
};

export const PLAN_MARKETING: Record<
  PaidPlanId,
  {
    title: string;
    tagline: string;
    positioning: string;
    description: string;
    features: string[];
    cta: string;
    valueAnchor?: string;
  }
> = {
  monthly: {
    title: "Try the System",
    tagline: "Full ecosystem. One month. Zero lock-in.",
    valueAnchor: "Less than a single tutoring session—entire platform included.",
    positioning:
      "Frictionless entry: every part of AmyNest—AI, Coach, Speech Coach, learning, Hub, routines—for one month. Cancel anytime. Ideal when you want proof before a longer commitment.",
    description:
      "No stripped-down trial. The same system annual members use, priced so starting feels easy.",
    features: [
      "Full AmyNest ecosystem for 30 days—nothing held back",
      "See calmer routines and clearer parenting within the first two weeks",
      "Try Speech Coach and learning paths with your child this month",
      "Cancel in two taps—only continue if home feels different",
    ],
    cta: "Try one month",
  },
  six_month: {
    title: "Steady Progress",
    tagline: "Safest choice for real habit change.",
    valueAnchor: "Save ~17% vs monthly—most families land here.",
    positioning:
      "Six months is the sweet spot: long enough for routines, speech, and learning to compound—short enough to feel deliberate. The plan parents pick when they want measurable change without overthinking.",
    description:
      "Habit formation window for ages 0–12—coaching and content adapt as your child moves through the year.",
    features: [
      "Enough time for routines to stick and communication to open up",
      "Track learning, behavior, and speech progress across months—not days",
      "Coach + Hub evolve with your child's stage",
      "Meaningful savings vs paying monthly—without a full-year decision yet",
    ],
    cta: "Start steady progress",
  },
  yearly: {
    title: "Growth Year",
    tagline: "Smartest choice—best savings, zero gaps.",
    valueAnchor: "Save ~33% vs monthly · ~$20 less than six months twice.",
    positioning:
      "One decision covers the school year and beyond: uninterrupted coaching, Speech Coach, adaptive learning, routines, and insights as your child develops. Highest LTV, lowest cost per month of growth.",
    description:
      "Annual members don't restart progress every few months—they keep continuity when seasons, grades, and challenges change.",
    features: [
      "Lowest cost per month—protect the budget while maximizing support",
      "Unbroken coaching, speech practice, and learning through the full year",
      "Routines and Hub content that mature with your child ages 0–12",
      "Never re-decide mid-year when life gets busy—growth stays on",
    ],
    cta: "Choose Growth Year",
  },
};

export const PURCHASE_CTAS = {
  default: "Continue with AmyNest Premium",
  monthly: PLAN_MARKETING.monthly.cta,
  sixMonth: PLAN_MARKETING.six_month.cta,
  annual: PLAN_MARKETING.yearly.cta,
  processingTitle: "Activating your family plan",
  processingSubtitle: "Connecting coaching, learning, and routines to your child.",
  verifyTitle: "Securing your plan",
  verifySubtitle: "Almost done—your progress stays linked to your account.",
  successTitle: "AmyNest Premium is active",
  successBody:
    "Amy AI, Coach, Speech Coach, learning, routines, and Hub—active for your child. Start with today's routine or ask Amy anything.",
  restorePurchases: "Restore Purchases",
  trustLine: `Cancel anytime · Billed clearly · ${PRODUCT_AGE_LABEL}`,
} as const;

export const PURCHASE_SCREEN = PURCHASE_CTAS;

export const FEATURE_SHOWCASE = {
  eyebrow: "Why AmyNest is different",
  title: "Eight tools. One subscription. One child-centered system.",
  subtitle: DIFFERENTIATION.vsOrdinaryApps,
  items: [
    { name: "Amy AI", outcome: "In-the-moment guidance—not articles you'll never read" },
    { name: "Amy Coach", outcome: "Step-by-step plans for tantrums, screens, sleep, focus" },
    { name: "Speech Coach", outcome: "Pronunciation practice that builds real speaking confidence" },
    { name: "Adaptive Learning", outcome: "Activities at their level—harder as they grow" },
    { name: "Parenting Hub", outcome: "Life skills & stories—not random YouTube rabbit holes" },
    { name: "Family Routines", outcome: "Mornings & bedtimes that reduce nagging and stress" },
    { name: "Behavior Insights", outcome: "Patterns that help you respond—not react" },
    { name: "Progress Tracking", outcome: "Proof of growth for you and pride for them" },
  ],
} as const;

export const REVENUECAT_PAYWALL = {
  headline: "The growth system for ages 0–12",
  subheadline:
    "Amy AI · Coach · Speech Coach · Learning · Routines · Hub—one subscription. Not scattered apps.",
  defaultPackageHighlight: "six_month" as PaidPlanId,
  annualPreselectCopy: "Most savings—tap Growth Year",
  monthlyDisplayName: PLAN_MARKETING.monthly.title,
  monthlySubtitle: PLAN_MARKETING.monthly.tagline,
  sixMonthDisplayName: PLAN_MARKETING.six_month.title,
  sixMonthBadge: "Most Popular",
  sixMonthSubtitle: PLAN_MARKETING.six_month.tagline,
  annualDisplayName: PLAN_MARKETING.yearly.title,
  annualBadge: "Smartest Choice",
  annualSubtitle: PLAN_MARKETING.yearly.tagline,
  purchaseButton: PURCHASE_CTAS.default,
  restoreButton: PURCHASE_CTAS.restorePurchases,
  footer: "Auto-renews via Google Play until cancelled in Subscriptions.",
  featureBullets: FEATURE_SHOWCASE.items.map((i) => i.outcome),
} as const;

export const TRUST_SECTION = {
  title: "Straightforward for parents",
  items: [
    { label: "Cancel anytime", detail: "Manage in App Store, Play Store, or your account." },
    { label: PRODUCT_AGE_LABEL, detail: "Content and coaching calibrated to childhood—not adults." },
    { label: "Secure checkout", detail: "App Store · Google Play · Razorpay" },
    { label: "Your data, your family", detail: "Profiles and progress stay tied to your household." },
  ],
  closing: "Trusted when the goal is real change at home—not another download you'll delete in a week.",
} as const;

export const UPGRADE_MODAL = {
  title: "Continue your child's journey",
  subtitle:
    "You've already started with AmyNest. Premium keeps AI guidance, routines, learning, and reports working together every day.",
  cta: "Start Growing Together",
  dismiss: "Maybe later",
} as const;

/** Shared Premium benefit checklist — used on paywalls (no fake stats). */
export const PAYWALL_CORE_BENEFITS = [
  "Unlimited AI guidance",
  "Unlimited personalized routines",
  "Weekly family reports",
  "Health Lab",
  "Complete learning journeys",
  "Educational games library",
  "Birth Sky stories",
  "Priority AI responses",
] as const;

/** Honest Free vs Premium matrix for conversion UI. */
export const FREE_VS_PREMIUM_MATRIX = [
  { label: "Daily tracking & milestones", free: "Included", premium: "Included" },
  { label: "Amy AI guidance", free: "Daily limit", premium: "Unlimited" },
  { label: "Personalized routines", free: "3 total", premium: "Unlimited" },
  { label: "Speech practice", free: "3 sessions", premium: "Unlimited" },
  { label: "Learning journeys", free: "Exploration days", premium: "Full access" },
  { label: "Educational games", free: "2 starters", premium: "Full library" },
  { label: "Health Lab", free: "Preview", premium: "Full access" },
  { label: "Weekly family reports", free: "Today's tip", premium: "Full reports" },
] as const;

export const PAYWALL_SOCIAL_PROOF = [
  "Parents use AmyNest every day to build healthy routines.",
  "Designed to grow with your child.",
  "Trusted parenting guidance powered by AI.",
] as const;

export const PAYWALL_AI = {
  title: "You've used today's free Amy guidance",
  subtitle:
    "Premium unlocks unlimited personalized answers for meltdowns, homework, bedtime, and the moments in between—so you always have a calm next step.",
  cta: "Unlock Unlimited Guidance",
} as const;

export const PAYWALL_INFANT_AI = {
  title: "You've used today's free baby questions",
  subtitle:
    "Premium unlocks unlimited Baby Expert answers about sleep, feeding, and development—matched to your baby's age, not generic advice.",
  cta: "Unlock Unlimited Guidance",
} as const;

export const PAYWALL_SPEECH_COACH = {
  title: "Your child finished today's practice",
  subtitle:
    "Keep building confidence together with unlimited conversations, pronunciation practice, and progress tracking.",
  cta: "Continue Building Confidence",
} as const;

export const PAYWALL_LEARNING = {
  title: "Continue today's learning journey",
  subtitle:
    "Keep phonics, study, math, olympiad, and spelling progressing every day—so momentum never pauses between school terms.",
  cta: "Unlock All Learning",
} as const;

export const PAYWALL_HUB = {
  title: "Continue exploring the Parent Hub",
  subtitle:
    "Life skills, stories, activities, and age-right tools—curated for 0–12, ready whenever your family needs the next step.",
  cta: "Continue My Child's Journey",
} as const;

export const PAYWALL_ROUTINES = {
  title: "Amy has already created routines your child loves",
  subtitle:
    "Continue creating personalized routines every day—for mornings, after-school, and bedtime that fit your child.",
  cta: "Continue Building Routines",
} as const;

export const PAYWALL_INFANT_SLEEP = {
  title: "Ready for a sleep plan built from your baby's patterns",
  subtitle:
    "AI Sleep Coach uses nap history and wake windows to recommend bedtime tweaks and a weekly focus—not generic sleep tips.",
  cta: "Unlock Sleep Guidance",
} as const;

export const PAYWALL_INFANT_FEEDING = {
  title: "Create meal plans for every stage of growth",
  subtitle:
    "A 7-day solids roadmap with allergy-safe intro order and portions from your baby's age and feeding logs.",
  cta: "Unlock Feeding Plans",
} as const;

export const PAYWALL_BIRTH_SKY = {
  title: "Your child's story has only begun",
  subtitle:
    "Unlock unlimited AI insights and keepsake stories that grow with your child.",
  cta: "Continue Exploring Birth Sky",
} as const;

export const PAYWALL_HEALTH_LAB = {
  title: "Build a lifelong wellness record",
  subtitle:
    "Health Lab turns daily care into clear trends—so you spot patterns early and celebrate real progress.",
  cta: "Unlock Health Lab",
} as const;

export const PAYWALL_GAMES = {
  title: "Unlock every educational game",
  subtitle:
    "Open the full play library and future releases—brain, memory, math, focus, and more beyond the two free starters.",
  cta: "Unlock All Games",
} as const;

export const CANCELLATION_RETENTION = {
  title: "Pausing slows what took weeks to build",
  body:
    "Your routines, Speech Coach sessions, learning streaks, and Coach plans stay active until this billing period ends. After that, the system rests—progress is safe, daily support is not. Many families switch to Growth Year instead of pausing mid-year.",
  bodyPeriodEnd:
    "Your routines, Speech Coach, learning, and Coach plans stay active until {{date}}. After that, daily support pauses—saved progress remains. Consider Growth Year if cost per month matters.",
  keepCta: "Keep the system active",
  cancelCta: "Pause at period end",
  note: "Return anytime—your family profile waits.",
} as const;

export const WIN_BACK = {
  headline: "Their routines and progress are still here",
  subheadline:
    "You already built momentum—Speech practice, learning paths, and calmer days. Reactivate and avoid starting over when your child is ready to continue.",
  cta: "Reactivate Growth Year",
  secondaryCta: "See all plans",
} as const;

export const ANNUAL_UPSELL = {
  title: "Switch to Growth Year—save ~33% vs monthly",
  subtitle:
    "You're on a shorter plan. Annual keeps coaching, Speech Coach, and learning unbroken through the school year at the lowest cost per month.",
  savingsHint: "Smartest Choice · Best LTV",
  cta: "Upgrade to Growth Year",
  dismiss: "Keep current plan",
} as const;

export const REFERRAL_PREMIUM = {
  title: "Share the system parents actually keep",
  subtitle:
    "Give friends the growth ecosystem you use—when 3 families try AmyNest and 1 subscribes, your child gets 30 premium days.",
  milestone: "3 friends start · 1 subscribes · 30 days premium for your family",
  cta: "Invite & earn 30 days",
  premiumMemberNote:
    "You're on Growth Year—gift premium access to parents still juggling separate apps.",
} as const;

// ─── Growth concepts (A/B, positioning tests) ────────────────────────────────

export const ANNUAL_POSITIONING_CONCEPTS = [
  "Growth Year: one subscription for the entire school year—no gaps when terms change.",
  "Pay for 10 months, get 12—save ~33% vs monthly and never break coaching continuity.",
  "The math parents notice: $3.33/month vs $4.99—same Premium either way.",
  "Annual = set and support: Speech Coach + learning + routines without re-subscribing in spring.",
  "Smartest Choice: same ecosystem, lowest cost per week of your child's development.",
  "Lock the year before routines slip—annual members report steadier mornings by week 3.",
  "Invest once in the platform that replaces tutor + routine app + parenting tips.",
  "Growth Year for families who are done trying one-off apps that don't connect.",
  "Best for siblings ages 0–12—one system, every profile, all year.",
  "Annual is for parents playing long-term: confidence, speech, learning—not monthly resets.",
] as const;

export const REVENUECAT_HEADLINE_CONCEPTS = [
  "The growth system for ages 0–12",
  "Eight tools. One subscription.",
  "Not tips. A full family system.",
  "Routines + learning + speech—connected",
  "Parent with a plan—not guesswork",
  "Replace five apps with AmyNest",
  "Help them grow. Stress less.",
  "Coach · Speech · Learning · Routines",
  "Built for busy parents ages 0–12",
  "Continue with AmyNest Premium",
] as const;

export const AI_PAYWALL_CONCEPTS = [
  "You don't have to figure this moment out alone",
  "Ask Amy before the moment escalates",
  "Calm answers for hard parenting minutes",
  "Tonight's bedtime—handled with a plan",
  "What to say when they won't listen",
  "From overwhelm to one clear next step",
  "Parenting clarity in under a minute",
  "Your on-call guide for ages 0–12",
  "Less Googling. More confidence.",
  "The reply you'd give if you weren't exhausted",
] as const;

export const CANCELLATION_SAVE_CONCEPTS = [
  "Pausing slows what took weeks to build",
  "Their Speech Coach streak is worth keeping",
  "Annual saves ~33%—switch instead of stopping?",
  "Progress is saved. Daily support isn't.",
  "You can pause—but kids lose rhythm fast",
  "Keep coaching active through report-card season",
  "One plan change vs starting over in 3 months",
  "Your routines still work—don't lose the guide",
  "Stay on Growth Year at $3.33/month",
  "Cancel later—try annual savings first",
] as const;

export const WIN_BACK_CONCEPTS = [
  "Their routines and progress are still here",
  "Pick up Speech Coach where they left off",
  "You don't have to rebuild from zero",
  "Welcome back—same child, same profile",
  "Reactivate before school routines reset",
  "30 seconds to restore their learning path",
  "The system you configured is waiting",
  "Continue Growth Year—lowest cost to return",
  "Miss calmer mornings? They're one tap away",
  "Your child's hub progress didn't disappear",
] as const;

export const AB_TEST_IDEAS = [
  "Default select: annual pre-selected vs six_month pre-selected on paywall",
  "Hero A: ecosystem headline vs outcome headline (stress reduction)",
  "Annual card: show $3.33/mo equivalent vs show $39.99/year only",
  "Six_month badge: Most Popular vs Smartest Choice annual",
  "Pricing order: annual-left vs six_month-center highlighted",
  "Paywall CTA: Continue with AmyNest Premium vs Explore free",
  "AI limit paywall: show today's free count vs hide count (outcome-only)",
  "Cancellation: offer annual switch inline vs retention copy only",
  "Win-back: 10% off annual first month vs no discount copy-only",
  "Post-purchase: show 'start routine' vs 'ask Amy' first-action prompt",
] as const;

export type PaywallReason =
  | "ai_quota"
  | "infant_ai_quota"
  | "personalized_coaching"
  | "premium_insight"
  | "child_limit"
  | "audio_lessons"
  | "routines_limit"
  | "behavior_locked"
  | "child_locked"
  | "coach_locked"
  | "hub_locked"
  | "hub_journey"
  | "feature"
  | "section_locked"
  | "phonics_workbook"
  | "hub_nutrition"
  | "nutrition_library"
  | "speech_coach"
  | "learning_locked"
  | "infant_sleep_coach"
  | "infant_feeding_plan";

export const PAYWALL_REASON_COPY: Record<
  PaywallReason,
  { title: string; subtitle: string; cta?: string }
> = {
  ai_quota: PAYWALL_AI,
  infant_ai_quota: PAYWALL_INFANT_AI,
  speech_coach: PAYWALL_SPEECH_COACH,
  learning_locked: PAYWALL_LEARNING,
  hub_locked: PAYWALL_HUB,
  hub_journey: PAYWALL_LEARNING,
  section_locked: PAYWALL_HUB,
  routines_limit: PAYWALL_ROUTINES,
  infant_sleep_coach: PAYWALL_INFANT_SLEEP,
  infant_feeding_plan: PAYWALL_INFANT_FEEDING,
  coach_locked: {
    title: "A plan for this exact parenting moment",
    subtitle:
      "Amy Coach turns tantrums, defiance, screens, and sleep struggles into 10–12 clear steps—for your child's age, not generic advice.",
    cta: "Unlock Personalized Coaching",
  },
  personalized_coaching: {
    title: "A plan for this exact parenting moment",
    subtitle:
      "Amy Coach turns tantrums, defiance, screens, and sleep struggles into 10–12 clear steps—for your child's age, not generic advice.",
    cta: "Unlock Personalized Coaching",
  },
  premium_insight: {
    title: "See the complete picture of your child's growth",
    subtitle:
      "Unlock weekly reports and deeper insights across wins, hard days, and milestones.",
    cta: "Unlock Weekly Reports",
  },
  child_limit: {
    title: "Every child deserves their own growth plan",
    subtitle:
      "Separate routines, progress, and coaching per child—one ecosystem, no profile left behind.",
    cta: "Support Every Child",
  },
  child_locked: {
    title: "Every child deserves their own growth plan",
    subtitle:
      "Separate routines, progress, and coaching per child—one ecosystem, no profile left behind.",
    cta: "Support Every Child",
  },
  audio_lessons: {
    title: "Wind-down that still teaches",
    subtitle:
      "Calm audio stories and focus tracks—ready when you need five peaceful minutes that count.",
    cta: "Unlock Audio Lessons",
  },
  behavior_locked: {
    title: "Log once. Parent smarter after.",
    subtitle:
      "Behavior tracking fuels insights—so the next meltdown has context, not confusion.",
    cta: "Unlock Behavior Insights",
  },
  phonics_workbook: {
    title: "Reading confidence starts at your table",
    subtitle:
      "Printable phonics workbooks for ages 3–7—practice together with structured worksheets.",
    cta: "Unlock Phonics Workbooks",
  },
  hub_nutrition: {
    title: "Create meal plans for every stage of growth",
    subtitle:
      "Allergy-aware, routine-friendly nutrition help—less dinner stress, better energy for learning.",
    cta: "Unlock Meal Plans",
  },
  nutrition_library: {
    title: "Download expert nutrition guides",
    subtitle:
      "Unlock the full Nutrition Library for printable guides matched to your family's stage.",
    cta: "Unlock Nutrition Library",
  },
  feature: UPGRADE_MODAL,
};

export function buildPlanCardsForApi(): Array<{
  id: PaidPlanId;
  title: string;
  tagline: string;
  description: string;
  badge: string | null;
  features: string[];
  valueAnchor?: string;
}> {
  return (["yearly", "six_month", "monthly"] as const).map((id) => ({
    id,
    title: PLAN_MARKETING[id].title,
    tagline: PLAN_MARKETING[id].tagline,
    description: PLAN_MARKETING[id].description,
    badge: PLAN_BADGES[id],
    features: PLAN_MARKETING[id].features,
    valueAnchor: PLAN_MARKETING[id].valueAnchor,
  }));
}

export function planCta(plan: PaidPlanId): string {
  return PLAN_MARKETING[plan].cta;
}
