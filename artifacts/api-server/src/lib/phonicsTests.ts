/**
 * Phonics Test engine — pure functions only.
 *
 * Generates Daily (5Q) and Weekly (20Q) phonics assessment question sets
 * from the existing `phonics_content` rows, scores submitted answers, and
 * builds insight messages. No DB access here — kept pure so it's trivially
 * testable with the Node built-in test runner.
 */

import crypto from "node:crypto";
import type { PhonicsContentRow } from "@workspace/db";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AgeGroup = "12_24m" | "2_3y" | "3_4y" | "4_5y" | "5_6y";
export const AGE_GROUP_LABEL: Record<AgeGroup, string> = {
  "12_24m": "12–24 months",
  "2_3y": "2–3 years",
  "3_4y": "3–4 years",
  "4_5y": "4–5 years",
  "5_6y": "5–6 years",
};

export type TestType = "daily" | "weekly";

export type QuestionType =
  | "animal_sound" // TTS animal sound → pick emoji
  | "letter_to_sound" // show letter glyph → pick spoken sound
  | "sound_to_letter" // TTS sound → pick letter glyph
  | "word_pic" // show emoji → pick word
  | "blending" // show "c-a-t" → pick the word
  | "listening"; // TTS full word → pick word

export interface QuestionOption {
  label: string;
  emoji?: string;
}

export interface QuestionPrompt {
  /** Headline shown above the question. */
  instruction: string;
  /** Glyph/word/letters to render large. */
  text?: string;
  /** Emoji to render large (for word_pic / animal_sound). */
  emoji?: string;
  /** If set, client should fetch TTS audio for this string and play it. */
  ttsText?: string;
}

export interface Question {
  /** Stable id within a session — `q1`, `q2`, … */
  id: string;
  /** FK → phonics_content.id — used to surface weak concepts. */
  conceptId: number;
  type: QuestionType;
  prompt: QuestionPrompt;
  options: QuestionOption[];
  /** Index into `options` of the correct answer. */
  correctIndex: number;
}

/** What the client receives — no `correctIndex`. */
export type ClientQuestion = Omit<Question, "correctIndex">;

export interface ScoreBreakdown {
  correct: number;
  total: number;
  accuracyPct: number;
  weakConceptIds: number[];
  perType: Record<string, { correct: number; total: number }>;
}

export interface RuleInsight {
  performanceLabel: "Beginner" | "Improving" | "Strong";
  insightText: string;
  insightSuggestion: string;
}

// ─── Deterministic PRNG (mulberry32) ─────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

// ─── Helpers to read the existing content rows ───────────────────────────────

/** Extract the bare phonetic sound from `sound` like "B says buh. B for Ball." */
function extractSound(row: PhonicsContentRow): string {
  const m = row.sound.match(/says\s+([a-zA-Z]+)/i);
  if (m && m[1]) return m[1].toLowerCase();
  // For 12_24m animal rows the sound IS the symbol (e.g. "Moo").
  return row.sound.replace(/\.+$/, "").trim();
}

/** Get the example word for a row, falling back to symbol when needed. */
function exampleWord(row: PhonicsContentRow): string {
  return (row.example ?? row.symbol).trim();
}

const VOWELS = new Set(["a", "e", "i", "o", "u"]);
function isCvc(word: string): boolean {
  const w = word.toLowerCase();
  if (w.length !== 3) return false;
  return (
    !VOWELS.has(w[0]!) &&
    VOWELS.has(w[1]!) &&
    !VOWELS.has(w[2]!) &&
    /^[a-z]+$/.test(w)
  );
}

function spellOut(word: string): string {
  return word.toLowerCase().split("").join("-");
}

// ─── Question type selection per age group ───────────────────────────────────

/** Allowed question types per age tier, in order of priority. */
const AGE_TYPES: Record<AgeGroup, QuestionType[]> = {
  "12_24m": ["animal_sound"],
  "2_3y": ["letter_to_sound", "sound_to_letter", "word_pic"],
  "3_4y": ["word_pic", "letter_to_sound", "sound_to_letter"],
  "4_5y": ["word_pic", "blending", "listening", "letter_to_sound"],
  "5_6y": ["blending", "listening", "word_pic"],
};

// ─── Question builders ───────────────────────────────────────────────────────

interface BuildContext {
  rng: () => number;
  /** Pool of letter rows for this age (or fallback to all rows). */
  letterRows: PhonicsContentRow[];
  /** Pool of word-bearing rows (any row with an example/emoji). */
  wordRows: PhonicsContentRow[];
  /** Pool of animal/sound rows for 12_24m. */
  soundRows: PhonicsContentRow[];
  /** Pool of CVC word rows. */
  cvcRows: PhonicsContentRow[];
}

function pickDistractors<T>(pool: T[], exclude: T, count: number, rng: () => number): T[] {
  const candidates = pool.filter((p) => p !== exclude);
  return shuffle(candidates, rng).slice(0, count);
}

function pickDistractorsBy<T, K>(
  pool: T[],
  excludeKey: K,
  keyFn: (item: T) => K,
  count: number,
  rng: () => number,
): T[] {
  const seen = new Set<K>([excludeKey]);
  const out: T[] = [];
  for (const cand of shuffle(pool, rng)) {
    const k = keyFn(cand);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(cand);
    if (out.length >= count) break;
  }
  return out;
}

function buildAnimalSoundQ(row: PhonicsContentRow, ctx: BuildContext, idx: number): Question | null {
  if (!row.emoji) return null;
  const distractors = pickDistractorsBy(
    ctx.soundRows.length ? ctx.soundRows : ctx.wordRows,
    row.emoji,
    (r) => r.emoji ?? "",
    3,
    ctx.rng,
  ).filter((r) => r.emoji);
  if (distractors.length < 3) return null;
  const options: QuestionOption[] = shuffle(
    [
      { label: row.symbol, emoji: row.emoji },
      ...distractors.map((d) => ({ label: d.symbol, emoji: d.emoji ?? "" })),
    ],
    ctx.rng,
  );
  const correctIndex = options.findIndex((o) => o.emoji === row.emoji);
  return {
    id: `q${idx + 1}`,
    conceptId: row.id,
    type: "animal_sound",
    prompt: {
      instruction: "Tap the animal making this sound",
      ttsText: row.sound,
    },
    options,
    correctIndex,
  };
}

function buildLetterToSoundQ(row: PhonicsContentRow, ctx: BuildContext, idx: number): Question | null {
  if (!ctx.letterRows.length) return null;
  const correctSound = extractSound(row);
  const distractors = pickDistractorsBy(
    ctx.letterRows,
    correctSound,
    (r) => extractSound(r),
    3,
    ctx.rng,
  );
  if (distractors.length < 3) return null;
  const options: QuestionOption[] = shuffle(
    [
      { label: correctSound },
      ...distractors.map((d) => ({ label: extractSound(d) })),
    ],
    ctx.rng,
  );
  const correctIndex = options.findIndex((o) => o.label === correctSound);
  return {
    id: `q${idx + 1}`,
    conceptId: row.id,
    type: "letter_to_sound",
    prompt: {
      instruction: "Which sound does this letter make?",
      text: row.symbol,
    },
    options,
    correctIndex,
  };
}

function buildSoundToLetterQ(row: PhonicsContentRow, ctx: BuildContext, idx: number): Question | null {
  if (!ctx.letterRows.length) return null;
  const correctLetter = row.symbol;
  const distractors = pickDistractorsBy(
    ctx.letterRows,
    correctLetter,
    (r) => r.symbol,
    3,
    ctx.rng,
  );
  if (distractors.length < 3) return null;
  const options: QuestionOption[] = shuffle(
    [
      { label: correctLetter },
      ...distractors.map((d) => ({ label: d.symbol })),
    ],
    ctx.rng,
  );
  const correctIndex = options.findIndex((o) => o.label === correctLetter);
  return {
    id: `q${idx + 1}`,
    conceptId: row.id,
    type: "sound_to_letter",
    prompt: {
      instruction: "Tap the letter that makes this sound",
      ttsText: extractSound(row),
    },
    options,
    correctIndex,
  };
}

function buildWordPicQ(row: PhonicsContentRow, ctx: BuildContext, idx: number): Question | null {
  if (!row.emoji) return null;
  const correct = exampleWord(row);
  const distractors = pickDistractorsBy(
    ctx.wordRows,
    correct.toLowerCase(),
    (r) => exampleWord(r).toLowerCase(),
    3,
    ctx.rng,
  );
  if (distractors.length < 3) return null;
  const options: QuestionOption[] = shuffle(
    [
      { label: correct },
      ...distractors.map((d) => ({ label: exampleWord(d) })),
    ],
    ctx.rng,
  );
  const correctIndex = options.findIndex(
    (o) => o.label.toLowerCase() === correct.toLowerCase(),
  );
  return {
    id: `q${idx + 1}`,
    conceptId: row.id,
    type: "word_pic",
    prompt: {
      instruction: "What is this?",
      emoji: row.emoji,
    },
    options,
    correctIndex,
  };
}

function buildBlendingQ(row: PhonicsContentRow, ctx: BuildContext, idx: number): Question | null {
  const word = exampleWord(row).toLowerCase();
  if (!isCvc(word)) return null;
  const cvcPool = ctx.cvcRows.length ? ctx.cvcRows : ctx.wordRows;
  const distractors = pickDistractorsBy(
    cvcPool,
    word,
    (r) => exampleWord(r).toLowerCase(),
    3,
    ctx.rng,
  ).filter((d) => isCvc(exampleWord(d)));
  if (distractors.length < 3) return null;
  const options: QuestionOption[] = shuffle(
    [
      { label: word },
      ...distractors.map((d) => ({ label: exampleWord(d).toLowerCase() })),
    ],
    ctx.rng,
  );
  const correctIndex = options.findIndex((o) => o.label === word);
  return {
    id: `q${idx + 1}`,
    conceptId: row.id,
    type: "blending",
    prompt: {
      instruction: "Blend the sounds — which word is it?",
      text: spellOut(word),
      ttsText: spellOut(word).replace(/-/g, "... "),
    },
    options,
    correctIndex,
  };
}

function buildListeningQ(row: PhonicsContentRow, ctx: BuildContext, idx: number): Question | null {
  const correct = exampleWord(row);
  const distractors = pickDistractorsBy(
    ctx.wordRows,
    correct.toLowerCase(),
    (r) => exampleWord(r).toLowerCase(),
    3,
    ctx.rng,
  );
  if (distractors.length < 3) return null;
  const options: QuestionOption[] = shuffle(
    [
      { label: correct },
      ...distractors.map((d) => ({ label: exampleWord(d) })),
    ],
    ctx.rng,
  );
  const correctIndex = options.findIndex(
    (o) => o.label.toLowerCase() === correct.toLowerCase(),
  );
  return {
    id: `q${idx + 1}`,
    conceptId: row.id,
    type: "listening",
    prompt: {
      instruction: "Listen and pick the word",
      ttsText: correct,
    },
    options,
    correctIndex,
  };
}

const BUILDERS: Record<
  QuestionType,
  (row: PhonicsContentRow, ctx: BuildContext, idx: number) => Question | null
> = {
  animal_sound: buildAnimalSoundQ,
  letter_to_sound: buildLetterToSoundQ,
  sound_to_letter: buildSoundToLetterQ,
  word_pic: buildWordPicQ,
  blending: buildBlendingQ,
  listening: buildListeningQ,
};

// ─── Public: generate questions ──────────────────────────────────────────────

export interface GenerateOptions {
  ageGroup: AgeGroup;
  /** Active phonics_content rows for this age tier. */
  contentRows: PhonicsContentRow[];
  /** How many questions to generate (5 daily, 20 weekly). */
  count: number;
  /** phonics_content.id values asked in the most recent test (avoid repeats). */
  recentItemIds?: number[];
  /** Deterministic seed (e.g. `Date.now()` at test start). */
  seed: number;
}

export function generateQuestions(opts: GenerateOptions): Question[] {
  const { ageGroup, contentRows, count, recentItemIds = [], seed } = opts;
  const rng = mulberry32(seed || 1);

  const recent = new Set(recentItemIds);
  const active = contentRows.filter((r) => r.active !== false);
  const fresh = active.filter((r) => !recent.has(r.id));
  // Fall back to all active rows if recency would starve us.
  const pool = fresh.length >= count ? fresh : active;

  const ctx: BuildContext = {
    rng,
    letterRows: active.filter((r) => r.type === "letter"),
    wordRows: active.filter((r) => Boolean(r.example || r.emoji)),
    soundRows: active.filter((r) => r.type === "sound"),
    cvcRows: active.filter((r) => isCvc(exampleWord(r))),
  };

  const allowedTypes = AGE_TYPES[ageGroup];
  const ordered = shuffle(pool, rng);

  const out: Question[] = [];
  let typeCursor = 0;
  for (const row of ordered) {
    if (out.length >= count) break;
    // Try each allowed type starting at the cursor — first builder that
    // returns a question wins. This guarantees a balanced type mix.
    let built: Question | null = null;
    for (let i = 0; i < allowedTypes.length; i++) {
      const t = allowedTypes[(typeCursor + i) % allowedTypes.length]!;
      built = BUILDERS[t](row, ctx, out.length);
      if (built) break;
    }
    if (built) {
      out.push(built);
      typeCursor++;
    }
  }
  return out;
}

// ─── Public: scoring ─────────────────────────────────────────────────────────

export function scoreAnswers(
  questions: Question[],
  answers: Array<{ questionId: string; selectedIndex: number }>,
): ScoreBreakdown {
  const byId = new Map(answers.map((a) => [a.questionId, a.selectedIndex]));
  const perType: Record<string, { correct: number; total: number }> = {};
  const weak = new Set<number>();
  let correct = 0;
  for (const q of questions) {
    const sel = byId.get(q.id);
    const isCorrect = typeof sel === "number" && sel === q.correctIndex;
    if (isCorrect) correct++;
    else weak.add(q.conceptId);
    const bucket = perType[q.type] ?? { correct: 0, total: 0 };
    bucket.total++;
    if (isCorrect) bucket.correct++;
    perType[q.type] = bucket;
  }
  const total = questions.length;
  const accuracyPct = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { correct, total, accuracyPct, weakConceptIds: Array.from(weak), perType };
}

// ─── Public: insights ────────────────────────────────────────────────────────

export function buildRuleBasedInsight(
  score: ScoreBreakdown,
  weakRows: PhonicsContentRow[],
  childName: string,
): RuleInsight {
  const symbols = weakRows.slice(0, 3).map((r) => r.symbol).join(", ");
  let label: RuleInsight["performanceLabel"];
  let text: string;
  let suggestion: string;
  if (score.accuracyPct < 50) {
    label = "Beginner";
    text = symbols
      ? `${childName} is just getting started — focus on these sounds first: ${symbols}.`
      : `${childName} is just getting started. Practise the same 2–3 sounds for a week.`;
    suggestion = "Repeat each sound 3–4 times slowly with a hand action.";
  } else if (score.accuracyPct < 80) {
    label = "Improving";
    text = symbols
      ? `Nice progress! ${childName} can level up by polishing: ${symbols}.`
      : `Nice progress! Keep practising daily.`;
    suggestion = "Try the matching items on the Phonics page for these sounds.";
  } else {
    label = "Strong";
    text = `Amazing work! ${childName} is ready for the next level.`;
    suggestion = symbols
      ? `For extra challenge, revisit: ${symbols}.`
      : `Try a Weekly Test to keep the streak going.`;
  }
  return { performanceLabel: label, insightText: text, insightSuggestion: suggestion };
}

// ─── Public: stateless session encryption (AES-256-GCM AEAD) ─────────────────
//
// Why encryption (not just HMAC): the session payload carries the correct
// answer index for each question. An HMAC-signed-but-readable token would let
// any client base64-decode it and trivially score 100%. We therefore wrap the
// payload in AES-256-GCM (authenticated encryption) so:
//   * confidentiality — clients cannot read correctIndex / conceptId,
//   * integrity      — any tampering fails the GCM auth tag check.
// The token also carries `userId` (so a token issued for user A cannot be
// submitted as user B) and a random `jti` (so a single token can only be
// consumed once — see /tests/submit replay check).

interface SessionPayload {
  /** Authenticated user the session was issued to. */
  userId: string;
  childId: number;
  testType: TestType;
  ageGroup: AgeGroup;
  questions: Question[];
  issuedAt: number;
  /** Random one-time-use id (UUID). Caller may supply for testing. */
  jti?: string;
}

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 min

/** Derive a 32-byte AES-256 key from the secret via HKDF-SHA256. */
function deriveKey(secret: string): Buffer {
  return Buffer.from(
    crypto.hkdfSync(
      "sha256",
      Buffer.from(secret, "utf8"),
      Buffer.from("phonics-tests-v1-salt", "utf8"),
      Buffer.from("phonics-tests-v1-aead-key", "utf8"),
      32,
    ),
  );
}

/** Validate the secret is strong enough for AES-256. Throws on weak secrets. */
export function assertSessionSecret(secret: string | undefined): asserts secret is string {
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set and at least 32 characters for phonics test encryption",
    );
  }
}

export function signSession(payload: SessionPayload, secret: string): string {
  assertSessionSecret(secret);
  const jti = payload.jti ?? crypto.randomUUID();
  const plaintext = Buffer.from(
    JSON.stringify({
      u: payload.userId,
      c: payload.childId,
      t: payload.testType,
      a: payload.ageGroup,
      q: payload.questions.map((q) => ({
        id: q.id,
        cid: q.conceptId,
        ty: q.type,
        ci: q.correctIndex,
      })),
      iat: payload.issuedAt,
      j: jti,
    }),
    "utf8",
  );
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Token format: v1.<iv>.<ciphertext>.<tag> — version prefix lets us rotate
  // the scheme without breaking outstanding tokens.
  return [
    "v1",
    iv.toString("base64url"),
    ct.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
}

export interface VerifiedSession {
  /** User the token was issued to. Bind submit handler to this. */
  userId: string;
  childId: number;
  testType: TestType;
  ageGroup: AgeGroup;
  /** Reduced — enough to score answers and surface concept ids. */
  questions: Array<{
    id: string;
    conceptId: number;
    type: QuestionType;
    correctIndex: number;
  }>;
  issuedAt: number;
  /** One-time-use id — submit handler MUST reject a previously-seen jti. */
  jti: string;
}

export function verifySession(token: string, secret: string, now = Date.now()): VerifiedSession | null {
  if (!secret || secret.length < 32) return null;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  const [, ivB64, ctB64, tagB64] = parts as [string, string, string, string];
  let iv: Buffer, ct: Buffer, tag: Buffer;
  try {
    iv = Buffer.from(ivB64, "base64url");
    ct = Buffer.from(ctB64, "base64url");
    tag = Buffer.from(tagB64, "base64url");
  } catch {
    return null;
  }
  if (iv.length !== 12 || tag.length !== 16) return null;
  const key = deriveKey(secret);
  let plaintext: Buffer;
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
  } catch {
    // Tampered ciphertext, wrong key, or wrong scheme → reject.
    return null;
  }
  let parsed: any;
  try {
    parsed = JSON.parse(plaintext.toString("utf8"));
  } catch {
    return null;
  }
  if (typeof parsed?.iat !== "number" || now - parsed.iat > SESSION_TTL_MS) return null;
  if (typeof parsed?.u !== "string" || !parsed.u) return null;
  if (typeof parsed?.j !== "string" || !parsed.j) return null;
  if (!Array.isArray(parsed.q)) return null;
  return {
    userId: String(parsed.u),
    childId: Number(parsed.c),
    testType: parsed.t,
    ageGroup: parsed.a,
    questions: parsed.q.map((q: any) => ({
      id: String(q.id),
      conceptId: Number(q.cid),
      type: q.ty,
      correctIndex: Number(q.ci),
    })),
    issuedAt: parsed.iat,
    jti: String(parsed.j),
  };
}

/** Strip correct answers before sending to the client. */
export function toClientQuestions(qs: Question[]): ClientQuestion[] {
  return qs.map(({ correctIndex: _drop, ...rest }) => rest);
}

// ─── AI insight (weekly tests only) ──────────────────────────────────────────

export interface AiInsightInput {
  childName: string;
  ageGroupLabel: string;
  accuracyPct: number;
  weakSymbols: string[];
  perType: Record<string, { correct: number; total: number }>;
}

export interface AiInsightResult {
  message: string;
  suggestion: string;
}

/**
 * Builds a 1–2 sentence parent-facing insight using the OpenAI integration.
 * Caller is responsible for `try/catch` and falling back to the rule-based
 * insight on failure.
 */
export async function buildAiInsight(
  input: AiInsightInput,
  // Injected to keep this module pure-ish and test-friendly.
  openai: {
    chat: {
      completions: {
        create: (args: any) => Promise<any>;
      };
    };
  },
): Promise<AiInsightResult> {
  const weakList = input.weakSymbols.slice(0, 5).join(", ") || "none";
  const typeSummary = Object.entries(input.perType)
    .map(([t, v]) => `${t}: ${v.correct}/${v.total}`)
    .join(", ");
  const sys =
    "You are a friendly early-childhood reading coach. Reply with strict JSON: " +
    '{"message": string, "suggestion": string}. Each value <= 25 words. ' +
    "Be warm, specific, and avoid jargon.";
  const user =
    `Child: ${input.childName} (${input.ageGroupLabel}). ` +
    `Weekly phonics test result: ${input.accuracyPct}% accuracy. ` +
    `Weak sounds/words: ${weakList}. ` +
    `Per-type score: ${typeSummary}. ` +
    `Write a JSON message + actionable suggestion for the parent.`;
  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_tokens: 160,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
  });
  const raw = resp?.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);
  return {
    message: String(parsed.message ?? "").slice(0, 240),
    suggestion: String(parsed.suggestion ?? "").slice(0, 240),
  };
}

// ─── Daily/weekly availability ───────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export function isAvailable(
  testType: TestType,
  lastCompletedAt: Date | null,
  now = new Date(),
): { available: boolean; nextAvailableAt: Date | null } {
  if (!lastCompletedAt) return { available: true, nextAvailableAt: null };
  const cooldownMs = testType === "daily" ? DAY_MS : WEEK_MS;
  const next = new Date(lastCompletedAt.getTime() + cooldownMs);
  if (now.getTime() >= next.getTime()) {
    return { available: true, nextAvailableAt: null };
  }
  return { available: false, nextAvailableAt: next };
}
