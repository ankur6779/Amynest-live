// Parent-Hub-parity data for the mobile InfantHub.
//
// Mirrors the data already shipped in the web Parent Hub
// (artifacts/kidschedule/src/components/infant-hub.tsx,
//  infant-sleep-module.tsx, infant-milestones.tsx, infant-baby-cues.tsx,
//  infant-sounds.tsx). Web is the source of truth — when an entry changes
// on web, mirror it here so the mobile featured InfantHub card stays in
// sync.
//
// Content is English-only at the data level (matching web). The mobile
// app supplies EN / HI / Hinglish strings for tab labels, headers and
// section chrome via i18n.

// ─── Sub-band helper (matches web `getBand` in infant-hub.tsx) ──────────────
export type InfantBand =
  | "0-3"
  | "3-6"
  | "6-9"
  | "9-12"
  | "12-18"
  | "18-24";

export function getInfantBand(months: number): InfantBand {
  if (months < 3) return "0-3";
  if (months < 6) return "3-6";
  if (months < 9) return "6-9";
  if (months < 12) return "9-12";
  if (months < 18) return "12-18";
  return "18-24";
}

// ─── Vaccinations (India NIS + IAP) ────────────────────────────────────────
export type VaxEntry = {
  ageLabel: string;
  ageMonths: number;
  vaccines: readonly string[];
};

export const VACCINATIONS: readonly VaxEntry[] = [
  { ageLabel: "Birth",     ageMonths: 0,    vaccines: ["BCG", "OPV-0", "Hep B-1"] },
  { ageLabel: "6 weeks",   ageMonths: 1.5,  vaccines: ["DTwP/DTaP-1", "IPV-1", "Hep B-2", "Hib-1", "Rotavirus-1", "PCV-1"] },
  { ageLabel: "10 weeks",  ageMonths: 2.5,  vaccines: ["DTwP/DTaP-2", "IPV-2", "Hib-2", "Rotavirus-2", "PCV-2"] },
  { ageLabel: "14 weeks",  ageMonths: 3.5,  vaccines: ["DTwP/DTaP-3", "IPV-3", "Hib-3", "Rotavirus-3", "PCV-3"] },
  { ageLabel: "6 months",  ageMonths: 6,    vaccines: ["OPV-1", "Hep B-3"] },
  { ageLabel: "9 months",  ageMonths: 9,    vaccines: ["OPV-2", "MMR-1", "Vitamin A-1"] },
  { ageLabel: "12 months", ageMonths: 12,   vaccines: ["PCV Booster", "Hep A-1", "Varicella-1"] },
  { ageLabel: "15 months", ageMonths: 15,   vaccines: ["MMR-2", "Varicella-2"] },
  { ageLabel: "18 months", ageMonths: 18,   vaccines: ["DTwP Booster-1", "IPV Booster-1", "Hib Booster", "Hep A-2"] },
  { ageLabel: "24 months", ageMonths: 24,   vaccines: ["Typhoid (TCV)"] },
];

/** Vaccinations due now or in the next 2 months. */
export function getUpcomingVaccinations(months: number): VaxEntry[] {
  return VACCINATIONS.filter(
    (v) => v.ageMonths >= months && v.ageMonths <= months + 2,
  );
}

/** Vaccinations whose target age has passed. */
export function getCompletedVaccinations(months: number): VaxEntry[] {
  return VACCINATIONS.filter((v) => v.ageMonths < months);
}

// ─── Common issues ─────────────────────────────────────────────────────────
export type CommonIssue = {
  id: string;
  emoji: string;
  title: string;
  bands: readonly InfantBand[];
  content: string;
};

export const COMMON_ISSUES: readonly CommonIssue[] = [
  {
    id: "colic", emoji: "😭", title: "Colic / Excessive Crying",
    bands: ["0-3", "3-6"],
    content:
      "Rule of 3: crying >3 hrs/day, >3 days/week, >3 weeks in a healthy baby. Try: gentle tummy massage clockwise, bicycle legs, white noise, feeding position upright 30 min after feed, check for gas. Usually peaks at 6 weeks and resolves by 3–4 months. See doctor if baby has fever or isn't eating.",
  },
  {
    id: "teething", emoji: "🦷", title: "Teething",
    bands: ["6-9", "9-12", "12-18"],
    content:
      "First tooth usually arrives 6–10 months. Signs: drooling, gum rubbing, fussiness, mild fever (under 38°C). Help: cold teething ring, gentle gum massage with clean finger. Do NOT use teething gels with benzocaine. Mild symptoms are normal — high fever, rash or diarrhoea are not teething symptoms.",
  },
  {
    id: "fever", emoji: "🌡️", title: "Fever",
    bands: ["0-3", "3-6", "6-9", "9-12", "12-18", "18-24"],
    content:
      "Under 3 months: any temp ≥38°C → go to hospital immediately. 3–6 months: call doctor if ≥38°C or baby seems unwell. 6 months+: treat if uncomfortable with paracetamol (correct dose for weight). Keep hydrated. Go to ER if: temp ≥40°C, seizure, rash, stiff neck, won't stop crying, very lethargic.",
  },
  {
    id: "cold", emoji: "🤧", title: "Cold / Stuffy Nose",
    bands: ["3-6", "6-9", "9-12", "12-18", "18-24"],
    content:
      "Babies can't blow their nose — use a nasal aspirator and saline drops before feeds. Keep room humidified. Slightly elevate head end of mattress (not pillow). Under 2 years: NO over-the-counter cough/cold medicine. Breastfeed frequently — milk transfers antibodies. See doctor if breathing is laboured or symptoms worsen after 10 days.",
  },
];

export function getCommonIssuesForAge(months: number): CommonIssue[] {
  const band = getInfantBand(months);
  return COMMON_ISSUES.filter((i) => i.bands.includes(band));
}

// ─── Milestones (motor / cognitive / social / language) ────────────────────
export type MilestoneCategory = "motor" | "cognitive" | "social" | "language";

export type Milestone = {
  id: string;
  emoji: string;
  title: string;
  category: MilestoneCategory;
  explanation: string;
  whyItMatters: string;
  activity: string;
  fromMonths: number;
  toMonths: number;
};

export const MILESTONES: readonly Milestone[] = [
  // 0–3 months
  { id: "b03_head_lift",    emoji: "💪", title: "Head Control Improving",   category: "motor",     fromMonths: 0, toMonths: 4,
    explanation: "Baby starts lifting their head briefly during tummy time.",
    whyItMatters: "Strong neck muscles are the foundation for rolling, sitting, crawling — every motor milestone builds on this.",
    activity: "Place baby on tummy on a firm surface and lie down face-to-face. Talk and smile to encourage head lifting." },
  { id: "b03_social_smile", emoji: "😊", title: "First Social Smile",       category: "social",    fromMonths: 0, toMonths: 4,
    explanation: "Baby smiles back when you smile or talk — a real intentional smile, not gas.",
    whyItMatters: "The first sign that baby recognises connection. It strengthens parent-baby bonding hormones for both of you.",
    activity: "Get face-to-face about 25 cm away. Smile widely and say their name in a sing-song tone. Wait 5 seconds for a response." },
  { id: "b03_eye_track",    emoji: "👀", title: "Tracking with Eyes",       category: "cognitive", fromMonths: 1, toMonths: 5,
    explanation: "Baby's eyes follow a moving face or toy from one side to the other.",
    whyItMatters: "Visual tracking trains the brain's attention system — the same system that will later support reading.",
    activity: "Hold a black-and-white card or your face 25 cm from baby. Slowly move side-to-side. They should follow." },
  { id: "b03_coo",          emoji: "🗣️", title: "First Coos & Vowels",     category: "language",  fromMonths: 1, toMonths: 5,
    explanation: "Baby makes soft 'aah' and 'ooh' sounds, especially when looking at you.",
    whyItMatters: "Cooing is baby's first attempt at conversation. Every coo you respond to wires the speech centre of their brain.",
    activity: "When baby coos, copy the sound back exactly. Pause for 5 seconds. They'll often try again." },
  { id: "b03_hands",        emoji: "✋", title: "Discovers Their Hands",    category: "cognitive", fromMonths: 2, toMonths: 5,
    explanation: "Baby looks at their own hands, brings them to mouth, and starts to grab.",
    whyItMatters: "Discovering 'these are mine!' is the start of body awareness — the foundation of self-concept.",
    activity: "Lay baby on back and place your finger or a soft rattle in their palm. Their grip reflex will close." },

  // 3–6 months
  { id: "b36_roll",         emoji: "🔄", title: "First Roll Over",          category: "motor",     fromMonths: 3, toMonths: 7,
    explanation: "Baby rolls from tummy to back (back-to-tummy comes later, around 5–6 months).",
    whyItMatters: "Rolling shows baby has the core strength and coordination to start moving — a huge leap toward independent mobility.",
    activity: "During tummy time, gently rock baby's hip to one side to give them the feel of rolling. Don't do the work — just hint." },
  { id: "b36_head_steady",  emoji: "👶", title: "Head Held Steady",         category: "motor",     fromMonths: 3, toMonths: 6,
    explanation: "When held upright, baby keeps their head steady without bobbing.",
    whyItMatters: "Steady head = ready to sit, ready to start solids safely, ready to see the world from your eye-level.",
    activity: "Hold baby upright on your lap facing outward. Talk to them so they look around. The looking strengthens neck muscles." },
  { id: "b36_laugh",        emoji: "😆", title: "First Belly Laugh",        category: "social",    fromMonths: 3, toMonths: 6,
    explanation: "Baby laughs out loud — not just smiles, but real giggles in response to play.",
    whyItMatters: "Laughter releases bonding hormones in BOTH of you. It's also a sign their emotional brain is thriving.",
    activity: "Try gentle blowing on tummy, peek-a-boo, or surprise faces. Find what makes YOUR baby giggle." },
  { id: "b36_reach",        emoji: "🤲", title: "Reaches for Objects",      category: "motor",     fromMonths: 3, toMonths: 6,
    explanation: "Baby reaches out and bats at toys, eventually grabbing them.",
    whyItMatters: "Hand-eye coordination is the building block of every fine-motor skill — eating, drawing, writing, dressing.",
    activity: "Hold a soft, rattly toy 20 cm from baby's hand. Wait. Let them work for it." },
  { id: "b36_babble",       emoji: "👄", title: "Babbling Begins",          category: "language",  fromMonths: 4, toMonths: 8,
    explanation: "Baby strings consonants together: 'ba-ba', 'da-da', 'ma-ma' — without meaning yet.",
    whyItMatters: "Babbling is brain rehearsal for real words. Every babble is the speech motor system practicing.",
    activity: "Sit face-to-face. Slowly say 'ba-ba' or 'ma-ma' with exaggerated lip movement. Pause and watch them try." },

  // 6–12 months
  { id: "b612_sit",         emoji: "🪑", title: "Sits Without Support",     category: "motor",     fromMonths: 5, toMonths: 9,
    explanation: "Baby sits independently for a minute or longer without falling over.",
    whyItMatters: "Independent sitting frees both hands for play — a huge boost for cognitive and fine-motor development.",
    activity: "Sit on the floor with baby between your legs (no support). Roll a soft ball back and forth." },
  { id: "b612_crawl",       emoji: "🐛", title: "Starts to Crawl",          category: "motor",     fromMonths: 6, toMonths: 12,
    explanation: "Baby moves themselves across the floor — could be classic crawl, army crawl, or bottom-shuffle. All count!",
    whyItMatters: "Crawling cross-wires the left and right sides of the brain — important for coordination, attention, and even reading later.",
    activity: "Place a favourite toy 30 cm in front of baby during tummy time. Don't move it. Let them figure out movement." },
  { id: "b612_pincer",      emoji: "🤏", title: "Pincer Grip",              category: "motor",     fromMonths: 7, toMonths: 12,
    explanation: "Baby picks up small objects (e.g. a piece of soft puffed cereal) with thumb and forefinger.",
    whyItMatters: "Pincer grip = independence at meals, plus the foundation for writing, buttoning, and using utensils.",
    activity: "Place 3–4 puffed cereal pieces on baby's high-chair tray. Sit and let them figure out the pickup." },
  { id: "b612_object_perm", emoji: "🙈", title: "Object Permanence",        category: "cognitive", fromMonths: 6, toMonths: 12,
    explanation: "Baby looks for a toy when you hide it under a cloth — they understand it still exists.",
    whyItMatters: "This is one of the biggest cognitive leaps in infancy. It also means separation anxiety is normal and developmental.",
    activity: "Cover a favourite toy partly with a cloth in front of baby. Watch — they should pull the cloth off." },
  { id: "b612_mama",        emoji: "💖", title: "First Meaningful Word",    category: "language",  fromMonths: 8, toMonths: 14,
    explanation: "Baby says 'mama', 'dada', or another word AND clearly means it (e.g. says 'mama' when looking at you).",
    whyItMatters: "The first true word marks the shift from babbling to symbolic language — a doorway to all communication.",
    activity: "Whenever you appear, say 'Mama is here!' (or your name). Repeat the word linked to YOU consistently." },
  { id: "b612_wave",        emoji: "👋", title: "Waves Bye-Bye",            category: "social",    fromMonths: 7, toMonths: 12,
    explanation: "Baby waves when prompted — and eventually starts waving on their own.",
    whyItMatters: "Waving is symbolic gesture — the same brain skill that lets them later use signs and then words to communicate.",
    activity: "Every time someone leaves, say 'Bye-bye' clearly and wave. Take baby's hand and wave it gently." },
  { id: "b612_pull_stand",  emoji: "🧍", title: "Pulls to Standing",        category: "motor",     fromMonths: 8, toMonths: 13,
    explanation: "Baby uses furniture (sofa, low table) to pull themselves up to standing.",
    whyItMatters: "The strength + balance to stand is the precursor to cruising along furniture and then to walking.",
    activity: "Place a favourite toy on a low, sturdy surface. Sit baby on the floor next to it. Watch them work." },

  // 12–24 months
  { id: "b1224_walk",       emoji: "🚶", title: "First Independent Steps",  category: "motor",     fromMonths: 11, toMonths: 18,
    explanation: "Toddler takes 2–3 steps without holding on — eventually walks across a room.",
    whyItMatters: "Walking unlocks a new world of exploration, which fuels cognitive, language and social leaps over the next 6 months.",
    activity: "Stand a few steps in front of toddler, arms out. Encourage them to step toward you. Cheer EVERY attempt." },
  { id: "b1224_words",      emoji: "📚", title: "10–20 Word Vocabulary",    category: "language",  fromMonths: 12, toMonths: 20,
    explanation: "Toddler uses 10–20+ single words meaningfully — names of people, animals, foods, body parts.",
    whyItMatters: "Vocabulary at 18 months is one of the strongest predictors of school readiness later.",
    activity: "Read ONE picture book together daily. Point and name everything. 'Cat. Big cat. Soft cat.'" },
  { id: "b1224_two_word",   emoji: "💬", title: "Two-Word Phrases",         category: "language",  fromMonths: 14, toMonths: 24,
    explanation: "Toddler combines two words: 'more milk', 'mama up', 'all gone', 'bye dada'.",
    whyItMatters: "Combining words = the start of grammar. From here, sentences explode.",
    activity: "Whenever toddler uses one word, model a two-word version. They say 'milk' → you say 'more milk?'" },
  { id: "b1224_body_parts", emoji: "👃", title: "Points to Body Parts",     category: "cognitive", fromMonths: 13, toMonths: 24,
    explanation: "Toddler points to nose, eyes, mouth, ears, hair when named.",
    whyItMatters: "Knowing body parts builds receptive vocabulary AND spatial awareness — the brain's map of self.",
    activity: "Sing 'Head, shoulders, knees & toes' daily. Touch each part as you sing." },
  { id: "b1224_scribble",   emoji: "✏️", title: "Scribbles with Crayon",   category: "motor",     fromMonths: 12, toMonths: 24,
    explanation: "Toddler holds a crayon (whole-fist grip is fine) and makes marks on paper.",
    whyItMatters: "Scribbling builds the hand strength and shoulder stability needed for writing later. It also expresses emotions.",
    activity: "Put a large piece of paper on the floor, give a chunky crayon, and demo a scribble. Then let them lead." },
  { id: "b1224_pretend",    emoji: "🍼", title: "Pretend Play",             category: "cognitive", fromMonths: 14, toMonths: 24,
    explanation: "Toddler feeds a doll, talks on a toy phone, or 'cooks' with kitchen toys.",
    whyItMatters: "Pretend play is one of the most powerful predictors of language, social, and problem-solving development.",
    activity: "Set up a tea party or doctor kit. Join in: 'Oh, the doll is hungry — feed her!' Model, then let them lead." },
  { id: "b1224_one_step",   emoji: "🎯", title: "Follows One-Step Commands", category: "language", fromMonths: 12, toMonths: 22,
    explanation: "Toddler does what you ask for simple actions: 'Bring the ball', 'Sit down', 'Give me the spoon'.",
    whyItMatters: "Following directions shows receptive language is far ahead of speech — they understand more than they say.",
    activity: "Use one clear command at a time during play. 'Give the bear a hug!' Smile and praise when they do." },
];

export function getMilestonesForAge(months: number): Milestone[] {
  return MILESTONES.filter(
    (m) => months >= m.fromMonths && months < m.toMonths,
  );
}

// ─── Baby Cues ─────────────────────────────────────────────────────────────
export type CueCategory = "hunger" | "sleep" | "overstim" | "discomfort";

export type BabyCue = {
  id: string;
  emoji: string;
  label: string;
  category: CueCategory;
  insight: string;
  action: string;
  fromMonths: number;
  toMonths: number;
};

export const CUES: readonly BabyCue[] = [
  // Hunger
  { id: "rooting",         emoji: "👶", label: "Rooting / mouth open",       category: "hunger",     fromMonths: 0, toMonths: 8,
    insight: "Baby is asking for milk — early hunger cue.",
    action: "Offer breast or bottle now. Catching hunger early means a calmer feed than waiting for crying." },
  { id: "lip_smacking",    emoji: "👄", label: "Lip smacking",               category: "hunger",     fromMonths: 0, toMonths: 12,
    insight: "Anticipating food — earliest hunger window.",
    action: "Begin a feed in the next 5 minutes for the easiest latch and least fuss." },
  { id: "hands_to_mouth",  emoji: "🤲", label: "Hands to mouth",             category: "hunger",     fromMonths: 0, toMonths: 8,
    insight: "Mid-stage hunger cue.",
    action: "Feed now. If you wait, hunger escalates to crying within 5–10 minutes." },
  // Sleep
  { id: "yawning",         emoji: "🥱", label: "Yawning",                    category: "sleep",      fromMonths: 0, toMonths: 24,
    insight: "Sleep window is opening — wind down.",
    action: "Begin nap routine NOW: dim lights, quiet voice, swaddle (if under 4m)." },
  { id: "eye_rubbing",     emoji: "😪", label: "Eye rubbing",                category: "sleep",      fromMonths: 0, toMonths: 24,
    insight: "Tired — sleep window is mid-stage.",
    action: "Skip stimulating play. Move straight to nap routine." },
  { id: "staring",         emoji: "👀", label: "Glazed staring into space",  category: "sleep",      fromMonths: 0, toMonths: 18,
    insight: "Earliest sleep cue — easy to miss.",
    action: "Stop play, dim lights, start nap routine for an easy fall-asleep." },
  // Overstim
  { id: "gaze_aversion",   emoji: "🙈", label: "Looking away during play",   category: "overstim",   fromMonths: 0, toMonths: 12,
    insight: "Sensory system needs a break.",
    action: "Pause. Speak softly, lower stimulation. Wait for them to re-engage." },
  { id: "arching_back",    emoji: "🌀", label: "Arching back / pushing away",category: "overstim",   fromMonths: 0, toMonths: 12,
    insight: "Too much stimulation — back off.",
    action: "Move to a calmer environment. Hold baby close upright until they settle." },
  // Discomfort
  { id: "pulling_legs",    emoji: "🦵", label: "Pulling legs to belly",      category: "discomfort", fromMonths: 0, toMonths: 6,
    insight: "Likely gas or wind discomfort.",
    action: "Try bicycle legs, gentle clockwise tummy massage, then upright burping." },
];

export function getCuesForAge(months: number): BabyCue[] {
  return CUES.filter((c) => months >= c.fromMonths && months < c.toMonths);
}

// ─── Wake Window Spec (mirrors infant-sleep-module.tsx) ────────────────────
export type WakeWindowSpec = {
  range: string;
  windowMin: number;
  windowMax: number;
  napCount: string;
  totalDayMin: number;
  napDurMin: number;
  nightSleepHrs: string;
};

export function getWakeSpec(months: number): WakeWindowSpec {
  if (months < 1)  return { range: "0–1 mo",   windowMin: 45,  windowMax: 60,  napCount: "5–7 micro", totalDayMin: 480, napDurMin: 60,  nightSleepHrs: "8–9 (interrupted)" };
  if (months < 2)  return { range: "1–2 mo",   windowMin: 60,  windowMax: 90,  napCount: "4–5",       totalDayMin: 360, napDurMin: 60,  nightSleepHrs: "8–10 (interrupted)" };
  if (months < 3)  return { range: "2–3 mo",   windowMin: 90,  windowMax: 120, napCount: "4–5",       totalDayMin: 300, napDurMin: 60,  nightSleepHrs: "10–11" };
  if (months < 5)  return { range: "3–5 mo",   windowMin: 90,  windowMax: 150, napCount: "3–4",       totalDayMin: 270, napDurMin: 75,  nightSleepHrs: "10–11" };
  if (months < 7)  return { range: "5–7 mo",   windowMin: 120, windowMax: 150, napCount: "3",         totalDayMin: 240, napDurMin: 80,  nightSleepHrs: "11" };
  if (months < 9)  return { range: "7–9 mo",   windowMin: 150, windowMax: 180, napCount: "2–3",       totalDayMin: 210, napDurMin: 90,  nightSleepHrs: "11" };
  if (months < 12) return { range: "9–12 mo",  windowMin: 180, windowMax: 240, napCount: "2",         totalDayMin: 180, napDurMin: 90,  nightSleepHrs: "11" };
  if (months < 15) return { range: "12–15 mo", windowMin: 240, windowMax: 300, napCount: "1–2",       totalDayMin: 150, napDurMin: 90,  nightSleepHrs: "11–12" };
  if (months < 18) return { range: "15–18 mo", windowMin: 300, windowMax: 360, napCount: "1",         totalDayMin: 120, napDurMin: 120, nightSleepHrs: "11–12" };
  return                  { range: "18–24 mo", windowMin: 300, windowMax: 360, napCount: "1",         totalDayMin: 120, napDurMin: 120, nightSleepHrs: "11–12" };
}

// ─── Common Sleep Issues (preview — log-independent) ───────────────────────
export type SleepIssueTip = {
  id: string;
  emoji: string;
  title: string;
  detail: string;
  tip: string;
  bands: readonly InfantBand[];
};

/** Static "things to watch for" preview — the live web SleepIssueDetector
 *  needs the parent to log naps. The mobile featured card shows this static
 *  preview so parents at least see what the system would flag. */
export const SLEEP_ISSUE_PREVIEWS: readonly SleepIssueTip[] = [
  { id: "overtired", emoji: "😵", title: "Overtiredness",
    detail: "Wake windows that stretch past the upper bound (cortisol spike).",
    tip: "Push the next nap 15–20 min earlier than you think. Overtired babies actually need sleep SOONER, not later.",
    bands: ["0-3", "3-6", "6-9", "9-12"] },
  { id: "short_naps", emoji: "⚡", title: "Short naps (under 35 min)",
    detail: "Catnapping under 35 min repeatedly across the week.",
    tip: "Try going in BEFORE baby wakes (around 25 min mark) and gently soothing through the next sleep cycle.",
    bands: ["3-6", "6-9", "9-12", "12-18"] },
  { id: "night_wakings", emoji: "🌃", title: "Frequent night waking",
    detail: "Multiple <90-min sleeps overnight.",
    tip: "Common causes: hunger (under 6m), teething, sleep regressions (4m, 8m, 12m, 18m). Check room temp 18–20°C, white noise, blackout.",
    bands: ["0-3", "3-6", "6-9", "9-12", "12-18", "18-24"] },
  { id: "irregular", emoji: "🌪️", title: "Irregular nap lengths",
    detail: "Naps swing widely day to day.",
    tip: "Anchor the FIRST nap of the day at a consistent clock time. The first nap sets the rhythm for the rest of the day.",
    bands: ["3-6", "6-9", "9-12", "12-18"] },
];

export function getSleepIssuePreviews(months: number): SleepIssueTip[] {
  const band = getInfantBand(months);
  return SLEEP_ISSUE_PREVIEWS.filter((i) => i.bands.includes(band));
}

// ─── Routine Preview (ported from infant-sleep-module generateRoutine) ─────
export type RoutinePreviewItem = {
  id: string;
  time: string;
  activity: string;
  emoji: string;
};

function fmtClock(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12 ? "AM" : "PM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m < 10 ? "0" : ""}${m} ${am}`;
}

export function getRoutinePreview(
  months: number,
  wakeUpTime: string = "7:00 AM",
): RoutinePreviewItem[] {
  const spec = getWakeSpec(months);
  const items: RoutinePreviewItem[] = [];

  const parseTime = (t: string): Date => {
    const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    const d = new Date();
    if (!m) { d.setHours(7, 0, 0, 0); return d; }
    let h = parseInt(m[1], 10);
    const mins = parseInt(m[2], 10);
    const ap = m[3].toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    d.setHours(h, mins, 0, 0);
    return d;
  };

  const cur = parseTime(wakeUpTime);
  const napCount =
    months < 3 ? 4 :
    months < 6 ? 3 :
    months < 9 ? 3 :
    months < 12 ? 2 :
    months < 15 ? 1 :
                  1;

  items.push({ id: "wake", time: fmtClock(cur), activity: "Wake + Feed", emoji: "☀️" });

  for (let i = 0; i < napCount; i++) {
    cur.setMinutes(cur.getMinutes() + spec.windowMin);
    items.push({
      id: `nap${i + 1}`,
      time: fmtClock(cur),
      activity: `Nap ${i + 1}`,
      emoji: "😴",
    });
    cur.setMinutes(cur.getMinutes() + spec.napDurMin);
    items.push({
      id: `wake${i + 1}`,
      time: fmtClock(cur),
      activity: i === napCount - 1 ? "Wake + Snack" : "Wake + Play",
      emoji: i === napCount - 1 ? "🍪" : "🧸",
    });
  }

  // Bedtime sequence
  const wake = parseTime(wakeUpTime);
  const target = new Date(wake);
  target.setHours(target.getHours() + 12);
  const bedHour = Math.max(target.getHours(), 18);
  const bath = new Date(cur);
  bath.setHours(bedHour, 0, 0, 0);
  items.push({ id: "bath", time: fmtClock(bath), activity: "Bath time", emoji: "🛁" });
  bath.setMinutes(bath.getMinutes() + 20);
  items.push({
    id: "dinner",
    time: fmtClock(bath),
    activity: months >= 6 ? "Dinner / Last feed" : "Last feed",
    emoji: "🥄",
  });
  bath.setMinutes(bath.getMinutes() + 30);
  items.push({ id: "book", time: fmtClock(bath), activity: "Book / Lullaby", emoji: "📖" });
  bath.setMinutes(bath.getMinutes() + 15);
  items.push({ id: "bedtime", time: fmtClock(bath), activity: "Bedtime", emoji: "🌙" });

  return items;
}

// ─── Feeding Reference (mirrors infant-hub.tsx getFeedingGuide) ────────────
export type FeedingGuide = { type: string; freq: string; tip: string };

export function getFeedingGuide(months: number): FeedingGuide {
  if (months < 6) return {
    type: "Breast milk / Formula only",
    freq: "Every 2–3 hrs · 8–12 times/day",
    tip: "Watch hunger cues — rooting, lip-smacking, sucking fists. Crying is a late hunger sign.",
  };
  if (months < 9) return {
    type: "Breast milk + Puree start (6 m+)",
    freq: "Breast 5–6×/day + 1–2 meals",
    tip: "Start single-ingredient purees: banana, carrot, sweet potato. No honey, salt or sugar before 12 months.",
  };
  if (months < 12) return {
    type: "Breast milk + Soft solids",
    freq: "Breast 4–5×/day + 2–3 meals",
    tip: "Introduce family textures slowly. Finger foods (soft): banana slices, soft dal pieces, khichdi.",
  };
  if (months < 18) return {
    type: "Family meals + Milk top-up",
    freq: "3 meals + 2 snacks · Milk 2–3×/day",
    tip: "Offer cow's milk (full fat) from 12 months. Serve small, soft portions of everything the family eats.",
  };
  return {
    type: "Full family meals",
    freq: "3 meals + 1–2 snacks",
    tip: "Self-feeding is great — let them make mess! Keep 300–400 ml cow's milk/day for calcium.",
  };
}

// ─── Sounds: white-noise + lullaby preview (from infant-sounds.tsx) ────────
/**
 * Three primary noise colours we can synthesise in pure JS — see audioSynth.ts.
 * Composed sounds (rain, shush, etc.) map down to one of these for mobile
 * playback while keeping their distinct labels and copy.
 */
export type SynthKind = "white" | "pink" | "brown";

export type NoiseType = {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  bestFor: string;
  /** Which raw noise colour to play on platforms without Web Audio. */
  synthKind: SynthKind;
};

export const NOISE_TYPES: readonly NoiseType[] = [
  { id: "shush",     emoji: "🫁", label: "Shushing",     bestFor: "Newborns (0–4 m), inconsolable crying",
    desc: "Rhythmic 'shhhh' — closest to what baby heard in the womb. Air rushing through blood vessels + muffled heartbeat = built-in white noise.",
    synthKind: "white" },
  { id: "rain",      emoji: "🌧️", label: "Rain",         bestFor: "All ages, especially 2–12 m for naps in noisy homes",
    desc: "Consistent broadband noise that masks household sounds — TV, voices, traffic. Most universally soothing for babies.",
    synthKind: "pink" },
  { id: "fan",       emoji: "🌀", label: "Fan",          bestFor: "Overtired newborns, summer sleep, colicky phases",
    desc: "Low-frequency rumble that deeply masks sound and has a grounding effect.",
    synthKind: "brown" },
  { id: "heartbeat", emoji: "💓", label: "Heartbeat",    bestFor: "Newborns 0–3 m, transition from arms to cot",
    desc: "Mimics what baby heard for 9 months in the womb. Deeply familiar and calming in the 4th trimester.",
    synthKind: "brown" },
  { id: "pink",      emoji: "🔊", label: "Pink Noise",   bestFor: "Older babies 6 m+, toddlers who've outgrown white noise",
    desc: "Like white noise but weighted to lower frequencies — more like rushing water than static.",
    synthKind: "pink" },
  { id: "white",     emoji: "📻", label: "White Noise",  bestFor: "Newborns 0–4 m, masking loud household noise",
    desc: "Pure broadband static — every frequency at equal energy. The classic 'TV between channels' sound.",
    synthKind: "white" },
  { id: "womb",      emoji: "🫀", label: "Womb",         bestFor: "Newborns 0–6 weeks, especially premature/NICU graduates",
    desc: "Recordings combining heartbeat, blood flow, and muffled voice. Most complete recreation of the womb sound environment.",
    synthKind: "brown" },
];

export type AgeNoiseTip = {
  band: string;
  fromMonths: number;
  toMonths: number;
  headline: string;
  tip: string;
  volume: string;
  recommended: readonly string[];
};

export const NOISE_AGE_TIPS: readonly AgeNoiseTip[] = [
  { band: "0–3 months", fromMonths: 0, toMonths: 3,
    headline: "White noise is a lifesaver right now",
    tip: "The 4th trimester — baby is adjusting to a world that is too quiet, too bright, and too still. White noise recreates the womb. Use it freely during sleep and fussy periods.",
    volume: "About as loud as a shower — roughly 60–65 dB. Never louder.",
    recommended: ["shush", "heartbeat", "womb"] },
  { band: "3–6 months", fromMonths: 3, toMonths: 6,
    headline: "Keep using it, but start fading volume",
    tip: "Still helpful — especially for naps — but start gradually lowering volume as baby becomes more settled. Songs are great for awake time.",
    volume: "50–60 dB. Keep the source at least 30 cm from baby's head.",
    recommended: ["rain", "shush", "white"] },
  { band: "6–12 months", fromMonths: 6, toMonths: 12,
    headline: "Use for sleep, shift to music for play",
    tip: "White noise for naps and night sleep is fine. During awake play, songs and rhythmic music do more developmental work.",
    volume: "Keep at 50 dB or below. A quiet fan is a good reference.",
    recommended: ["rain", "fan", "pink"] },
  { band: "12–24 months", fromMonths: 12, toMonths: 24,
    headline: "Begin gentle weaning from white noise",
    tip: "Start fading slowly — reduce volume by a notch each week, then try turning it off 30 minutes after they've fallen asleep. Aim to be free of it by 2 years.",
    volume: "40–50 dB maximum. If they can talk over it easily, that's about right.",
    recommended: ["rain", "pink"] },
];

export function getNoiseAgeTip(months: number): AgeNoiseTip {
  return (
    NOISE_AGE_TIPS.find((t) => months >= t.fromMonths && months < t.toMonths) ??
    NOISE_AGE_TIPS[NOISE_AGE_TIPS.length - 1]
  );
}

// Simple traditional lullabies (mobile-only preview library — short, calming
// snippets, NOT the full poem catalogue used on web). Each track ships a
// short sine-wave melody synthesised via `audioSynth.buildMelodyWav` so
// parents can hear the tune; the lyric stays alongside as a sing-along
// reference.
export type LullabyLang = "en" | "hi" | "hin";

import { NOTE_FREQ } from "./audioSynth";
import type { Note } from "./audioSynth.ts";
const { C4, D4, E4, F4, G4, A4, B4, C5 } = NOTE_FREQ;
const Q = 480;        // quarter note (~125 BPM lullaby tempo)
const H = Q * 2;      // half note
const D_ = Q * 3;     // dotted half

export type LullabyMelody = {
  notes: readonly Note[];
  /** Optional white-noise bed mixed under the tune. */
  noiseBed?: { kind: SynthKind; level: number };
  /** Peak amplitude (0..1). Defaults to 0.32 in the synth. */
  amplitude?: number;
};

export type Lullaby = {
  id: string;
  emoji: string;
  title: string;
  lang: LullabyLang;
  lyric: string;
  melody: LullabyMelody;
};

// "Twinkle Twinkle Little Star" — first two phrases (~8.6s).
const TWINKLE_NOTES: Note[] = [
  { freqHz: C4, durMs: Q }, { freqHz: C4, durMs: Q }, { freqHz: G4, durMs: Q }, { freqHz: G4, durMs: Q },
  { freqHz: A4, durMs: Q }, { freqHz: A4, durMs: Q }, { freqHz: G4, durMs: H },
  { freqHz: F4, durMs: Q }, { freqHz: F4, durMs: Q }, { freqHz: E4, durMs: Q }, { freqHz: E4, durMs: Q },
  { freqHz: D4, durMs: Q }, { freqHz: D4, durMs: Q }, { freqHz: C4, durMs: H },
];

// "Sleep Little One" — original gentle descending lullaby (~9s).
const SLEEP_LITTLE_ONE_NOTES: Note[] = [
  { freqHz: C5, durMs: Q }, { freqHz: B4, durMs: Q }, { freqHz: A4, durMs: Q }, { freqHz: G4, durMs: H },
  { freqHz: A4, durMs: Q }, { freqHz: G4, durMs: Q }, { freqHz: F4, durMs: H },
  { freqHz: E4, durMs: Q }, { freqHz: D4, durMs: Q }, { freqHz: C4, durMs: D_ },
  { freqHz: G4, durMs: Q }, { freqHz: F4, durMs: Q }, { freqHz: E4, durMs: Q }, { freqHz: D4, durMs: Q },
  { freqHz: C4, durMs: D_ },
];

// "Rock-a-Bye Baby" — traditional 6/8 melody (~8s).
const ROCK_A_BYE_NOTES: Note[] = [
  { freqHz: E4, durMs: Q }, { freqHz: E4, durMs: Q }, { freqHz: G4, durMs: H },
  { freqHz: F4, durMs: Q }, { freqHz: F4, durMs: Q }, { freqHz: D4, durMs: H },
  { freqHz: E4, durMs: Q }, { freqHz: F4, durMs: Q }, { freqHz: G4, durMs: Q },
  { freqHz: A4, durMs: Q }, { freqHz: G4, durMs: Q }, { freqHz: F4, durMs: Q }, { freqHz: E4, durMs: H },
];

// "Chanda Mama Door Ke" — simple Hindi pattern (~8s).
const CHANDA_MAMA_NOTES: Note[] = [
  { freqHz: G4, durMs: Q }, { freqHz: A4, durMs: Q }, { freqHz: B4, durMs: Q }, { freqHz: G4, durMs: Q },
  { freqHz: A4, durMs: Q }, { freqHz: B4, durMs: Q }, { freqHz: C5, durMs: H },
  { freqHz: B4, durMs: Q }, { freqHz: A4, durMs: Q }, { freqHz: G4, durMs: Q }, { freqHz: F4, durMs: Q },
  { freqHz: G4, durMs: H }, { freqHz: A4, durMs: Q }, { freqHz: G4, durMs: H },
];

// "So Ja Meri Pyari Bachhi" — gentle descending Hinglish lullaby (~8s).
const SO_JA_NOTES: Note[] = [
  { freqHz: A4, durMs: Q }, { freqHz: G4, durMs: Q }, { freqHz: F4, durMs: Q }, { freqHz: E4, durMs: H },
  { freqHz: F4, durMs: Q }, { freqHz: G4, durMs: Q }, { freqHz: A4, durMs: H },
  { freqHz: G4, durMs: Q }, { freqHz: F4, durMs: Q }, { freqHz: E4, durMs: Q }, { freqHz: D4, durMs: Q },
  { freqHz: E4, durMs: Q }, { freqHz: F4, durMs: Q }, { freqHz: G4, durMs: H },
];

// "White Noise Dream" — a Twinkle hum (lower amplitude) over a soft pink
// noise bed; designed to bridge the white-noise + lullaby experience.
const WHITE_NOISE_DREAM_NOTES: Note[] = TWINKLE_NOTES.map((n) => ({ ...n }));

export const LULLABIES: readonly Lullaby[] = [
  { id: "twinkle", emoji: "⭐", title: "Twinkle Twinkle Little Star", lang: "en",
    lyric: "Twinkle, twinkle, little star,\nHow I wonder what you are.\nUp above the world so high,\nLike a diamond in the sky.",
    melody: { notes: TWINKLE_NOTES } },
  { id: "sleep_little_one", emoji: "🌟", title: "Sleep Little One", lang: "en",
    lyric: "Hush little one, close your eyes,\nThe moon is rising in the skies.\nSleep little one, dreams will come,\nMorning is far — rest now, my one.",
    melody: { notes: SLEEP_LITTLE_ONE_NOTES, amplitude: 0.30 } },
  { id: "white_noise_dream", emoji: "💫", title: "White Noise Dream", lang: "en",
    lyric: "A gentle hum under soft static —\nfor parents who want both melody and bed sound at once.",
    melody: { notes: WHITE_NOISE_DREAM_NOTES, amplitude: 0.20, noiseBed: { kind: "pink", level: 0.45 } } },
  { id: "rock_a_bye", emoji: "🌙", title: "Rock-a-Bye Baby", lang: "en",
    lyric: "Rock-a-bye baby, on the tree top,\nWhen the wind blows the cradle will rock.\nWhen the bough breaks the cradle will fall,\nAnd down will come baby, cradle and all.",
    melody: { notes: ROCK_A_BYE_NOTES } },
  { id: "chanda_mama", emoji: "🌝", title: "Chanda Mama Door Ke", lang: "hi",
    lyric: "चंदा मामा दूर के, पुए पकाए बूर के,\nआप खाएं थाली में, मुन्ने को दें प्याली में।",
    melody: { notes: CHANDA_MAMA_NOTES } },
  { id: "lori_so_ja", emoji: "💤", title: "So Ja Meri Pyari Bachhi", lang: "hin",
    lyric: "So ja, so ja, meri pyari bachhi,\nNeendon ki chadar mein lipti hui,\nChand sitaron ki roshni mein,\nMaa ki lori sun ke so ja.",
    melody: { notes: SO_JA_NOTES } },
];
