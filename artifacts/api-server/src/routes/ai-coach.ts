import { Router, type IRouter } from "express";
import { createHash, randomUUID } from "crypto";
import { eq, desc, and, inArray } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { db, aiCacheTable, userProgressTable, userCoachSessionsTable } from "@workspace/db";
import { logger } from "../lib/logger.js";
import { GOAL_IDS, type GoalId } from "../lib/image-map.js";
import { aiUsageGate } from "../middlewares/aiUsageGate.js";
import { incrementAiUsage } from "../services/subscriptionService.js";

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
  language?: "en" | "hi" | "hinglish";
  triggers?: string[];
  routine?: string;
}

// ─── Config ──────────────────────────────────────────────────────────────
const NAMESPACE = "ai_coach_v4";
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

function buildCacheKey(input: CoachInput): string {
  const triggers = (input.triggers ?? []).map(norm).filter(Boolean).sort().join("-");
  // Namespace is part of the raw key so a version bump (v2 → v3) produces a
  // completely different cacheKey — old rows can never be served to the new schema.
  const lang = input.language === "hi" || input.language === "hinglish" ? input.language : "en";
  const raw = `${NAMESPACE}_${lang}_${norm(input.goal)}_${norm(input.ageGroup)}_${norm(input.severity)}_${triggers}_${norm(input.routine)}`;
  return createHash("sha1").update(raw).digest("hex");
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

function fallbackPlan(input: CoachInput): CoachPlan {
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

// ─── Adaptive extension wins (when a step doesn't work) ──────────────────
function fallbackExtensionWins(failedWinTitle: string, startNumber: number): Win[] {
  const mk = (n: number, title: string, objective: string, deep: string,
    actions: string[], example: string, mistake: string, micro: string, dur: string, sci: string): Win => ({
    win: n, title, objective, deep_explanation: deep, actions,
    example, mistake_to_avoid: mistake, micro_task: micro, duration: dur,
    science_reference: sci,
  });

  // Pool of 18 unique strategies across 6 batches of 3.
  // batchIndex rotates so the SAME 3 cards never appear twice in a row.
  const batchIndex = Math.floor((startNumber - 13) / 3) % 6;

  const batches: (() => [Win, Win, Win])[] = [
    // ── BATCH 0 ────────────────────────────────────────────────────────
    () => [
      mk(startNumber,
        "Lower the bar by 80%",
        `"${failedWinTitle}" is too big right now — shrink it to 30 seconds`,
        "Behaviour change fails when a new action requires more energy than you have on hard days. BJ Fogg's lab shows habits stick when they are 'tinier than feels useful' — small enough to do on your worst day. One heroic attempt teaches nothing; 30 seconds done daily for 7 days creates a neural groove that bigger steps never could.",
        ["Take the original step and cut it to 30 seconds maximum", "Attach it to an existing anchor (after coffee, before bath)", "Do it even on bad days — consistency matters more than quality", "Track only completion, not outcome"],
        "A mum couldn't sustain '5-min special time'. She shrank to '60 seconds of eye-contact before bath'. After 2 weeks her son started asking for it himself.",
        "Pushing through the original step instead of genuinely shrinking it.",
        "Write the 30-second version of the failed step. Do it once today.",
        "7 days",
        "Tiny Habits methodology (BJ Fogg, Stanford Behaviour Design Lab, 2019)"),
      mk(startNumber + 1,
        "Find the hidden blocker first",
        "No strategy works when a biological need is unmet — find it",
        "When a research-backed strategy repeatedly fails, a hidden blocker is almost always the cause: hunger, sleep debt, sensory overload, or parental depletion. The cortisol spike from unmet biological needs blocks the prefrontal cortex — the very part needed for behaviour change. Fixing the blocker can unlock a stalled strategy overnight.",
        ["Audit your child's last 48 hours: sleep hours, meals, screen time, transitions", "Audit your own state: sleep, stress, support", "Rank the most depleted factor (1 = worst)", "Fix that single lever for 3 days before re-trying the strategy"],
        "Dad's 'connection time' kept failing. His son was getting 9 hrs sleep instead of 11. Moving bedtime 90 min earlier fixed it — connection clicked within days.",
        "Blaming the strategy when unmet biology is the real wall.",
        "Name one biological factor (child OR yours) that needs fixing before this strategy can land.",
        "3–5 days",
        "Maslow's Hierarchy of Needs; cortisol/prefrontal cortex research (Arnsten, 1998)"),
      mk(startNumber + 2,
        "Flip the angle: structure ↔ autonomy",
        "If gentle hasn't worked, try structured. If strict hasn't worked, add autonomy",
        "Different temperaments respond to opposite angles. High-sensitivity children often need MORE structure to feel safe; strong-willed children need MORE autonomy to engage willingly. If your current approach hasn't moved the needle in 2 weeks, the philosophy isn't wrong — the fit is wrong for THIS child. Switch the angle while keeping the warmth.",
        ["If you've been gentle: add ONE clear, non-negotiable rule (no debate, just warmth)", "If you've been strict: give ONE daily choice with zero parental opinion attached", "Watch your child's first 3-day response — that's real data", "Commit to the new angle for a full week before evaluating"],
        "A mum's gentle bedtime approach stalled. She added a firm 7:30 lights-out + 15-min cuddle. Bedtime fights ended within 4 days.",
        "Switching angles every 3 days — the new approach needs 7 full days to show results.",
        "Decide right now: more structure or more autonomy? Pick one action to try tonight.",
        "7 days",
        "Goodness-of-fit theory (Chess & Thomas, 1977); temperament research"),
    ],
    // ── BATCH 1 ────────────────────────────────────────────────────────
    () => [
      mk(startNumber,
        "Use a When-Then bridge",
        "Link the new behaviour to an existing daily trigger",
        "Implementation intentions — 'When X happens, I will do Y' — triple follow-through rates compared to vague intentions. The brain stores if-then pairs in the basal ganglia, where automatic habits live. The key is specificity: an exact trigger ('when we close the front door') beats a time ('every evening'). Children's behaviour responds the same way.",
        ["Pick an existing daily moment your child reliably reaches (door, lunchbox, shoes off)", "State the bridge out loud: 'When you put your shoes away, then we do special time'", "Keep the THEN action under 2 minutes at first", "Repeat the exact same wording for 10 days — consistency cements the link"],
        "A family added 'When your bag is hung up, then we get 5 minutes of story time.' Bag-hanging went from daily battle to automatic in 9 days.",
        "Changing the wording each day — the brain needs the EXACT same trigger phrase to automate.",
        "Write one When-Then statement for today using a trigger your child hits 100% of the time.",
        "10 days",
        "Implementation intentions research (Peter Gollwitzer, NYU, 1999); habit loop science"),
      mk(startNumber + 1,
        "Add a sensory anchor",
        "Use a physical or sensory cue to shift your child's state before the hard step",
        "The nervous system must be regulated before the cortex can engage with demands. Sensory input (deep pressure, slow breath, cold water, rhythmic movement) activates the vagus nerve and drops heart rate within 90 seconds — making cooperation physiologically possible. This isn't a bribe; it's biology.",
        ["Identify when your child's body is dysregulated (tight fists, avoidance, loud voice)", "Offer a 60-second sensory reset BEFORE making the request: bear hug, 3 slow breaths together, cold water on wrists", "Only make the request after you see the body soften", "Never use the sensory reset as a bargaining chip"],
        "A dad tried 'homework time' when his daughter came home wired from school. Added 10-min outdoor swing time first. Homework resistance dropped by 70% within a week.",
        "Using the sensory reset as a reward or after the meltdown has started — it must come before.",
        "Pick one sensory reset (swing, hug, cold water, breath) and offer it before tonight's hardest transition.",
        "7–10 days",
        "Polyvagal theory (Stephen Porges, 2011); sensory processing research (Ayres, 1972)"),
      mk(startNumber + 2,
        "Co-regulate first, redirect second",
        "Your calm is the strategy — get regulated before you try to change behaviour",
        "Children co-regulate through their parent's nervous system before age 12. If you approach a dysregulated child while activated yourself, you escalate — not calm — their system. Daniel Siegel's neuroscience: a regulated adult presence lowers cortisol in a child within 4 minutes. The 'strategy' isn't the words you say; it's your state.",
        ["Notice your own activation level before approaching (1–10 scale)", "If you're above 6, take 90 seconds first: 3 slow exhales, jaw drop, shoulder drop", "Approach with a soft face and lower body position (same height as child)", "Say less — one word or a calm presence is more powerful than explanation"],
        "A mum who kept escalating bedtime fights started sitting silently next to her son for 3 minutes before speaking. Fights reduced by half in a week.",
        "Trying to reason or redirect before both of you are physiologically calm.",
        "Tonight: rate your activation before each hard parenting moment. Breathe first if above 5.",
        "14 days",
        "Co-regulation & interpersonal neurobiology (Dan Siegel, 2012); polyvagal theory"),
    ],
    // ── BATCH 2 ────────────────────────────────────────────────────────
    () => [
      mk(startNumber,
        "Make it visible with a simple chart",
        "The brain responds to visible progress — a chart does half the work",
        "Visual tracking externalises effort, making invisible progress concrete. Self-determination theory shows that seeing your own progress strengthens intrinsic motivation. For children, a simple sticker chart isn't a bribe — it's a representation of competence they can hold in their hands. The key is keeping it simple: one behaviour, one mark, same time each day.",
        ["Choose exactly ONE behaviour to track — not three", "Make the chart together with your child so they own it", "Add a mark immediately after the behaviour — delay kills the loop", "Review the chart together at the same daily moment (morning or bedtime)"],
        "A mum tracking 'morning shoes before 8am' with a simple chart. Son went from 40% to 90% compliance in 2 weeks — without any reward other than seeing his own streak.",
        "Tracking multiple behaviours or missing the immediate mark — both break the feedback loop.",
        "Draw a 7-box row on paper right now. Tell your child: one mark per day for this one thing.",
        "14 days",
        "Self-determination theory (Deci & Ryan, 1985); visual feedback loops in behaviour change"),
      mk(startNumber + 1,
        "Use play as the delivery vehicle",
        "If the direct approach isn't working, smuggle the skill inside a game",
        "Play is the brain's preferred learning state: dopamine rises, threat response drops, and the prefrontal cortex opens to new information. Stuart Brown's research shows that play-based rehearsal of skills transfers to real-life compliance faster than instruction. The trick is never revealing the 'lesson' — let it be purely fun.",
        ["Turn the hard task into a game: timer race, silly voice, stuffed animal role-play", "Never correct or teach during play — just follow your child's lead", "Repeat the same game for 5 days so the skill gets reinforced", "Gradually let the game drift toward the real situation"],
        "A dad whose daughter refused teeth-brushing turned it into a 'monster detector' game with a flashlight. She was brushing voluntarily within 3 days.",
        "Mixing game-mode with instruction-mode in the same moment — keep them completely separate.",
        "Design a 3-minute game around tonight's hardest task. No teaching — just fun.",
        "10 days",
        "Play science (Stuart Brown, 2009); Dr Lawrence Cohen's Playful Parenting (2001)"),
      mk(startNumber + 2,
        "Find the strength inside the difficulty",
        "Reframe the 'problem' behaviour as a strength running too hot",
        "Strength-based parenting, rooted in positive psychology, shifts the parent's lens from deficit to capacity. A child who 'won't listen' is often demonstrating strong autonomy and self-direction. A child who 'overreacts' often has deep emotional sensitivity. When parents name the strength (not the problem), children's self-regulation improves because shame drops and identity shifts.",
        ["Name the positive version of the difficult trait (persistent, passionate, sensitive, energetic)", "Say it to your child directly: 'You have such strong feelings — that's a real gift'", "Redirect the ENERGY of the trait, not the trait itself", "Stop using problem-framing language ('always', 'never', 'why can't you just')"],
        "Parents reframed 'she's so dramatic' to 'she feels things so deeply'. Changed their own response tone; daughter's meltdown frequency halved in 3 weeks.",
        "Using the strength reframe as a hollow compliment rather than a genuine belief shift.",
        "Name one strength your child has that the 'problem' behaviour is a version of. Say it to them today.",
        "Ongoing",
        "Positive psychology (Martin Seligman, 2002); strength-based parenting (Lea Waters, 2017)"),
    ],
    // ── BATCH 3 ────────────────────────────────────────────────────────
    () => [
      mk(startNumber,
        "Repair the rupture explicitly",
        "A brief repair conversation resets the relationship and makes the next attempt safer",
        "John Gottman's research shows it's not conflict that damages children — it's unrepaired conflict. A simple, sincere repair ('I was too loud earlier, that wasn't okay') rebuilds attachment security, which is the neurological foundation on which all behaviour change rests. Children who receive explicit repairs show lower cortisol and better cooperation than those who receive only time.",
        ["Wait until both of you are calm (at least 30 minutes after a hard moment)", "Make eye contact and name what happened without defensiveness", "Say what YOU did: 'I got frustrated and raised my voice — that's on me'", "Keep it under 60 seconds — children don't need long explanations, just sincerity"],
        "A dad who rarely apologised started doing 1-sentence repairs after hard evenings. His son began coming to him voluntarily — relationship and cooperation both improved.",
        "Over-explaining or turning the repair into a teaching moment — keep it short and accountable.",
        "Think of the last hard moment. Tonight, offer a one-sentence repair with eye contact.",
        "Ongoing",
        "Gottman's repair theory (1999); attachment & rupture-repair research (Tronick, 1989)"),
      mk(startNumber + 1,
        "Audit your own emotional state pattern",
        "When nothing is working, the pattern is often in the parent's nervous system, not the child",
        "Ross Greene and Daniel Siegel both point to a hard truth: parental emotional arousal is the single strongest predictor of child behaviour escalation. When a parent's window of tolerance is narrow (from stress, poor sleep, or their own childhood patterns), the child's normal behaviour triggers disproportionate responses — and the child's nervous system learns dysregulation. Shifting the parent's pattern often shifts the child's without any direct intervention.",
        ["For 3 days, track your own emotional arousal on a 1-10 scale at meal, homework, and bedtime", "Identify your personal depletion signals (shallow breath, tight chest, clipped sentences)", "Build one daily practice that widens your window: 20-min walk, 7-hour sleep target, one adult conversation", "Notice whether your child's behaviour shifts when YOUR state improves"],
        "A mum realised she was always at 8/10 by 5pm when her son's behaviour peaked. She added a 15-minute solo walk at 4:30. His evening meltdowns dropped significantly.",
        "Waiting until you're dysregulated to try to regulate — build the resource before you need it.",
        "Track your arousal at 3 key moments today (1–10). Identify your earliest warning signal.",
        "14 days",
        "Window of tolerance (Dan Siegel, 1999); Collaborative Problem Solving (Ross Greene, 2014)"),
      mk(startNumber + 2,
        "Natural consequences with warm curiosity",
        "Let the situation teach — with you alongside, not fixing it",
        "Alfred Adler's foundational research, extended by Jane Nelsen's Positive Discipline, shows children learn most durably from natural consequences when a trusted adult is present with curiosity rather than judgment. The parent's role is not to protect the child from the consequence, but to stay warm while it lands, and ask: 'What do you think happened? What could work differently?' This activates the child's own problem-solving brain.",
        ["Identify a consequence that naturally flows from the behaviour (not a punishment you invent)", "Warn once calmly, then step back and let it happen", "After the consequence, wait until calm and ask: 'What happened? What would you do differently?'", "Resist rescuing — your discomfort is not the signal to intervene"],
        "A mum stopped packing her son's forgotten lunch. He was hungry once. He never forgot again. She stayed warm and asked 'What's your plan for tomorrow?' — no lecture.",
        "Confusing natural consequences with punishment — tone and timing make all the difference.",
        "Identify one natural consequence you've been shielding your child from. Let it land today.",
        "Situation-dependent",
        "Natural consequences theory (Alfred Adler); Positive Discipline (Jane Nelsen, 1981)"),
    ],
    // ── BATCH 4 ────────────────────────────────────────────────────────
    () => [
      mk(startNumber,
        "Problem-solve together at a calm moment",
        "Invite your child to co-create the solution — their buy-in is the strategy",
        "Ross Greene's Collaborative Problem Solving model (used in clinical settings worldwide) shows that children who help design the solution follow through at 3× the rate of those who receive solutions. The child's prefrontal cortex must be engaged, which is only possible when both parent and child are calm. The magic is in the question: 'I've noticed X is hard — what do you think we could try?'",
        ["Wait for a genuinely calm moment — never raise the topic during or just after a conflict", "Start with curiosity, not a solution: 'I've noticed X — what's making it hard for you?'", "Listen fully without correcting. Then share your concern (not your solution)", "Ask together: 'What could work for both of us?' and pick ONE thing to try for 5 days"],
        "A dad and his 7-year-old co-designed a 'homework deal': 20-min work, then 10-min Lego. Son's follow-through went from 30% to 85% in 2 weeks because he'd built the plan himself.",
        "Doing collaborative problem-solving during a conflict or within 20 minutes after one — timing is everything.",
        "Tonight at a calm moment, ask your child: 'What makes [this] hard for you?' Just listen.",
        "Ongoing",
        "Collaborative Problem Solving (Ross Greene, The Explosive Child, 2014)"),
      mk(startNumber + 1,
        "Narrate the positive out loud",
        "Catching and naming good behaviour cements it faster than any correction",
        "Behavioural science consistently shows a 5:1 positive-to-negative feedback ratio predicts healthy family dynamics (Gottman) and child compliance. Yet most parents narrate problems and stay silent during good moments. Specific, immediate narration ('You stayed calm when your sister took your toy — that took real control') activates the dopamine-reward loop and makes the behaviour more likely to repeat.",
        ["For 3 days, commit to narrating every positive behaviour you notice — out loud, immediately", "Be specific: name the behaviour AND the quality it shows ('You shared without being asked — that's generosity')", "Don't add 'but' or a correction after the narration — just let it land", "Aim for 5 positive narrations for every 1 correction across the day"],
        "A mum shifted from mostly correcting to narrating positives for 1 week. Her son's cooperative behaviour increased and he started narrating his own good choices aloud.",
        "Saying 'good job' — it's too vague to reinforce anything. Specificity is the entire mechanism.",
        "Set a phone reminder for 3 times today to narrate something specific your child did well.",
        "14 days",
        "5:1 ratio research (John Gottman, 1994); positive reinforcement science (Skinner; Bandura)"),
      mk(startNumber + 2,
        "Shrink the transition, not the task",
        "Most resistance happens in the gap between activities — target that gap",
        "Transitions (stopping one thing, starting another) are neurologically expensive. The prefrontal cortex must inhibit one activity while orienting to another — this costs energy that young children and dysregulated older ones simply don't have. Research on transition warnings, countdown rituals, and 'bridging' (naming what comes after the transition) reduces resistance by up to 60% without changing the task itself.",
        ["Give a 5-minute verbal warning before every major transition ('5 more minutes, then bath')", "Add a 1-minute warning immediately before the switch ('1 minute, then we go')", "Use a consistent bridging phrase: 'After bath, then story time' — make the next good thing visible", "Create one transition ritual that stays the same every day (a song, a countdown, a handshake)"],
        "A mum added '5-min warning + song' to every transition for her 5-year-old. Screen-time tantrums dropped from daily to once a week within 10 days.",
        "Giving warnings but not following through — the child learns the warning means nothing.",
        "Pick one daily transition that's always hard. Add a 5-min warning starting tonight.",
        "10 days",
        "Executive function & transition research (Zelazo, 2006); Siegel & Bryson, The Whole-Brain Child (2011)"),
    ],
    // ── BATCH 5 ────────────────────────────────────────────────────────
    () => [
      mk(startNumber,
        "Match the strategy to the child's developmental stage",
        "A strategy for a 9-year-old won't work on a 4-year-old — stage-match everything",
        "Jean Piaget's developmental stages and modern neuroscience confirm that children's brains operate in qualitatively different modes at different ages. Abstract reasoning, impulse control, and empathy are NOT available to a 4-year-old — they're not choosing to be difficult, they're being 4. Every strategy in this plan was designed for your child's age group, but if it's not landing, a mismatch in expectation is almost always involved.",
        ["Write down your child's age and revisit what's developmentally normal for that stage", "For under-5s: reduce words, increase physical cues and play", "For 6-9: use concrete rules, predictable structure, and natural consequences", "For 10+: include them in problem-solving, explain the 'why', give more autonomy"],
        "A dad kept explaining 'why we don't hit' to his 3-year-old using paragraphs. Switched to a one-word redirect ('kind hands') + physical demonstration. Hitting stopped within 5 days.",
        "Using logic-heavy explanations with children under 7 — they need concrete, physical, short.",
        "Look up ONE developmental fact about your child's age group today. Adjust one expectation.",
        "Ongoing",
        "Piaget's developmental stages (1952); neurodevelopmental research (Zelazo & Carlson, 2012)"),
      mk(startNumber + 1,
        "Reduce cognitive load for both of you",
        "Too many rules and too many decisions are the silent killers of consistency",
        "Decision fatigue is real. Roy Baumeister's research shows willpower and decision-making share the same finite daily resource. Parents who are managing multiple behaviour strategies simultaneously burn through that resource by 3pm. Children whose environments have too many rules experience the same depletion. Simplifying to ONE rule, ONE consequence, ONE routine at a time restores capacity for both.",
        ["Count how many behaviour strategies you are currently running simultaneously", "Pick the ONE that matters most this week — put the others on hold", "Reduce household rules to 3 maximum, stated positively ('We use kind words')", "Reduce the child's daily decisions to 2–3 max — too much choice creates anxiety, not confidence"],
        "A mum running 6 strategies at once dropped to 1 (morning routine only). Consistency jumped because she had the energy to follow through every single time.",
        "Adding a new strategy before the current one has had 10 days — stack one at a time.",
        "List every behaviour goal you're currently working on. Cross out all but ONE. Focus there.",
        "10 days per strategy",
        "Ego depletion & decision fatigue (Roy Baumeister, 1998); choice overload (Barry Schwartz, 2004)"),
      mk(startNumber + 2,
        "Change the environment, not the child",
        "Redesigning the space removes the trigger — no willpower required",
        "Kurt Lewin's field theory and modern behavioural economics (Thaler & Sunstein) show that environment shapes behaviour more powerfully than intention. If your child always melts down in the kitchen after school, the kitchen at 4pm IS the trigger. Changing the environment (different room, snack first, outdoor time) removes the cue entirely — no willpower, no negotiation, no strategy required.",
        ["Map the last 3 difficult moments: where were you, what time, what just happened before?", "Identify the consistent environmental pattern (location, time, hunger, transition)", "Change ONE environmental variable: move the activity, change the time, add a buffer", "Run the new environment for 7 days and observe — environment changes work faster than behaviour interventions"],
        "A family noticed meltdowns happened every day at the dinner table. Moved to eating outside twice a week. Dinner-time stress halved — same food, same family, different environment.",
        "Trying to change the child's behaviour without changing the trigger environment first.",
        "Find the common environmental thread in your last 3 hard moments. Change one variable tonight.",
        "7 days",
        "Field theory (Kurt Lewin, 1936); Nudge theory (Thaler & Sunstein, 2008); behavioural design"),
    ],
  ];

  const [w0, w1, w2] = batches[batchIndex]();
  return [w0, w1, w2];
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
      .values({ cacheKey, namespace: NAMESPACE, input, response: plan })
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

// ─── POST /ai-coach ──────────────────────────────────────────────────────
router.post("/ai-coach", aiUsageGate, async (req, res): Promise<void> => {
  pruneMem();
  const { userId } = getAuth(req);
  const raw: CoachInput = req.body ?? {};
  const goal = norm(raw.goal);
  if (!GOAL_IDS.includes(goal as GoalId)) {
    res.status(400).json({ error: "invalid goal", validGoals: GOAL_IDS });
    return;
  }
  const langRawIn = typeof raw.language === "string" ? raw.language.toLowerCase().split("-")[0] : "en";
  const inputLang: "en" | "hi" | "hinglish" =
    langRawIn === "hi" ? "hi" : langRawIn === "hinglish" ? "hinglish" : "en";
  const input: CoachInput = {
    goal,
    ageGroup: clip(raw.ageGroup, 30) || "5-7",
    severity: clip(raw.severity, 30) || "moderate",
    language: inputLang,
    triggers: Array.isArray(raw.triggers)
      ? raw.triggers.filter((t): t is string => typeof t === "string").slice(0, 8).map((t) => clip(t, 50))
      : [],
    routine: clip(raw.routine, 200) || "Inconsistent",
  };

  const cacheKey = buildCacheKey(input);
  const sessionId = randomUUID();

  // L1
  const mem = memCache.get(cacheKey);
  if (mem && Date.now() - mem.ts < MEMORY_TTL_MS) {
    memStats.hits++;
    logger.info({ cacheKey: cacheKey.slice(0, 8), source: "memory", stats: memStats }, "ai-coach cache hit");
    res.json({ plan: mem.plan, sessionId, cached: true, source: "memory" });
    if (userId) void saveCoachSession(userId, sessionId, goal!, mem.plan, input);
    return;
  }

  // L2
  const dbHit = await dbGet(cacheKey);
  if (dbHit) {
    memCache.set(cacheKey, { plan: dbHit, ts: Date.now() });
    memStats.dbHits++;
    logger.info({ cacheKey: cacheKey.slice(0, 8), source: "db", stats: memStats }, "ai-coach cache hit");
    res.json({ plan: dbHit, sessionId, cached: true, source: "db" });
    if (userId) void saveCoachSession(userId, sessionId, goal!, dbHit, input);
    return;
  }

  memStats.misses++;
  memStats.aiCalls++;
  logger.info({ cacheKey: cacheKey.slice(0, 8), goal, stats: memStats }, "ai-coach cache miss — calling AI");

  const goalLabel = GOAL_LABELS[input.goal!] ?? input.goal;
  const triggers = (input.triggers ?? []).join(", ") || "not specified";
  const { getGoalPromptSection } = await import("../lib/goal-prompts.js");
  const language: "en" | "hi" | "hinglish" = input.language ?? "en";
  const goalBrief = getGoalPromptSection(input.goal!, goalLabel!, language);
  const langDirective =
    language === "hi"
      ? "\nIMPORTANT: Write ALL string VALUES (title, root_cause, summary, wins[].title, objective, deep_explanation, actions, example, mistake_to_avoid, micro_task, duration, science_reference) in natural Hindi (Devanagari script). Keep JSON keys in English."
      : language === "hinglish"
      ? "\nIMPORTANT: Write ALL string VALUES in Hinglish (Roman-script Hindi mixed with English words, e.g. 'Bachche ko calm karne ke liye sleep routine set karein'). Keep JSON keys in English."
      : "";

  const systemPrompt = `You are a specialist child psychologist and parenting coach who adapts your expertise to the SPECIFIC parenting goal in front of you.
You give parents DEEP, complete, step-by-step solutions — never short generic tips.
Every win you write must feel like a complete module a parent can implement and see results from.
When the goal is about sleep, write like a paediatric sleep consultant. When it's about tantrums, write like a co-regulation specialist. When it's about screen time, write like a behavioural-addiction expert. Mirror the requested expertise precisely.
You ALWAYS return valid JSON only. No markdown, no commentary, no code fences, no preamble.${langDirective}`;

  const userPrompt = `Build a complete 12-win behaviour-change plan for this parenting goal.

Goal: ${goalLabel}
Child age group: ${input.ageGroup} years
Severity: ${input.severity}
Common triggers: ${triggers}
Current routine/approach: ${input.routine}

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
- Output ONLY the JSON object — no other text

━━━ AGE-STAGE DEVELOPMENTAL BRIEF (${input.ageGroup}) ━━━
${input.ageGroup === "10+"
  ? `TWEEN/TEEN (10+ yrs): Massive prefrontal-cortex remodelling AND limbic-system surge create high emotional reactivity with growing logical capacity (Steinberg, Casey). Identity formation (Erikson stage 5), peer influence eclipses parent influence on social rules but parents still anchor values. Use:
  - Collaborative problem-solving over directives (Ross Greene)
  - Validating before guiding — never lecture
  - Autonomy with scaffolding (Self-Determination Theory: Deci & Ryan)
  - Shorter, fewer parent-led talks; more questions, more listening
  - Acknowledge online/social-media reality (Jean Twenge, Jonathan Haidt research)
  - Avoid power struggles — co-create rules, then enforce them calmly
  - Privacy + connection balance (research on adolescent brain: B.J. Casey)
  Wins must respect that the child has growing reasoning power and craves dignity. Avoid baby-talk framing.`
  : input.ageGroup === "8-10"
  ? `MIDDLE CHILDHOOD (8–10 yrs): Industry vs Inferiority (Erikson), peer comparisons start, abstract thinking emerges. Wins should build competence, autonomy and emotion-naming vocabulary. Use natural-consequence framing more than punishment.`
  : input.ageGroup === "5-7"
  ? `EARLY SCHOOL AGE (5–7 yrs): Concrete operational thinking starting (Piaget), big feelings + still-developing impulse control. Wins lean on visual schedules, role-play, predictable routines and short emotion-coaching scripts.`
  : `EARLY CHILDHOOD (2–4 yrs): Autonomy vs Shame (Erikson), prefrontal cortex barely online, behaviour IS communication. Wins must rely on co-regulation, choice within limits, and PARENT-led nervous-system regulation as the primary tool.`
}
${goalBrief}`;

  let plan: CoachPlan;
  let aiOk = true;
  try {
    const { openai } = await import("@workspace/integrations-openai-ai-server");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 8000,
    });
    const rawContent = completion.choices[0]?.message?.content?.trim() ?? "";
    try {
      const parsed = JSON.parse(rawContent);
      plan = validatePlan(parsed) ? parsed : fallbackPlan(input);
    } catch {
      plan = fallbackPlan(input);
    }
  } catch (err) {
    logger.error({ err }, "ai-coach OpenAI error");
    plan = fallbackPlan(input);
    aiOk = false;
  }

  memCache.set(cacheKey, { plan, ts: Date.now() });
  if (aiOk) await dbSet(cacheKey, input, plan);

  res.json({ plan, sessionId, cached: false, source: "ai", fallback: !aiOk });
  if (userId) void saveCoachSession(userId, sessionId, goal!, plan, input);
});

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
  const langRawIn = typeof raw.language === "string" ? raw.language.toLowerCase().split("-")[0] : "en";
  const inputLang: "en" | "hi" | "hinglish" =
    langRawIn === "hi" ? "hi" : langRawIn === "hinglish" ? "hinglish" : "en";
  const input: CoachInput = {
    goal,
    ageGroup: clip(raw.ageGroup, 30) || "5-7",
    severity: clip(raw.severity, 30) || "moderate",
    language: inputLang,
    triggers: Array.isArray(raw.triggers)
      ? raw.triggers.filter((t): t is string => typeof t === "string").slice(0, 8).map((t) => clip(t, 50))
      : [],
    routine: clip(raw.routine, 200) || "Inconsistent",
  };

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

  // ── L1 / L2 cache hit → instant done ──────────────────────────────
  const mem = memCache.get(cacheKey);
  if (mem && Date.now() - mem.ts < MEMORY_TTL_MS) {
    memStats.hits++;
    logger.info({ cacheKey: cacheKey.slice(0, 8), source: "memory", stats: memStats }, "ai-coach (stream) cache hit");
    planDelivered = true;
    send("done", { plan: mem.plan, sessionId, cached: true, source: "memory", fallback: false });
    finish();
    if (userId) void saveCoachSession(userId, sessionId, goal, mem.plan, input);
    return;
  }

  const dbHit = await dbGet(cacheKey);
  if (dbHit) {
    memCache.set(cacheKey, { plan: dbHit, ts: Date.now() });
    memStats.dbHits++;
    logger.info({ cacheKey: cacheKey.slice(0, 8), source: "db", stats: memStats }, "ai-coach (stream) cache hit");
    planDelivered = true;
    send("done", { plan: dbHit, sessionId, cached: true, source: "db", fallback: false });
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
  const language: "en" | "hi" | "hinglish" = input.language ?? "en";
  const goalBrief = getGoalPromptSection(input.goal!, goalLabel!, language);
  const langDirective =
    language === "hi"
      ? "\nIMPORTANT: Write ALL string VALUES (title, root_cause, summary, wins[].title, objective, deep_explanation, actions, example, mistake_to_avoid, micro_task, duration, science_reference) in natural Hindi (Devanagari script). Keep JSON keys in English."
      : language === "hinglish"
      ? "\nIMPORTANT: Write ALL string VALUES in Hinglish (Roman-script Hindi mixed with English words, e.g. 'Bachche ko calm karne ke liye sleep routine set karein'). Keep JSON keys in English."
      : "";

  const systemPrompt = `You are a specialist child psychologist and parenting coach who adapts your expertise to the SPECIFIC parenting goal in front of you.
You give parents DEEP, complete, step-by-step solutions — never short generic tips.
Every win you write must feel like a complete module a parent can implement and see results from.
When the goal is about sleep, write like a paediatric sleep consultant. When it's about tantrums, write like a co-regulation specialist. When it's about screen time, write like a behavioural-addiction expert. Mirror the requested expertise precisely.
You ALWAYS return valid JSON only. No markdown, no commentary, no code fences, no preamble.${langDirective}`;

  const userPrompt = `Build a complete 12-win behaviour-change plan for this parenting goal.

Goal: ${goalLabel}
Child age group: ${input.ageGroup} years
Severity: ${input.severity}
Common triggers: ${triggers}
Current routine/approach: ${input.routine}

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
- Output ONLY the JSON object — no other text

${goalBrief}`;

  // Tell the client its sessionId immediately so feedback writes can target
  // the right row even before the first win arrives.
  send("session", { sessionId, totalWins: 12 });
  send("progress", { winsBuilt: 0, totalWins: 12 });

  let plan: CoachPlan = fallbackPlan(input);
  let aiOk = false;
  try {
    const { openai } = await import("@workspace/integrations-openai-ai-server");
    const stream = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 8000,
        stream: true,
      },
      // Cancel the upstream OpenAI request as soon as the client disconnects
      // so we don't keep burning tokens for an abandoned plan.
      { signal: aiAbort.signal },
    );

    let buf = "";
    let lastWinsBuilt = 0;
    let winCursor = 0;
    let metaSent = false;
    const sentWinNumbers = new Set<number>();
    // Each new win object in the JSON starts with `"win": N`. Counting that
    // pattern in the buffer gives us a cheap progress indicator (kept for
    // backwards compatibility with older clients).
    const winRe = /"win"\s*:\s*\d+/g;
    for await (const chunk of stream) {
      if (ended) break;
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (!delta) continue;
      buf += delta;

      // Emit plan_meta as soon as title/root_cause/summary are all complete.
      if (!metaSent) {
        const meta = tryExtractMeta(buf);
        if (meta) {
          send("plan_meta", meta);
          metaSent = true;
        }
      }

      // Emit each newly-completed win as a `win` event.
      const extracted = extractCompletedWins(buf, winCursor);
      winCursor = extracted.cursor;
      for (const raw of extracted.wins) {
        try {
          const winObj = JSON.parse(raw) as unknown;
          if (validateWin(winObj) && !sentWinNumbers.has(winObj.win)) {
            sentWinNumbers.add(winObj.win);
            send("win", winObj);
          }
        } catch {
          // unparseable slice — skip; the final JSON.parse below remains the
          // source of truth.
        }
      }

      const winsBuilt = Math.min(12, (buf.match(winRe) || []).length);
      if (winsBuilt > lastWinsBuilt) {
        lastWinsBuilt = winsBuilt;
        send("progress", { winsBuilt, totalWins: 12 });
      }
    }

    try {
      const parsed = JSON.parse(buf);
      if (validatePlan(parsed)) {
        plan = parsed;
        aiOk = true;
      } else {
        logger.warn({ cacheKey: cacheKey.slice(0, 8) }, "ai-coach (stream) plan validation failed — using fallback");
      }
    } catch (parseErr) {
      logger.warn({ err: parseErr, cacheKey: cacheKey.slice(0, 8) }, "ai-coach (stream) JSON parse failed — using fallback");
    }
  } catch (err) {
    // AbortError is expected when the client disconnected — don't log as error.
    const isAbort = (err as { name?: string } | null)?.name === "AbortError";
    if (!isAbort) logger.error({ err }, "ai-coach (stream) OpenAI error");
  }

  // If the user already disconnected, skip post-work entirely. finish() has
  // already refunded the quota slot.
  if (ended) return;

  memCache.set(cacheKey, { plan, ts: Date.now() });
  if (aiOk) await dbSet(cacheKey, input, plan);

  planDelivered = true;
  send("done", { plan, sessionId, cached: false, source: "ai", fallback: !aiOk });
  finish();
  if (userId) void saveCoachSession(userId, sessionId, goal, plan, input);
});

// ─── POST /ai-coach/extend ───────────────────────────────────────────────
// When a parent says "Not worked for me" — generate 3 adaptive wins to append
router.post("/ai-coach/extend", aiUsageGate, async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "unauthorized" }); return; }

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

  const systemPrompt = `You are a child psychologist & behaviour-change expert.
The parent has tried a step in their plan and it did NOT work for their child.
You will write 3 ADAPTIVE follow-up wins that take a different angle: shrink the bar, check hidden blockers (sleep/hunger/sensory), and try the opposite approach (more structure or more autonomy).
Return ONLY valid JSON. No markdown.`;

  const userPrompt = `Parenting goal: ${goalLabel}
Child age: ${ageGroup} years
Severity: ${severity}
Current routine: ${routine}
The step that did NOT work: "${failedWinTitle}" (win #${Number.isFinite(failedWinNumber) ? failedWinNumber : "?"})
Already tried (DO NOT repeat these titles): ${existingTitles.join(" | ") || "none"}

Return ONLY this JSON shape:
{
  "wins": [
    { "win": ${start}, "title": "...", "objective": "...", "deep_explanation": "5-6 lines of science", "actions": ["...", "...", "...", "..."], "example": "real story", "mistake_to_avoid": "...", "micro_task": "5-min task today", "duration": "...", "science_reference": "concept/researcher" },
    { "win": ${start + 1}, ... },
    { "win": ${start + 2}, ... }
  ]
}

STRICT:
- EXACTLY 3 wins, numbered ${start}, ${start + 1}, ${start + 2}
- Each takes a DIFFERENT angle from the failed step (shrink / blocker / opposite)
- 3-5 actions each, substantive deep_explanation, real example with names
- Every win MUST include "science_reference"
- Output ONLY the JSON object`;

  let wins: Win[] | null = null;
  let usedFallback = false;
  try {
    const { openai } = await import("@workspace/integrations-openai-ai-server");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 3000,
    });
    const rawContent = completion.choices[0]?.message?.content?.trim() ?? "";
    try {
      const parsed = JSON.parse(rawContent);
      const arr = (parsed as { wins?: unknown }).wins;
      if (Array.isArray(arr) && arr.length === 3 && arr.every(validateWin)
          && (arr as Win[]).every((w, i) => w.win === start + i)) {
        wins = arr as Win[];
      }
    } catch { /* fall through to fallback */ }
  } catch (err) {
    logger.error({ err }, "ai-coach extend OpenAI error");
  }

  if (!wins) {
    wins = fallbackExtensionWins(failedWinTitle, start);
    usedFallback = true;
  }

  res.json({ wins, source: usedFallback ? "fallback" : "ai" });
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

export default router;
