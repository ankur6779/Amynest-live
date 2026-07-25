/**
 * Client-side conversational intelligence for Amy Astro.
 * No backend calls — memory, rhythm, continuity, and quality pass only.
 */

import { loadCosmicMemory } from "./cosmic-memory";
import { loadReplyMemory, rememberPlanetsDiscussed, rememberReplyOpening } from "./reply-memory";
import { enrichWithKnowledge } from "./knowledge-intelligence";

const KEY = "amynest:amy-astro:guide-memory:v1:";

export type PromptKind =
  | "concern"
  | "meaning"
  | "action"
  | "more"
  | "explain"
  | "examples"
  | "school"
  | "friendship"
  | "confidence"
  | "creativity"
  | "emotion"
  | "sleep"
  | "behaviour"
  | "curiosity"
  | "short"
  | "long"
  | "general";

export type ResponseRhythm =
  | "local_followup"
  | "reflect_first"
  | "answer_direct"
  | "invite_explore";

export type ResponsePattern =
  | "narrative"
  | "example"
  | "reflection"
  | "bullets"
  | "short"
  | "long"
  | "question_first"
  | "observation_first";

export type GuideMemory = {
  turnCount: number;
  lastTopics: string[];
  lastThemes: string[];
  lastQuestions: string[];
  lastEndings: string[];
  lastTransitions: string[];
  lastAdvice: string[];
  lastMetaphors: string[];
  lastPatterns: ResponsePattern[];
  lastRhythms: ResponseRhythm[];
  lastFollowUps: string[];
  style: "warm" | "curious" | "reflective";
};

export type ChartGrounding = {
  childName: string;
  sunSign: string;
  moonSign: string;
  risingSign: string | null;
  moonPhaseLabel: string;
  daySky: boolean;
  /** YYYY-MM-DD — used for age-aware guidance only */
  birthDate?: string | null;
};

const EMPTY: GuideMemory = {
  turnCount: 0,
  lastTopics: [],
  lastThemes: [],
  lastQuestions: [],
  lastEndings: [],
  lastTransitions: [],
  lastAdvice: [],
  lastMetaphors: [],
  lastPatterns: [],
  lastRhythms: [],
  lastFollowUps: [],
  style: "warm",
};

const memoryStore = new Map<string, GuideMemory>();

const ALT_OPENINGS = [
  "Sitting with what their chart softly shows,",
  "A quieter noticing from their birth sky:",
  "Holding their lights gently,",
  "From what their Sun and Moon already suggest,",
  "With their sky in mind,",
  "Taking this slowly,",
];

const ALT_ENDINGS = [
  "What part of that lands closest for you?",
  "Would it help to stay with one small example from this week?",
  "I can also stay with the Moon side of this, if you’d like.",
  "One gentle next step is enough — no rush.",
];

const SOFT_FOLLOWUPS = [
  "I also noticed their Moon themes often colour evenings — does that match what you see?",
  "Would you like to explore how this shows up at school, or keep it close to home?",
  "One gentle observation: small rituals often teach more than big talks.",
  "Does this feel more about confidence, belonging, or rest?",
];

const ROBOTIC =
  /\b(as an ai|i'm an artificial|as a language model|certainly!|absolutely!|great question!|of course!)\b/gi;
const MYSTICAL =
  /\b(destiny|fated|the universe has spoken|cosmic decree|manifest their fate|karmic debt)\b/gi;
const DRAMATIC = /\b(life.?changing| forever doomed|guaranteed success|always will)\b/gi;

function read(profileId: string): GuideMemory {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(KEY + profileId);
      if (raw) return { ...EMPTY, ...JSON.parse(raw) };
    }
  } catch {
    /* fall through */
  }
  return { ...EMPTY, ...(memoryStore.get(profileId) ?? {}) };
}

function write(profileId: string, next: GuideMemory): GuideMemory {
  memoryStore.set(profileId, next);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(KEY + profileId, JSON.stringify(next));
    }
  } catch {
    /* memory is enough */
  }
  return next;
}

export function __resetGuideMemoryForTests(): void {
  memoryStore.clear();
  try {
    if (typeof localStorage !== "undefined") {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(KEY)) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    }
  } catch {
    /* ignore */
  }
}

export function loadGuideMemory(profileId: string): GuideMemory {
  return read(profileId);
}

function firstSentence(body: string): string {
  return body.trim().split(/(?<=[.!?])\s+/)[0]?.slice(0, 160) ?? "";
}

function lastSentence(body: string): string {
  const parts = body.trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  return parts[parts.length - 1]?.slice(0, 160) ?? "";
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 72);
}

function lead(s: string, n = 4): string {
  return norm(s).split(" ").slice(0, n).join(" ");
}

function similar(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb || na.startsWith(nb) || nb.startsWith(na)) return true;
  const la = lead(na);
  const lb = lead(nb);
  return la === lb && la.length >= 10;
}

export function classifyPrompt(question: string): PromptKind {
  const q = question.trim().toLowerCase();
  // Intent keywords win over length (e.g. "I'm worried.")
  if (/worr(y|ied)|anxious|afraid|scared|stress/.test(q)) return "concern";
  if (/what should i do|how (can|do|should) i|advice|help me/.test(q)) return "action";
  if (/what does (this|that|it|her|his|their)?.{0,40}mean|means\?$|interpret/.test(q))
    return "meaning";
  if (/tell me more|go on|continue|and then/.test(q)) return "more";
  if (/explain|can you explain|help me understand/.test(q)) return "explain";
  if (/example|for instance|like what|give examples/.test(q)) return "examples";
  if (/school|classroom|homework|teacher/.test(q)) return "school";
  if (/friend|peer|playdate|social/.test(q)) return "friendship";
  if (/confiden|self.?esteem|brave|shy/.test(q)) return "confidence";
  if (/creativ|art|imagin|draw|music/.test(q)) return "creativity";
  if (/emotion|feelings?|mood|cry|anger|meltdown/.test(q)) return "emotion";
  if (/sleep|bedtime|night|nap/.test(q)) return "sleep";
  if (/behaviou?r|tantrum|listen|defian|discipline/.test(q)) return "behaviour";
  if (/curios|wonder|why do they|interested/.test(q)) return "curiosity";
  if (/^(hi|hello|hey|thanks|ok|yes|no)\b/.test(q) || q.length < 12) return "short";
  if (q.length > 180) return "long";
  return "general";
}

export function extractTheme(question: string): string {
  const kind = classifyPrompt(question);
  const map: Record<PromptKind, string> = {
    concern: "worry",
    meaning: "meaning",
    action: "parenting support",
    more: "going deeper",
    explain: "explanation",
    examples: "examples",
    school: "school",
    friendship: "friendships",
    confidence: "confidence",
    creativity: "creativity",
    emotion: "emotional expression",
    sleep: "sleep and rest",
    behaviour: "behaviour",
    curiosity: "curiosity",
    short: "a quiet check-in",
    long: "a fuller story",
    general: "their sky",
  };
  return map[kind];
}

function nextStyle(prev: GuideMemory["style"]): GuideMemory["style"] {
  if (prev === "warm") return "curious";
  if (prev === "curious") return "reflective";
  return "warm";
}

function pickPattern(kind: PromptKind, mem: GuideMemory): ResponsePattern {
  const pools: Record<PromptKind, ResponsePattern[]> = {
    concern: ["reflection", "question_first", "short", "observation_first"],
    meaning: ["narrative", "observation_first", "long", "bullets"],
    action: ["example", "bullets", "short", "reflection"],
    more: ["narrative", "example", "long", "observation_first"],
    explain: ["narrative", "bullets", "long", "example"],
    examples: ["example", "bullets", "short", "narrative"],
    school: ["example", "observation_first", "bullets", "reflection"],
    friendship: ["narrative", "example", "reflection", "question_first"],
    confidence: ["reflection", "example", "short", "observation_first"],
    creativity: ["narrative", "example", "observation_first", "short"],
    emotion: ["reflection", "observation_first", "question_first", "short"],
    sleep: ["example", "bullets", "short", "reflection"],
    behaviour: ["example", "reflection", "question_first", "bullets"],
    curiosity: ["narrative", "question_first", "observation_first", "example"],
    short: ["short", "question_first", "reflection", "observation_first"],
    long: ["long", "narrative", "bullets", "reflection"],
    general: ["observation_first", "narrative", "short", "question_first"],
  };
  const pool = pools[kind] ?? pools.general;
  const avoided = new Set(mem.lastPatterns.slice(0, 2));
  for (let i = 0; i < pool.length; i++) {
    const candidate = pool[(mem.turnCount + i) % pool.length]!;
    if (!avoided.has(candidate)) return candidate;
  }
  return pool[mem.turnCount % pool.length]!;
}

/**
 * Choose conversation rhythm. Vague/emotional prompts sometimes get a local follow-up
 * instead of an immediate long model answer.
 */
export function chooseRhythm(
  question: string,
  mem: GuideMemory,
): ResponseRhythm {
  const kind = classifyPrompt(question);
  const last = mem.lastRhythms[0];
  const repeatedQ = mem.lastQuestions.some((q) => similar(q, question));

  if (repeatedQ && last !== "local_followup") {
    return "reflect_first";
  }

  const vague =
    kind === "short" ||
    kind === "concern" ||
    kind === "more" ||
    kind === "action" ||
    (kind === "general" && question.trim().split(/\s+/).length < 6);

  // Never stack local follow-ups twice in a row.
  if (vague && last !== "local_followup" && mem.turnCount % 3 !== 1) {
    return "local_followup";
  }
  if (kind === "curiosity" || kind === "meaning") {
    return mem.turnCount % 2 === 0 ? "invite_explore" : "answer_direct";
  }
  if (kind === "explain" || kind === "examples" || kind === "long") {
    return "answer_direct";
  }
  if (kind === "emotion" || kind === "concern") {
    return "reflect_first";
  }
  const cycle: ResponseRhythm[] = [
    "answer_direct",
    "reflect_first",
    "invite_explore",
    "answer_direct",
  ];
  let pick = cycle[mem.turnCount % cycle.length]!;
  if (pick === last) {
    pick = cycle[(mem.turnCount + 1) % cycle.length]!;
  }
  return pick;
}

export function buildSessionContinuity(
  profileId: string,
  childName: string,
): string | null {
  const mem = read(profileId);
  const cosmic = loadCosmicMemory(profileId);
  const reply = loadReplyMemory(profileId);
  const theme = mem.lastThemes[0];
  const planet = reply.lastPlanets[0] ?? cosmic.lastPlanet;

  if (!theme && !planet && cosmic.chaptersOpened.length === 0) return null;

  const lines: string[] = [];
  if (theme) {
    lines.push(
      mem.turnCount > 0
        ? `Last time we explored ${theme}${childName ? ` for ${childName}` : ""}.`
        : `We can pick up ${theme} again whenever you’re ready.`,
    );
  }
  if (planet && typeof planet === "string") {
    const label =
      planet === "sun" || planet === "Sun"
        ? "the Sun"
        : planet === "moon" || planet === "Moon"
          ? "the Moon"
          : "Rising";
    lines.push(`We were also sitting with ${label}.`);
  } else if (cosmic.chaptersOpened.length > 0) {
    lines.push(
      `This connects with the ${cosmic.chaptersOpened.length} chapter${
        cosmic.chaptersOpened.length === 1 ? "" : "s"
      } you’ve already opened.`,
    );
  }
  return lines[0] ?? null;
}

function risingNote(chart: ChartGrounding): string {
  if (chart.daySky || !chart.risingSign) {
    return "Rising isn’t available in Day Sky mode, so I’ll stay with Sun and Moon.";
  }
  return `Rising in ${chart.risingSign} is how a room may first meet them — a soft doorway, not a script.`;
}

export function buildLocalGuideTurn(input: {
  question: string;
  chart: ChartGrounding;
  mem: GuideMemory;
}): string {
  const { question, chart, mem } = input;
  const kind = classifyPrompt(question);
  const child = chart.childName.trim() || "your child";
  const style = mem.style;
  const theme = extractTheme(question);
  const prior = mem.lastThemes[0];

  const bridge =
    prior && !similar(prior, theme)
      ? `This sits beside ${prior} we touched earlier. `
      : "";

  const sunMoon = `${child}'s Sun in ${chart.sunSign} and Moon in ${chart.moonSign}`;
  const phase = chart.moonPhaseLabel.toLowerCase();

  const byKind: Record<PromptKind, string[]> = {
    concern: [
      `${bridge}I hear the worry. Before we go further — is it mostly evenings, school, or something quieter between you and ${child}?`,
      `${bridge}When worry shows up, I like to start soft. Looking at ${sunMoon}, does the worry feel more emotional weather, or more about how they enter a room?`,
    ],
    meaning: [
      `${bridge}Which part feels unclear — their ${chart.sunSign} daylight, ${chart.moonSign} Moon weather, or how others first meet them?`,
      `${bridge}“Meaning” can sit in astronomy or in reflection. Which lens would help you most right now?`,
    ],
    action: [
      `${bridge}Before we talk about what to try — what have you already offered ${child} that seemed to help even a little?`,
      `${bridge}I can share one small practice. First, is this about bedtime, big feelings, or confidence out in the world?`,
    ],
    more: [
      `${bridge}Happy to go deeper. Shall we stay with ${prior ?? theme}, or shift toward ${chart.moonSign} Moon themes?`,
      `${bridge}Tell me which thread you want more of — belonging, curiosity, or how they meet new spaces.`,
    ],
    explain: [
      `${bridge}I can explain gently. Do you want the astronomy facts, a traditional story lens, or a parenting reflection?`,
    ],
    examples: [
      `${bridge}Examples help. Is this for home evenings, school mornings, or play with friends?`,
    ],
    school: [
      chart.daySky || !chart.risingSign
        ? `${bridge}School days can stretch comfort and effort. Is the hard part arriving, focusing, or friendships in the room?`
        : `${bridge}School can stretch how ${child} first meets a room. Is the hard part arriving, focusing, or friendships?`,
    ],
    friendship: [
      `${bridge}Friendships often echo Moon belonging. Do they hang back first, or leap in and then need a soft landing?`,
    ],
    confidence: [
      `${bridge}Confidence for ${child} often grows in small witnessed efforts. Where did you last see a flicker of pride?`,
    ],
    creativity: [
      `${bridge}Creativity loves unhurried play. Is ${child} more drawn to making, imagining stories, or moving their body?`,
    ],
    emotion: [
      `${bridge}Emotional weather — a ${phase} Moon note in ${chart.moonSign}. Does it rise quickly, or quietly build?`,
    ],
    sleep: [
      `${bridge}Sleep is often rhythm more than willpower. Is bedtime hard at the start, or in the middle of the night?`,
    ],
    behaviour: [
      `${bridge}Behaviour is usually a message. When it flares, what just happened in the minutes before?`,
    ],
    curiosity: [
      `${bridge}Curiosity is one of ${child}'s soft strengths. What lately made their eyes light up?`,
    ],
    short: [
      `I’m here with ${child}'s sky. What’s on your mind tonight — feelings, school, or something quieter?`,
      `Taking this gently. Would you like a short reflection, or a small parenting idea?`,
    ],
    long: [
      `${bridge}Thank you for the fuller picture. Which part should we hold first — the worry, the pattern, or one concrete moment?`,
    ],
    general: [
      `${bridge}I’m with ${sunMoon}. What would feel most useful — understanding, a small idea to try, or simply being heard?`,
    ],
  };

  const pool = byKind[kind] ?? byKind.general;
  let line = pool[mem.turnCount % pool.length]!;
  if (style === "curious" && !line.includes("?")) {
    line = `${line} What feels true from where you sit?`;
  }
  if (kind !== "short" && mem.turnCount % 4 === 2) {
    line = `${line} (${risingNote(chart)})`;
  }
  return line;
}

function stripRobotic(body: string): string {
  return body
    .replace(ROBOTIC, "")
    .replace(MYSTICAL, "a pattern to notice")
    .replace(DRAMATIC, "something to watch gently")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function fingerprintAdvice(body: string): string {
  const m =
    body.match(
      /\b(try|offer|notice|protect|give|keep|invite)\b[^.!?]{0,80}/i,
    )?.[0] ?? "";
  return lead(m, 5);
}

function fingerprintMetaphor(body: string): string {
  const m =
    body.match(
      /\b(like a|as if|weather|lantern|doorway|tide|garden|compass)\b[^.!?]{0,60}/i,
    )?.[0] ?? "";
  return lead(m, 4);
}

function fingerprintTransition(body: string): string {
  const m =
    body.match(
      /^(that said|importantly|remember that|in other words|at the end of the day)[^.!?]*/im,
    )?.[0] ?? "";
  return lead(m, 4);
}

function maybeAppendFollowUp(
  body: string,
  mem: GuideMemory,
  rhythm: ResponseRhythm,
): string {
  if (rhythm === "local_followup") return body;
  if (/\?\s*$/.test(body.trim())) return body;
  if (mem.turnCount % 3 !== 0) return body; // only sometimes
  const unused = SOFT_FOLLOWUPS.filter(
    (f) => !mem.lastFollowUps.some((x) => similar(x, f)),
  );
  const pick = unused[mem.turnCount % Math.max(1, unused.length)] ?? ALT_ENDINGS[0]!;
  return `${body.trim()}\n\n${pick}`;
}

/**
 * Quality pass before display — openings, endings, tone, follow-ups.
 */
export function runQualityPass(input: {
  profileId: string;
  body: string;
  question: string;
  chart: ChartGrounding;
  rhythm: ResponseRhythm;
  pattern: ResponsePattern;
}): { body: string; flags: string[] } {
  const flags: string[] = [];
  const mem = read(input.profileId);
  let body = stripRobotic(input.body);
  if (body !== input.body.trim()) flags.push("tone_softened");

  const opening = firstSentence(body);
  const replyMem = loadReplyMemory(input.profileId);

  if (replyMem.lastOpenings.some((o) => similar(o, opening))) {
    flags.push("repeated_opening");
    const rest = body.slice(opening.length).replace(/^\s*/, "");
    const alt = ALT_OPENINGS[mem.turnCount % ALT_OPENINGS.length]!;
    body = rest ? `${alt} ${rest}` : `${alt} ${opening}`;
  }

  const ending = lastSentence(body);
  if (mem.lastEndings.some((e) => similar(e, ending))) {
    flags.push("repeated_ending");
    const withoutEnd = body.slice(0, Math.max(0, body.length - ending.length)).trim();
    const alt = ALT_ENDINGS[(mem.turnCount + 1) % ALT_ENDINGS.length]!;
    body = withoutEnd ? `${withoutEnd} ${alt}` : alt;
  }

  const adv = fingerprintAdvice(body);
  if (adv && mem.lastAdvice.some((a) => a === adv)) {
    flags.push("repeated_advice");
  }
  const met = fingerprintMetaphor(body);
  if (met && mem.lastMetaphors.some((m) => m === met)) {
    flags.push("repeated_metaphor");
    body = body.replace(/\blike a lantern\b/gi, "like a quiet compass");
    body = body.replace(/\bemotional weather\b/gi, "inner climate");
  }
  const tr = fingerprintTransition(body);
  if (tr && mem.lastTransitions.some((t) => t === tr)) {
    flags.push("repeated_transition");
    body = body.replace(/^(that said|importantly|remember that),?\s*/im, "");
  }

  // Day Sky honesty — never imply Rising is known, never equate birth chart to today's sky
  if (input.chart.daySky || !input.chart.risingSign) {
    if (/\brising\b/i.test(body)) {
      flags.push("rising_grounding");
      body = body
        .replace(/\bRising in [A-Za-z]+\b/g, "Rising (unavailable in Day Sky)")
        .replace(/\bRising doorway\b/gi, "how they enter a room");
      if (!/unavailable|day sky/i.test(body)) {
        body = `${body.trim()}\n\nRising isn’t available in Day Sky, so I’m staying with Sun and Moon.`;
      }
    }
  }
  if (
    /\b(today'?s live sky|live sky today|sky right now is their birth|birth chart is today)\b/i.test(
      body,
    )
  ) {
    flags.push("live_sky_confusion");
    body = body.replace(
      /\b(today'?s live sky|live sky today|sky right now is their birth|birth chart is today)\b/gi,
      "their birth-chart sky (not today's live sky)",
    );
  }

  // Pattern-aware length trim for short questions
  if (
    (input.pattern === "short" || classifyPrompt(input.question) === "short") &&
    body.length > 520
  ) {
    flags.push("trimmed_for_short");
    const paras = body.split(/\n\n+/);
    body = paras.slice(0, 2).join("\n\n");
    if (!/[?]$/.test(body.trim())) {
      body = `${body.trim()}\n\nWhat would you like to hold next?`;
    }
  }

  if (input.rhythm === "invite_explore" || input.rhythm === "reflect_first") {
    body = maybeAppendFollowUp(body, mem, input.rhythm);
  }

  // Reflect-first prefix when model launched straight into advice
  if (
    input.rhythm === "reflect_first" &&
    !/^(i hear|sitting with|holding|taking this|a quieter)/i.test(body.trim())
  ) {
    const child = input.chart.childName || "them";
    body = `Holding what you shared about ${child} for a moment.\n\n${body}`;
    flags.push("reflect_prefix");
  }

  // Knowledge intelligence — fuse useful layers + quality checklist rewrite
  if (input.rhythm !== "local_followup") {
    const enriched = enrichWithKnowledge(body, {
      childName: input.chart.childName,
      sunSign: input.chart.sunSign,
      moonSign: input.chart.moonSign,
      risingSign: input.chart.risingSign,
      moonPhaseLabel: input.chart.moonPhaseLabel,
      daySky: input.chart.daySky,
      birthDate: input.chart.birthDate,
      question: input.question,
      promptKind: classifyPrompt(input.question),
      turnCount: mem.turnCount,
      lastReflection: mem.lastFollowUps[0] ?? null,
    });
    body = enriched.body;
    for (const a of enriched.applied) flags.push(`knowledge_${a}`);
    const failed = Object.entries(enriched.checks)
      .filter(([, ok]) => !ok)
      .map(([k]) => k);
    if (failed.length) flags.push(`quality_gap:${failed.join(",")}`);
  } else {
    // Local follow-ups: safety scrub only — keep them short questions
    const safeOnly = enrichWithKnowledge(body, {
      childName: input.chart.childName,
      sunSign: input.chart.sunSign,
      moonSign: input.chart.moonSign,
      risingSign: input.chart.risingSign,
      moonPhaseLabel: input.chart.moonPhaseLabel,
      daySky: input.chart.daySky,
      birthDate: input.chart.birthDate,
      question: input.question,
      promptKind: "short",
      turnCount: mem.turnCount,
    });
    body = safeOnly.body.split(/\n\n+/)[0] ?? safeOnly.body;
    flags.push("knowledge_local_safe");
  }

  rememberReplyOpening(input.profileId, body);
  return { body, flags };
}

export function rememberConversationTurn(input: {
  profileId: string;
  question: string;
  reply: string;
  rhythm: ResponseRhythm;
  pattern: ResponsePattern;
  planets?: string[];
}): GuideMemory {
  const prev = read(input.profileId);
  const theme = extractTheme(input.question);
  const ending = lastSentence(input.reply);
  const next: GuideMemory = {
    turnCount: prev.turnCount + 1,
    lastTopics: [theme, ...prev.lastTopics.filter((t) => t !== theme)].slice(0, 6),
    lastThemes: [theme, ...prev.lastThemes.filter((t) => t !== theme)].slice(0, 6),
    lastQuestions: [
      input.question,
      ...prev.lastQuestions.filter((q) => !similar(q, input.question)),
    ].slice(0, 8),
    lastEndings: [ending, ...prev.lastEndings.filter((e) => !similar(e, ending))].slice(
      0,
      4,
    ),
    lastTransitions: [
      fingerprintTransition(input.reply),
      ...prev.lastTransitions,
    ]
      .filter(Boolean)
      .slice(0, 4),
    lastAdvice: [fingerprintAdvice(input.reply), ...prev.lastAdvice]
      .filter(Boolean)
      .slice(0, 4),
    lastMetaphors: [fingerprintMetaphor(input.reply), ...prev.lastMetaphors]
      .filter(Boolean)
      .slice(0, 4),
    lastPatterns: [input.pattern, ...prev.lastPatterns].slice(0, 5),
    lastRhythms: [input.rhythm, ...prev.lastRhythms].slice(0, 5),
    lastFollowUps: /\?\s*$/.test(input.reply.trim())
      ? [lastSentence(input.reply), ...prev.lastFollowUps].slice(0, 4)
      : prev.lastFollowUps,
    style: nextStyle(prev.style),
  };
  const saved = write(input.profileId, next);
  if (input.planets?.length) {
    rememberPlanetsDiscussed(input.profileId, input.planets);
  }
  return saved;
}

export type PlannedTurn =
  | {
      kind: "local_guide";
      rhythm: ResponseRhythm;
      pattern: ResponsePattern;
      body: string;
      promptKind: PromptKind;
    }
  | {
      kind: "stream";
      rhythm: ResponseRhythm;
      pattern: ResponsePattern;
      promptKind: PromptKind;
    };

export function planConversationTurn(input: {
  profileId: string;
  question: string;
  chart: ChartGrounding;
}): PlannedTurn {
  const mem = read(input.profileId);
  const promptKind = classifyPrompt(input.question);
  const rhythm = chooseRhythm(input.question, mem);
  const pattern = pickPattern(promptKind, mem);

  if (rhythm === "local_followup") {
    return {
      kind: "local_guide",
      rhythm,
      pattern: "question_first",
      promptKind,
      body: buildLocalGuideTurn({
        question: input.question,
        chart: input.chart,
        mem,
      }),
    };
  }

  return { kind: "stream", rhythm, pattern, promptKind };
}

/** Looking-at microcopy — planet-aware, never invents Rising. */
export function lookingAtCopy(input: {
  chart: ChartGrounding;
  question: string;
}): string {
  const kind = classifyPrompt(input.question);
  const child = input.chart.childName || "them";
  const base = `Amy is sitting with ${child}'s birth chart`;
  const daySky = input.chart.daySky || !input.chart.risingSign;
  const lens: Partial<Record<PromptKind, string>> = {
    sleep: " — especially Moon rhythm",
    emotion: " — especially Moon weather",
    confidence: " — especially Sun light",
    school: daySky
      ? " — Sun effort and comfort themes"
      : " — Sun effort and how a room may first meet them",
    friendship: " — Moon belonging",
    behaviour: " — with gentle noticing, not labels",
    concern: " — carefully, without rushing to fix",
  };
  const rising = daySky
    ? " This is their birth chart — not today's live sky. Sun and Moon only for now."
    : " This is their birth chart — not today's live sky. Sun, Moon, and Rising.";
  return `${base}${lens[kind] ?? ""}.${rising}`;
}

/**
 * Local guide simulator for tests — produces varied grounded replies without the API.
 */
export function simulateGuideResponse(input: {
  question: string;
  chart: ChartGrounding;
  rhythm: ResponseRhythm;
  pattern: ResponsePattern;
  mem: GuideMemory;
}): string {
  const child = input.chart.childName || "your child";
  const { sunSign, moonSign, moonPhaseLabel } = input.chart;
  const theme = extractTheme(input.question);
  const kind = classifyPrompt(input.question);

  if (input.rhythm === "local_followup") {
    return buildLocalGuideTurn({
      question: input.question,
      chart: input.chart,
      mem: input.mem,
    });
  }

  const openers: Record<ResponsePattern, string> = {
    narrative: `In ${child}'s story, ${theme} often threads through Sun in ${sunSign} and a ${moonPhaseLabel.toLowerCase()} Moon in ${moonSign}.`,
    example: input.chart.daySky || !input.chart.risingSign
      ? `A small example: if ${child} hesitates at the door, that can be Moon pacing — not defiance.`
      : `A small example: if ${child} hesitates at the door, that can be Rising-or-Moon pacing — not defiance.`,
    reflection: `Holding ${theme} with you — nothing here is fate, only a softer way to notice ${child}.`,
    bullets: `A few quiet notices about ${theme}:\n• Sun in ${sunSign} — effort likes gentle witnessing\n• Moon in ${moonSign} — belonging steadies them\n• Keep changes small`,
    short: `${child}'s ${sunSign} Sun and ${moonSign} Moon suggest soft pacing around ${theme}.`,
    long: `When parents ask about ${theme}, I start with astronomy we actually have: Sun in ${sunSign}, Moon in ${moonSign}${
      input.chart.risingSign && !input.chart.daySky
        ? `, Rising in ${input.chart.risingSign}`
        : ""
    }. From there, traditional stories can colour the picture, and reflection stays optional.`,
    question_first: `When you think about ${theme}, what moment from this week comes first?`,
    observation_first: `One quiet observation: ${theme} often softens when ${child} feels unhurried.`,
  };

  let body = openers[input.pattern];
  if (input.rhythm === "reflect_first" && input.pattern !== "reflection") {
    body = `I hear you.\n\n${body}`;
  }
  if (input.rhythm === "invite_explore" && !body.includes("?")) {
    body = `${body}\n\nWould you like to explore how this shows up at home, or keep it with the chart for now?`;
  }
  if (kind === "action") {
    body = `${body}\n\nOne gentle idea: name the feeling, offer one choice, then pause.`;
  }
  if (input.chart.daySky) {
    body = `${body}\n\nRising isn’t available in Day Sky, so I’m staying with Sun and Moon.`;
  }
  return body;
}

export function scoreRepetition(bodies: string[]): {
  openingCollisionRate: number;
  endingCollisionRate: number;
  flaggedPairs: Array<{ i: number; j: number; reason: string }>;
} {
  const flagged: Array<{ i: number; j: number; reason: string }> = [];
  let openHits = 0;
  let endHits = 0;
  let pairs = 0;
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      pairs++;
      if (similar(firstSentence(bodies[i]!), firstSentence(bodies[j]!))) {
        openHits++;
        flagged.push({ i, j, reason: "opening" });
      }
      if (similar(lastSentence(bodies[i]!), lastSentence(bodies[j]!))) {
        endHits++;
        flagged.push({ i, j, reason: "ending" });
      }
    }
  }
  return {
    openingCollisionRate: pairs ? openHits / pairs : 0,
    endingCollisionRate: pairs ? endHits / pairs : 0,
    flaggedPairs: flagged.slice(0, 12),
  };
}
