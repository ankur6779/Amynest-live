import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { eq, desc, and, inArray } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { db, aiCacheTable, userProgressTable, userCoachSessionsTable } from "@workspace/db";
import { logger } from "../lib/logger.js";
import { GOAL_IDS, type GoalId } from "../lib/image-map.js";
import { getGoalPromptSection } from "../lib/goal-prompts.js";
import { aiUsageGate } from "../middlewares/aiUsageGate.js";
import { incrementAiUsage } from "../services/subscriptionService.js";
import {
  COACH_INITIAL_WINS,
  COACH_TOTAL_WINS,
  dbGetCoachCache,
  dbSetCoachCache,
  staticInitialWinsFallback,
  INITIAL_AI_TIMEOUT_MS,
  validatePartialPlan,
  getCoachGenerationById,
  getCoachGenerationBySession,
  updateCoachSessionPlan,
  validatePlan as validateFullCoachPlan,
  validateWin as validateServiceWin,
  type CoachPlan as ServiceCoachPlan,
  type CoachWin as ServiceCoachWin,
} from "../services/coachWinGenerationService.js";
import { startCoachPerfSpan } from "../lib/coach-performance.js";
import { fallbackExtensionWin } from "../services/coachExtensionFallback.js";
import { buildCoachPlanCacheKey, COACH_PLAN_NAMESPACE } from "../services/coachPlanCacheKey.js";
import {
  generateAndCacheCoachWinAudio,
  pregenerateCoachPlanAudio,
} from "../services/coachAudioCacheService.js";
import { submitRouteAiJob } from "../lib/route-ai-queue.js";
import { TTS_MAX_INPUT_CHARS } from "../services/ttsCacheService.js";

const router: IRouter = Router();

// ─── Types ────────────────────────────────────────────────────────────────
interface Win {
  win: number;
  title: string;
  objective: string;
  deep_explanation: string;
  actions: string[];
  example: string;
  mistake_to_avoid: string;
  micro_task: string;
  duration: string;
  science_reference: string;
}

interface CoachPlan {
  title: string;
  root_cause: string;
  summary: string;
  wins: Win[];
}

interface CoachInput {
  goal?: string;        // goal id slug
  ageGroup?: string;    // "2-4" | "5-7" | "8-10"
  severity?: string;    // "mild" | "moderate" | "severe"
  triggers?: string[];
  routine?: string;
  // Topic-specific answers from coachTopicQuestions.json. Free-form key
  // → value (string or string[]) blob — forwarded into the AI prompt
  // and included in the cache key so different inputs cache separately.
  topicAnswers?: Record<string, string | string[]>;
}

// ─── Config ──────────────────────────────────────────────────────────────
const DB_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MEMORY_TTL_MS = 10 * 60 * 1000;
const MEMORY_MAX = 200;

const memCache = new Map<string, { plan: CoachPlan; ts: number }>();
const memStats = { hits: 0, misses: 0, dbHits: 0, aiCalls: 0 };

function pruneMem() {
  const now = Date.now();
  for (const [k, v] of memCache.entries()) if (now - v.ts > MEMORY_TTL_MS) memCache.delete(k);
  while (memCache.size > MEMORY_MAX) {
    const oldest = memCache.keys().next().value;
    if (!oldest) break;
    memCache.delete(oldest);
  }
}

// ─── Validation helpers ──────────────────────────────────────────────────
const norm = (s: unknown): string =>
  String(s ?? "").toLowerCase().trim().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "").slice(0, 60);

const clip = (s: unknown, max: number): string =>
  typeof s === "string" ? s.trim().slice(0, max) : "";

function normTopicAnswers(ta?: Record<string, string | string[]>): string {
  if (!ta) return "";
  const keys = Object.keys(ta).sort();
  const parts: string[] = [];
  for (const k of keys) {
    const v = ta[k];
    const valStr = Array.isArray(v)
      ? v.map(norm).filter(Boolean).sort().join(",")
      : norm(v);
    if (!valStr) continue;
    parts.push(`${norm(k)}=${valStr}`);
  }
  return parts.join("|");
}

function buildCacheKey(input: CoachInput): string {
  return buildCoachPlanCacheKey(input);
}

/**
 * Parse / sanitise a raw `topicAnswers` value off the request body. Drops
 * non-string values, trims, and caps both keys and values so the prompt
 * and cache key cannot be abused with megabyte-scale junk.
 */
function parseTopicAnswers(raw: unknown): Record<string, string | string[]> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, string | string[]> = {};
  let count = 0;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (count >= 30) break;
    const key = clip(k, 60);
    if (!key) continue;
    if (typeof v === "string") {
      const val = clip(v, 200);
      if (!val) continue;
      out[key] = val;
      count++;
    } else if (Array.isArray(v)) {
      const arr = v.filter((x): x is string => typeof x === "string").slice(0, 12).map((x) => clip(x, 100)).filter(Boolean);
      if (arr.length === 0) continue;
      out[key] = arr;
      count++;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Render `topicAnswers` as a human-readable block to inject into the AI
 * user prompt. Returns an empty string when there are no entries so the
 * prompt structure stays identical for unmapped topics.
 */
function renderTopicAnswersBlock(ta?: Record<string, string | string[]>): string {
  if (!ta) return "";
  const lines: string[] = [];
  for (const [k, v] of Object.entries(ta)) {
    const label = String(k).replace(/^common_/, "").replace(/_/g, " ");
    const valStr = Array.isArray(v)
      ? v.filter((x) => typeof x === "string" && x.length > 0).map((x) => clip(x, 80)).join(", ")
      : clip(v, 200);
    if (!valStr) continue;
    lines.push(`- ${label}: ${valStr}`);
  }
  if (lines.length === 0) return "";
  return `\nTopic-specific context (parent's answers — use these to tailor every win):\n${lines.join("\n")}\n`;
}

const isStr = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

function validateWin(w: unknown): w is Win {
  if (!w || typeof w !== "object") return false;
  const o = w as Record<string, unknown>;
  return (
    typeof o.win === "number" &&
    isStr(o.title) &&
    isStr(o.objective) &&
    isStr(o.deep_explanation) &&
    Array.isArray(o.actions) && o.actions.length >= 3 && o.actions.length <= 6 &&
    o.actions.every(isStr) &&
    isStr(o.example) &&
    isStr(o.mistake_to_avoid) &&
    isStr(o.micro_task) &&
    isStr(o.duration) &&
    isStr(o.science_reference)
  );
}

function validatePlan(p: unknown): p is CoachPlan {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  if (!isStr(o.title) || !isStr(o.root_cause) || !isStr(o.summary)) return false;
  // v4 contract: exactly 12 wins, numbered 1..12
  if (!Array.isArray(o.wins) || o.wins.length !== 12) return false;
  if (!o.wins.every(validateWin)) return false;
  return o.wins.every((w, i) => (w as Win).win === i + 1);
}

// ─── Incremental JSON parsers (used by /ai-coach/stream) ─────────────────
//
// These let us emit `plan_meta` and individual `win` SSE events as soon as
// the streaming OpenAI response contains complete sub-objects — so the
// client can render win 1 in ~1-2 seconds instead of waiting for all 12.

/**
 * Try to extract title / root_cause / summary from a partial JSON buffer.
 * Returns null if any field is still mid-stream. The regex tolerates
 * escaped quotes inside the string value.
 */
function tryExtractMeta(
  buf: string,
): { title: string; root_cause: string; summary: string } | null {
  const pick = (key: string): string | undefined => {
    const re = new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`);
    const m = buf.match(re);
    if (!m) return undefined;
    try {
      return JSON.parse(`"${m[1]}"`) as string;
    } catch {
      return undefined;
    }
  };
  const title = pick("title");
  const root_cause = pick("root_cause");
  const summary = pick("summary");
  if (!title || !root_cause || !summary) return null;
  return { title, root_cause, summary };
}

/**
 * Walks the partial buffer starting from `cursor`, locating each newly-
 * completed top-level object inside the `wins` array. Returns the slices
 * (raw JSON text) plus the new cursor position so the caller can resume.
 *
 * String/escape-aware brace counting — handles `{` / `}` inside string
 * values like `"actions": ["use { brackets }"]` correctly.
 */
function extractCompletedWins(
  buf: string,
  cursor: number,
): { wins: string[]; cursor: number } {
  const winsKey = buf.match(/"wins"\s*:\s*\[/);
  if (!winsKey || winsKey.index === undefined) return { wins: [], cursor };
  const arrayStart = winsKey.index + winsKey[0].length;
  let i = Math.max(cursor, arrayStart);
  const out: string[] = [];

  while (i < buf.length) {
    while (i < buf.length && (buf[i] === "," || buf[i] === " " || buf[i] === "\n" || buf[i] === "\r" || buf[i] === "\t")) {
      i++;
    }
    if (i >= buf.length) break;
    if (buf[i] === "]") {
      i++;
      break;
    }
    if (buf[i] !== "{") break; // not at object boundary yet — wait for more bytes

    let depth = 0;
    let inString = false;
    let escape = false;
    let j = i;
    let closed = false;
    for (; j < buf.length; j++) {
      const ch = buf[j];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === "\"") {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          closed = true;
          break;
        }
      }
    }
    if (!closed) break; // incomplete object — wait for next chunk
    out.push(buf.slice(i, j + 1));
    i = j + 1;
  }

  return { wins: out, cursor: i };
}

// ─── Goal display labels (used in fallback + prompts) ────────────────────
const GOAL_LABELS: Record<string, string> = {
  // Behavior
  "manage-tantrums": "Manage Tantrums",
  "handle-aggression": "Handle Aggression (hitting, biting)",
  "reduce-defiance": "Reduce Defiance (not listening)",
  "emotional-regulation": "Emotional Regulation",
  "separation-anxiety": "Separation Anxiety",
  "change-stubborn-behaviour": "Change Stubborn Behaviour",
  // Screen & Focus
  "balance-screen-time": "Balance Screen Time",
  "reduce-mobile-addiction": "Reduce Mobile Addiction",
  "improve-focus-span": "Improve Focus Span",
  "reduce-shorts-overuse": "Reduce YouTube / Shorts Overuse",
  "reduce-instant-gratification": "Reduce Instant Gratification Habit",
  // Eating
  "encourage-independent-eating": "Encourage Independent Eating",
  "navigate-fussy-eating": "Navigate Fussy Eating",
  "stop-junk-food-craving": "Stop Junk Food Craving",
  "healthy-eating-routine": "Build Healthy Eating Routine",
  "improve-mealtime-behavior": "Improve Mealtime Behavior",
  // Sleep
  "improve-sleep-patterns": "Improve Sleep Patterns",
  "fix-bedtime-resistance": "Fix Bedtime Resistance",
  "stop-night-waking": "Stop Night Waking",
  "consistent-sleep-routine": "Build Consistent Sleep Routine",
  "reduce-late-sleeping": "Reduce Late Sleeping Habit",
  // Learning
  "boost-concentration": "Boost Concentration",
  "build-study-discipline": "Build Study Discipline",
  "increase-learning-interest": "Increase Learning Interest",
  "reduce-homework-resistance": "Reduce Homework Resistance",
  "develop-growth-mindset": "Develop Growth Mindset",
  // Parenting Challenges
  "manage-grandparents-interference": "Manage Grandparents' Interference",
  "align-parenting-between-parents": "Align Parenting Between Parents",
  "handle-working-parent-guilt": "Handle Working Parent Guilt",
  "set-consistent-family-rules": "Set Consistent Family Rules",

  // Toddler Behavior (2-4 yrs)
  "toddler-tantrums": "Toddler Tantrums (2–4 yrs)",
  "hitting-biting": "Hitting & Biting",
  "no-phase": "The 'No' Phase",
  "public-meltdowns": "Public Meltdowns",
  "whining-and-clinginess": "Whining & Clinginess",

  // Daily Skills & Independence
  "potty-training-readiness": "Potty Training Readiness",
  "potty-day-training": "Day Toilet Training",
  "potty-night-training": "Night-Time Dry",
  "potty-public-anxiety": "Public Toilet Anxiety",
  "self-dressing": "Self-Dressing & Hygiene",

  // Family Dynamics
  "sibling-rivalry": "Sibling Rivalry",
  "sharing-turn-taking": "Sharing & Turn-Taking",
  "new-baby-adjustment": "Adjusting to New Baby",
  "sibling-fights": "Sibling Fights & Hitting",
  "favouritism-feelings": "Handle Favouritism Feelings",

  // Special Situations
  "travel-with-kids": "Travel With Kids",
  "hospital-doctor-visit": "Hospital / Doctor Visit",
  "daycare-school-transition": "Daycare / School Transition",
  "welcoming-new-sibling": "Welcoming a New Sibling",
  "moving-houses": "Moving to a New Home",

  // Kids Health Concern (research & science-based)
  "child-obesity-management": "Childhood Obesity & Weight Management",
  "nutrition-deficiency": "Nutrition Deficiency (Hidden Problem)",
  "boost-immunity": "Immunity & Frequent Illness",
  "dental-health": "Dental Health",
  "digital-health-eye-care": "Screen Addiction & Digital Health",
  "early-milestones-0-5": "Early Development & Milestones (0–5 yrs)",

  // For You (Parent Self-Care)
  "parent-burnout": "Beat Parent Burnout",
  "stay-calm-anger": "Stay Calm When Angry",
  "guilt-after-yelling": "Handle Guilt After Yelling",
  "find-me-time": "Find 'Me Time' Daily",
  "couple-time-balance": "Balance Partner & Parent Time",
  "improve-own-sleep": "Improve Your Own Sleep",
  "manage-overwhelm": "Manage Daily Overwhelm",
};

export function fallbackPlan(input: CoachInput): CoachPlan {
  const label = GOAL_LABELS[input.goal ?? ""] ?? "Your Parenting Goal";
  const ageGroup = input.ageGroup || "your child's age";
  const mk = (
    n: number, title: string, objective: string, deep: string,
    actions: string[], example: string, mistake: string, micro: string, dur: string, sci: string
  ): Win => ({
    win: n, title, objective, deep_explanation: deep, actions,
    example, mistake_to_avoid: mistake, micro_task: micro, duration: dur,
    science_reference: sci,
  });
  return {
    title: label,
    root_cause:
      `At ${ageGroup}, the prefrontal cortex (the brain's brake pedal) is still developing — kids physically cannot self-regulate the way adults can. What looks like 'misbehaviour' is usually a nervous system that's overloaded, an unmet need (sleep, hunger, connection), or a developmental skill that hasn't been built yet.`,
    summary:
      `This is a structured 12-step plan that moves from connection → consistent expectations → skill-building → repair → habit lock-in. Don't rush — each win is a complete module designed to actually shift the underlying pattern, not just paper over it.`,
    wins: [
      mk(1, "Connect before you correct",
         "Open communication so your child listens",
         "Children's brains literally cannot access logic when they feel disconnected or threatened. Connection lowers cortisol, activates the prefrontal cortex, and tells the nervous system 'I'm safe' — only THEN can a child receive guidance. Skip this step and every other strategy will feel like pushing a boulder uphill.",
         ["Get on eye level before speaking — physically lower yourself", "Name what you see without judgment ('I see you're upset, your body is moving fast')", "Wait 10 full seconds in silence before giving any instruction", "Touch shoulder or offer hand if welcomed"],
         "Sara's 4-year-old was throwing toys. Instead of 'Stop that!', she knelt down and said 'Looks like something is really frustrating.' He paused, said 'I wanted the red one.' Connection took 30 seconds; the meltdown was avoided.",
         "Talking to your child from across the room or while distracted by your phone — they read this as 'not safe to listen' even if your words are kind.",
         "Today: try 5 minutes of 'special time' — child picks the activity, phone away, fully present.",
         "2–3 days",
         "Connection-based discipline (Daniel Siegel & Tina Payne Bryson, 'The Whole-Brain Child')"),
      mk(2, "Identify the real trigger",
         "Stop guessing — find the actual root",
         "90% of recurring behaviour has a predictable trigger: hunger, tired, transition, sensory overload, or unmet emotional need. When you can name the trigger, you stop fighting the behaviour and start solving the cause. This is the single biggest shift parents make.",
         ["Track for 3 days: what time, what happened just before, last meal, last sleep", "Look for patterns (4pm meltdown = hunger; pre-bath = transition)", "Ask your child softly when calm: 'What was hardest today?'"],
         "Maya tracked her 5-year-old's tantrums for 3 days — every single one happened between 5–6pm. Earlier dinner = problem solved.",
         "Treating every meltdown as 'bad behaviour' rather than data — the behaviour IS the message.",
         "Today: keep a 3-line note in your phone every time the behaviour shows up — time, situation, what was happening 30 min before.",
         "3 days",
         "Behavioural ABC analysis (Antecedent–Behaviour–Consequence, applied behaviour science)"),
      mk(3, "Set ONE clear expectation",
         "Reduce confusion and decision fatigue",
         `Children at ${ageGroup} can hold 1–2 rules in working memory at a time. When parents juggle 10 expectations, kids freeze, comply randomly, or push back hard. ONE clear, repeated, positively-phrased rule beats 10 vague ones every time.`,
         ["Pick the single most important rule for this week", "Phrase positively ('We use gentle hands') not negatively ('Don't hit')", "Repeat it the same exact way every time it applies"],
         "Instead of 'Don't run, don't yell, don't hit your sister' — Anna chose ONE: 'In our home we keep our bodies safe.' Repeated that line for a week.",
         "Adding a new rule each time something annoys you — kids tune out the noise.",
         "Write ONE rule on a sticky note. Stick it on the fridge. Use it when needed.",
         "3–4 days",
         "Working-memory limits in early childhood (Cowan's capacity research)"),
      mk(4, "Offer two real choices",
         "Give autonomy without losing the limit",
         "Autonomy is a core developmental need (self-determination theory). When children feel they have NO control, they create some — by resisting. Two limited choices give them genuine agency while you keep the boundary that matters.",
         ["'Do you want X or Y?' — both options must be acceptable to you", "Never offer a choice during a full meltdown — wait for calm", "Honour the choice once made"],
         "Bath fight every night. Dad switched from 'Time for bath' to 'Bath now or in 5 minutes?' — fights stopped in 2 days.",
         "Offering fake choices ('Do you want to do X or do you want a time-out?') — kids feel tricked.",
         "At one transition today, swap a command for a choice.",
         "3–4 days",
         "Self-Determination Theory — autonomy as a core need (Deci & Ryan)"),
      mk(5, "Co-regulate before correcting",
         "Lend your calm — borrow theirs later",
         "Children regulate through their parent's nervous system before they can do it alone. When you're activated, they amplify; when you're calm, they slowly settle. This is biological co-regulation (Stephen Porges' Polyvagal Theory) — not a parenting trick.",
         ["Lower your voice instead of raising it", "Drop your shoulders, soften your face", "Breathe slowly and visibly — they will mirror you", "Validate first ('This is hard'), correct later"],
         "Priya started doing 4-7-8 breathing audibly when her son melted down. Within a week he was breathing with her.",
         "Trying to teach a regulation skill mid-meltdown — the lesson can only land afterward.",
         "Practice 4-in / 7-hold / 8-out breathing twice today, before any tough moment.",
         "1 week",
         "Polyvagal Theory & co-regulation (Stephen Porges)"),
      mk(6, "Hold the limit kindly",
         "Stay warm AND firm — they aren't opposites",
         "Kids feel safer when limits hold even under pressure. A wobbling limit teaches 'if I push hard enough, the rule changes' — which makes future pushes louder. Holding the limit while staying warm is the gentle-discipline gold standard.",
         ["Validate the feeling, hold the limit: 'I know — and the answer is still no'", "Stay nearby, don't lecture, don't punish in heat", "Repeat the rule once, then stop talking"],
         "'I see you really want more screen time. Screen time is done for today. I'm right here if you want a hug.' Said calmly, on repeat.",
         "Caving when the meltdown gets loud — this teaches escalation works.",
         "Today: pick ONE limit you've been wobbling on. Hold it warmly today.",
         "1 week",
         "Authoritative parenting style — high warmth + high structure (Diana Baumrind)"),
      mk(7, "Build the missing skill",
         "Don't punish what hasn't been taught",
         "Most repeated behaviour problems are missing skills, not missing motivation. A child who can't transition needs transition practice; a child who lashes out needs anger-language practice. Skills are built through low-stakes repetition, not consequences.",
         ["Name the skill out loud ('We're learning how to wait')", "Practice during calm moments, not during crisis", "Praise the attempt, not just the success"],
         "5-year-old kept hitting when frustrated. Mom made a 'feelings poster' and practiced naming feelings during car rides — hitting dropped in 2 weeks.",
         "Expecting a child to do something they've never been taught to do.",
         "Pick ONE skill (waiting, sharing, transitioning) — practice for 3 minutes during calm time today.",
         "1–2 weeks",
         "Collaborative & Proactive Solutions — 'kids do well if they can' (Ross Greene)"),
      mk(8, "Repair after rupture",
         "Repair > perfection — every time",
         "Every parent loses it sometimes. What matters is what happens next. Repair (owning your part, reconnecting) builds attachment security and teaches your child that mistakes are recoverable — one of the most important life skills they'll ever learn.",
         ["When you lose your cool, return when calm", "Take ownership: 'I yelled. That wasn't your fault. I'm sorry.'", "Reconnect physically — hug, sit together, read a book"],
         "After yelling at her son, Lina sat next to him 10 minutes later: 'I yelled. That was about my stress, not you. I love you.' He hugged her back.",
         "Pretending the rupture didn't happen, OR over-apologising in a way that puts the child in a parental role.",
         "Tonight: bedtime check-in — 'Best part of today? Hardest part?'",
         "Ongoing",
         "Attachment repair & rupture-and-repair cycles (John Gottman, Edward Tronick)"),
      mk(9, "Track tiny wins daily",
         "Notice progress so you don't give up",
         "Behaviour change is invisible day-to-day but obvious week-to-week. Without a tracking system, your brain remembers only the bad moments and concludes 'nothing is working' — when real progress is happening underneath.",
         ["Each evening, write ONE thing that went 5% better", "Look for partial wins — '20 sec less screaming' is a win", "Share the win with your child the next morning"],
         "Raj's wins jar: 'Bedtime took 25 min instead of 40.' After 2 weeks, the jar full of small wins kept him going.",
         "Comparing to other families' kids — your only baseline is YOUR child last week.",
         "Tonight: text yourself or a partner ONE small win.",
         "1 week",
         "Behavioural Activation & self-monitoring (cognitive-behavioural research)"),
      mk(10, "Hold consistency for 14 days",
         "Lock in the new pattern",
         "Behaviours rewire after 14–21 days of consistent response. Most parents quit at day 5 because that's when kids ESCALATE — testing whether the new boundary is real. Holding through the day-5 burst is when the real change happens.",
         ["Use the same response every time, every day, even when tired", "Expect a 'protest burst' around day 5 — this means it's working", "Resist switching strategies — give it the full 14 days"],
         "Asha gave up at day 6 every time. The 7th time she pushed through — by day 12 her daughter was sleeping through the night.",
         "Switching tactics mid-stream because 'it's not working yet' — change needs runway.",
         "Mark a calendar each day you held the new approach — visible streak.",
         "2 weeks",
         "Habit formation & extinction bursts (BJ Fogg, Tiny Habits)"),
      mk(11, "Maintain through setbacks",
         "Regression is part of the path, not the end of it",
         "Kids regress before big developmental leaps and during stress (illness, new sibling, school changes). A regression isn't failure — it's a sign your child is reorganising. Return to the basics: connect first, hold the limit, repair.",
         ["Expect regression around big transitions", "Drop expectations slightly — return to win 1 (connect)", "Don't restart the plan — resume from where you were"],
         "Two months in, a stomach bug + new school caused a setback. Parents went back to extra connection time for 4 days — pattern returned.",
         "Treating regression as evidence the plan failed and abandoning it.",
         "When setback hits: extra 5 min of special time daily for 3 days.",
         "Ongoing",
         "Developmental regression around growth spurts (Brazelton's Touchpoints)"),
      mk(12, "Make it a family value",
         "Move from rules to identity",
         "The deepest behaviour change happens when 'we don't hit' becomes 'we are a gentle family' — when the behaviour expresses identity, not just compliance. This is what makes change last into the teen years and beyond.",
         ["Use 'we' language: 'In our home we…'", "Tell stories of family identity: 'We're the family that talks it out'", "Notice and name when your child lives the value"],
         "Family motto on the fridge: 'We are kind, we are brave, we try again.' Kids quoted it back during arguments.",
         "Skipping this final step — without identity, behaviour reverts to baseline under stress.",
         "Tonight at dinner: ask 'What's one thing our family is really good at?'",
         "Ongoing",
         "Identity-based behaviour change (James Clear, Atomic Habits)"),
    ],
  };
}

// ─── DB cache helpers ────────────────────────────────────────────────────
async function dbGet(cacheKey: string): Promise<CoachPlan | null> {
  try {
    const rows = await db.select().from(aiCacheTable).where(eq(aiCacheTable.cacheKey, cacheKey)).limit(1);
    const row = rows[0];
    if (!row) return null;
    if (Date.now() - new Date(row.createdAt).getTime() > DB_CACHE_TTL_MS) return null;
    return row.response as CoachPlan;
  } catch (err) {
    logger.warn({ err }, "ai-coach DB cache read failed");
    return null;
  }
}

async function dbSet(cacheKey: string, input: CoachInput, plan: CoachPlan): Promise<void> {
  try {
    await db
      .insert(aiCacheTable)
      .values({ cacheKey, namespace: COACH_PLAN_NAMESPACE, input, response: plan })
      .onConflictDoUpdate({
        target: aiCacheTable.cacheKey,
        set: { input, response: plan, createdAt: new Date() },
      });
  } catch (err) {
    logger.warn({ err }, "ai-coach DB cache write failed");
  }
}

// ─── helper: save session for "Continue plan" restore ────────────────────
async function saveCoachSession(
  userId: string,
  sessionId: string,
  goalId: string,
  plan: CoachPlan,
  inputs: CoachInput,
): Promise<void> {
  try {
    await db
      .insert(userCoachSessionsTable)
      .values({ sessionId, userId, goalId, planJson: plan as unknown as Record<string, unknown>, inputs: inputs as unknown as Record<string, unknown> })
      .onConflictDoNothing();
  } catch (err) {
    logger.warn({ err }, "ai-coach session save failed (non-fatal)");
  }
}

function parseCoachInput(raw: CoachInput): { input: CoachInput; goal: string } | null {
  const goal = norm(raw.goal);
  if (!GOAL_IDS.includes(goal as GoalId)) return null;
  return {
    goal,
    input: {
      goal,
      ageGroup: clip(raw.ageGroup, 30) || "5-7",
      severity: clip(raw.severity, 30) || "moderate",
      triggers: Array.isArray(raw.triggers)
        ? raw.triggers.filter((t): t is string => typeof t === "string").slice(0, 8).map((t) => clip(t, 50))
        : [],
      routine: clip(raw.routine, 200) || "Inconsistent",
      topicAnswers: parseTopicAnswers(raw.topicAnswers),
    },
  };
}

async function handleCoachGenerate(req: import("express").Request, res: import("express").Response): Promise<void> {
  pruneMem();
  const requestStart = Date.now();
  const requestSpan = startCoachPerfSpan("REQUEST_TOTAL", {
    path: req.path,
    method: req.method,
  });
  const { userId } = getAuth(req);
  const parsed = parseCoachInput((req.body ?? {}) as CoachInput);
  if (!parsed) {
    requestSpan.end({ status: "error", httpStatus: 400 });
    res.status(400).json({ error: "invalid goal", validGoals: GOAL_IDS });
    return;
  }
  const { input, goal } = parsed;

  if (userId) {
    const { assertCoachCanGenerate } = await import(
      "../services/coachJourneyService.js"
    );
    const gate = await assertCoachCanGenerate(userId, goal);
    if (!gate.ok) {
      requestSpan.end({ status: "error", httpStatus: 402 });
      res.status(402).json({
        error: "coach_locked",
        feature: "amy_coach",
        message: "This Amy Coach topic is locked. Upgrade or complete your free journey.",
        goalAccess: gate.goalAccess,
      });
      return;
    }
  }

  if (userId) {
    const { fireJourneyTask } = await import("../services/journeyService.js");
    fireJourneyTask(userId, "amy_coach");
  }

  const cacheKey = buildCacheKey(input);

  const completePayload = (plan: CoachPlan, planCacheKey: string, extra: Record<string, unknown>) => ({
    plan,
    wins: plan.wins,
    status: "complete" as const,
    totalWins: COACH_TOTAL_WINS,
    sessionId: randomUUID(),
    planCacheKey,
    ...extra,
  });

  const cacheSpan = startCoachPerfSpan("CACHE_LOOKUP", { userId, cacheKey: cacheKey.slice(0, 8) });

  // L1 — full cached plan
  const mem = memCache.get(cacheKey);
  if (mem && Date.now() - mem.ts < MEMORY_TTL_MS && mem.plan.wins.length >= COACH_TOTAL_WINS) {
    cacheSpan.end({ hit: "memory" });
    memStats.hits++;
    logger.info({ cacheKey: cacheKey.slice(0, 8), source: "memory", stats: memStats }, "ai-coach cache hit");
    const memPayload = completePayload(mem.plan, cacheKey, { cached: true, source: "memory" });
    const responseMs = Date.now() - requestStart;
    console.log({ step: "RESPONSE_SENT", time: responseMs, status: "complete", cached: true });
    requestSpan.end({ status: "complete", cached: true, source: "memory", userId, responseMs });
    startCoachPerfSpan("RESPONSE_SENT", { status: "complete", cached: true, responseMs }).end();
    res.json(memPayload);
    if (userId) {
      void saveCoachSession(userId, memPayload.sessionId, goal, mem.plan, input);
      void import("../services/coachJourneyService.js").then(({ recordCoachPlanCompleted }) =>
        recordCoachPlanCompleted(userId, goal, memPayload.sessionId),
      );
    }
    return;
  }

  // L2 — full cached plan
  const dbHit = await dbGetCoachCache(cacheKey);
  if (dbHit && validateFullCoachPlan(dbHit)) {
    cacheSpan.end({ hit: "db" });
    memCache.set(cacheKey, { plan: dbHit, ts: Date.now() });
    memStats.dbHits++;
    logger.info({ cacheKey: cacheKey.slice(0, 8), source: "db", stats: memStats }, "ai-coach cache hit");
    const dbPayload = completePayload(dbHit, cacheKey, { cached: true, source: "db" });
    const responseMsDb = Date.now() - requestStart;
    console.log({ step: "RESPONSE_SENT", time: responseMsDb, status: "complete", cached: true });
    requestSpan.end({ status: "complete", cached: true, source: "db", userId, responseMs: responseMsDb });
    startCoachPerfSpan("RESPONSE_SENT", { status: "complete", cached: true, responseMs: responseMsDb }).end();
    res.json(dbPayload);
    if (userId) {
      void saveCoachSession(userId, dbPayload.sessionId, goal, dbHit, input);
      void import("../services/coachJourneyService.js").then(({ recordCoachPlanCompleted }) =>
        recordCoachPlanCompleted(userId, goal, dbPayload.sessionId),
      );
    }
    return;
  }

  cacheSpan.end({ hit: "miss" });

  memStats.misses++;
  memStats.aiCalls++;
  logger.info({ cacheKey: cacheKey.slice(0, 8), goal, stats: memStats }, "ai-coach cache miss — fast initial wins");

  const goalLabel = GOAL_LABELS[input.goal!] ?? input.goal;

  const topicBlock = renderTopicAnswersBlock(input.topicAnswers);
  const { enqueueAiJob, isBullMqActive } = await import("../queue/ai-job-queue.js");
  const { wrapJobInput } = await import("../queue/ai-job-payload.js");
  const { waitForJobResult } = await import("../queue/index.js");
  const { waitForJob } = await import("../queue/ai-job-store.js");
  let partialPlan: CoachPlan = staticInitialWinsFallback(goalLabel!, input);
  let aiOk = false;
  if (userId) {
    console.log("Enqueue:", "ai-coach/initial");
    const enqueued = await enqueueAiJob(
      "ai-coach.initial_wins",
      userId,
      wrapJobInput("ai-coach/initial", {
        systemPrompt: "coach-initial",
        userPrompt: JSON.stringify({ input, goalLabel, topicBlock }),
      }),
    );
    if (enqueued.jobId) {
      const finished = isBullMqActive()
        ? await waitForJobResult(enqueued.jobId, INITIAL_AI_TIMEOUT_MS)
        : await waitForJob(enqueued.jobId, INITIAL_AI_TIMEOUT_MS);
      if (finished?.status === "completed" && finished.result) {
        const body = finished.result as { raw: string };
        try {
          const parsed = JSON.parse(body.raw);
          if (validatePartialPlan(parsed)) {
            partialPlan = parsed;
            aiOk = true;
          }
        } catch {
          /* fallback */
        }
      }
    }
  }

  const effectiveSessionId = randomUUID();

  const responseMs = Date.now() - requestStart;
  console.log({ step: "RESPONSE_SENT", time: responseMs, status: "partial", lazy: true });
  requestSpan.end({
    status: "partial",
    userId,
    sessionId: effectiveSessionId,
    initialWins: partialPlan.wins.length,
    aiOk,
    responseMs,
  });
  startCoachPerfSpan("RESPONSE_SENT", { status: "partial", responseMs }).end();

  res.json({
    plan: partialPlan,
    wins: partialPlan.wins,
    status: "partial" as const,
    totalWins: COACH_TOTAL_WINS,
    initialWins: COACH_INITIAL_WINS,
    sessionId: effectiveSessionId,
    planCacheKey: cacheKey,
    cached: false,
    source: aiOk ? "ai" : "fallback",
    fallback: !aiOk,
    lazyWins: true,
  });

  if (userId) {
    void saveCoachSession(userId, effectiveSessionId, goal, partialPlan as ServiceCoachPlan, input);
    void import("../services/coachJourneyService.js").then(({ recordCoachPlanCompleted }) =>
      recordCoachPlanCompleted(userId, goal, effectiveSessionId),
    );
  }
}

// ─── POST /coach/next-win — lazy win 3..12 on parent advance ─────────────
async function handleCoachNextWin(req: import("express").Request, res: import("express").Response): Promise<void> {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = parseCoachInput((req.body ?? {}) as CoachInput);
  if (!parsed) {
    res.status(400).json({ error: "invalid goal", validGoals: GOAL_IDS });
    return;
  }
  const { input, goal } = parsed;

  const raw = req.body ?? {};
  const sessionId = clip(raw.sessionId, 64);
  if (!sessionId) {
    res.status(400).json({ error: "sessionId required" });
    return;
  }

  const planMeta = raw.plan as Record<string, unknown> | undefined;
  if (
    !planMeta ||
    !isStr(planMeta.title) ||
    !isStr(planMeta.root_cause) ||
    !isStr(planMeta.summary)
  ) {
    res.status(400).json({ error: "invalid plan meta" });
    return;
  }

  const existingRaw = Array.isArray(raw.existingWins) ? raw.existingWins : [];
  const existingWins: ServiceCoachWin[] = [];
  for (const w of existingRaw.slice(0, COACH_TOTAL_WINS)) {
    if (!validateServiceWin(w)) {
      res.status(400).json({ error: "invalid existingWins" });
      return;
    }
    existingWins.push(w as ServiceCoachWin);
  }

  const nextWinNumber = existingWins.length + 1;
  if (nextWinNumber < COACH_INITIAL_WINS + 1 || nextWinNumber > COACH_TOTAL_WINS) {
    res.status(400).json({
      error: nextWinNumber > COACH_TOTAL_WINS ? "plan_complete" : "invalid_win_sequence",
      totalWins: COACH_TOTAL_WINS,
    });
    return;
  }
  if (!existingWins.every((w, i) => w.win === i + 1)) {
    res.status(400).json({ error: "wins must be numbered 1..n in order" });
    return;
  }

  const goalLabel = GOAL_LABELS[input.goal!] ?? input.goal;
  const goalBrief = getGoalPromptSection(input.goal!, goalLabel!);
  const topicBlock = renderTopicAnswersBlock(input.topicAnswers);
  const cacheKey = buildCacheKey(input);
  const meta = {
    title: planMeta.title as string,
    root_cause: planMeta.root_cause as string,
    summary: planMeta.summary as string,
  };

  const { submitRouteAiJob } = await import("../lib/route-ai-queue.js");
  await submitRouteAiJob({
    routeName: "ai-coach/next-win",
    type: "ai-coach.next_win",
    userId,
    input: {
      input,
      goalLabel: goalLabel!,
      goalBrief,
      meta,
      existingWins,
      nextWinNumber,
      topicBlock,
    },
    waitMs: 25_000,
    buildSyncBody: (result) => {
      const body = result as { win: Win; aiOk: boolean };
      const win = body.win;
      if (!validateWin(win) || win.win !== nextWinNumber) {
        const fallbackSlice = fallbackPlan(input).wins[nextWinNumber - 1];
        if (!fallbackSlice) {
          return { error: "next_win_failed" };
        }
        const mergedWins = [...existingWins, fallbackSlice];
        const plan: CoachPlan = { ...meta, wins: mergedWins };
        void updateCoachSessionPlan(userId, sessionId, plan as ServiceCoachPlan);
        return {
          win: fallbackSlice,
          status: mergedWins.length >= COACH_TOTAL_WINS ? "complete" : "partial",
          totalWins: COACH_TOTAL_WINS,
          source: "fallback",
        };
      }

      const mergedWins = [...existingWins, win];
      const plan: CoachPlan = { ...meta, wins: mergedWins };
      void updateCoachSessionPlan(userId, sessionId, plan as ServiceCoachPlan);
      if (mergedWins.length >= COACH_TOTAL_WINS) {
        memCache.set(cacheKey, { plan, ts: Date.now() });
        void dbSetCoachCache(cacheKey, input, plan as ServiceCoachPlan);
      }

      return {
        win,
        status: mergedWins.length >= COACH_TOTAL_WINS ? "complete" : "partial",
        totalWins: COACH_TOTAL_WINS,
        source: body.aiOk ? "ai" : "fallback",
      };
    },
    res,
  });
}

// ─── POST /ai-coach (2 wins now; wins 3–12 lazy on /coach/next-win) ───────
router.post("/ai-coach", aiUsageGate, handleCoachGenerate);
router.post("/coach/generate", aiUsageGate, handleCoachGenerate);
router.post("/ai-coach/next-win", handleCoachNextWin);
router.post("/coach/next-win", handleCoachNextWin);

async function handleCoachStatus(req: import("express").Request, res: import("express").Response): Promise<void> {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const sessionId = clip(req.query.sessionId, 64);
  const generationId = clip(req.query.generationId, 64);
  if (!sessionId && !generationId) {
    res.status(400).json({ error: "sessionId or generationId required" });
    return;
  }

  const row = generationId
    ? await getCoachGenerationById(userId, generationId)
    : await getCoachGenerationBySession(userId, sessionId!);

  if (!row) {
    res.status(404).json({ error: "generation not found" });
    return;
  }

  res.json({
    status: row.status,
    wins: row.plan.wins,
    plan: row.plan,
    sessionId: row.sessionId,
    generationId: row.generationId,
    totalWins: COACH_TOTAL_WINS,
    source: "amy_coach",
  });
}

router.get("/ai-coach/status", handleCoachStatus);
router.get("/coach/status", handleCoachStatus);

// ─── POST /ai-coach/stream ───────────────────────────────────────────────
// Server-Sent Events (SSE) version of /ai-coach. Streams progress events
// as the AI generates each win, so the loading UI can show "Crafting win
// 5 of 12…" instead of a static spinner. Same validation, same caches —
// returns the same `{ plan, sessionId, ... }` shape inside a `done` event.
router.post("/ai-coach/stream", aiUsageGate, async (req, res): Promise<void> => {
  pruneMem();
  const { userId } = getAuth(req);
  const raw: CoachInput = req.body ?? {};
  const goal = norm(raw.goal);
  if (!GOAL_IDS.includes(goal as GoalId)) {
    res.status(400).json({ error: "invalid goal", validGoals: GOAL_IDS });
    return;
  }
  const input: CoachInput = {
    goal,
    ageGroup: clip(raw.ageGroup, 30) || "5-7",
    severity: clip(raw.severity, 30) || "moderate",
    triggers: Array.isArray(raw.triggers)
      ? raw.triggers.filter((t): t is string => typeof t === "string").slice(0, 8).map((t) => clip(t, 50))
      : [],
    routine: clip(raw.routine, 200) || "Inconsistent",
    topicAnswers: parseTopicAnswers(raw.topicAnswers),
  };

  if (userId) {
    const { assertCoachCanGenerate } = await import("../services/coachJourneyService.js");
    const gate = await assertCoachCanGenerate(userId, goal);
    if (!gate.ok) {
      res.status(402).json({
        error: "coach_locked",
        feature: "amy_coach",
        message: "This Amy Coach topic is locked. Upgrade or complete your free journey.",
        goalAccess: gate.goalAccess,
      });
      return;
    }
  }

  const cacheKey = buildCacheKey(input);
  const sessionId = randomUUID();

  // ── Open SSE stream ────────────────────────────────────────────────
  res.status(200).set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });
  // flushHeaders is available on Node http.ServerResponse but not on every Express type.
  const flushHeaders = (res as unknown as { flushHeaders?: () => void }).flushHeaders;
  if (typeof flushHeaders === "function") flushHeaders.call(res);

  let ended = false;
  let planDelivered = false;
  const aiAbort = new AbortController();
  const send = (event: string, data: unknown): void => {
    if (ended) return;
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      // socket may be half-closed; treat as ended
      ended = true;
    }
  };
  const heartbeat = setInterval(() => {
    if (ended) return;
    try { res.write(`: ping\n\n`); } catch { ended = true; }
  }, 15000);
  const finish = (): void => {
    if (ended) return;
    ended = true;
    clearInterval(heartbeat);
    aiAbort.abort();
    try { res.end(); } catch { /* noop */ }
    // Refund the AI quota if the user disconnected before getting any plan.
    // (When a plan is delivered — even a fallback — we keep the slot consumed
    // to match the non-streaming endpoint's behaviour.)
    if (!planDelivered && userId) {
      void incrementAiUsage(userId, -1).catch(() => undefined);
    }
  };
  req.on("close", finish);

  // ── L1 / L2 cache hit → instant done (only when full 12-win plan cached) ──
  const mem = memCache.get(cacheKey);
  if (mem && Date.now() - mem.ts < MEMORY_TTL_MS && mem.plan.wins.length >= COACH_TOTAL_WINS) {
    memStats.hits++;
    logger.info({ cacheKey: cacheKey.slice(0, 8), source: "memory", stats: memStats }, "ai-coach (stream) cache hit");
    planDelivered = true;
    send("done", { plan: mem.plan, sessionId, planCacheKey: cacheKey, cached: true, source: "memory", fallback: false });
    finish();
    if (userId) void saveCoachSession(userId, sessionId, goal, mem.plan, input);
    return;
  }

  const dbHit = await dbGet(cacheKey);
  if (dbHit && validateFullCoachPlan(dbHit)) {
    memCache.set(cacheKey, { plan: dbHit, ts: Date.now() });
    memStats.dbHits++;
    logger.info({ cacheKey: cacheKey.slice(0, 8), source: "db", stats: memStats }, "ai-coach (stream) cache hit");
    planDelivered = true;
    send("done", { plan: dbHit, sessionId, planCacheKey: cacheKey, cached: true, source: "db", fallback: false });
    finish();
    if (userId) void saveCoachSession(userId, sessionId, goal, dbHit, input);
    return;
  }

  memStats.misses++;
  memStats.aiCalls++;
  logger.info({ cacheKey: cacheKey.slice(0, 8), goal, stats: memStats }, "ai-coach (stream) cache miss — calling AI");

  // ── Build prompts (same as POST /ai-coach) ────────────────────────
  const goalLabel = GOAL_LABELS[input.goal!] ?? input.goal;
  const triggers = (input.triggers ?? []).join(", ") || "not specified";
  const { getGoalPromptSection } = await import("../lib/goal-prompts.js");
  const goalBrief = getGoalPromptSection(input.goal!, goalLabel!);

  const systemPrompt = `You are a specialist child psychologist and parenting coach who adapts your expertise to the SPECIFIC parenting goal in front of you.
You give parents DEEP, complete, step-by-step solutions — never short generic tips.
Every win you write must feel like a complete module a parent can implement and see results from.
When the goal is about sleep, write like a paediatric sleep consultant. When it's about tantrums, write like a co-regulation specialist. When it's about screen time, write like a behavioural-addiction expert. Mirror the requested expertise precisely.
You ALWAYS return valid JSON only. No markdown, no commentary, no code fences, no preamble.`;

  const userPrompt = `Build a complete 12-win behaviour-change plan for this parenting goal.

Goal: ${goalLabel}
Child age group: ${input.ageGroup} years
Severity: ${input.severity}
Common triggers: ${triggers}
Current routine/approach: ${input.routine}
${renderTopicAnswersBlock(input.topicAnswers)}
Return ONLY valid JSON in this EXACT shape:
{
  "title": "Empathetic title naming the goal in 4-6 words",
  "root_cause": "3-4 sentence neuroscience/developmental explanation of WHY this challenge happens at this age. Reference brain development, nervous system, or a specific developmental need. Be specific, not generic.",
  "summary": "2 sentence overview of how the 12 wins progress from connection → diagnosis → skill-building → consistency → identity",
  "wins": [
    {
      "win": 1,
      "title": "Clear imperative step name (3-6 words)",
      "objective": "ONE sentence: what this step fixes for parent and child",
      "deep_explanation": "5-6 lines explaining WHY this works (neuroscience, developmental psychology, or behavioural science). Reference a researcher/principle. Make a parent who reads ONLY this section understand the science.",
      "actions": ["Specific action 1 (concrete, doable today)", "Specific action 2", "Specific action 3", "Specific action 4 (optional)"],
      "example": "ONE realistic 2-3 sentence story of a parent applying this step and what shifted",
      "mistake_to_avoid": "ONE sentence naming the most common parenting mistake that undermines this step",
      "micro_task": "ONE small task the parent can do TODAY in under 5 minutes to start practising this win",
      "duration": "How long to practice (e.g. '2-3 days', '1 week', '2 weeks', 'Ongoing')",
      "science_reference": "Short reference to the underlying scientific concept, study or theory (e.g. 'Operant conditioning (Skinner)', 'Polyvagal Theory (Porges)', 'Dopamine reward system', 'Sleep-cycle research')"
    }
  ]
}

STRICT RULES:
- EXACTLY 12 wins, numbered 1 through 12 in order
- Progression must follow: (1-2) Connect & diagnose root cause → (3-4) Set expectations & give autonomy → (5-7) Build regulation & skills → (8-9) Repair & track → (10-11) Consistency & setbacks → (12) Family identity
- Each win is a COMPLETE module — no overlaps, no repetition
- Tone: warm, calm, non-judgmental, specific to ${input.ageGroup} years
- Each "actions" array MUST have 3-5 items
- Examples must feel real, with names and specifics — not abstract
- Reference at least 5 different researchers/principles across the 12 wins
- "deep_explanation" must be 6-8 lines of substantive science, not generic
- Every win MUST include a "science_reference" naming a real researcher, theory, study, or guideline body (AAP/WHO/CDC/NIH/RCPCH etc.). Generic phrases like "research shows" are NOT acceptable — name the source.
- When the parent has provided topic-specific context above, weave those specifics into the wins (root_cause, examples, actions, micro_tasks, mistake_to_avoid) so the plan feels personalised — name the location/device/food/trigger they reported instead of generic phrasing.
- Output ONLY the JSON object — no other text

${goalBrief}`;

  // Tell the client its sessionId immediately so feedback writes can target
  // the right row even before the first win arrives.
  send("session", { sessionId, totalWins: 12 });
  send("progress", { winsBuilt: 0, totalWins: 12 });

  let plan: CoachPlan = fallbackPlan(input);
  let aiOk = false;
  try {
    if (!ended && userId) {
      const { enqueueAiJob, isBullMqActive } = await import("../queue/ai-job-queue.js");
      const { wrapJobInput } = await import("../queue/ai-job-payload.js");
      const { waitForJobResult } = await import("../queue/index.js");
      const { waitForJob } = await import("../queue/ai-job-store.js");
      console.log("Enqueue:", "ai-coach/stream");
      const enqueued = await enqueueAiJob(
        "ai-coach.stream_plan",
        userId,
        wrapJobInput("ai-coach/stream", { systemPrompt, userPrompt }),
      );
      if (enqueued.jobId) {
        const finished = isBullMqActive()
          ? await waitForJobResult(enqueued.jobId, 90_000)
          : await waitForJob(enqueued.jobId, 90_000);
        if (finished?.status === "completed" && finished.result) {
          const buf = (finished.result as { raw: string }).raw ?? "";
          const meta = tryExtractMeta(buf);
          if (meta) send("plan_meta", meta);
          const extracted = extractCompletedWins(buf, 0);
          for (const rawWin of extracted.wins) {
            try {
              const winObj = JSON.parse(rawWin) as unknown;
              if (validateWin(winObj)) send("win", winObj);
            } catch {
              /* skip partial */
            }
          }
          send("progress", { winsBuilt: 12, totalWins: 12 });
          try {
            const parsed = JSON.parse(buf);
            if (validatePlan(parsed)) {
              plan = parsed;
              aiOk = true;
            }
          } catch (parseErr) {
            logger.warn({ err: parseErr, cacheKey: cacheKey.slice(0, 8) }, "ai-coach (stream) JSON parse failed");
          }
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "ai-coach (stream) queue error");
  }

  // If the user already disconnected, skip post-work entirely. finish() has
  // already refunded the quota slot.
  if (ended) return;

  memCache.set(cacheKey, { plan, ts: Date.now() });
  if (aiOk) await dbSet(cacheKey, input, plan);

  planDelivered = true;
  send("done", { plan, sessionId, planCacheKey: cacheKey, cached: false, source: "ai", fallback: !aiOk });
  finish();
  if (userId) void saveCoachSession(userId, sessionId, goal, plan, input);
  if (userId) {
    void import("../services/coachJourneyService.js").then(({ recordCoachPlanCompleted }) =>
      recordCoachPlanCompleted(userId, goal, sessionId),
    );
  }
});

// ─── POST /ai-coach/extend ───────────────────────────────────────────────
// When a parent says "Not worked for me" or "Partially worked" — generate 1 adaptive win
router.post("/ai-coach/extend", aiUsageGate, async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "unauthorized" }); return; }

  const { assertCoachCanExtend } = await import("../services/coachJourneyService.js");
  const extendGate = await assertCoachCanExtend(userId);
  if (!extendGate.ok) {
    res.status(402).json({
      error: "coach_locked",
      feature: "amy_coach_extend",
      message: "Adaptive follow-up wins unlock on Day 2 of your free Amy Coach journey.",
    });
    return;
  }

  const raw = req.body ?? {};
  const goal = clip(raw.goal, 64);
  if (!goal || !GOAL_IDS.includes(goal as GoalId)) {
    res.status(400).json({ error: "invalid goal" });
    return;
  }
  const ageGroup = clip(raw.ageGroup, 30) || "5-7";
  const severity = clip(raw.severity, 30) || "moderate";
  const routine = clip(raw.routine, 200) || "Inconsistent";
  const failedWinTitle = clip(raw.failedWinTitle, 200) || "the previous step";
  const failedWinNumber = Number(raw.failedWinNumber);
  const startWinNumber = Number(raw.startWinNumber);
  const existingTitlesRaw = Array.isArray(raw.existingWinTitles) ? raw.existingWinTitles : [];
  const existingTitles = existingTitlesRaw
    .filter((t: unknown): t is string => typeof t === "string")
    .slice(0, 30)
    .map((t: string) => clip(t, 120));

  if (!Number.isFinite(startWinNumber) || startWinNumber < 1 || startWinNumber > 50) {
    res.status(400).json({ error: "invalid startWinNumber" });
    return;
  }

  const goalLabel = GOAL_LABELS[goal] ?? goal;
  const start = Math.floor(startWinNumber);
  const feedbackType = clip(raw.feedbackType, 16).toLowerCase();
  const partialAttempt = feedbackType === "partial";
  const outcomeLine = partialAttempt
    ? `The step PARTIALLY worked: "${failedWinTitle}" (win #${Number.isFinite(failedWinNumber) ? failedWinNumber : "?"}) — refine and shrink it further.`
    : `The step is NOT QUITE working yet: "${failedWinTitle}" (win #${Number.isFinite(failedWinNumber) ? failedWinNumber : "?"}) — try a different angle.`;

  const systemPrompt = `You are a child psychologist & behaviour-change expert.
The parent has tried a step toward their goal and it ${partialAttempt ? "only partially worked" : "is not quite working yet"} for their child.
You will write 1 ADAPTIVE follow-up win that takes a fresh angle: shrink the bar, check hidden blockers (sleep/hunger/sensory), or flip the approach (more structure or more autonomy).
Return ONLY valid JSON. No markdown.`;

  const userPrompt = `Parenting goal: ${goalLabel}
Child age: ${ageGroup} years
Severity: ${severity}
Current routine: ${routine}
${outcomeLine}
Already tried (DO NOT repeat these titles): ${existingTitles.join(" | ") || "none"}

Return ONLY this JSON shape:
{
  "wins": [
    { "win": ${start}, "title": "...", "objective": "...", "deep_explanation": "5-6 lines of science", "actions": ["...", "...", "...", "..."], "example": "real story", "mistake_to_avoid": "...", "micro_task": "5-min task today", "duration": "...", "science_reference": "concept/researcher" }
  ]
}

STRICT:
- EXACTLY 1 win, numbered ${start}
- Takes a DIFFERENT angle from the failed step (shrink / blocker / opposite)
- 3-5 actions, substantive deep_explanation, real example with names
- MUST include "science_reference"
- Output ONLY the JSON object`;

  const { submitRouteAiJob } = await import("../lib/route-ai-queue.js");
  await submitRouteAiJob({
    routeName: "ai-coach/extend",
    type: "ai-coach.extend",
    userId,
    input: { systemPrompt, userPrompt, startWinNumber: start, failedWinTitle },
    waitMs: 30_000,
    buildSyncBody: (result) => {
      const body = result as { wins: Win[]; source: string; usedFallback: boolean };
      let wins = body.wins;
      let usedFallback = body.usedFallback;
      if (wins?.length === 1 && wins.every(validateWin) && wins[0]?.win === start) {
        return { wins, source: usedFallback ? "fallback" : "ai" };
      }
      wins = [fallbackExtensionWin(failedWinTitle, start)];
      return { wins, source: "fallback" };
    },
    res,
  });
});

// ─── POST /ai-coach/feedback ─────────────────────────────────────────────
router.post("/ai-coach/feedback", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "unauthorized" }); return; }

  const body = req.body ?? {};
  const sessionId = clip(body.sessionId, 64);
  const goalId = clip(body.goalId, 64);
  const planTitle = clip(body.planTitle, 200);
  const winNumber = Number(body.winNumber);
  const totalWins = Number(body.totalWins);
  const feedback = clip(body.feedback, 16).toLowerCase();

  if (!sessionId || !goalId || !planTitle ||
      !Number.isFinite(winNumber) || winNumber < 1 || winNumber > 20 ||
      !Number.isFinite(totalWins) || totalWins < 1 || totalWins > 20 ||
      !["yes", "somewhat", "no"].includes(feedback)) {
    res.status(400).json({ error: "invalid payload" });
    return;
  }

  try {
    await db.insert(userProgressTable).values({
      userId, sessionId, goalId, planTitle,
      winNumber: Math.floor(winNumber),
      totalWins: Math.floor(totalWins),
      feedback,
    }).onConflictDoUpdate({
      target: [userProgressTable.sessionId, userProgressTable.winNumber],
      set: { feedback, planTitle, totalWins: Math.floor(totalWins), createdAt: new Date() },
    });
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "ai-coach feedback insert failed");
    res.status(500).json({ error: "failed to save feedback" });
  }
});

// ─── GET /ai-coach/session/:sessionId ────────────────────────────────────
// Loads saved plan + inputs for "Continue plan" from Progress page
router.get("/ai-coach/session/:sessionId", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "unauthorized" }); return; }

  const sid = clip(req.params.sessionId, 64);
  if (!sid) { res.status(400).json({ error: "missing sessionId" }); return; }

  try {
    const [row] = await db
      .select()
      .from(userCoachSessionsTable)
      .where(and(eq(userCoachSessionsTable.sessionId, sid), eq(userCoachSessionsTable.userId, userId)))
      .limit(1);

    if (!row) { res.status(404).json({ error: "session not found" }); return; }

    const feedbackRows = await db
      .select()
      .from(userProgressTable)
      .where(and(eq(userProgressTable.sessionId, sid), eq(userProgressTable.userId, userId)));

    const feedbacks: Record<number, string> = {};
    for (const f of feedbackRows) feedbacks[f.winNumber] = f.feedback;

    res.json({
      sessionId: row.sessionId,
      goalId: row.goalId,
      plan: row.planJson,
      planCacheKey: buildCacheKey(row.inputs as CoachInput),
      inputs: row.inputs,
      feedbacks,
    });
  } catch (err) {
    logger.error({ err }, "ai-coach session fetch failed");
    res.status(500).json({ error: "failed to load session" });
  }
});

// ─── GET /ai-coach/progress ──────────────────────────────────────────────
router.get("/ai-coach/progress", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "unauthorized" }); return; }

  try {
    const rows = await db
      .select()
      .from(userProgressTable)
      .where(eq(userProgressTable.userId, userId))
      .orderBy(desc(userProgressTable.createdAt))
      .limit(200);

    // group by sessionId
    const sessionsMap = new Map<string, {
      sessionId: string;
      goalId: string;
      planTitle: string;
      totalWins: number;
      completedWins: Set<number>;
      lastFeedback: string;
      lastUpdated: string;
      feedbacks: { win: number; feedback: string; at: string }[];
    }>();

    for (const r of rows) {
      let s = sessionsMap.get(r.sessionId);
      if (!s) {
        s = {
          sessionId: r.sessionId,
          goalId: r.goalId,
          planTitle: r.planTitle,
          totalWins: r.totalWins,
          completedWins: new Set(),
          lastFeedback: r.feedback,
          lastUpdated: r.createdAt.toISOString(),
          feedbacks: [],
        };
        sessionsMap.set(r.sessionId, s);
      }
      s.completedWins.add(r.winNumber);
      s.feedbacks.push({ win: r.winNumber, feedback: r.feedback, at: r.createdAt.toISOString() });
    }

    // Check which sessions have a restorable coach-session row
    // (old sessions created before the sessions table existed won't have one)
    const allSessionIds = Array.from(sessionsMap.keys());
    const resumableSet = new Set<string>();
    if (allSessionIds.length > 0) {
      const coachRows = await db
        .select({ sessionId: userCoachSessionsTable.sessionId })
        .from(userCoachSessionsTable)
        .where(
          and(
            eq(userCoachSessionsTable.userId, userId),
            inArray(userCoachSessionsTable.sessionId, allSessionIds),
          ),
        );
      for (const r of coachRows) resumableSet.add(r.sessionId);
    }

    const sessions = Array.from(sessionsMap.values()).map((s) => ({
      sessionId: s.sessionId,
      goalId: s.goalId,
      goalLabel: GOAL_LABELS[s.goalId] ?? s.goalId,
      planTitle: s.planTitle,
      totalWins: s.totalWins,
      completed: s.completedWins.size,
      lastFeedback: s.lastFeedback,
      lastUpdated: s.lastUpdated,
      feedbacks: s.feedbacks.sort((a, b) => a.win - b.win),
      canResume: resumableSet.has(s.sessionId),
    }));

    res.json({ sessions });
  } catch (err) {
    logger.error({ err }, "ai-coach progress query failed");
    res.status(500).json({ error: "failed to load progress" });
  }
});

// ─── POST /ai-coach/pregenerate-audio ────────────────────────────────────
// Pre-synthesizes listen-aloud MP3s for coach wins into coach_audio_cache + tts_cache.
router.post("/ai-coach/pregenerate-audio", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const planCacheKey = clip(req.body?.planCacheKey, 64);
  const rawWins = req.body?.wins;
  if (!planCacheKey || !/^[a-f0-9]{40}$/.test(planCacheKey)) {
    res.status(400).json({ error: "invalid_plan_cache_key" });
    return;
  }
  if (!Array.isArray(rawWins) || rawWins.length === 0) {
    res.status(400).json({ error: "invalid_wins" });
    return;
  }
  if (rawWins.length > 20) {
    res.status(400).json({ error: "too_many_wins" });
    return;
  }

  const wins = rawWins
    .filter((w): w is Win => w && typeof w === "object" && typeof (w as Win).win === "number")
    .slice(0, 20);

  await submitRouteAiJob({
    routeName: "ai-coach/pregenerate-audio",
    type: "ai-coach.pregenerate_audio",
    userId,
    input: { planCacheKey, wins },
    waitMs: 120_000,
    buildSyncBody: (result) => result as Record<string, unknown>,
    res,
  });
});

// ─── POST /ai-coach/audio/generate ───────────────────────────────────────
// Cache-first coach win audio — dedicated layer then shared TTS store.
router.post("/ai-coach/audio/generate", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const planCacheKey = clip(req.body?.planCacheKey, 64);
  const winIndex = Number(req.body?.winIndex);
  const rawWin = req.body?.win as Win | undefined;
  const text = clip(req.body?.text, TTS_MAX_INPUT_CHARS);

  if (!planCacheKey || !/^[a-f0-9]{40}$/.test(planCacheKey)) {
    res.status(400).json({ error: "invalid_plan_cache_key" });
    return;
  }
  if (!Number.isFinite(winIndex) || winIndex < 1 || winIndex > 20) {
    res.status(400).json({ error: "invalid_win_index" });
    return;
  }

  try {
    const result = await generateAndCacheCoachWinAudio({
      planCacheKey,
      winIndex,
      text: text || undefined,
      win: rawWin,
    });
    if (!result) {
      res.status(502).json({ ok: false, error: "tts_failed" });
      return;
    }
    res.json({
      ok: true,
      url: result.audioUrl,
      audioUrl: result.audioUrl,
      cacheKey: result.ttsCacheKey,
      planCacheKey: result.planCacheKey,
      winIndex: result.winIndex,
      cached: result.cached,
    });
  } catch (err) {
    logger.error(
      {
        evt: "coach_audio.generate_failed",
        message: err instanceof Error ? err.message : String(err),
      },
      "coach audio generate failed",
    );
    res.status(502).json({ ok: false, error: "tts_failed" });
  }
});

// ─── POST /ai-coach/pregenerate-infant-audio ─────────────────────────────
// One-shot warm of all static 0–2 yr infant problem listen-aloud clips (shared cache).
router.post("/ai-coach/pregenerate-infant-audio", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  await submitRouteAiJob({
    routeName: "ai-coach/pregenerate-infant-audio",
    type: "ai-coach.pregenerate_infant_audio",
    userId,
    input: {},
    waitMs: 300_000,
    buildSyncBody: (result) => result as Record<string, unknown>,
    res,
  });
});

export default router;
