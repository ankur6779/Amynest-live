import { randomUUID } from "crypto";
import { eq, and, desc } from "drizzle-orm";
import {
  db,
  aiCacheTable,
  userCoachSessionsTable,
  coachWinGenerationsTable,
} from "@workspace/db";
import { logger } from "../lib/logger.js";
import { startCoachPerfSpan, withCoachPerf } from "../lib/coach-performance.js";

export const COACH_TOTAL_WINS = 12;
export const COACH_INITIAL_WINS = 2;
export const COACH_REMAINING_WINS = 10;
export const COACH_SOURCE = "amy_coach";
const NAMESPACE = "ai_coach_v4";
const DB_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Hard cap on initial OpenAI call — response must not wait longer. */
export const INITIAL_AI_TIMEOUT_MS = 4000;

function aiCallTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("initial_ai_timeout")), ms);
  });
}

/** Fast static 2-win plan when AI times out or fails (avoids loading full 12-win fallback). */
export function staticInitialWinsFallback(goalLabel: string, input: CoachInput): CoachPlan {
  const age = input.ageGroup ?? "5-7";
  return {
    title: `${goalLabel} — start here`,
    root_cause:
      `Children in the ${age} age range are still building self-regulation. ` +
      `Stress around ${goalLabel.toLowerCase()} often reflects an unmet need or skill gap, not defiance.`,
    summary:
      "Two starter wins below; the rest of your 12-win plan will appear in a moment.",
    wins: [
      {
        win: 1,
        title: "Pause and name what you see",
        objective: "Lower escalation before you coach",
        deep_explanation:
          "A brief pause helps your child feel seen. Naming the feeling (e.g. you look frustrated) " +
          "activates co-regulation pathways described in Gottman's emotion coaching research.",
        actions: [
          "Stop talking for 3 breaths",
          "Say one feeling word you notice",
          "Ask one short question: what do you need?",
        ],
        example:
          "Parent: 'You look really upset about shoes.' Child nods. Parent waits. Child says 'They're too tight.'",
        mistake_to_avoid: "Explaining or lecturing before the child feels heard.",
        micro_task: "Use one feeling word at the next hard moment today.",
        duration: "3–5 days",
        science_reference: "Gottman emotion coaching",
      },
      {
        win: 2,
        title: "Pick one tiny next step",
        objective: "Make progress without a full lecture",
        deep_explanation:
          "Small, repeatable steps build habit loops (BJ Fogg, Tiny Habits). " +
          "One clear action beats a long list when everyone is already stressed.",
        actions: [
          "Choose one behaviour to practice (not three)",
          "Write it on a sticky note where you'll see it",
          "Celebrate any attempt, even partial",
        ],
        example:
          "Instead of a 10-minute talk about bedtime, parent says: 'Tonight we try pajamas before the story.'",
        mistake_to_avoid: "Changing the whole routine at once.",
        micro_task: "Post one sticky-note reminder tonight.",
        duration: "5–7 days",
        science_reference: "BJ Fogg — Tiny Habits",
      },
    ],
  };
}

export interface CoachWin {
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

export interface CoachPlan {
  title: string;
  root_cause: string;
  summary: string;
  wins: CoachWin[];
}

export interface CoachInput {
  goal?: string;
  ageGroup?: string;
  severity?: string;
  triggers?: string[];
  routine?: string;
  topicAnswers?: Record<string, string | string[]>;
}

export type CoachGenerationStatus = "partial" | "complete";

const inFlightBackground = new Set<string>();

const isStr = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

export function validateWin(w: unknown): w is CoachWin {
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

export function validatePartialPlan(p: unknown): p is CoachPlan {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  if (!isStr(o.title) || !isStr(o.root_cause) || !isStr(o.summary)) return false;
  if (!Array.isArray(o.wins) || o.wins.length !== COACH_INITIAL_WINS) return false;
  if (!o.wins.every(validateWin)) return false;
  return o.wins.every((w, i) => (w as CoachWin).win === i + 1);
}

export function validatePlan(p: unknown): p is CoachPlan {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  if (!isStr(o.title) || !isStr(o.root_cause) || !isStr(o.summary)) return false;
  if (!Array.isArray(o.wins) || o.wins.length !== COACH_TOTAL_WINS) return false;
  if (!o.wins.every(validateWin)) return false;
  return o.wins.every((w, i) => (w as CoachWin).win === i + 1);
}

function validateRemainingWins(wins: unknown, startWin: number): wins is CoachWin[] {
  if (!Array.isArray(wins) || wins.length !== COACH_REMAINING_WINS) return false;
  if (!wins.every(validateWin)) return false;
  return wins.every((w, i) => w.win === startWin + i);
}

export function mergeCoachPlan(
  meta: Pick<CoachPlan, "title" | "root_cause" | "summary">,
  initialWins: CoachWin[],
  remainingWins: CoachWin[],
): CoachPlan {
  return {
    ...meta,
    wins: [...initialWins, ...remainingWins].map((w, i) => ({ ...w, win: i + 1 })),
  };
}

async function loadFallbackPlan(input: CoachInput): Promise<CoachPlan> {
  const mod = await import("../routes/ai-coach.js");
  return mod.fallbackPlan(input);
}

export async function upsertCoachGeneration(params: {
  generationId: string;
  sessionId: string;
  userId: string;
  cacheKey: string;
  input: CoachInput;
  plan: CoachPlan;
  status: CoachGenerationStatus;
  errorMessage?: string;
}): Promise<void> {
  const dbStep = params.status === "complete" ? "DB_WRITE_COMPLETE" : "DB_WRITE_PARTIAL";
  try {
    await withCoachPerf(dbStep, { generationId: params.generationId, userId: params.userId }, async () =>
      db.insert(coachWinGenerationsTable)
      .values({
        generationId: params.generationId,
        sessionId: params.sessionId,
        userId: params.userId,
        cacheKey: params.cacheKey,
        input: params.input as unknown as Record<string, unknown>,
        planJson: params.plan as unknown as Record<string, unknown>,
        wins: params.plan.wins as unknown as Record<string, unknown>[],
        status: params.status,
        source: COACH_SOURCE,
        errorMessage: params.errorMessage ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: coachWinGenerationsTable.generationId,
        set: {
          planJson: params.plan as unknown as Record<string, unknown>,
          wins: params.plan.wins as unknown as Record<string, unknown>[],
          status: params.status,
          errorMessage: params.errorMessage ?? null,
          updatedAt: new Date(),
        },
      }),
    );
  } catch (err) {
    logger.warn({ err, generationId: params.generationId }, "coach win generation DB upsert failed");
  }
}

async function maybeHydrateFromCache(
  row: { cacheKey: string; status: string; planJson: unknown; generationId: string; sessionId: string },
): Promise<{
  generationId: string;
  sessionId: string;
  status: CoachGenerationStatus;
  plan: CoachPlan;
} | null> {
  const plan = row.planJson as CoachPlan;
  if (row.status === "complete" || plan.wins.length >= COACH_TOTAL_WINS) {
    return {
      generationId: row.generationId,
      sessionId: row.sessionId,
      status: "complete",
      plan,
    };
  }
  const cached = await dbGetCoachCache(row.cacheKey);
  if (cached && validatePlan(cached)) {
    return {
      generationId: row.generationId,
      sessionId: row.sessionId,
      status: "complete",
      plan: cached,
    };
  }
  return {
    generationId: row.generationId,
    sessionId: row.sessionId,
    status: "partial",
    plan,
  };
}

export async function getCoachGenerationBySession(
  userId: string,
  sessionId: string,
): Promise<{
  generationId: string;
  sessionId: string;
  status: CoachGenerationStatus;
  plan: CoachPlan;
} | null> {
  try {
    const [row] = await db
      .select()
      .from(coachWinGenerationsTable)
      .where(
        and(
          eq(coachWinGenerationsTable.userId, userId),
          eq(coachWinGenerationsTable.sessionId, sessionId),
        ),
      )
      .orderBy(desc(coachWinGenerationsTable.updatedAt))
      .limit(1);
    if (!row) return null;
    return maybeHydrateFromCache(row);
  } catch (err) {
    logger.warn({ err, userId, sessionId }, "coach win generation fetch failed");
    return null;
  }
}

export async function getCoachGenerationById(
  userId: string,
  generationId: string,
): Promise<{
  generationId: string;
  sessionId: string;
  status: CoachGenerationStatus;
  plan: CoachPlan;
} | null> {
  try {
    const [row] = await db
      .select()
      .from(coachWinGenerationsTable)
      .where(
        and(
          eq(coachWinGenerationsTable.userId, userId),
          eq(coachWinGenerationsTable.generationId, generationId),
        ),
      )
      .limit(1);
    if (!row) return null;
    return maybeHydrateFromCache(row);
  } catch (err) {
    logger.warn({ err, userId, generationId }, "coach win generation fetch by id failed");
    return null;
  }
}

async function dbSetCoachCache(cacheKey: string, input: CoachInput, plan: CoachPlan): Promise<void> {
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

async function updateCoachSessionPlan(
  userId: string,
  sessionId: string,
  plan: CoachPlan,
): Promise<void> {
  try {
    await db
      .update(userCoachSessionsTable)
      .set({ planJson: plan as unknown as Record<string, unknown> })
      .where(
        and(
          eq(userCoachSessionsTable.userId, userId),
          eq(userCoachSessionsTable.sessionId, sessionId),
        ),
      );
  } catch (err) {
    logger.warn({ err, sessionId }, "ai-coach session plan update failed (non-fatal)");
  }
}

function buildPromptContext(
  input: CoachInput,
  goalLabel: string,
  goalBrief: string,
  renderTopicAnswersBlock: (ta?: Record<string, string | string[]>) => string,
): { triggers: string; topicBlock: string; ageBrief: string } {
  const triggers = (input.triggers ?? []).join(", ") || "not specified";
  const topicBlock = renderTopicAnswersBlock(input.topicAnswers);
  const ageBrief =
    input.ageGroup === "10+"
      ? `TWEEN/TEEN (10+ yrs): collaborative problem-solving, validate before guiding.`
      : input.ageGroup === "8-10"
        ? `MIDDLE CHILDHOOD (8–10 yrs): build competence and emotion-naming.`
        : input.ageGroup === "5-7"
          ? `EARLY SCHOOL AGE (5–7 yrs): visual schedules, short emotion-coaching scripts.`
          : `EARLY CHILDHOOD (2–4 yrs): co-regulation and choice within limits.`;
  void goalBrief;
  return { triggers, topicBlock, ageBrief };
}

async function callInitialCoachAi(
  input: CoachInput,
  goalLabel: string,
  renderTopicAnswersBlock: (ta?: Record<string, string | string[]>) => string,
): Promise<CoachPlan | null> {
  const { triggers, topicBlock } = buildPromptContext(
    input,
    goalLabel,
    "",
    renderTopicAnswersBlock,
  );

  const systemPrompt =
    "Parenting coach. Generate exactly 2 simple, actionable wins. Keep output short. No explanation. Valid JSON only.";

  const userPrompt = `Generate exactly 2 simple, actionable wins. Keep output short. No explanation.

Goal: ${goalLabel}
Age: ${input.ageGroup}
Severity: ${input.severity}
Triggers: ${triggers}
Routine: ${input.routine}
${topicBlock}
JSON only:
{"title":"...","root_cause":"2 sentences","summary":"1 sentence","wins":[{"win":1,"title":"...","objective":"...","deep_explanation":"2-3 lines","actions":["a","b","c"],"example":"1 sentence","mistake_to_avoid":"...","micro_task":"...","duration":"...","science_reference":"..."},{"win":2,...}]}`;

  const { openai } = await import("@workspace/integrations-openai-ai-server");
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 900,
    temperature: 0.6,
  });
  const rawContent = completion.choices[0]?.message?.content?.trim() ?? "";
  const parsed = JSON.parse(rawContent);
  if (validatePartialPlan(parsed)) return parsed;
  return null;
}

export async function generateInitialCoachWins(
  input: CoachInput,
  goalLabel: string,
  _goalBrief: string,
  renderTopicAnswersBlock: (ta?: Record<string, string | string[]>) => string,
): Promise<{ plan: CoachPlan; aiOk: boolean }> {
  const aiSpan = startCoachPerfSpan("AI_CALL_INITIAL", { goal: input.goal });
  try {
    const plan = await Promise.race([
      callInitialCoachAi(input, goalLabel, renderTopicAnswersBlock),
      aiCallTimeout(INITIAL_AI_TIMEOUT_MS),
    ]);
    if (plan) {
      aiSpan.end({ aiOk: true, wins: COACH_INITIAL_WINS });
      return { plan, aiOk: true };
    }
    aiSpan.end({ aiOk: false, reason: "validation_failed" });
  } catch (err) {
    const timedOut = err instanceof Error && err.message === "initial_ai_timeout";
    aiSpan.end({ aiOk: false, error: true, timedOut });
    if (!timedOut) logger.error({ err }, "ai-coach initial wins OpenAI error");
  }

  return { plan: staticInitialWinsFallback(goalLabel, input), aiOk: false };
}

export async function generateRemainingWinsWithAi(
  input: CoachInput,
  goalLabel: string,
  goalBrief: string,
  meta: Pick<CoachPlan, "title" | "root_cause" | "summary">,
  existingWins: CoachWin[],
  renderTopicAnswersBlock: (ta?: Record<string, string | string[]>) => string,
): Promise<{ wins: CoachWin[]; aiOk: boolean }> {
  const startWin = COACH_INITIAL_WINS + 1;
  const { triggers, topicBlock } = buildPromptContext(
    input,
    goalLabel,
    goalBrief,
    renderTopicAnswersBlock,
  );
  const existingSummary = existingWins
    .map((w) => `#${w.win} "${w.title}" — ${w.objective}`)
    .join("\n");

  const systemPrompt = `You are a specialist child psychologist and parenting coach.
Generate 10 more personalized wins that continue an existing 12-win plan.
Do NOT repeat or rephrase the first 2 wins already written.
Return valid JSON only.`;

  const userPrompt = `Parenting goal: ${goalLabel}
Child age: ${input.ageGroup} years
Severity: ${input.severity}
Triggers: ${triggers}
Routine: ${input.routine}
${topicBlock}
Plan title: ${meta.title}
Root cause (already written): ${meta.root_cause}

Already written — DO NOT repeat these wins:
${existingSummary}

Generate 10 MORE wins numbered ${startWin} through ${COACH_TOTAL_WINS}.
Progression: expectations & autonomy → regulation & skills → repair & track → consistency → identity.

Return ONLY:
{
  "wins": [
    { "win": ${startWin}, "title": "...", "objective": "...", "deep_explanation": "5-6 lines", "actions": ["..."], "example": "...", "mistake_to_avoid": "...", "micro_task": "...", "duration": "...", "science_reference": "..." }
  ]
}

STRICT:
- EXACTLY 10 wins, numbered ${startWin} to ${COACH_TOTAL_WINS}
- No overlap with the first 2 wins above
- 3-5 actions each; substantive deep_explanation; real science_reference on every win
${goalBrief}`;

  const aiSpan = startCoachPerfSpan("AI_CALL_BACKGROUND", { goal: input.goal });
  try {
    const { openai } = await import("@workspace/integrations-openai-ai-server");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 6500,
    });
    const rawContent = completion.choices[0]?.message?.content?.trim() ?? "";
    try {
      const parsed = JSON.parse(rawContent) as { wins?: unknown };
      if (validateRemainingWins(parsed.wins, startWin)) {
        aiSpan.end({ aiOk: true, wins: COACH_REMAINING_WINS });
        return { wins: parsed.wins, aiOk: true };
      }
    } catch {
      /* fall through */
    }
    aiSpan.end({ aiOk: false, reason: "validation_failed" });
  } catch (err) {
    aiSpan.end({ aiOk: false, error: true });
    logger.error({ err }, "ai-coach background wins OpenAI error");
  }

  const full = await loadFallbackPlan(input);
  return { wins: full.wins.slice(COACH_INITIAL_WINS), aiOk: false };
}

export interface BackgroundCoachJob {
  generationId: string;
  sessionId: string;
  userId: string;
  cacheKey: string;
  input: CoachInput;
  partialPlan: CoachPlan;
  goalLabel: string;
  goalBrief: string;
  renderTopicAnswersBlock: (ta?: Record<string, string | string[]>) => string;
  onComplete?: (plan: CoachPlan) => void;
  memCacheSet?: (plan: CoachPlan) => void;
}

/**
 * Fire-and-forget background completion. Does not use per-user queue.
 */
export function generateRemainingCoachWins(job: BackgroundCoachJob): void {
  const { generationId } = job;
  if (inFlightBackground.has(generationId)) return;
  inFlightBackground.add(generationId);

  setImmediate(() => {
    void (async () => {
      const bgSpan = startCoachPerfSpan("BACKGROUND_TOTAL", {
        generationId: job.generationId,
        userId: job.userId,
      });
      try {
        const { wins: remaining, aiOk } = await generateRemainingWinsWithAi(
          job.input,
          job.goalLabel,
          job.goalBrief,
          job.partialPlan,
          job.partialPlan.wins,
          job.renderTopicAnswersBlock,
        );

        const fullPlan = mergeCoachPlan(job.partialPlan, job.partialPlan.wins, remaining);
        if (!validatePlan(fullPlan)) {
          logger.warn({ generationId }, "ai-coach background merge validation failed — using fallback slice");
          const fallback = await loadFallbackPlan(job.input);
          Object.assign(fullPlan, fallback);
        }

        if (aiOk) await dbSetCoachCache(job.cacheKey, job.input, fullPlan);
        job.memCacheSet?.(fullPlan);
        job.onComplete?.(fullPlan);

        await upsertCoachGeneration({
          generationId: job.generationId,
          sessionId: job.sessionId,
          userId: job.userId,
          cacheKey: job.cacheKey,
          input: job.input,
          plan: fullPlan,
          status: "complete",
        });
        await updateCoachSessionPlan(job.userId, job.sessionId, fullPlan);

        bgSpan.end({ status: "complete", wins: fullPlan.wins.length, aiOk });
        logger.info(
          { generationId, sessionId: job.sessionId, wins: fullPlan.wins.length },
          "ai-coach background wins complete",
        );
      } catch (err) {
        bgSpan.end({ status: "error" });
        logger.error({ err, generationId: job.generationId }, "ai-coach background generation failed");
        await upsertCoachGeneration({
          generationId: job.generationId,
          sessionId: job.sessionId,
          userId: job.userId,
          cacheKey: job.cacheKey,
          input: job.input,
          plan: job.partialPlan,
          status: "partial",
          errorMessage: err instanceof Error ? err.message : "background_failed",
        });
      } finally {
        inFlightBackground.delete(generationId);
      }
    })();
  });
}

export function newCoachGenerationIds(): { sessionId: string; generationId: string } {
  return { sessionId: randomUUID(), generationId: randomUUID() };
}

export async function dbGetCoachCache(cacheKey: string): Promise<CoachPlan | null> {
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
