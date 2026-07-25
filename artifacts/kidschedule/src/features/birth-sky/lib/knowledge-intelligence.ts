/**
 * Knowledge intelligence — client-only reasoning upgrades for Amy Astro.
 * Fuses chart, astronomy, tradition, development, and parenting when useful.
 * No UI / API / backend changes.
 */

import type { PromptKind } from "./conversation-intelligence";

export type AgeBand = "toddler" | "preschool" | "school" | "teen" | "unknown";

export type KnowledgeTheme =
  | "confidence"
  | "friendships"
  | "school"
  | "learning"
  | "creativity"
  | "emotions"
  | "anxiety"
  | "curiosity"
  | "routines"
  | "independence"
  | "general";

export type KnowledgeContext = {
  childName: string;
  sunSign: string;
  moonSign: string;
  risingSign: string | null;
  moonPhaseLabel: string;
  daySky: boolean;
  birthDate?: string | null;
  question: string;
  promptKind: PromptKind;
  turnCount: number;
  lastReflection?: string | null;
};

export type QualityChecks = {
  useful: boolean;
  personal: boolean;
  grounded: boolean;
  actionable: boolean;
  warm: boolean;
  nonRepetitive: boolean;
  appropriateLength: boolean;
  safe: boolean;
};

const DESTINY =
  /\b(destined to|fated to|will (definitely|always|never)|guaranteed to|born to be (a |an )?(leader|failure|star)|their destiny)\b/i;
const ILLNESS =
  /\b(will (get|have|develop)|predicts?|destined).{0,40}\b(cancer|illness|disease|disability|mental illness|autism|adhd diagnosis)\b/i;
const MONEY =
  /\b(will be (rich|wealthy|poor)|financial (success|ruin)|make (a lot of )?money|born lucky with money)\b/i;
const RELATIONSHIP_FATE =
  /\b(will marry|soulmate|never find love|destined partner|divorce is (certain|fated))\b/i;
const DEPENDENCE =
  /\b(only amy can|you must always ask|never decide without|depend on (this|me|astrology))\b/i;
const VAGUE =
  /\b(just be present|trust the process|trust the journey|follow your intuition|every child is (unique|different)|it depends|believe in yourself|the stars have aligned)\b/i;

export function resolveAgeBand(
  birthDate: string | null | undefined,
  now = new Date(),
): AgeBand {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return "unknown";
  const [y, m, d] = birthDate.split("-").map(Number);
  const born = new Date(y!, m! - 1, d);
  if (Number.isNaN(born.getTime())) return "unknown";
  let years = now.getFullYear() - born.getFullYear();
  const monthDiff = now.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < born.getDate())) {
    years -= 1;
  }
  if (years < 0) return "unknown";
  if (years < 3) return "toddler";
  if (years < 6) return "preschool";
  if (years < 12) return "school";
  return "teen";
}

export function themeFromPrompt(question: string, kind: PromptKind): KnowledgeTheme {
  const q = question.toLowerCase();
  if (/friend|peer|playdate|social/.test(q) || kind === "friendship") return "friendships";
  if (/school|classroom|teacher|homework/.test(q) || kind === "school") return "school";
  if (/learn|focus|homework|reading|math/.test(q)) return "learning";
  if (
    /\b(creat(?:e|ive|ivity)?|art\b|imagin|draw|music|story)\b/.test(q) ||
    kind === "creativity"
  )
    return "creativity";
  if (/anxi|worr|fear|nervous|panic/.test(q) || kind === "concern") return "anxiety";
  if (/emotion|feel|meltdown|cry|anger|mood/.test(q) || kind === "emotion") return "emotions";
  if (/curios|wonder|why/.test(q) || kind === "curiosity") return "curiosity";
  if (/routine|schedule|bedtime|morning|habit|sleep/.test(q) || kind === "sleep")
    return "routines";
  if (/independ|do it (myself|themselves)|autonom/.test(q)) return "independence";
  if (/confiden|shy|brave|self.?esteem/.test(q) || kind === "confidence") return "confidence";
  return "general";
}

type LayerBits = {
  astronomy?: string;
  traditional?: string;
  development?: string;
  parentingTry: string;
  reflection: string;
};

function ageExamples(band: AgeBand, theme: KnowledgeTheme, child: string): string {
  const table: Record<AgeBand, Record<KnowledgeTheme, string>> = {
    toddler: {
      confidence: `For a toddler, confidence looks like trying a new toy twice — celebrate the try, not the outcome.`,
      friendships: `Parallel play is normal: sitting near another child while each does their own thing still counts as social practice.`,
      school: `“School” at this age is separation practice — a short goodbye ritual beats a long explanation.`,
      learning: `Learning is sensorial: pouring, stacking, naming. Narrate what ${child} is doing in simple words.`,
      creativity: `Offer one tray of open-ended materials; stay nearby without directing the story.`,
      emotions: `Name the feeling in few words (“Big mad”) and offer a body reset: water, hug, or a quiet corner.`,
      anxiety: `Anxiety often shows as clinginess. Keep transitions tiny and predictable.`,
      curiosity: `Follow one “what’s that?” with a 20-second explore, then pause — don’t lecture.`,
      routines: `Same order every time: wash → story → lights. Songs make the sequence stick.`,
      independence: `Offer two real choices (“red cup or blue?”) so agency stays safe and small.`,
      general: `Keep guidance concrete and body-based — toddlers learn through rhythm more than talk.`,
    },
    preschool: {
      confidence: `Let ${child} show you something they made — your attention is the stage.`,
      friendships: `Practice one friendship script: “Can I play?” and “I need a turn next.”`,
      school: `Rehearse the drop-off in play at home the night before; keep goodbyes warm and short.`,
      learning: `Use play to practice: count stairs, sort colours, tell the story of the day in three beats.`,
      creativity: `Ask “What happens next in your story?” instead of correcting how it looks.`,
      emotions: `Feelings charts help — point, name, then choose a calm-down card together.`,
      anxiety: `Preview new places with a photo or story; pack one familiar comfort object.`,
      curiosity: `Answer with a question back sometimes: “What do you notice?” — it keeps wonder alive.`,
      routines: `Picture schedules reduce power struggles more than repeated verbal reminders.`,
      independence: `Hand over one job (shoes, backpack zip) and protect the time it takes.`,
      general: `Preschoolers need preview + practice more than long talks.`,
    },
    school: {
      confidence: `Witness effort specifically: “You stayed with that hard part for five minutes.”`,
      friendships: `Debrief one social moment after school with curiosity, not fixing: “What felt okay?”`,
      school: `Create a 10-minute after-school landing before homework — snack + quiet, then start.`,
      learning: `Break tasks into start / middle / done. Celebrate starting as much as finishing.`,
      creativity: `Protect unstructured play after structured days; creativity needs unhurried minutes.`,
      emotions: `Offer a feelings check at a neutral time, not mid-storm: “Scale of 1–5 today?”`,
      anxiety: `Externalize worries on paper for 5 minutes, then fold and put them away until tomorrow.`,
      curiosity: `Follow one rabbit hole a week together — library, walk, or simple experiment.`,
      routines: `Anchor mornings with the same three steps posted where they can see them.`,
      independence: `Let them pack the bag the night before; your role is check, not redo.`,
      general: `School-age kids respond best to specific noticing and small ownership.`,
    },
    teen: {
      confidence: `Ask permission before advice: “Want ideas, or just a listener?”`,
      friendships: `Stay available without interrogating — side-by-side chats (car, walk) open more than face-to-face quizzes.`,
      school: `Focus on recovery rhythms after hard days; grades improve when sleep and belonging are steady.`,
      learning: `Help them design their own study block (25 minutes) rather than hovering.`,
      creativity: `Treat their projects as serious — ask process questions, not only outcomes.`,
      emotions: `Validate first (“That sounds heavy”), then ask if they want problem-solving.`,
      anxiety: `Co-regulate: breathe together, then narrow to one next action for the next hour.`,
      curiosity: `Share your own questions; teens open when adults aren’t performing expertise.`,
      routines: `Negotiate non-negotiables (sleep window, device parking) and leave the rest flexible.`,
      independence: `Offer scaffolding they can refuse — respect builds more than rules alone.`,
      general: `Teens need dignity, choice, and adults who don’t catastrophize.`,
    },
    unknown: {
      confidence: `Notice one concrete effort today and name it without comparing.`,
      friendships: `Ask what felt easy or hard with peers — listen before coaching.`,
      school: `Protect a soft landing after the day before any correction.`,
      learning: `Shrink the next step until it feels startable.`,
      creativity: `Leave open time with no performance goal.`,
      emotions: `Name the feeling, then offer one calming choice.`,
      anxiety: `Shrink the unknown: preview, practice, then pause.`,
      curiosity: `Follow their question for two minutes before teaching.`,
      routines: `Pick one micro-routine and keep it boringly consistent.`,
      independence: `Hand over one small job and allow imperfect success.`,
      general: `Keep advice small, kind, and tryable tonight.`,
    },
  };
  return table[band][theme];
}

function astronomyBit(ctx: KnowledgeContext, theme: KnowledgeTheme): string | undefined {
  // Only when chart colour helps the theme.
  if (theme === "general" && ctx.promptKind === "short") return undefined;
  if (
    theme === "emotions" ||
    theme === "anxiety" ||
    theme === "routines" ||
    /\bmoon\b/i.test(ctx.question)
  ) {
    return `Astronomy (birth chart, not today’s sky): Moon in ${ctx.moonSign} (${ctx.moonPhaseLabel.toLowerCase()}) often pairs with belonging and rhythm themes.`;
  }
  if (
    theme === "confidence" ||
    theme === "creativity" ||
    theme === "independence" ||
    /\bsun\b/i.test(ctx.question)
  ) {
    return `Astronomy (birth chart): Sun in ${ctx.sunSign} can frame vitality and the wish to be gently seen — a pattern to notice, not a prediction.`;
  }
  if (theme === "friendships" || theme === "school" || /\brising\b/i.test(ctx.question)) {
    if (ctx.daySky || !ctx.risingSign) {
      return `Astronomy: without Rising in Day Sky mode, we stay with Sun (${ctx.sunSign}) and Moon (${ctx.moonSign}) for how effort and comfort may interact.`;
    }
    return `Astronomy: Rising in ${ctx.risingSign} is a soft “first impression” doorway — useful for new rooms, not a social script.`;
  }
  if (theme === "learning" || theme === "curiosity") {
    return `Astronomy: Sun in ${ctx.sunSign} + Moon in ${ctx.moonSign} can hint how curiosity wakes (bright spark vs quiet absorb) — still only a noticing lens.`;
  }
  if (ctx.promptKind === "explain" || ctx.promptKind === "meaning" || theme === "general") {
    return `Astronomy (birth chart): Sun in ${ctx.sunSign}, Moon in ${ctx.moonSign}${
      ctx.risingSign && !ctx.daySky ? `, Rising in ${ctx.risingSign}` : ""
    } — patterns to notice, not predictions.`;
  }
  return undefined;
}

function traditionalBit(
  theme: KnowledgeTheme,
  sunSign: string,
  question: string,
): string | undefined {
  // Light cultural framing, clearly labeled — never fate.
  if (
    theme === "emotions" ||
    theme === "anxiety" ||
    /\b(moon|lunar|tradition)/i.test(question)
  ) {
    return `Traditional interpretation (reflective story lens): lunar themes are often told as inner weather — useful metaphor, not medical or predictive truth.`;
  }
  if (theme === "confidence" || theme === "independence" || /\bsun\b/i.test(question)) {
    return `Traditional interpretation: solar stories around ${sunSign} often speak of heart and courage practiced in small stages — metaphor only.`;
  }
  if (theme === "friendships") {
    return `Traditional interpretation: belonging tales usually emphasise shared rhythm over popularity — a cultural story, not a social forecast.`;
  }
  return undefined;
}

function developmentBit(band: AgeBand, theme: KnowledgeTheme): string | undefined {
  const map: Partial<Record<KnowledgeTheme, Partial<Record<AgeBand, string>>>> = {
    friendships: {
      toddler: `Child development: before ~3, side-by-side play is typical; forced sharing often backfires.`,
      preschool: `Child development: friendship skills are practiced scripts — they need rehearsal more than lectures.`,
      school: `Child development: peer feedback gets louder; home remains the safer place to repair.`,
      teen: `Child development: peers shape identity; parental curiosity beats surveillance.`,
    },
    emotions: {
      toddler: `Child development: big feelings arrive before language — co-regulation comes first.`,
      preschool: `Child development: naming feelings shrinks intensity; shame expands it.`,
      school: `Child development: mixed feelings are new; “both/and” language helps.`,
      teen: `Child development: emotional intensity + privacy needs rise together.`,
    },
    school: {
      preschool: `Child development: separation capacity grows with predictable adults.`,
      school: `Child development: attention is a limited resource after social effort.`,
      teen: `Child development: sleep and belonging predict learning more than willpower talks.`,
    },
    anxiety: {
      toddler: `Child development: fear of separation is common; consistency calms more than persuasion.`,
      preschool: `Child development: imagination can amplify worries — preview reduces them.`,
      school: `Child development: performance anxiety often hides as stomach aches or avoidance.`,
      teen: `Child development: anxiety can look like irritability; ask before assuming attitude.`,
    },
  };
  return map[theme]?.[band] ?? map[theme]?.unknown;
}

export function buildKnowledgeLayers(ctx: KnowledgeContext): LayerBits {
  const band = resolveAgeBand(ctx.birthDate);
  const theme = themeFromPrompt(ctx.question, ctx.promptKind);
  const child = ctx.childName.trim() || "your child";

  return {
    astronomy: astronomyBit(ctx, theme),
    traditional: traditionalBit(theme, ctx.sunSign, ctx.question),
    development: developmentBit(band, theme),
    parentingTry: `What parents can try: ${ageExamples(band, theme, child)}`,
    reflection: pickReflection(theme, child, band, ctx.turnCount, ctx.lastReflection),
  };
}

const REFLECTIONS: Record<KnowledgeTheme, string[]> = {
  confidence: [
    "Where did you notice even a small brave try this week?",
    "What would ‘enough’ look like for them today — not perfect?",
  ],
  friendships: [
    "When they talk about friends, what emotion do you hear under the words?",
    "Is there one relationship you’re hoping to understand better?",
  ],
  school: [
    "What part of the school day seems to cost them the most energy?",
    "If tomorrow started 10% softer, what would you change first?",
  ],
  learning: [
    "When learning feels hard, do they freeze, rush, or ask for help?",
    "What helps them start — not finish?",
  ],
  creativity: [
    "Where do they create most freely — alone, with you, or with peers?",
    "What would protect twenty unhurried minutes this week?",
  ],
  emotions: [
    "What feeling is hardest for your family to sit with right now?",
    "When storms pass, how do you reconnect?",
  ],
  anxiety: [
    "What worry shows up in their body first?",
    "What already helps even a little — and could you repeat it on purpose?",
  ],
  curiosity: [
    "What question of theirs have you been tempted to answer too quickly?",
    "What are they quietly fascinated by lately?",
  ],
  routines: [
    "Which transition is the stickiest — mornings, after school, or bedtime?",
    "What one step could become boringly consistent?",
  ],
  independence: [
    "What job could they own this week, imperfectly?",
    "Where might help be arriving a little too fast?",
  ],
  general: [
    "What feels most true about them this week?",
    "What would feeling supported look like for you tonight?",
  ],
};

function pickReflection(
  theme: KnowledgeTheme,
  child: string,
  band: AgeBand,
  turnCount: number,
  last?: string | null,
): string {
  const pool = REFLECTIONS[theme].map((r) => r.replace(/\bthem\b/g, child));
  const ageTwist =
    band === "teen"
      ? `Would ${child} want ideas, or simply to be heard?`
      : band === "toddler"
        ? `What tiny moment of connection felt real today with ${child}?`
        : null;
  const options = ageTwist ? [...pool, ageTwist] : pool;
  const filtered = options.filter((o) => o !== last);
  return filtered[turnCount % filtered.length] ?? options[0]!;
}

export function shouldAttachPractical(kind: PromptKind, theme: KnowledgeTheme): boolean {
  if (kind === "short" || kind === "more") return false;
  if (kind === "action" || kind === "concern" || kind === "examples") return true;
  if (theme === "general") {
    // Still offer a try when parents ask how/what to do in plain language.
    return kind === "general" || kind === "explain" || kind === "meaning";
  }
  return [
    "confidence",
    "friendships",
    "school",
    "learning",
    "emotions",
    "anxiety",
    "routines",
    "independence",
    "creativity",
    "curiosity",
  ].includes(theme);
}

export function shouldAttachReflection(
  kind: PromptKind,
  turnCount: number,
  bodyAlreadyAsks: boolean,
): boolean {
  if (bodyAlreadyAsks) return false;
  if (kind === "short") return turnCount % 2 === 0;
  // Many — not every — replies.
  return turnCount % 3 !== 1;
}

export function evaluateQuality(
  body: string,
  ctx: KnowledgeContext,
): { checks: QualityChecks; fails: string[] } {
  const child = ctx.childName.trim();
  const theme = themeFromPrompt(ctx.question, ctx.promptKind);
  const fails: string[] = [];

  const safe =
    !DESTINY.test(body) &&
    !ILLNESS.test(body) &&
    !MONEY.test(body) &&
    !RELATIONSHIP_FATE.test(body) &&
    !DEPENDENCE.test(body);
  if (!safe) fails.push("safe");

  const personal =
    (!!child && body.toLowerCase().includes(child.toLowerCase())) ||
    /\b(their|your child|sun|moon|rising)\b/i.test(body);
  if (!personal) fails.push("personal");

  const grounded =
    /\b(sun|moon|rising|birth chart|astronomy|traditional|day sky|pattern to notice)\b/i.test(
      body,
    ) || ctx.promptKind === "short";
  if (!grounded) fails.push("grounded");

  const actionable =
    /what parents can try/i.test(body) ||
    /\b(try|offer|practice|protect|preview|pack|hand over|celebrate|rehearse|debrief|snack)\b/i.test(
      body,
    ) ||
    ctx.promptKind === "short" ||
    ctx.promptKind === "more";
  if (!actionable && shouldAttachPractical(ctx.promptKind, theme)) fails.push("actionable");

  const warm = !/\b(you should have|obviously|just stop|simply make them)\b/i.test(body);
  if (!warm) fails.push("warm");

  const useful = body.trim().length > 40 && !VAGUE.test(body.slice(0, 120));
  if (!useful && ctx.promptKind !== "short") fails.push("useful");

  const len = body.trim().length;
  const appropriateLength =
    ctx.promptKind === "short"
      ? len < 480
      : ctx.promptKind === "long"
        ? len > 120 && len < 2200
        : len > 80 && len < 1600;
  if (!appropriateLength) fails.push("appropriateLength");

  const nonRepetitive = !/\b(as an ai|great question|certainly!)\b/i.test(body);
  if (!nonRepetitive) fails.push("nonRepetitive");

  const checks: QualityChecks = {
    useful: !fails.includes("useful"),
    personal: !fails.includes("personal"),
    grounded: !fails.includes("grounded"),
    actionable: !fails.includes("actionable"),
    warm: !fails.includes("warm"),
    nonRepetitive: !fails.includes("nonRepetitive"),
    appropriateLength: !fails.includes("appropriateLength"),
    safe: !fails.includes("safe"),
  };

  return { checks, fails };
}

function scrubSafety(body: string): string {
  let out = body;
  out = out.replace(DESTINY, "may sometimes show a pattern worth noticing");
  out = out.replace(ILLNESS, "is not something astrology can diagnose or predict");
  out = out.replace(MONEY, "isn’t something we predict here");
  out = out.replace(RELATIONSHIP_FATE, "isn’t a fixed relationship forecast");
  out = out.replace(DEPENDENCE, "your own knowing matters most");
  out = out.replace(
    /\bthis (guarantees|ensures) they will\b/gi,
    "this may sometimes relate to how they",
  );
  return out;
}

/**
 * Fuse knowledge into a model (or simulated) reply when quality checks fail
 * or when practical/reflection layers are missing.
 */
export function enrichWithKnowledge(
  body: string,
  ctx: KnowledgeContext,
): { body: string; applied: string[]; checks: QualityChecks } {
  const theme = themeFromPrompt(ctx.question, ctx.promptKind);
  const layers = buildKnowledgeLayers(ctx);
  const applied: string[] = [];
  let next = scrubSafety(body.trim());
  applied.push("safety_scrub");

  // Soften vague / chatbot filler anywhere in the reply
  if (VAGUE.test(next)) {
    next = next.replace(new RegExp(VAGUE.source, "gi"), "");
    applied.push("de_vague");
  }
  next = next
    .replace(/\bas an ai,?\s*/gi, "")
    .replace(/\bcertainly!\s*/gi, "")
    .replace(/\bgreat question!\s*/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .trim();

  const child = ctx.childName.trim();
  if (child && !next.toLowerCase().includes(child.toLowerCase())) {
    next = `For ${child}: ${next}`;
    applied.push("personalize");
  }

  // Selective fusion — only layers that improve the answer
  const needsGrounding =
    !/\b(sun|moon|rising|birth chart|astronomy)\b/i.test(next) &&
    ctx.promptKind !== "short";
  if (needsGrounding && layers.astronomy) {
    next = `${next}\n\n${layers.astronomy}`;
    applied.push("astronomy");
  }

  const wantsTradition =
    /tradition|culture|story|meaning|explain/i.test(ctx.question) ||
    ctx.promptKind === "meaning" ||
    ctx.promptKind === "explain";
  if (wantsTradition && layers.traditional && !/traditional interpretation/i.test(next)) {
    next = `${next}\n\n${layers.traditional}`;
    applied.push("traditional");
  }

  const wantsDev =
    shouldAttachPractical(ctx.promptKind, theme) ||
    /develop|age|toddler|teen|school/i.test(ctx.question);
  if (wantsDev && layers.development && !/child development:/i.test(next)) {
    next = `${next}\n\n${layers.development}`;
    applied.push("development");
  }

  if (
    shouldAttachPractical(ctx.promptKind, theme) &&
    !/what parents can try/i.test(next)
  ) {
    next = `${next}\n\n${layers.parentingTry}`;
    applied.push("practical");
  }

  const asks = /\?\s*$/.test(next.trim()) || (next.match(/\?/g) || []).length >= 2;
  if (shouldAttachReflection(ctx.promptKind, ctx.turnCount, asks)) {
    next = `${next}\n\n${layers.reflection}`;
    applied.push("reflection");
  }

  // Length trim
  if (ctx.promptKind === "short" && next.length > 480) {
    const parts = next.split(/\n\n+/).slice(0, 2);
    next = parts.join("\n\n");
    applied.push("trim_short");
  }
  if (next.length > 1800 && ctx.promptKind !== "long") {
    next = next.split(/\n\n+/).slice(0, 5).join("\n\n");
    applied.push("trim_medium");
  }

  let { checks, fails } = evaluateQuality(next, ctx);

  // Second pass rewrite if still failing actionable/grounded
  if (fails.includes("actionable") && layers.parentingTry) {
    next = `${next}\n\n${layers.parentingTry}`;
    applied.push("practical_retry");
    ({ checks, fails } = evaluateQuality(next, ctx));
  }
  if (fails.includes("grounded") && layers.astronomy) {
    next = `${layers.astronomy}\n\n${next}`;
    applied.push("ground_retry");
    ({ checks } = evaluateQuality(next, ctx));
  }
  if (fails.includes("warm")) {
    next = next
      .replace(/\byou should have\b/gi, "you might try")
      .replace(/\bobviously\b/gi, "often")
      .replace(/\bjust stop\b/gi, "gently pause");
    applied.push("warm_retry");
    ({ checks } = evaluateQuality(next, ctx));
  }

  return { body: next.trim(), applied, checks };
}

/** Scenario labels for the evaluation suite */
export const KNOWLEDGE_SCENARIOS = [
  "confidence",
  "friendships",
  "school",
  "learning",
  "creativity",
  "emotions",
  "anxiety",
  "curiosity",
  "routines",
  "independence",
] as const;

export type ScenarioId = (typeof KNOWLEDGE_SCENARIOS)[number];

export function scenarioPrompt(scenario: ScenarioId, childName: string): string {
  const map: Record<ScenarioId, string> = {
    confidence: `How can I build ${childName}'s confidence without pressure?`,
    friendships: `${childName} struggles with friendships at the playground. What helps?`,
    school: `${childName} comes home exhausted from school. What should I do?`,
    learning: `How does ${childName} learn best when homework feels hard?`,
    creativity: `${childName} loves creating but quits if it isn't perfect.`,
    emotions: `${childName} has big emotional storms after small frustrations.`,
    anxiety: `I'm worried — ${childName} gets anxious before new places.`,
    curiosity: `How can I protect ${childName}'s curiosity?`,
    routines: `Our morning routine with ${childName} keeps falling apart.`,
    independence: `How do I support ${childName}'s independence without rushing them?`,
  };
  return map[scenario];
}

export function isGenericResponse(body: string): boolean {
  const generic =
    /\b(every child is different|trust the journey|believe in yourself|the stars have aligned|manifest|as an ai|certainly!)\b/i;
  if (generic.test(body)) return true;
  const hasTry = /what parents can try/i.test(body);
  const hasConcrete =
    /\b(minute|snack|choice|preview|name|zip|bag|photo|script|25 minute|two real|witness|landing|practice|tray|shoes|breathe)\b/i.test(
      body,
    );
  const hasChart = /\b(sun|moon|rising|astronomy|birth chart)\b/i.test(body);
  // Long replies without practical or concrete parenting cues still feel generic.
  return body.length > 280 && !hasTry && !hasConcrete && !hasChart;
}
