import { Router, type IRouter } from "express";
import { getAuth } from "../lib/auth";
import { and, desc, eq } from "drizzle-orm";
import { db, userAiMessagesTable } from "@workspace/db";
import { GetRecipeBody, GetRecipeResponse, AskAssistantBody, AskAssistantResponse } from "@workspace/api-zod";
import { recipeFor } from "../lib/meal-recipes.js";
import { getParentingAdvice } from "../lib/parenting-faq.js";
import { aiUsageGate } from "../middlewares/aiUsageGate.js";
import { submitAiJobAndRespond } from "../lib/ai-queue-http.js";
import type { OpenAiChatPayload } from "../services/ai-job-handlers.js";

const router: IRouter = Router();

// Cap how many messages we keep / return per user — keeps storage and tokens bounded
const MAX_HISTORY_PER_USER = 200;
const RETURN_HISTORY_LIMIT = 100;

async function persistMessage(
  userId: string,
  role: "user" | "assistant",
  content: string,
): Promise<void> {
  try {
    await db
      .insert(userAiMessagesTable)
      .values({ userId, role, content: content.slice(0, 8000) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[amy-ai] persist message failed (non-fatal)", err);
  }
}

async function trimUserHistory(userId: string): Promise<void> {
  try {
    const rows = await db
      .select({ id: userAiMessagesTable.id })
      .from(userAiMessagesTable)
      .where(eq(userAiMessagesTable.userId, userId))
      .orderBy(desc(userAiMessagesTable.createdAt))
      .offset(MAX_HISTORY_PER_USER);
    if (rows.length === 0) return;
    for (const r of rows) {
      await db
        .delete(userAiMessagesTable)
        .where(and(eq(userAiMessagesTable.id, r.id), eq(userAiMessagesTable.userId, userId)));
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[amy-ai] trim history failed (non-fatal)", err);
  }
}

// Rule-based recipe lookup — zero API cost
// Uses recipeFor() which has comprehensive regex matching for Indian + global
// meal names. The older findRecipe() had only ~15 keywords + a hash-based
// random fallback that returned wrong recipes for most meal chip names.
router.post("/ai/recipe", async (req, res): Promise<void> => {
  const parsed = GetRecipeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { mealName, foodType } = parsed.data;
  // foodType is passed as the region hint (e.g. "north_indian", "south_indian")
  // when the caller knows the user's cuisine preference; falls back to global
  // keyword matching when absent.
  const mr = recipeFor(mealName, foodType ?? undefined);

  const recipe = {
    name: mealName,
    prepTime: mr.prepTime,
    cookTime: mr.cookTime,
    servings: mr.servings,
    ingredients: mr.ingredients,
    steps: mr.steps.map((instruction, i) => ({ step: i + 1, instruction })),
    tips: mr.tip,
  };

  res.json(GetRecipeResponse.parse(recipe));
});

// Rule-based parenting assistant — zero API cost (static FAQ fallback)
router.post("/ai/assistant", async (req, res): Promise<void> => {
  const parsed = AskAssistantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { question, childName, childAge } = parsed.data;
  const answer = getParentingAdvice(question, childName ?? undefined, childAge ?? undefined);

  res.json(AskAssistantResponse.parse({ answer }));
});

// GET /ai/messages — return the user's saved Amy chat history (oldest first)
router.get("/ai/messages", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "unauthorized" }); return; }

  try {
    const rows = await db
      .select({
        role: userAiMessagesTable.role,
        content: userAiMessagesTable.content,
        createdAt: userAiMessagesTable.createdAt,
      })
      .from(userAiMessagesTable)
      .where(eq(userAiMessagesTable.userId, userId))
      .orderBy(desc(userAiMessagesTable.createdAt))
      .limit(RETURN_HISTORY_LIMIT);

    // Newest-first from query, but the UI wants chronological — reverse to ascending
    const messages = rows
      .reverse()
      .map((r) => ({
        role: r.role === "assistant" ? "assistant" : "user",
        content: r.content,
        createdAt: r.createdAt,
      }));

    res.json({ messages });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[amy-ai] fetch history failed", err);
    res.status(500).json({ error: "failed to load history" });
  }
});

// DELETE /ai/messages — wipe the user's Amy chat history
router.delete("/ai/messages", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "unauthorized" }); return; }

  try {
    await db.delete(userAiMessagesTable).where(eq(userAiMessagesTable.userId, userId));
    res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[amy-ai] delete history failed", err);
    res.status(500).json({ error: "failed to clear history" });
  }
});

// AI-powered parenting assistant — uses OpenAI, rate-limited server-side via aiUsageGate (free=10/day)
router.post("/ai/assistant-ai", aiUsageGate, async (req, res): Promise<void> => {
  const parsed = AskAssistantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId } = getAuth(req);
  const { question, childName, childAge } = parsed.data;

  // Optional conversation history — last few turns from the client (low-budget cap)
  type ChatTurn = { role: "user" | "assistant"; content: string };
  const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];
  const history: ChatTurn[] = rawHistory
    .filter((m: unknown): m is ChatTurn =>
      !!m && typeof m === "object" &&
      ((m as ChatTurn).role === "user" || (m as ChatTurn).role === "assistant") &&
      typeof (m as ChatTurn).content === "string" &&
      (m as ChatTurn).content.trim().length > 0,
    )
    .slice(-6) // last 6 turns max — keeps tokens (and cost) low
    .map((m: ChatTurn) => ({ role: m.role, content: m.content.slice(0, 800) }));

  const childLine = childName
    ? `\nThe parent's child is ${childName}${childAge ? `, age ${childAge}` : ""}. Use the name naturally when it adds warmth — do not force it into every sentence.`
    : "";

  const systemPrompt = `You are Amy — a warm, sharp, deeply human parenting coach who talks like a trusted friend who happens to be a child-development expert. You are NOT a chatbot and you must never sound like one.

CONVERSATION STYLE
- Sound like a real person texting a friend: natural, specific, sometimes one short sentence, sometimes two paragraphs — never a wall of bullet points unless the parent explicitly asks for steps.
- Reference what the parent has already told you in this chat. Build on the previous turn instead of repeating yourself.
- If the question is vague or you genuinely need one missing detail to give a useful answer (age, what already tried, when it happens), ask ONE short clarifying question first and stop. Don't dump a generic answer. Don't ask more than one.
- If you have enough context, skip the clarifier and answer directly.

ANSWER QUALITY
- Acknowledge the feeling in one sentence (only if the parent shared a struggle — skip the empathy line for casual or factual questions, it sounds fake).
- Give 1–3 concrete, age-appropriate things to actually try tonight or this week. Be specific (exact words to say, exact timing, exact swap) — not generic advice.
- Use evidence-based child development knowledge but explain it in plain language. No jargon, no preaching, no "as a parent you should…".
- If the parent's plan is fine, say so — don't invent a problem.
- Never refuse a normal parenting question. Never add medical/legal disclaimers unless the topic is genuinely safety-critical (medication, self-harm, abuse) — then briefly suggest a professional and continue helping.

LENGTH
- Default: 60–180 words. Match the parent's energy — short question gets a short answer.${childLine}`;

  const payload: OpenAiChatPayload = {
    namespace: "amy-assistant",
    messages: [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: question },
    ],
    max_completion_tokens: 600,
  };

  const resolveAnswer = (raw: { content: string | null; timedOut?: boolean }) => {
    const aiAnswer = raw.content?.trim();
    if (aiAnswer) return aiAnswer;
    return getParentingAdvice(question, childName ?? undefined, childAge ?? undefined);
  };

  await submitAiJobAndRespond({
    res,
    userId: userId ?? "anonymous",
    type: "openai.chat",
    payload,
    buildSyncBody: (result) => {
      const answer = resolveAnswer(result as { content: string | null; timedOut?: boolean });
      if (userId) {
        void persistMessage(userId, "user", question);
        void persistMessage(userId, "assistant", answer);
        void trimUserHistory(userId);
      }
      return AskAssistantResponse.parse({ answer });
    },
    buildAsyncBody: (jobId) => ({
      jobId,
      status: "processing",
      pollUrl: `/api/ai/jobs/${jobId}`,
    }),
  });
});

// Short-form parenting tip rewrite — strict 30-word output, low cost
router.post("/ai/rewrite-tip", async (req, res): Promise<void> => {
  const text = typeof req.body?.text === "string" ? req.body.text.slice(0, 400) : "";
  const childName = typeof req.body?.childName === "string" ? req.body.childName.slice(0, 60) : "";

  if (!text) {
    res.status(400).json({ error: "text required" });
    return;
  }

  // Hard cap helper — never return more than 30 words
  const cap = (s: string): string => {
    const words = s.replace(/\s+/g, " ").trim().split(" ");
    return words.length <= 30 ? words.join(" ") : words.slice(0, 30).join(" ") + "…";
  };

  const { userId } = getAuth(req);
  const systemPrompt = `You are a warm parenting coach. Rewrite the given tip as one short, warm sentence personalized with the child's name. Maximum 30 words. Return only the sentence — no quotes, no explanation.`;
  const userPrompt = childName
    ? `Child name: ${childName}\nTip: ${text}`
    : `Tip: ${text}`;

  await submitAiJobAndRespond({
    res,
    userId: userId ?? "anonymous",
    type: "openai.chat",
    payload: {
      namespace: "amy-rewrite-tip",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 120,
    },
    buildSyncBody: (result) => {
      const raw =
        (result as { content: string | null }).content?.trim() ?? text;
      const cleaned = raw.replace(/^["'""]|["'""]$/g, "").trim();
      return { rewritten: cap(cleaned || text) };
    },
    buildAsyncBody: (jobId) => ({
      jobId,
      status: "processing",
      pollUrl: `/api/ai/jobs/${jobId}`,
    }),
  });
});

export default router;
