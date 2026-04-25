// Goal-specific prompt appendices.
// Each goal ID maps to a "family" of expert focus areas, psychological
// concepts, and must-include themes. The main prompt in ai-coach.ts
// already ships the base rules + JSON schema; this module returns the
// goal-specific section that is appended to differentiate output.

type GoalFamily =
  | "tantrum" | "aggression" | "defiance" | "emotional" | "separation"
  | "screen" | "focus" | "learning"
  | "eating"
  | "sleep"
  | "stubborn"
  | "coparenting" | "generic"
  // NEW families
  | "toddler" | "potty" | "siblings" | "selfcare" | "transitions"
  // Kids Health Concern (research & science-based)
  | "obesity" | "nutrition" | "immunity" | "dental" | "digitalhealth" | "development";

interface FamilyPrompt {
  focus: string[];
  concepts: string[];
  mustInclude: string[];
  experts?: string[];
}

const FAMILIES: Record<GoalFamily, FamilyPrompt> = {
  tantrum: {
    focus: [
      "Emotional regulation and co-regulation between parent and child",
      "Preventing triggers before escalation (hunger, tiredness, transitions)",
      "Teaching the child to name and ride the feeling wave",
    ],
    concepts: [
      "Prefrontal cortex development and 'flipped lid' neuroscience",
      "Window of tolerance and nervous-system states",
      "Emotional validation and attuned responses",
    ],
    mustInclude: [
      "Wins that cover BEFORE a tantrum (prevention and connection)",
      "Wins that cover DURING a tantrum (co-regulation and safety)",
      "Wins that cover AFTER a tantrum (repair, teaching and reflection)",
    ],
    experts: ["Dan Siegel", "Tina Payne Bryson", "Mona Delahooke", "Stephen Porges"],
  },
  aggression: {
    focus: [
      "Reading hitting/biting as communication, not character",
      "Rebuilding impulse-control via tiny repeatable practices",
      "Restoring relationship safety after aggressive episodes",
    ],
    concepts: [
      "Fight-flight-freeze biology and sensory overload",
      "Mirror neurons and modelling of regulated behaviour",
      "Replacement behaviour training",
    ],
    mustInclude: [
      "A clear in-the-moment safety script (blocking without shaming)",
      "Teaching a specific replacement skill (words, body cues, signals)",
      "Repair ritual and rebuilding trust after each incident",
    ],
    experts: ["Mona Delahooke", "Ross Greene", "Dan Siegel"],
  },
  defiance: {
    focus: [
      "Cooperation through connection, not compliance through pressure",
      "Dissolving power struggles by sharing real control",
      "Making the 'yes path' easier than the 'no path'",
    ],
    concepts: [
      "Self-Determination Theory (autonomy, competence, relatedness)",
      "Choice architecture and limited real choices",
      "Collaborative Problem Solving",
    ],
    mustInclude: [
      "A script for giving two genuine choices inside a firm limit",
      "How to hold the limit warmly when pushback escalates",
      "How to build a week of small cooperation wins",
    ],
    experts: ["Deci & Ryan", "Ross Greene", "Diana Baumrind"],
  },
  emotional: {
    focus: [
      "Building the child's emotional vocabulary and interoception",
      "Parent as external regulator before internal regulation develops",
      "Daily rhythms that stabilise the nervous system",
    ],
    concepts: [
      "Polyvagal Theory and co-regulation",
      "Emotion granularity (naming feelings reduces intensity)",
      "Attachment security as the regulation platform",
    ],
    mustInclude: [
      "A feelings-naming practice that happens during CALM moments",
      "A breathing/body-based regulation tool both parent and child use",
      "A nightly check-in ritual that processes the day's emotions",
    ],
    experts: ["Stephen Porges", "Lisa Feldman Barrett", "Dan Siegel"],
  },
  separation: {
    focus: [
      "Secure-base behaviour and predictable goodbyes",
      "Gradual practice of independence in low-stakes settings",
      "Shrinking separation anxiety without dismissing the feeling",
    ],
    concepts: [
      "Attachment theory and the secure-base / safe-haven cycle",
      "Object permanence and 'return rituals'",
      "Gradual exposure and graduated independence",
    ],
    mustInclude: [
      "A consistent goodbye ritual (same words, same gesture, every time)",
      "A reunion ritual that reliably restores connection",
      "A graded practice ladder (2 min apart → 15 min → longer)",
    ],
    experts: ["John Bowlby", "Mary Ainsworth", "Circle of Security"],
  },
  screen: {
    focus: [
      "The dopamine-addiction cycle and attention hijacking",
      "Replacing screens with high-reward offline alternatives",
      "Environment redesign so willpower isn't needed",
    ],
    concepts: [
      "Dopamine regulation and variable-reward schedules",
      "Reward-system reset and boredom as fuel for creativity",
      "Behavioural environment design (Nudge, choice architecture)",
    ],
    mustInclude: [
      "A gradual weaning plan (not cold turkey) with exact minute-targets per day",
      "A menu of concrete offline alternatives matched to the child's interests",
      "A parent-consistency system so rules don't bend under protest",
    ],
    experts: ["Anna Lembke (Dopamine Nation)", "Nir Eyal", "Thaler & Sunstein"],
  },
  focus: {
    focus: [
      "Attention-span building through graded practice",
      "Reducing environmental distractions",
      "Single-tasking and deep-work habits appropriate for the age",
    ],
    concepts: [
      "Cognitive load theory and working-memory limits",
      "Attentional training and Pomodoro-style intervals for kids",
      "Screen-attention residue and recovery time",
    ],
    mustInclude: [
      "A specific focus-building exercise progression (by minutes)",
      "An environment-setup checklist (lighting, seating, no phone, etc.)",
      "How screens earlier in the day impact focus later",
    ],
    experts: ["John Sweller (cognitive load)", "Daniel Willingham", "Adam Gazzaley"],
  },
  learning: {
    focus: [
      "Intrinsic motivation over bribes or fear",
      "Growth mindset and productive struggle",
      "Making effort visible and celebrated",
    ],
    concepts: [
      "Growth vs fixed mindset (Dweck)",
      "Zone of Proximal Development (Vygotsky)",
      "Spaced repetition and retrieval practice",
    ],
    mustInclude: [
      "A process-praise script (praise effort, strategy, not ability)",
      "A homework/study routine that matches the child's attention span",
      "How to reframe failure as data, not identity",
    ],
    experts: ["Carol Dweck", "Lev Vygotsky", "Barbara Oakley"],
  },
  eating: {
    focus: [
      "Pressure-free mealtimes and autonomy building",
      "Repeated neutral exposure to new foods",
      "Restoring trust between child and hunger/fullness cues",
    ],
    concepts: [
      "Ellyn Satter's Division of Responsibility",
      "Mere-exposure effect and food neophobia",
      "Interoceptive awareness and self-regulation",
    ],
    mustInclude: [
      "What NOT to do at the table (no forcing, no bribing, no grazing)",
      "How to introduce new foods across 10-15 low-pressure exposures",
      "How to design the mealtime environment and parent tone",
    ],
    experts: ["Ellyn Satter", "Leann Birch"],
  },
  sleep: {
    focus: [
      "Circadian-rhythm regulation and light/dark cues",
      "Sleep associations the child can carry alone",
      "Bedtime resistance as a transition problem, not defiance",
    ],
    concepts: [
      "Melatonin cycle and bright-light/dim-light timing",
      "Habit loops (cue → routine → reward) applied to bedtime",
      "Extinction-burst research in gentle sleep training",
    ],
    mustInclude: [
      "A specific 30-45 minute pre-sleep routine (same order every night)",
      "A night-waking response ladder (calm, consistent, boring)",
      "A consistency system that survives weekends and travel",
    ],
    experts: ["Matthew Walker", "Richard Ferber", "Jodi Mindell"],
  },
  stubborn: {
    focus: [
      "Dismantling power struggles before they start",
      "Autonomy vs control — giving real micro-choices",
      "Building cooperation through predictable warmth + firmness",
    ],
    concepts: [
      "Choice architecture and two-option framing",
      "Positive reinforcement and specific praise",
      "Authoritative parenting (high warmth + high structure)",
    ],
    mustInclude: [
      "How to avoid the conflict entirely by changing the setup",
      "Scripts for offering controlled choices that the parent can live with",
      "A 7-day cooperation-building plan with tracked wins",
    ],
    experts: ["Diana Baumrind", "B.F. Skinner", "Ross Greene"],
  },
  coparenting: {
    focus: [
      "Unified adult front even when beliefs differ",
      "Boundaries with extended family without burning bridges",
      "Processing parent guilt so it doesn't leak into the child",
    ],
    concepts: [
      "Family-systems theory and triangulation",
      "Values-based parenting (ACT matrix) over rule-based",
      "Ruptures and repairs in the adult relationship",
    ],
    mustInclude: [
      "A weekly 15-minute parent-sync script (what's working, what's not)",
      "A diplomatic but firm phrase bank for grandparents/relatives",
      "A guilt-reframing practice the working parent can do in 3 minutes",
    ],
    experts: ["John Gottman", "Murray Bowen", "Becky Kennedy"],
  },
  generic: {
    focus: ["Deep, practical, science-based parenting solutions"],
    concepts: ["Neuroscience, behavioural psychology, habit formation"],
    mustInclude: ["Real-life actionable steps tailored to the stated goal"],
  },
  // ─── NEW FAMILIES ──────────────────────────────────────────────────
  toddler: {
    focus: [
      "2–4 yr brain: massive prefrontal-cortex pruning, almost no impulse control",
      "Autonomy explosion + still-developing language = behaviour IS the communication",
      "Co-regulation: parent's calm body lends regulation to the toddler's body",
    ],
    concepts: [
      "Erikson: Autonomy vs. Shame & Doubt stage (2–4 yrs)",
      "Daniel Siegel & Tina Bryson — 'flipped lid' / hand model of the brain",
      "Mona Delahooke — bottom-up vs top-down behaviour",
      "Stephen Porges — polyvagal regulation",
    ],
    mustInclude: [
      "A specific in-the-moment script (what to SAY in 10 words or less)",
      "A connection ritual that PREVENTS the next episode (≤5 min)",
      "A 'give them control inside a limit' choice script (two real options)",
      "A repair script for after the storm passes",
    ],
    experts: ["Dan Siegel", "Tina Payne Bryson", "Mona Delahooke", "Janet Lansbury", "Becky Kennedy"],
  },
  potty: {
    focus: [
      "Readiness signs (dryness intervals, body awareness, interest)",
      "Pressure-free, child-led process — accidents are NOT failures",
      "Day mastery before night; night-time dryness is largely physiological maturation",
    ],
    concepts: [
      "AAP toilet-training readiness (typical window 18 months – 3 yrs)",
      "ICCS (Brazelton) child-oriented approach — significantly fewer regressions",
      "Operant conditioning: tiny celebrations beat sticker charts long-term",
      "Antidiuretic hormone (ADH) maturation — night dryness ≠ effort",
    ],
    mustInclude: [
      "A clear readiness-check (yes/no) the parent can do this week",
      "Step-by-step day-1 plan (clothes off, timer, snack/drink loading)",
      "Exact words for accidents (no shame, no praise — neutral coaching)",
      "When to PAUSE training (regressions, illness, big life changes)",
    ],
    experts: ["T. Berry Brazelton", "AAP", "Jamie Glowacki", "Dr Steve Hodges"],
  },
  siblings: {
    focus: [
      "Each child's emotional bucket — rivalry is starvation, not malice",
      "Stop being the referee — coach skills, not verdicts",
      "Protect the relationship long-term, not the moment's peace",
    ],
    concepts: [
      "Adler/Dreikurs — sibling positions and the 'mistaken goal' of attention",
      "Faber & Mazlish — 'do not compare, describe what you see'",
      "Attachment theory — secure base required for prosocial sibling behaviour",
      "Conflict-resolution scaffolding (sportscasting → coaching → stepping back)",
    ],
    mustInclude: [
      "A 1:1 connection ritual (15 min/day per child) — the #1 evidence-based intervention",
      "A sportscasting script for live conflicts (describe, do not judge)",
      "A repair conversation after a hit/bite that builds empathy, not shame",
      "A 'no comparing' rephrase library (replace 'why can't you be like X')",
    ],
    experts: ["Adele Faber & Elaine Mazlish", "Janet Lansbury", "Laura Markham", "Becky Kennedy"],
  },
  selfcare: {
    focus: [
      "You cannot pour from an empty cup — parent regulation IS the intervention",
      "Burnout is a nervous-system state, not a willpower failure",
      "Tiny 2–10 min restoration beats hour-long fantasies you'll never get",
    ],
    concepts: [
      "Maslach burnout inventory — emotional exhaustion + depersonalisation + low efficacy",
      "Polyvagal theory — completing the stress cycle (Nagoski)",
      "Self-Compassion (Kristin Neff) — three components: kindness, common humanity, mindfulness",
      "Sleep deprivation cognition cost — 6 hrs × 10 nights ≈ 24 hrs awake",
    ],
    mustInclude: [
      "A 2-min nervous-system reset the parent can do mid-meltdown",
      "One boundary script to protect 10 min/day non-negotiable",
      "A reframe practice for guilt (specific cognitive-distortion challenge)",
      "A weekly 'minimum viable rest' plan that survives chaos",
    ],
    experts: ["Emily & Amelia Nagoski", "Kristin Neff", "Christina Maslach", "Becky Kennedy"],
  },
  transitions: {
    focus: [
      "Predictability is the antidote to transition anxiety",
      "Pre-loading (preview, rehearse, role-play) reduces in-the-moment overwhelm by ~50%",
      "Hold both feelings: this is hard AND we will be okay",
    ],
    concepts: [
      "Transitional objects (Winnicott) — anchor of safety in new spaces",
      "Bowlby attachment — secure base allows exploration of unfamiliar environments",
      "Cognitive rehearsal & habituation — repeated low-stakes exposure",
      "Story-based scripts (Carol Gray's Social Stories) for predictability",
    ],
    mustInclude: [
      "A pre-trip / pre-event preview ritual (visuals, story, what to expect)",
      "A 'comfort kit' packing list specific to the situation",
      "Day-of script for departure (no sneaking out, no over-explaining)",
      "A post-event decompression ritual to integrate the experience",
    ],
    experts: ["John Bowlby", "Donald Winnicott", "Carol Gray", "Tina Payne Bryson"],
  },

  // ─── Kids Health Concern (research & science-based) ─────────────────
  obesity: {
    focus: [
      "Family-based behaviour change (the parent is the system, not the child)",
      "Environment > willpower — what's in the home is what gets eaten",
      "Movement as joy, not punishment; sleep & stress as primary metabolic levers",
    ],
    concepts: [
      "AAP 2023 clinical guideline: Intensive Health Behaviour & Lifestyle Treatment (IHBLT) ≥ 26 contact hours/year",
      "Ellyn Satter's Division of Responsibility — never restrict food, never force",
      "Energy density, ultra-processed food displacement, and the 'NOVA' classification",
      "Sleep ↔ leptin/ghrelin axis; <9 hrs sleep doubles obesity risk in school-age kids (Cappuccio meta-analysis)",
      "BMI percentile interpretation (≥85th overweight, ≥95th obesity) per CDC growth charts",
    ],
    mustInclude: [
      "A 5-2-1-0 daily target (5 fruit/veg, ≤2 hrs recreational screen, 1 hr active play, 0 sugary drinks) — AAP-endorsed",
      "Concrete pantry & fridge swaps (specific products to remove, specific products to add)",
      "A weight-NEUTRAL language script — focus on 'strong body / energy', never on size, fat, or diet",
      "When to involve a paediatrician (BMI ≥95th %ile, comorbidities like acanthosis nigricans, snoring, knee pain)",
      "A non-food reward menu for celebrations and stress",
    ],
    experts: ["AAP (Hampl et al. 2023 guideline)", "Ellyn Satter", "Dr Yoni Freedhoff", "Dr David Ludwig"],
  },
  nutrition: {
    focus: [
      "Iron, vitamin D, B12, zinc and iodine are the silent shortfalls in Indian/South-Asian kids",
      "Bioavailability matters more than raw quantity (heme vs non-heme iron, calcium-iron timing, phytate inhibition)",
      "Hidden hunger looks like normal weight — flag fatigue, pallor, frequent infections, picky eating, poor focus",
    ],
    concepts: [
      "ICMR-NIN 2020 RDA (recommended dietary allowances) for Indian children",
      "WHO 'first 1000 days' window — deficiencies here cause permanent cognitive shortfalls",
      "Iron-deficiency anaemia: 67% of Indian under-5s (NFHS-5) — strongest evidence-based link to school performance",
      "Vitamin D deficiency in Indian kids ≈ 70-90% (sunlight is necessary but not sufficient with modern lifestyle)",
      "Vegetarian-specific risks: B12 (only in animal foods or fortified) and absorbable iron",
    ],
    mustInclude: [
      "A red-flag symptom checklist (when to ask the paediatrician for a CBC + ferritin + 25(OH)D test)",
      "An Indian/desi 'iron-rich plate' template (palak/dal/rajma + vit-C source like nimbu/amla/tomato in same meal)",
      "Smart pairings & anti-pairings (no chai/coffee/dairy with iron meal; vit-C boosts absorption 3-4×)",
      "A weekly fortification swap list (e.g., double-fortified salt, ragi/bajra rotation, fortified milk, eggs)",
      "When supplements are appropriate vs food-first (only after testing; never self-supplement multi-vitamins)",
    ],
    experts: ["ICMR-NIN India", "WHO/UNICEF", "Dr Nimali Fernando (Doctor Yum)", "Dr Tim Spector"],
  },
  immunity: {
    focus: [
      "Frequent illness in 1-5 yr olds is normal immune training (8-12 colds/year average) — not weakness",
      "Sleep, gut microbiome, and outdoor play are the three biggest evidence-based immunity levers",
      "When 'frequent illness' becomes a red flag (>1 ear infection/2 months, >2 pneumonias/year, failure to thrive)",
    ],
    concepts: [
      "Hygiene hypothesis & old friends theory — microbial diversity calibrates the immune system",
      "Vitamin D's role in innate + adaptive immunity (Cochrane review: supplementation reduces respiratory infections)",
      "Gut-immune axis — 70% of immune cells live in the GALT; fibre & fermented foods feed them",
      "Sleep deprivation halves antibody response to vaccines (Prather et al.)",
      "Indian immunisation schedule (IAP) and the catch-up logic for missed vaccines",
    ],
    mustInclude: [
      "A daily immunity stack the family can sustain (sleep target by age, ≥60 min outdoor play, fibre + fermented food)",
      "Hand-hygiene script (when, how long — '20 sec = sing happy birthday twice')",
      "A 'sick day' decision tree: when to keep home, when to call doctor, when ER",
      "What does NOT boost immunity (zinc lozenges for kids, mega-vit-C, immunity 'tonics' — debunk gently)",
      "Vaccination catch-up reminder + ICMR/IAP-aligned calendar reference",
    ],
    experts: ["Indian Academy of Pediatrics (IAP)", "WHO", "Dr Tim Spector", "Dr Tina Bhutani"],
  },
  dental: {
    focus: [
      "Tooth decay in under-5s is the #1 chronic disease worldwide — and almost 100% preventable",
      "Two non-negotiables: fluoride toothpaste from the FIRST tooth + no bottle/sippy in bed with anything but water",
      "Sugar frequency matters more than sugar quantity (each sugar exposure = 20-min acid attack)",
    ],
    concepts: [
      "AAPD/Indian Society of Pedodontics: brush twice daily with fluoride from age 0 (rice-grain → pea-size at 3)",
      "Early Childhood Caries (ECC) and 'baby bottle tooth decay' — mechanism is biofilm + sugar + time",
      "Streptococcus mutans transmission from caregiver to baby (no shared spoons, no pre-chewing food)",
      "First dental visit by age 1 (AAPD) — preventive care, not treatment, is the goal",
      "Fluoride debate evidence: WHO/AAP/IAP unanimously recommend appropriate-dose fluoride; risk is over- not under-use",
    ],
    mustInclude: [
      "An age-specific brushing protocol (who brushes, how long, technique, parent supervision until age 7-8)",
      "Toothpaste amount script (rice grain 0-3 yrs, pea-size 3-6 yrs, full strip 6+) — and 'spit, don't rinse'",
      "Sugar-frequency rules (sweet treats only with meals, never sipped/grazed; water between meals)",
      "First dental visit timing + what to expect (and how to make it fun, not scary)",
      "Tooth-injury first-aid (knocked-out milk vs permanent tooth — DIFFERENT protocols)",
    ],
    experts: ["AAPD (American Academy of Pediatric Dentistry)", "Indian Society of Pedodontics", "WHO Oral Health Programme"],
  },
  digitalhealth: {
    focus: [
      "This is NOT just about addiction — it's about EYES, posture, sleep, and developing brains",
      "The 20-20-20 rule and 2 hours of daylight outdoor exposure are the strongest myopia-prevention evidence we have",
      "Blue-light fear is overblown; what matters is total screen TIME, screen DISTANCE, and the LAST hour before bed",
    ],
    concepts: [
      "AAP/AAO screen-time guidelines (0 under 18 mo except video calls; ≤1 hr 2-5 yr; consistent limits 6+)",
      "Childhood myopia epidemic — Asian populations 80%+ by adulthood; outdoor time is the single biggest protective factor",
      "Digital eye strain (asthenopia): blink rate drops by 60% at screens; dryness, headache, blur",
      "Melatonin suppression: bright screens 1 hr pre-bed delay sleep onset by 30-60 min in kids (Hale & Guan meta-analysis)",
      "Tech-neck posture: 60° head flexion = 27 kg load on developing cervical spine",
    ],
    mustInclude: [
      "20-20-20 rule (every 20 min, 20-sec break, look 20 ft away) — taught as a game",
      "≥ 2 hrs/day daylight outdoor target — myopia prevention, dose-dependent",
      "Screen distance & posture rules (arm's length for tablet, eye-level top of monitor, feet flat)",
      "A no-screen-1-hr-before-bed protocol with a substitute wind-down ritual",
      "Symptom checklist: when to see optometrist (squinting, head-tilt, sitting too close, complaining of headaches)",
    ],
    experts: ["AAP/AAO joint statement", "All India Ophthalmological Society", "Dr Anna Lembke (Dopamine Nation)", "WHO"],
  },
  development: {
    focus: [
      "Milestones are signposts, not deadlines — but RED FLAGS need same-week paediatric review (don't wait & watch)",
      "Serve-and-return interactions are the brain-builder — quality > quantity > toys > apps",
      "Early intervention before age 3 changes lifelong trajectory; after age 5 the cost of inaction multiplies"
    ],
    concepts: [
      "CDC/AAP developmental milestone checklist (updated 2022) — gross motor, fine motor, language, social, cognitive",
      "Critical periods of synaptic pruning — most rapid in first 1000 days",
      "Harvard Center on the Developing Child — toxic stress vs serve-and-return architecture",
      "M-CHAT-R/F autism screening at 18 + 24 months (universal screening recommended by AAP)",
      "Indian context: Trivandrum Developmental Screening Chart (TDSC) and IAP red-flag list",
    ],
    mustInclude: [
      "Age-specific 'should-do-by-now' milestones AND specific RED FLAGS that need a paediatrician this week",
      "Serve-and-return script for daily play (5 simple steps to do during diaper change, meal, bath)",
      "A no-screen-under-2 reminder + the WHY (passive viewing replaces the language input that builds the brain)",
      "When/how to ask for a developmental assessment (pediatrician → developmental ped → therapist) without panic",
      "A weekly 'milestone check-in' the parent does without the child knowing they're being assessed",
    ],
    experts: ["CDC Learn the Signs / AAP Bright Futures", "Harvard Center on the Developing Child", "Indian Academy of Pediatrics", "Dr T. Berry Brazelton"],
  },
};

const GOAL_TO_FAMILY: Record<string, GoalFamily> = {
  // Behavior
  "manage-tantrums": "tantrum",
  "handle-aggression": "aggression",
  "reduce-defiance": "defiance",
  "emotional-regulation": "emotional",
  "separation-anxiety": "separation",
  "change-stubborn-behaviour": "stubborn",
  // Screen & Focus
  "balance-screen-time": "screen",
  "reduce-mobile-addiction": "screen",
  "reduce-shorts-overuse": "screen",
  "reduce-instant-gratification": "screen",
  "improve-focus-span": "focus",
  // Eating
  "encourage-independent-eating": "eating",
  "navigate-fussy-eating": "eating",
  "stop-junk-food-craving": "eating",
  "healthy-eating-routine": "eating",
  "improve-mealtime-behavior": "eating",
  // Sleep
  "improve-sleep-patterns": "sleep",
  "fix-bedtime-resistance": "sleep",
  "stop-night-waking": "sleep",
  "consistent-sleep-routine": "sleep",
  "reduce-late-sleeping": "sleep",
  // Learning
  "boost-concentration": "focus",
  "build-study-discipline": "learning",
  "increase-learning-interest": "learning",
  "reduce-homework-resistance": "learning",
  "develop-growth-mindset": "learning",
  // Parenting challenges
  "manage-grandparents-interference": "coparenting",
  "align-parenting-between-parents": "coparenting",
  "handle-working-parent-guilt": "coparenting",
  "set-consistent-family-rules": "coparenting",
  // Toddler Behavior (2–4)
  "toddler-tantrums": "toddler",
  "hitting-biting": "toddler",
  "no-phase": "toddler",
  "public-meltdowns": "toddler",
  "whining-and-clinginess": "toddler",
  // Daily Skills & Independence
  "potty-training-readiness": "potty",
  "potty-day-training": "potty",
  "potty-night-training": "potty",
  "potty-public-anxiety": "potty",
  "self-dressing": "potty",
  // Family Dynamics
  "sibling-rivalry": "siblings",
  "sharing-turn-taking": "siblings",
  "new-baby-adjustment": "siblings",
  "sibling-fights": "siblings",
  "favouritism-feelings": "siblings",
  // Parent Self-Care
  "parent-burnout": "selfcare",
  "anger-management-parent": "selfcare",
  "find-me-time": "selfcare",
  "parent-sleep": "selfcare",
  "mom-guilt": "selfcare",
  // Special Situations
  "travel-with-kids": "transitions",
  "hospital-doctor-visit": "transitions",
  "daycare-school-transition": "transitions",
  "welcoming-new-sibling": "transitions",
  "moving-houses": "transitions",
  // Kids Health Concern (research & science-based)
  "child-obesity-management": "obesity",
  "nutrition-deficiency": "nutrition",
  "boost-immunity": "immunity",
  "dental-health": "dental",
  "digital-health-eye-care": "digitalhealth",
  "early-milestones-0-5": "development",
};

// ─── HINDI / HINGLISH BRIEFS for the 5 NEW families ─────────────────
// (English is the default; these override only when the user picks Hindi or Hinglish.)
type LangBrief = Partial<Record<"hi" | "hinglish", FamilyPrompt>>;

const FAMILY_TRANSLATIONS: Partial<Record<GoalFamily, LangBrief>> = {
  toddler: {
    hi: {
      focus: [
        "2–4 साल का दिमाग: prefrontal cortex अभी विकसित हो रहा है, impulse control लगभग शून्य",
        "स्वायत्तता का विस्फोट + भाषा अभी अधूरी = व्यवहार ही बच्चे की भाषा है",
        "Co-regulation: माता-पिता का शांत शरीर बच्चे के शरीर को शांति उधार देता है",
      ],
      concepts: [
        "Erikson: Autonomy vs. Shame & Doubt अवस्था (2–4 वर्ष)",
        "Daniel Siegel व Tina Bryson — 'flipped lid' / दिमाग का hand model",
        "Mona Delahooke — bottom-up बनाम top-down behaviour",
        "Stephen Porges — polyvagal regulation",
      ],
      mustInclude: [
        "तूफ़ान के बीच का सटीक script (10 शब्दों में क्या कहना है)",
        "अगले एपिसोड को रोकने वाला connection ritual (≤5 मिनट)",
        "'सीमा के अंदर control दो' वाला choice script (दो असली विकल्प)",
        "तूफ़ान के बाद का repair script",
      ],
      experts: ["Dan Siegel", "Tina Payne Bryson", "Mona Delahooke", "Janet Lansbury", "Becky Kennedy"],
    },
    hinglish: {
      focus: [
        "2–4 yr ka brain: prefrontal cortex abhi develop ho raha hai, impulse control almost zero",
        "Autonomy explosion + abhi-poori-nahi language = behaviour hi bachche ki language hai",
        "Co-regulation: parent ka calm body bachche ke body ko regulation udhaar deta hai",
      ],
      concepts: [
        "Erikson: Autonomy vs. Shame & Doubt stage (2–4 yrs)",
        "Daniel Siegel aur Tina Bryson — 'flipped lid' / brain ka hand model",
        "Mona Delahooke — bottom-up vs top-down behaviour",
        "Stephen Porges — polyvagal regulation",
      ],
      mustInclude: [
        "Toofan ke beech ka exact script (10 words ya kam mein kya bolna hai)",
        "Agle episode ko prevent karne wala connection ritual (≤5 min)",
        "'Limit ke andar control do' wala choice script (do real options)",
        "Toofan ke baad ka repair script",
      ],
      experts: ["Dan Siegel", "Tina Payne Bryson", "Mona Delahooke", "Janet Lansbury", "Becky Kennedy"],
    },
  },
  potty: {
    hi: {
      focus: [
        "Readiness के संकेत (सूखे रहने का अंतराल, body awareness, रुचि)",
        "बिना दबाव, बच्चे की रफ़्तार पर — accidents असफलता नहीं हैं",
        "पहले दिन की महारत, फिर रात; रात की सूखापन मुख्यतः शारीरिक परिपक्वता है",
      ],
      concepts: [
        "AAP toilet-training readiness (आम window 18 महीने – 3 वर्ष)",
        "ICCS (Brazelton) child-oriented approach — कम regressions",
        "Operant conditioning: छोटी celebrations sticker chart से बेहतर लम्बी अवधि में",
        "Antidiuretic hormone (ADH) maturation — रात की सूखापन ≠ कोशिश",
      ],
      mustInclude: [
        "इस हफ्ते करने योग्य एक स्पष्ट readiness-check (हाँ/नहीं)",
        "Day-1 step-by-step plan (कपड़े उतार, timer, snack/drink loading)",
        "Accident के लिए सटीक शब्द (न शर्म, न तारीफ़ — neutral coaching)",
        "Training कब रोकें (regressions, बीमारी, बड़े बदलाव)",
      ],
      experts: ["T. Berry Brazelton", "AAP", "Jamie Glowacki", "Dr Steve Hodges"],
    },
    hinglish: {
      focus: [
        "Readiness ke signs (dry rehne ka interval, body awareness, interest)",
        "Bina pressure, bachche ki speed pe — accidents failure nahi hain",
        "Pehle din ki mastery, phir raat; raat ki dryness mostly physiological maturation hai",
      ],
      concepts: [
        "AAP toilet-training readiness (typical window 18 months – 3 yrs)",
        "ICCS (Brazelton) child-oriented approach — kam regressions",
        "Operant conditioning: chhoti celebrations sticker chart se behtar long-term",
        "Antidiuretic hormone (ADH) maturation — raat ki dryness ≠ effort",
      ],
      mustInclude: [
        "Is hafte ho sakne wala ek clear readiness-check (haan/nahi)",
        "Day-1 step-by-step plan (kapde utaar, timer, snack/drink loading)",
        "Accidents ke liye exact words (na sharam, na taarif — neutral coaching)",
        "Training kab pause karein (regressions, illness, bade life changes)",
      ],
      experts: ["T. Berry Brazelton", "AAP", "Jamie Glowacki", "Dr Steve Hodges"],
    },
  },
  siblings: {
    hi: {
      focus: [
        "हर बच्चे की भावनात्मक बाल्टी — rivalry भूख है, द्वेष नहीं",
        "Referee बनना बंद करें — verdict नहीं, skill सिखाएँ",
        "लम्बे समय के रिश्ते की रक्षा करें, पल की शांति की नहीं",
      ],
      concepts: [
        "Adler/Dreikurs — sibling positions और attention का 'mistaken goal'",
        "Faber & Mazlish — 'comparison नहीं, जो दिख रहा है उसे describe करो'",
        "Attachment theory — secure base के बिना prosocial sibling व्यवहार नहीं",
        "Conflict-resolution scaffolding (sportscasting → coaching → पीछे हटना)",
      ],
      mustInclude: [
        "हर बच्चे के साथ 1:1 connection ritual (15 मिनट/दिन) — सबसे प्रमाणित intervention",
        "Live झगड़े के लिए sportscasting script (describe करें, judge नहीं)",
        "मारपीट के बाद empathy बढ़ाने वाली repair conversation",
        "'Comparison मत करो' के लिए rephrase library",
      ],
      experts: ["Adele Faber & Elaine Mazlish", "Janet Lansbury", "Laura Markham", "Becky Kennedy"],
    },
    hinglish: {
      focus: [
        "Har bachche ki emotional bucket — rivalry bhookh hai, dushmani nahi",
        "Referee banna band karein — verdict nahi, skill sikhaayein",
        "Long-term rishtey ki raksha karein, pal ki shanti ki nahi",
      ],
      concepts: [
        "Adler/Dreikurs — sibling positions aur attention ka 'mistaken goal'",
        "Faber & Mazlish — 'comparison nahi, jo dikh raha hai use describe karo'",
        "Attachment theory — secure base ke bina prosocial sibling behaviour nahi",
        "Conflict-resolution scaffolding (sportscasting → coaching → peeche hatna)",
      ],
      mustInclude: [
        "Har bachche ke saath 1:1 connection ritual (15 min/day) — sabse evidence-based intervention",
        "Live jhagde ke liye sportscasting script (describe karein, judge nahi)",
        "Maarpeet ke baad empathy badhane wali repair conversation",
        "'Comparison mat karo' ke liye rephrase library",
      ],
      experts: ["Adele Faber & Elaine Mazlish", "Janet Lansbury", "Laura Markham", "Becky Kennedy"],
    },
  },
  selfcare: {
    hi: {
      focus: [
        "खाली कप से नहीं उँडेला जा सकता — माता-पिता का regulation ही intervention है",
        "Burnout एक nervous-system अवस्था है, willpower की कमी नहीं",
        "2–10 मिनट की छोटी restoration घंटों की कल्पना से बेहतर है",
      ],
      concepts: [
        "Maslach burnout inventory — emotional exhaustion + depersonalisation + low efficacy",
        "Polyvagal theory — stress cycle पूरा करना (Nagoski)",
        "Self-Compassion (Kristin Neff) — kindness, common humanity, mindfulness",
        "Sleep deprivation cognition cost — 6 hrs × 10 nights ≈ 24 hrs awake",
      ],
      mustInclude: [
        "Meltdown के बीच में 2-min nervous-system reset",
        "रोज़ 10 मिनट पक्का करने वाला boundary script",
        "Guilt के लिए reframe practice (specific cognitive distortion challenge)",
        "अराजकता में भी टिकने वाला 'minimum viable rest' weekly plan",
      ],
      experts: ["Emily & Amelia Nagoski", "Kristin Neff", "Christina Maslach", "Becky Kennedy"],
    },
    hinglish: {
      focus: [
        "Khaali cup se pour nahi kar sakte — parent ka regulation hi intervention hai",
        "Burnout ek nervous-system state hai, willpower failure nahi",
        "2–10 min ki chhoti restoration ghanton ki fantasy se behtar hai",
      ],
      concepts: [
        "Maslach burnout inventory — emotional exhaustion + depersonalisation + low efficacy",
        "Polyvagal theory — stress cycle complete karna (Nagoski)",
        "Self-Compassion (Kristin Neff) — kindness, common humanity, mindfulness",
        "Sleep deprivation cognition cost — 6 hrs × 10 nights ≈ 24 hrs awake",
      ],
      mustInclude: [
        "Meltdown ke beech mein 2-min nervous-system reset",
        "Roz 10 min pakka karne wala ek boundary script",
        "Guilt ke liye reframe practice (specific cognitive distortion challenge)",
        "Chaos mein bhi tikne wala 'minimum viable rest' weekly plan",
      ],
      experts: ["Emily & Amelia Nagoski", "Kristin Neff", "Christina Maslach", "Becky Kennedy"],
    },
  },
  transitions: {
    hi: {
      focus: [
        "Predictability ही transition anxiety का इलाज है",
        "Pre-loading (preview, rehearse, role-play) ~50% overwhelm घटाता है",
        "दोनों भावनाएँ साथ रखें: यह कठिन है AND हम ठीक रहेंगे",
      ],
      concepts: [
        "Transitional objects (Winnicott) — नई जगहों में सुरक्षा का anchor",
        "Bowlby attachment — secure base से ही नई जगह exploration संभव",
        "Cognitive rehearsal & habituation — बार-बार low-stakes exposure",
        "Story-based scripts (Carol Gray's Social Stories) for predictability",
      ],
      mustInclude: [
        "Pre-trip / pre-event preview ritual (visuals, story, क्या होने वाला है)",
        "स्थिति के अनुसार 'comfort kit' packing list",
        "Departure के दिन का script (चुपके से न जाएँ, ज़्यादा explanation न दें)",
        "Event के बाद decompression ritual (अनुभव को integrate करना)",
      ],
      experts: ["John Bowlby", "Donald Winnicott", "Carol Gray", "Tina Payne Bryson"],
    },
    hinglish: {
      focus: [
        "Predictability hi transition anxiety ka ilaaj hai",
        "Pre-loading (preview, rehearse, role-play) ~50% overwhelm kam karta hai",
        "Dono feelings saath rakhein: ye mushkil hai AND hum theek rahenge",
      ],
      concepts: [
        "Transitional objects (Winnicott) — nayi jagahon mein safety ka anchor",
        "Bowlby attachment — secure base se hi nayi jagah exploration hota hai",
        "Cognitive rehearsal & habituation — baar-baar low-stakes exposure",
        "Story-based scripts (Carol Gray's Social Stories) for predictability",
      ],
      mustInclude: [
        "Pre-trip / pre-event preview ritual (visuals, story, kya hone wala hai)",
        "Situation ke hisab se 'comfort kit' packing list",
        "Departure ke din ka script (chupke se mat jaayein, zyada explain mat karein)",
        "Event ke baad decompression ritual (anubhav ko integrate karna)",
      ],
      experts: ["John Bowlby", "Donald Winnicott", "Carol Gray", "Tina Payne Bryson"],
    },
  },
};

export function getGoalPromptSection(
  goalId: string,
  goalLabel: string,
  language: "en" | "hi" | "hinglish" = "en",
): string {
  const family = GOAL_TO_FAMILY[goalId] ?? "generic";
  const baseEn = FAMILIES[family];
  const translated = language !== "en" ? FAMILY_TRANSLATIONS[family]?.[language] : undefined;
  const f: FamilyPrompt = translated ?? baseEn;

  const bullets = (arr: string[]) => arr.map((x) => `- ${x}`).join("\n");
  const experts = f.experts?.length
    ? `\nGround your writing in the work of: ${f.experts.join(", ")}.`
    : "";

  // Headings stay in English (they instruct the AI), bullets are language-aware.
  return `

━━━ GOAL-SPECIFIC EXPERT BRIEF ━━━
Goal: ${goalLabel}

FOCUS (what every win should serve):
${bullets(f.focus)}

PSYCHOLOGY & NEUROSCIENCE CONCEPTS TO APPLY:
${bullets(f.concepts)}

THIS PLAN MUST INCLUDE:
${bullets(f.mustInclude)}${experts}

Write like a senior expert in THIS specific goal area — not a generalist. Every win should feel authored for "${goalLabel}" specifically, not recycled from a generic parenting manual.`;
}
