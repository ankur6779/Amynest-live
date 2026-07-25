/**
 * Client-side Amy reply memory — greetings, openings, suggestions, planets.
 * Rewrites repetitive openings before display (no backend change).
 */

const KEY = "amynest:amy-astro:reply-memory:v1:";

export type ReplyMemory = {
  lastOpenings: string[];
  lastGreetings: string[];
  suggestionIndex: number;
  lastPlanets: string[];
};

const EMPTY: ReplyMemory = {
  lastOpenings: [],
  lastGreetings: [],
  suggestionIndex: 0,
  lastPlanets: [],
};

/** In-memory fallback when localStorage is unavailable (tests / private mode). */
const memoryStore = new Map<string, ReplyMemory>();

const ALT_OPENINGS = [
  "Sitting with what their chart softly shows,",
  "A quieter noticing from their birth sky:",
  "Holding their lights gently,",
  "From what their Sun and Moon already suggest,",
  "With their sky in mind,",
];

function read(profileId: string): ReplyMemory {
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

function write(profileId: string, next: ReplyMemory): ReplyMemory {
  memoryStore.set(profileId, next);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(KEY + profileId, JSON.stringify(next));
    }
  } catch {
    /* memory store is enough */
  }
  return next;
}

/** Test helper */
export function __resetReplyMemoryForTests(): void {
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

function firstSentence(body: string): string {
  return body.trim().split(/(?<=[.!?])\s+/)[0]?.slice(0, 140) ?? "";
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 64);
}

function isSimilar(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb || na.startsWith(nb) || nb.startsWith(na)) return true;
  // Same lead phrase (first 4 words) counts as a repeat opening.
  const lead = (s: string) => s.split(" ").slice(0, 4).join(" ");
  const la = lead(na);
  const lb = lead(nb);
  return la === lb && la.length >= 10;
}

export function loadReplyMemory(profileId: string): ReplyMemory {
  return read(profileId);
}

export function rememberReplyOpening(profileId: string, body: string): ReplyMemory {
  const prev = read(profileId);
  const opening = firstSentence(body);
  if (!opening) return prev;
  const lastOpenings = [opening, ...prev.lastOpenings.filter((o) => !isSimilar(o, opening))].slice(
    0,
    3,
  );
  return write(profileId, { ...prev, lastOpenings });
}

export function rememberGreeting(profileId: string, greeting: string): ReplyMemory {
  const prev = read(profileId);
  const lastGreetings = [
    greeting,
    ...prev.lastGreetings.filter((g) => g !== greeting),
  ].slice(0, 4);
  return write(profileId, { ...prev, lastGreetings });
}

export function rememberPlanetsDiscussed(
  profileId: string,
  planets: string[],
): ReplyMemory {
  const prev = read(profileId);
  const lastPlanets = [...planets, ...prev.lastPlanets]
    .filter((p, i, arr) => arr.indexOf(p) === i)
    .slice(0, 6);
  return write(profileId, { ...prev, lastPlanets });
}

/**
 * Lightweight opening polish (kept for unit tests).
 * Production display path uses conversation-intelligence.runQualityPass.
 */
export function polishDisplayedReply(profileId: string, body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return body;
  const prev = read(profileId);
  const opening = firstSentence(trimmed);
  const repeated = prev.lastOpenings.some((o) => isSimilar(o, opening));

  let nextBody = trimmed;
  if (repeated) {
    const rest = trimmed.slice(opening.length).replace(/^\s*/, "");
    const alt = ALT_OPENINGS[prev.lastOpenings.length % ALT_OPENINGS.length]!;
    nextBody = rest ? `${alt} ${rest}` : `${alt} ${opening}`;
  }

  rememberReplyOpening(profileId, nextBody);
  return nextBody;
}

export function nextSuggestionBatch(
  profileId: string,
  pool: readonly string[],
): string[] {
  const prev = read(profileId);
  const start = prev.suggestionIndex % pool.length;
  const batch = [0, 1, 2, 3].map((i) => pool[(start + i) % pool.length]!);
  write(profileId, {
    ...prev,
    suggestionIndex: prev.suggestionIndex + 1,
  });
  return batch;
}

export function dayPartLabel(hour = new Date().getHours()): string {
  if (hour < 5) return "night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

/** Heuristic length hint for UI typing state (display only). */
export function responseLengthHint(question: string, hasRising: boolean): "short" | "medium" | "long" {
  const q = question.trim();
  if (/^(hi|hello|thanks|ok)\b/i.test(q) || q.length < 18) return "short";
  if (q.length > 160 || /explain|deep|detail|chapter|everything/i.test(q)) return "long";
  if (!hasRising && q.length < 28) return "short";
  return "medium";
}
