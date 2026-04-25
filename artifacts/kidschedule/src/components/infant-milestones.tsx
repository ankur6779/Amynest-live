import { useState, useEffect, useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, Trophy, Target, Heart, ChevronDown, ChevronUp,
  PlayCircle, CheckCircle2, RotateCcw, ArrowUp, Clock,
  TrendingUp, Lightbulb, Smile, Baby, BookOpen,
} from "lucide-react";

// ─── Milestone Data Model ─────────────────────────────────────────────────────
type MState = "not_started" | "in_progress" | "achieved";
type MCategory = "motor" | "cognitive" | "social" | "language";

const CATEGORY_META: Record<MCategory, { label: string; emoji: string; color: string; bg: string }> = {
  motor:     { label: "Motor",     emoji: "🤸", color: "text-orange-700 dark:text-orange-300", bg: "bg-orange-100 dark:bg-orange-500/20" },
  cognitive: { label: "Thinking",  emoji: "🧠", color: "text-violet-700 dark:text-violet-300", bg: "bg-violet-100 dark:bg-violet-500/20" },
  social:    { label: "Social",    emoji: "💞", color: "text-rose-700 dark:text-rose-300",     bg: "bg-rose-100 dark:bg-rose-500/20" },
  language:  { label: "Language",  emoji: "💬", color: "text-sky-700 dark:text-sky-300",       bg: "bg-sky-100 dark:bg-sky-500/20" },
};

type BuddyMilestone = {
  id: string;
  emoji: string;
  title: string;
  explanation: string;
  whyItMatters: string;
  activity: string;
  timeRequired: string;
  easierVariation: string;
  nextLevel: string;
  category: MCategory;
  fromMonths: number;
  toMonths: number;
};

const MILESTONES: BuddyMilestone[] = [
  // ── 0–3 MONTHS ──────────────────────────────────────────────────────────
  {
    id: "b03_head_lift", emoji: "💪", title: "Head Control Improving", category: "motor",
    explanation: "Baby starts lifting their head briefly during tummy time.",
    whyItMatters: "Strong neck muscles are the foundation for rolling, sitting, crawling — every motor milestone builds on this.",
    activity: "Place baby on tummy on a firm surface and lie down face-to-face. Talk and smile to encourage head lifting.",
    timeRequired: "2–3 min · 2–3× daily",
    easierVariation: "Start with tummy-on-chest while you recline. Gravity is gentler this way and they still build the muscles.",
    nextLevel: "Try holding a high-contrast toy slightly above their line of sight to encourage longer holds.",
    fromMonths: 0, toMonths: 4,
  },
  {
    id: "b03_social_smile", emoji: "😊", title: "First Social Smile", category: "social",
    explanation: "Baby smiles back when you smile or talk — a real intentional smile, not gas.",
    whyItMatters: "The first sign that baby recognises connection. It strengthens parent-baby bonding hormones for both of you.",
    activity: "Get face-to-face about 25 cm away. Smile widely and say their name in a sing-song tone. Wait 5 seconds for a response.",
    timeRequired: "1–2 min · 4–5× daily",
    easierVariation: "Try after a feed when baby is calm and full. Use exaggerated facial expressions — slow blinks, wide smiles.",
    nextLevel: "Mirror their sounds back. They'll start cooing in response — that's the next chapter: serve-and-return.",
    fromMonths: 0, toMonths: 4,
  },
  {
    id: "b03_eye_track", emoji: "👀", title: "Tracking with Eyes", category: "cognitive",
    explanation: "Baby's eyes follow a moving face or toy from one side to the other.",
    whyItMatters: "Visual tracking trains the brain's attention system — the same system that will later support reading.",
    activity: "Hold a black-and-white card or your face 25 cm from baby. Slowly move side-to-side. They should follow.",
    timeRequired: "2–3 min · 2× daily",
    easierVariation: "Try in a dim room with a soft light source. Less visual noise = easier to focus.",
    nextLevel: "Try moving the object up-down and in a small circle. Tracking complex paths comes later.",
    fromMonths: 1, toMonths: 5,
  },
  {
    id: "b03_coo", emoji: "🗣️", title: "First Coos & Vowels", category: "language",
    explanation: "Baby makes soft 'aah' and 'ooh' sounds, especially when looking at you.",
    whyItMatters: "Cooing is baby's first attempt at conversation. Every coo you respond to wires the speech centre of their brain.",
    activity: "When baby coos, copy the sound back exactly. Pause for 5 seconds. They'll often try again.",
    timeRequired: "2–4 min · throughout day",
    easierVariation: "Start during nappy change — they're calm and have your full attention. Smile while doing it.",
    nextLevel: "Add a new vowel sound after their coo: they say 'aah', you reply 'aah... ooh!'. It builds variety.",
    fromMonths: 1, toMonths: 5,
  },
  {
    id: "b03_hands", emoji: "✋", title: "Discovers Their Hands", category: "cognitive",
    explanation: "Baby looks at their own hands, brings them to mouth, and starts to grab.",
    whyItMatters: "Discovering 'these are mine!' is the start of body awareness — the foundation of self-concept.",
    activity: "Lay baby on back and place your finger or a soft rattle in their palm. Their grip reflex will close.",
    timeRequired: "2–3 min · 2–3× daily",
    easierVariation: "Bring their own hands together at midline above their chest. Just feeling their hands meet teaches body map.",
    nextLevel: "Hang a low play gym above baby with toys at arm's length. Reaching strengthens shoulders and intent.",
    fromMonths: 2, toMonths: 5,
  },

  // ── 3–6 MONTHS ──────────────────────────────────────────────────────────
  {
    id: "b36_roll", emoji: "🔄", title: "First Roll Over", category: "motor",
    explanation: "Baby rolls from tummy to back (back-to-tummy comes later, around 5–6 months).",
    whyItMatters: "Rolling shows baby has the core strength and coordination to start moving — a huge leap toward independent mobility.",
    activity: "During tummy time, gently rock baby's hip to one side to give them the feel of rolling. Don't do the work — just hint.",
    timeRequired: "3–5 min · 2× daily",
    easierVariation: "Place a favourite toy just out of reach to one side. Motivation often beats muscle.",
    nextLevel: "Encourage back-to-tummy by slowly raising one leg across the body — they'll learn the twist.",
    fromMonths: 3, toMonths: 7,
  },
  {
    id: "b36_head_steady", emoji: "👶", title: "Head Held Steady", category: "motor",
    explanation: "When held upright, baby keeps their head steady without bobbing.",
    whyItMatters: "Steady head = ready to sit, ready to start solids safely, ready to see the world from your eye-level.",
    activity: "Hold baby upright on your lap facing outward. Talk to them so they look around. The looking strengthens neck muscles.",
    timeRequired: "5 min · 3–4× daily",
    easierVariation: "Use a baby carrier with proper neck support — the gentle motion encourages them to lift their head naturally.",
    nextLevel: "Try sitting baby on your lap, supporting only the lower back. They'll engage core muscles to stay up.",
    fromMonths: 3, toMonths: 6,
  },
  {
    id: "b36_laugh", emoji: "😆", title: "First Belly Laugh", category: "social",
    explanation: "Baby laughs out loud — not just smiles, but real giggles in response to play.",
    whyItMatters: "Laughter releases bonding hormones in BOTH of you. It's also a sign their emotional brain is thriving.",
    activity: "Try gentle blowing on tummy, peek-a-boo, or surprise faces. Find what makes YOUR baby giggle.",
    timeRequired: "2–3 min · once daily",
    easierVariation: "Try when baby is well-rested and just-fed. Tickle play under the chin or behind the ear often gets a smile first.",
    nextLevel: "Build anticipation: 'Are you ready... ready... PEEK-A-BOO!' Pausing before the punchline trains predicting.",
    fromMonths: 3, toMonths: 6,
  },
  {
    id: "b36_reach", emoji: "🤲", title: "Reaches for Objects", category: "motor",
    explanation: "Baby reaches out and bats at toys, eventually grabbing them.",
    whyItMatters: "Hand-eye coordination is the building block of every fine-motor skill — eating, drawing, writing, dressing.",
    activity: "Hold a soft, rattly toy 20 cm from baby's hand. Wait. Let them work for it.",
    timeRequired: "3–5 min · 2–3× daily",
    easierVariation: "Place the toy ON their hand first so they feel it. Then move it 5 cm away. Tiny distance = early success.",
    nextLevel: "Offer two toys, one in each hand. They'll start passing items hand-to-hand around 5–6 months.",
    fromMonths: 3, toMonths: 6,
  },
  {
    id: "b36_babble", emoji: "👄", title: "Babbling Begins", category: "language",
    explanation: "Baby strings consonants together: 'ba-ba', 'da-da', 'ma-ma' — without meaning yet.",
    whyItMatters: "Babbling is brain rehearsal for real words. Every babble is the speech motor system practicing.",
    activity: "Sit face-to-face. Slowly say 'ba-ba' or 'ma-ma' with exaggerated lip movement. Pause and watch them try.",
    timeRequired: "3 min · 3× daily",
    easierVariation: "Sing simple repeating songs ('Twinkle twinkle' uses lots of repeated syllables — perfect babble fuel).",
    nextLevel: "Now react with delight when they say 'ma-ma' near you. Connecting the sound to YOU is how it becomes a word.",
    fromMonths: 4, toMonths: 8,
  },

  // ── 6–12 MONTHS ─────────────────────────────────────────────────────────
  {
    id: "b612_sit", emoji: "🪑", title: "Sits Without Support", category: "motor",
    explanation: "Baby sits independently for a minute or longer without falling over.",
    whyItMatters: "Independent sitting frees both hands for play — a huge boost for cognitive and fine-motor development.",
    activity: "Sit on the floor with baby between your legs (no support). Roll a soft ball back and forth.",
    timeRequired: "5 min · 2× daily",
    easierVariation: "Sit baby in a U-shape using a nursing pillow around their hips. Gradually lower it as they get steadier.",
    nextLevel: "Place toys just outside their reach so they have to lean and return — builds the rotation needed for crawling.",
    fromMonths: 5, toMonths: 9,
  },
  {
    id: "b612_crawl", emoji: "🐛", title: "Starts to Crawl", category: "motor",
    explanation: "Baby moves themselves across the floor — could be classic crawl, army crawl, or bottom-shuffle. All count!",
    whyItMatters: "Crawling cross-wires the left and right sides of the brain — important for coordination, attention, and even reading later.",
    activity: "Place a favourite toy 30 cm in front of baby during tummy time. Don't move it. Let them figure out movement.",
    timeRequired: "5 min · 2× daily",
    easierVariation: "Place your hands flat against their feet so they can push off. The push-off feel teaches the motion.",
    nextLevel: "Crawl alongside them through play tunnels or under chairs. Crawling for joy strengthens the pattern.",
    fromMonths: 6, toMonths: 12,
  },
  {
    id: "b612_pincer", emoji: "🤏", title: "Pincer Grip", category: "motor",
    explanation: "Baby picks up small objects (e.g. a piece of soft puffed cereal) with thumb and forefinger.",
    whyItMatters: "Pincer grip = independence at meals, plus the foundation for writing, buttoning, and using utensils.",
    activity: "Place 3–4 puffed cereal pieces on baby's high-chair tray. Sit and let them figure out the pickup.",
    timeRequired: "5–10 min · at meals",
    easierVariation: "Use larger soft items (small banana cubes) first. As they master those, drop down to smaller pieces.",
    nextLevel: "Offer a small spoon — let them stab at soft food. Real spoon use comes around 12 months.",
    fromMonths: 7, toMonths: 12,
  },
  {
    id: "b612_object_perm", emoji: "🙈", title: "Object Permanence", category: "cognitive",
    explanation: "Baby looks for a toy when you hide it under a cloth — they understand it still exists.",
    whyItMatters: "This is one of the biggest cognitive leaps in infancy. It also means separation anxiety is normal and developmental.",
    activity: "Cover a favourite toy partly with a cloth in front of baby. Watch — they should pull the cloth off.",
    timeRequired: "3 min · 2× daily",
    easierVariation: "Leave half of the toy visible at first. Gradually cover more as they figure out the game.",
    nextLevel: "Play classic peek-a-boo with a cloth over your face. They'll pull it off and shriek with joy.",
    fromMonths: 6, toMonths: 12,
  },
  {
    id: "b612_mama", emoji: "💖", title: "First Meaningful Word", category: "language",
    explanation: "Baby says 'mama', 'dada', or another word AND clearly means it (e.g. says 'mama' when looking at you).",
    whyItMatters: "The first true word marks the shift from babbling to symbolic language — a doorway to all communication.",
    activity: "Whenever you appear, say 'Mama is here!' (or your name). Repeat the word linked to YOU consistently.",
    timeRequired: "1 min · every appearance",
    easierVariation: "Use just one syllable consistently for a person or thing: 'Da' for dad, 'Ba' for ball. Simpler = first.",
    nextLevel: "Once they have 3–5 words, start two-word combinations: 'More milk', 'Bye dada'. Model 1 step ahead.",
    fromMonths: 8, toMonths: 14,
  },
  {
    id: "b612_wave", emoji: "👋", title: "Waves Bye-Bye", category: "social",
    explanation: "Baby waves when prompted — and eventually starts waving on their own.",
    whyItMatters: "Waving is symbolic gesture — the same brain skill that lets them later use signs and then words to communicate.",
    activity: "Every time someone leaves, say 'Bye-bye' clearly and wave. Take baby's hand and wave it gently.",
    timeRequired: "10 sec · multiple/day",
    easierVariation: "Try waving in a mirror together. Seeing the action mirrored helps them imitate faster.",
    nextLevel: "Add 'hi' on entry. Clapping for 'yay' often follows. Build a small gesture vocabulary they can use.",
    fromMonths: 7, toMonths: 12,
  },
  {
    id: "b612_pull_stand", emoji: "🧍", title: "Pulls to Standing", category: "motor",
    explanation: "Baby uses furniture (sofa, low table) to pull themselves up to standing.",
    whyItMatters: "The strength + balance to stand is the precursor to cruising along furniture and then to walking.",
    activity: "Place a favourite toy on a low, sturdy surface. Sit baby on the floor next to it. Watch them work.",
    timeRequired: "5 min · 1–2× daily",
    easierVariation: "Sit them next to a stable chair leg first. Encourage them to pull on YOUR fingers to come up.",
    nextLevel: "Place toys on a sofa, then walk them along (cruising). Holding ONE hand walks come around 11–13 months.",
    fromMonths: 8, toMonths: 13,
  },

  // ── 12–24 MONTHS ────────────────────────────────────────────────────────
  {
    id: "b1224_walk", emoji: "🚶", title: "First Independent Steps", category: "motor",
    explanation: "Toddler takes 2–3 steps without holding on — eventually walks across a room.",
    whyItMatters: "Walking unlocks a new world of exploration, which fuels cognitive, language and social leaps over the next 6 months.",
    activity: "Stand a few steps in front of toddler, arms out. Encourage them to step toward you. Cheer EVERY attempt.",
    timeRequired: "3–5 min · 2× daily",
    easierVariation: "Let them push a stable push-toy (e.g. weighted walker). The steady support + motion feel of walking.",
    nextLevel: "Once steady, try walking outdoors on safe grass. Different surfaces train balance differently.",
    fromMonths: 11, toMonths: 18,
  },
  {
    id: "b1224_words", emoji: "📚", title: "10–20 Word Vocabulary", category: "language",
    explanation: "Toddler uses 10–20+ single words meaningfully — names of people, animals, foods, body parts.",
    whyItMatters: "Vocabulary at 18 months is one of the strongest predictors of school readiness later.",
    activity: "Read ONE picture book together daily. Point and name everything. 'Cat. Big cat. Soft cat.'",
    timeRequired: "5 min · daily",
    easierVariation: "Pick books with one large image per page and very few words. 'First Words' books work brilliantly.",
    nextLevel: "Ask 'Where's the cat?' instead of just naming. They'll point — the next step is them naming it back.",
    fromMonths: 12, toMonths: 20,
  },
  {
    id: "b1224_two_word", emoji: "💬", title: "Two-Word Phrases", category: "language",
    explanation: "Toddler combines two words: 'more milk', 'mama up', 'all gone', 'bye dada'.",
    whyItMatters: "Combining words = the start of grammar. From here, sentences explode.",
    activity: "Whenever toddler uses one word, model a two-word version. They say 'milk' → you say 'more milk?'",
    timeRequired: "Throughout day",
    easierVariation: "Start with action + object combos: 'kick ball', 'eat apple'. Easier to grasp than abstract pairs.",
    nextLevel: "Once they use 2-word phrases, ask 'what colour?' or 'how many?' to nudge longer responses.",
    fromMonths: 14, toMonths: 24,
  },
  {
    id: "b1224_body_parts", emoji: "👃", title: "Points to Body Parts", category: "cognitive",
    explanation: "Toddler points to nose, eyes, mouth, ears, hair when named.",
    whyItMatters: "Knowing body parts builds receptive vocabulary AND spatial awareness — the brain's map of self.",
    activity: "Sing 'Head, shoulders, knees & toes' daily. Touch each part as you sing.",
    timeRequired: "2 min · 2× daily",
    easierVariation: "Start with just nose. Touch their nose, then yours. Repeat for a week before adding the next part.",
    nextLevel: "Add less obvious parts: chin, elbow, knee. Then move to clothes: 'Where's your shoe?'",
    fromMonths: 13, toMonths: 24,
  },
  {
    id: "b1224_scribble", emoji: "✏️", title: "Scribbles with Crayon", category: "motor",
    explanation: "Toddler holds a crayon (whole-fist grip is fine) and makes marks on paper.",
    whyItMatters: "Scribbling builds the hand strength and shoulder stability needed for writing later. It also expresses emotions.",
    activity: "Put a large piece of paper on the floor, give a chunky crayon, and demo a scribble. Then let them lead.",
    timeRequired: "5–10 min · 2–3× weekly",
    easierVariation: "Try finger-painting in yoghurt or shaving foam first. The sensory feedback teaches the motion.",
    nextLevel: "Show them a vertical line, then a circle. They'll begin imitating around 18–24 months.",
    fromMonths: 12, toMonths: 24,
  },
  {
    id: "b1224_pretend", emoji: "🍼", title: "Pretend Play", category: "cognitive",
    explanation: "Toddler feeds a doll, talks on a toy phone, or 'cooks' with kitchen toys.",
    whyItMatters: "Pretend play is one of the most powerful predictors of language, social, and problem-solving development.",
    activity: "Set up a tea party or doctor kit. Join in: 'Oh, the doll is hungry — feed her!' Model, then let them lead.",
    timeRequired: "10 min · daily",
    easierVariation: "Start with familiar real-life routines: pretend bath time for a doll, pretend feeding. They imitate what they live.",
    nextLevel: "Let them direct the play. Ask 'what's happening now?' Pretend stories show emerging narrative skill.",
    fromMonths: 14, toMonths: 24,
  },
  {
    id: "b1224_one_step", emoji: "🎯", title: "Follows One-Step Commands", category: "language",
    explanation: "Toddler does what you ask for simple actions: 'Bring the ball', 'Sit down', 'Give me the spoon'.",
    whyItMatters: "Following directions shows receptive language is far ahead of speech — they understand more than they say.",
    activity: "Use one clear command at a time during play. 'Give the bear a hug!' Smile and praise when they do.",
    timeRequired: "Throughout day",
    easierVariation: "Pair the command with a gesture: say 'come here' AND open your arms. Gestures bridge to words.",
    nextLevel: "Try two-step commands: 'Pick up the cup AND put it on the table'. Comes around 20–24 months.",
    fromMonths: 12, toMonths: 22,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
type Stored = Record<string, { state: MState; updatedAt: number }>;

// Map from old MilestoneTracker IDs → new BuddyMilestone IDs (only direct equivalents)
const OLD_TO_NEW_ID: Record<string, string> = {
  m0_lift_head: "b03_head_lift",
  m0_eye_track: "b03_eye_track",
  m0_social_smile: "b03_social_smile",
  m0_coo: "b03_coo",
  m3_roll_front: "b36_roll",
  m3_laughs: "b36_laugh",
  m3_reach: "b36_reach",
  m3_babble: "b36_babble",
  m3_head_steady: "b36_head_steady",
  m6_sit: "b612_sit",
  m6_bye_wave: "b612_wave",
  m6_object_perm: "b612_object_perm",
  m9_crawl: "b612_crawl",
  m9_pull_stand: "b612_pull_stand",
  m9_pincer: "b612_pincer",
  m9_mama_dada: "b612_mama",
  m12_walk: "b1224_walk",
  m12_words: "b1224_words",
  m12_commands: "b1224_one_step",
  m12_scribble: "b1224_scribble",
  m18_words50: "b1224_words",
  m18_two_word: "b1224_two_word",
  m18_body_parts: "b1224_body_parts",
  m18_pretend: "b1224_pretend",
};

function loadProgress(childName: string): Stored {
  const key = `amynest:milestones:${childName}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};

    const out: Stored = {};
    let migrated = false;
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      // Resolve old → new ID where applicable
      const newKey = OLD_TO_NEW_ID[k];
      const targetKey = newKey ?? k;
      if (newKey) migrated = true;

      if (typeof v === "boolean") {
        // Old boolean shape from legacy MilestoneTracker
        out[targetKey] = { state: v ? "achieved" : "not_started", updatedAt: Date.now() };
        migrated = true;
      } else if (v && typeof v === "object" && "state" in v) {
        out[targetKey] = v as { state: MState; updatedAt: number };
      }
    }

    // Persist migrated shape so we only do this once
    if (migrated) {
      try { localStorage.setItem(key, JSON.stringify(out)); } catch {}
    }
    return out;
  } catch { return {}; }
}

function saveProgress(childName: string, data: Stored) {
  try { localStorage.setItem(`amynest:milestones:${childName}`, JSON.stringify(data)); } catch {}
}

function getAgeBand(months: number): "0-3" | "3-6" | "6-12" | "12-24" {
  if (months < 3) return "0-3";
  if (months < 6) return "3-6";
  if (months < 12) return "6-12";
  return "12-24";
}

function getBandLabel(band: string): string {
  switch (band) {
    case "0-3": return "0–3 months";
    case "3-6": return "3–6 months";
    case "6-12": return "6–12 months";
    default: return "12–24 months";
  }
}

function getMilestonesForAge(months: number): BuddyMilestone[] {
  return MILESTONES.filter((m) => months >= m.fromMonths && months < m.toMonths);
}

function getWeekKey(): number {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 1).getTime();
  const week = Math.floor((d.getTime() - start) / (7 * 24 * 60 * 60 * 1000));
  return d.getFullYear() * 100 + week;
}

// Pick this week's plan: prioritise in-progress > not-started, rotate by week
function pickWeeklyPlan(all: BuddyMilestone[], stored: Stored, count = 3): BuddyMilestone[] {
  if (all.length === 0) return [];

  const inProgress = all.filter((m) => stored[m.id]?.state === "in_progress");
  const notStarted = all.filter((m) => !stored[m.id] || stored[m.id]?.state === "not_started");
  const achieved = all.filter((m) => stored[m.id]?.state === "achieved");

  const wk = getWeekKey();
  const rotate = <T,>(arr: T[]): T[] => {
    if (arr.length === 0) return arr;
    const offset = wk % arr.length;
    return [...arr.slice(offset), ...arr.slice(0, offset)];
  };

  const pool = [...inProgress, ...rotate(notStarted), ...rotate(achieved)];
  return pool.slice(0, Math.min(count, all.length));
}

const ENCOURAGE_NOT_STARTED = [
  "Let's start when you're both ready 💜",
  "No pressure — every baby moves at their own pace.",
  "Pick a calm moment to try this together.",
];
const ENCOURAGE_IN_PROGRESS = [
  "Great progress! Keep going 🌟",
  "Almost there — consistency wins.",
  "You're doing wonderfully. Try again today.",
];
const ENCOURAGE_ACHIEVED = [
  "Amazing! You unlocked this together 🏆",
  "Look at that growth! Celebrate this win.",
  "Beautifully done — this is real progress.",
];

const PARENT_TIPS = [
  "Don't worry if your baby is slightly behind — milestone ranges are wide and very normal.",
  "Every baby develops at their own pace. Comparison is the thief of parenting joy.",
  "Some weeks are big leaps, others are quiet. Both are part of growth.",
  "If a milestone feels stuck for 2+ months past the upper age, mention it at your next check-up — early support helps when needed.",
  "Skills don't appear in a clean order — your baby may skip crawling and go straight to walking. That's also normal.",
  "Babies often regress briefly before a big leap. A 'bad' week is sometimes a sign growth is coming.",
];

// ─── Main Component ───────────────────────────────────────────────────────────
export function BuddyMilestonePlanner({ childName, ageMonths }: { childName: string; ageMonths: number }) {
  const { toast } = useToast();
  const [progress, setProgress] = useState<Stored>(() => loadProgress(childName));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tipIdx, setTipIdx] = useState(0);

  // Reload when child changes
  useEffect(() => { setProgress(loadProgress(childName)); }, [childName]);

  const ageBand = getAgeBand(ageMonths);
  const ageMilestones = useMemo(() => getMilestonesForAge(ageMonths), [ageMonths]);
  const bandMilestones = useMemo(
    () => MILESTONES.filter((m) => {
      // Loose band match: include any whose range overlaps with the band
      const [bMin, bMax] = ageBand === "0-3" ? [0, 3]
        : ageBand === "3-6" ? [3, 6]
        : ageBand === "6-12" ? [6, 12]
        : [12, 24];
      return m.fromMonths < bMax && m.toMonths > bMin;
    }),
    [ageBand],
  );

  const weeklyPlan = useMemo(() => pickWeeklyPlan(ageMilestones, progress, 3), [ageMilestones, progress]);

  // If user opens a milestone from "All for this age" outside the weekly plan,
  // surface it inline as an "Also exploring" extra card.
  const planIds = useMemo(() => new Set(weeklyPlan.map((m) => m.id)), [weeklyPlan]);
  const extraOpened = useMemo(() => {
    if (!expanded || planIds.has(expanded)) return null;
    return bandMilestones.find((m) => m.id === expanded) ?? null;
  }, [expanded, planIds, bandMilestones]);

  const setState = useCallback((id: string, state: MState) => {
    setProgress((prev) => {
      const next = { ...prev, [id]: { state, updatedAt: Date.now() } };
      saveProgress(childName, next);
      return next;
    });
    if (state === "achieved") {
      const msg = ENCOURAGE_ACHIEVED[Math.floor(Math.random() * ENCOURAGE_ACHIEVED.length)];
      toast({ description: msg });
    } else if (state === "in_progress") {
      const msg = ENCOURAGE_IN_PROGRESS[Math.floor(Math.random() * ENCOURAGE_IN_PROGRESS.length)];
      toast({ description: msg });
    }
  }, [childName, toast]);

  // Weekly summary stats (across the current age band, not just plan)
  const stats = useMemo(() => {
    const total = bandMilestones.length;
    const done = bandMilestones.filter((m) => progress[m.id]?.state === "achieved").length;
    const ip = bandMilestones.filter((m) => progress[m.id]?.state === "in_progress").length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const nextFocus = bandMilestones
      .filter((m) => progress[m.id]?.state !== "achieved")
      .slice(0, 2)
      .map((m) => m.title);
    return { total, done, ip, pct, nextFocus };
  }, [bandMilestones, progress]);

  return (
    <div className="space-y-4">
      {/* ── Weekly Summary Card ─────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-100/80 via-fuchsia-100/60 to-pink-100/80 dark:from-violet-900/30 dark:via-fuchsia-900/20 dark:to-pink-900/30 border border-violet-200/60 dark:border-violet-400/20 p-4 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-violet-600 dark:text-violet-300" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">Weekly Summary</p>
          </div>
          <span className="text-[10px] font-bold text-violet-600/80 dark:text-violet-300/80">{getBandLabel(ageBand)}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <SummaryStat label="Achieved" value={`${stats.done}`} sub={`/ ${stats.total}`} />
          <SummaryStat label="In progress" value={`${stats.ip}`} sub="now" />
          <SummaryStat label="Progress" value={`${stats.pct}%`} sub="" />
        </div>

        {/* Big progress bar */}
        <div className="h-2.5 rounded-full bg-white/60 dark:bg-white/10 overflow-hidden mb-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 transition-all duration-700"
            style={{ width: `${stats.pct}%` }}
          />
        </div>

        {stats.nextFocus.length > 0 && (
          <div className="mt-3 pt-3 border-t border-violet-300/40 dark:border-violet-400/20">
            <div className="flex items-center gap-1.5 mb-1">
              <Target className="h-3 w-3 text-violet-600 dark:text-violet-300" />
              <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">Next focus</p>
            </div>
            <p className="text-[12px] text-violet-800/90 dark:text-violet-100/90 leading-snug">
              {stats.nextFocus.join(" · ")}
            </p>
          </div>
        )}
      </div>

      {/* ── This Week's Plan ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-fuchsia-500" />
            <p className="text-xs font-bold text-foreground">This Week's Plan</p>
          </div>
          <p className="text-[10px] text-muted-foreground">{weeklyPlan.length} for you to focus on</p>
        </div>

        <div className="space-y-2.5">
          {weeklyPlan.map((m) => (
            <MilestoneCard
              key={m.id}
              milestone={m}
              state={progress[m.id]?.state ?? "not_started"}
              isOpen={expanded === m.id}
              onToggle={() => setExpanded(expanded === m.id ? null : m.id)}
              onSetState={(s) => setState(m.id, s)}
            />
          ))}

          {weeklyPlan.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-border/60 px-3 py-6 text-center">
              <Baby className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-[12px] text-muted-foreground">No milestones for this exact age yet — check back soon.</p>
            </div>
          )}
        </div>

        {/* Extra opened — when user clicked an item from "All for this age" */}
        {extraOpened && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-3 w-3 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Also exploring</p>
            </div>
            <MilestoneCard
              milestone={extraOpened}
              state={progress[extraOpened.id]?.state ?? "not_started"}
              isOpen
              onToggle={() => setExpanded(null)}
              onSetState={(s) => setState(extraOpened.id, s)}
            />
          </div>
        )}
      </div>

      {/* ── Parent Guidance Tip ─────────────────────────────────────── */}
      <div className="rounded-xl bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 border border-rose-200/60 dark:border-rose-400/20 p-3">
        <div className="flex items-start gap-2.5">
          <Heart className="h-4 w-4 text-rose-500 fill-rose-300 dark:fill-rose-500/30 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">A gentle reminder</p>
            </div>
            <p className="text-[12px] text-rose-900/90 dark:text-rose-100/90 leading-relaxed">
              {PARENT_TIPS[tipIdx % PARENT_TIPS.length]}
            </p>
          </div>
          <button
            onClick={() => setTipIdx((i) => i + 1)}
            className="text-rose-500 dark:text-rose-300 hover:text-rose-600 transition-colors p-1"
            aria-label="Next tip"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── All milestones for this age band (collapsible) ─────────── */}
      <BandLibrary
        bandMilestones={bandMilestones}
        weeklyPlanIds={new Set(weeklyPlan.map((m) => m.id))}
        progress={progress}
        setExpanded={(id) => setExpanded(id)}
      />
    </div>
  );
}

function SummaryStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg bg-white/70 dark:bg-white/10 px-2 py-2 text-center">
      <p className="text-[9px] font-bold uppercase tracking-wide text-violet-600/80 dark:text-violet-300/80">{label}</p>
      <p className="text-base font-bold text-violet-900 dark:text-violet-100 leading-tight tabular-nums">
        {value}
        {sub && <span className="text-[10px] text-violet-600/60 dark:text-violet-300/60 ml-0.5 font-medium">{sub}</span>}
      </p>
    </div>
  );
}

function ActionBtn({
  active, onClick, label, emoji, accent,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  emoji: string;
  accent: "muted" | "amber" | "emerald";
}) {
  const base = "flex flex-col items-center gap-0.5 py-2 rounded-lg text-[10px] font-bold transition-all border";
  let cls = "";
  if (active) {
    cls = accent === "emerald"
      ? "bg-emerald-500 text-white border-emerald-600 shadow-[0_4px_12px_-2px_rgba(16,185,129,0.5)]"
      : accent === "amber"
      ? "bg-amber-500 text-white border-amber-600 shadow-[0_4px_12px_-2px_rgba(245,158,11,0.5)]"
      : "bg-muted-foreground/30 text-foreground border-muted-foreground/40";
  } else {
    cls = "bg-white/60 dark:bg-white/5 text-muted-foreground border-border hover:border-current hover:text-foreground";
  }
  return (
    <button onClick={onClick} className={`${base} ${cls}`}>
      <span className="text-base leading-none">{emoji}</span>
      <span>{label}</span>
    </button>
  );
}

function MilestoneCard({
  milestone, state, isOpen, onToggle, onSetState,
}: {
  milestone: BuddyMilestone;
  state: MState;
  isOpen: boolean;
  onToggle: () => void;
  onSetState: (s: MState) => void;
}) {
  const m = milestone;
  const cur = state;
  const cat = CATEGORY_META[m.category];
  const pct = cur === "achieved" ? 100 : cur === "in_progress" ? 50 : 0;

  return (
    <div
      className={[
        "rounded-2xl border-2 backdrop-blur-md transition-all overflow-hidden",
        cur === "achieved"
          ? "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-300/60 dark:border-emerald-400/30 shadow-[0_8px_24px_-12px_rgba(16,185,129,0.4)]"
          : cur === "in_progress"
          ? "bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-300/60 dark:border-amber-400/30 shadow-[0_8px_24px_-12px_rgba(245,158,11,0.4)]"
          : "bg-white/60 dark:bg-white/[0.04] border-border",
      ].join(" ")}
    >
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-start gap-3 text-left"
      >
        <span className="text-2xl leading-none shrink-0 mt-0.5">{m.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <p className="font-bold text-sm text-foreground leading-tight">{m.title}</p>
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${cat.bg} ${cat.color}`}>
              <span className="text-[10px] leading-none">{cat.emoji}</span>
              <span className="uppercase tracking-wide">{cat.label}</span>
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground leading-snug">{m.explanation}</p>
          <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden mt-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                cur === "achieved" ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                : cur === "in_progress" ? "bg-gradient-to-r from-amber-500 to-orange-500"
                : "bg-muted-foreground/30"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-1" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />}
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="rounded-lg bg-violet-50/80 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-400/20 p-2.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Heart className="h-3 w-3 text-violet-600 dark:text-violet-400" />
              <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">Why it matters</p>
            </div>
            <p className="text-[12px] text-violet-900/90 dark:text-violet-100/90 leading-snug">{m.whyItMatters}</p>
          </div>

          <div className="rounded-lg bg-sky-50/80 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-400/20 p-2.5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                <PlayCircle className="h-3 w-3 text-sky-600 dark:text-sky-400" />
                <p className="text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">Try this activity</p>
              </div>
              <span className="inline-flex items-center gap-0.5 text-[10px] text-sky-700/80 dark:text-sky-300/80 font-bold">
                <Clock className="h-2.5 w-2.5" />
                {m.timeRequired}
              </span>
            </div>
            <p className="text-[12px] text-sky-900/90 dark:text-sky-100/90 leading-snug">{m.activity}</p>
          </div>

          {cur === "not_started" && (
            <div className="rounded-lg bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-400/20 p-2.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Lightbulb className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">Try an easier start</p>
              </div>
              <p className="text-[12px] text-amber-900/90 dark:text-amber-100/90 leading-snug">{m.easierVariation}</p>
            </div>
          )}
          {cur === "in_progress" && (
            <div className="rounded-lg bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-400/20 p-2.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Smile className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">Almost there</p>
              </div>
              <p className="text-[12px] text-amber-900/90 dark:text-amber-100/90 leading-snug">
                Keep showing up daily — even 2 minutes counts. If progress feels stuck, switch to: {m.easierVariation}
              </p>
            </div>
          )}
          {cur === "achieved" && (
            <div className="rounded-lg bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-400/20 p-2.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <ArrowUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Next level</p>
              </div>
              <p className="text-[12px] text-emerald-900/90 dark:text-emerald-100/90 leading-snug">{m.nextLevel}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <ActionBtn active={cur === "not_started"} onClick={() => onSetState("not_started")} label="Not yet" emoji="🌱" accent="muted" />
            <ActionBtn active={cur === "in_progress"} onClick={() => onSetState("in_progress")} label="Trying" emoji="✨" accent="amber" />
            <ActionBtn active={cur === "achieved"} onClick={() => onSetState("achieved")} label="Achieved" emoji="🏆" accent="emerald" />
          </div>
        </div>
      )}
    </div>
  );
}

function BandLibrary({
  bandMilestones, weeklyPlanIds, progress, setExpanded,
}: {
  bandMilestones: BuddyMilestone[];
  weeklyPlanIds: Set<string>;
  progress: Stored;
  setExpanded: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const others = bandMilestones.filter((m) => !weeklyPlanIds.has(m.id));

  if (others.length === 0) return null;

  return (
    <div className="rounded-xl bg-white/40 dark:bg-white/[0.03] border border-border overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold text-foreground">All for this age</span>
          <span className="text-[10px] text-muted-foreground">({others.length} more)</span>
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {others.map((m) => {
            const st = progress[m.id]?.state ?? "not_started";
            const cat = CATEGORY_META[m.category];
            return (
              <button
                key={m.id}
                onClick={() => setExpanded(m.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/60 dark:bg-white/5 border border-border hover:border-primary/40 transition-all text-left"
              >
                <span className="text-base shrink-0">{m.emoji}</span>
                <span className="text-[12px] font-semibold text-foreground flex-1 truncate">{m.title}</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${cat.bg} ${cat.color}`}>
                  {cat.emoji}
                </span>
                {st === "achieved" && <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />}
                {st === "in_progress" && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
