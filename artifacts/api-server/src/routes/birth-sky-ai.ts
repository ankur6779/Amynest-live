/**
 * Birth Sky AI Conversations API (IM-4 / Pack 6 + Pack 2 entitlement).
 * No lifecycle/settings/export. Existing RevenueCat premium only.
 */

import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  db,
  birthProfilesTable,
  skySnapshotsTable,
  birthSkyConversationsTable,
  birthSkyMessagesTable,
} from "@workspace/db";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import { requireBirthSkyAllowlist } from "../services/birth-sky/require-birth-sky-allowlist";
import {
  BIRTH_SKY_AI_MIN_INTERVAL_MS,
  BIRTH_SKY_CONTEXT_SCHEMA_VERSION,
} from "../services/birth-sky/ai-constants.js";
import {
  assembleBirthSkyPrompt,
  assertSupportedContextSchema,
  type BirthSkyAiContextInput,
} from "../services/birth-sky/ai-context.js";
import {
  ackBirthSkyDelivery,
  evaluateBirthSkyAiGate,
} from "../services/birth-sky/ai-entitlement.js";
import { streamBirthSkyChat } from "../services/birth-sky/ai-stream.js";
import { validateBirthSkyAiOutput } from "../services/birth-sky/ai-safety.js";
import {
  resolveBirthSkyModelCatalog,
  routeBirthSkyModel,
  type BirthSkyModelTier,
} from "../services/birth-sky/ai-model-router.js";
import {
  estimateBirthSkyCostUsd,
  recordBirthSkyAiTelemetry,
} from "../services/birth-sky/ai-router-telemetry.js";

const router: IRouter = Router();
router.use(requireBirthSkyAllowlist);

const lastStreamAt = new Map<string, number>();
const activeAborts = new Map<string, AbortController>();

const contextSchema = z.object({
  contextSchemaVersion: z.string().min(1).max(64).default(BIRTH_SKY_CONTEXT_SCHEMA_VERSION),
  snapshotVersion: z.string().min(1).max(128),
  engineVersion: z.string().min(1).max(128),
  mode: z.enum(["full", "day_sky"]),
  timePrecision: z.enum(["exact", "approximate", "unknown"]),
  placeProvided: z.boolean(),
  sunSign: z.string().min(1).max(40),
  moonSign: z.string().min(1).max(40),
  moonPhase: z.string().min(1).max(40),
  moonPhaseLabel: z.string().min(1).max(80),
  risingSign: z.string().max(40).nullable(),
  traditionalContentVersion: z.string().max(64).nullable().optional(),
  traditionCardId: z.string().max(80).nullable().optional(),
  lunarMansionKey: z.string().max(40).nullable().optional(),
  reflectionIds: z.array(z.string().max(80)).max(12).optional(),
  reflectionPromptIds: z.array(z.string().max(80)).max(12).optional(),
  reflectionCount: z.number().int().min(0).max(10_000).optional(),
  childFirstName: z.string().max(80).nullable().optional(),
  userQuestion: z.string().min(1).max(2000),
  entryPoint: z.enum(["reflect", "tradition", "sky", "astronomy", "resume"]),
});

async function loadOwnedProfile(userId: string, profileId: string) {
  const rows = await db
    .select()
    .from(birthProfilesTable)
    .where(
      and(
        eq(birthProfilesTable.id, profileId),
        eq(birthProfilesTable.userId, userId),
        isNull(birthProfilesTable.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

function mapMessage(row: typeof birthSkyMessagesTable.$inferSelect) {
  return {
    messageId: row.id,
    conversationId: row.conversationId,
    role: row.role,
    body: row.body,
    sequence: row.sequence,
    jobId: row.jobId,
    deliveryId: row.deliveryId,
    modelVersion: row.modelVersion,
    contextSchemaVersion: row.contextSchemaVersion,
    snapshotVersion: row.snapshotVersion,
    engineVersion: row.engineVersion,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * GET /api/birth-sky/profiles/:profileId/ai-entitlement
 */
router.get("/birth-sky/profiles/:profileId/ai-entitlement", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const profileId = String(req.params.profileId);
  try {
    const gate = await evaluateBirthSkyAiGate(userId, profileId);
    if (!gate.allowed && "reason" in gate && gate.reason === "profile_not_found") {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({
      canRequestAiInsight: gate.allowed,
      isPremium: gate.isPremium,
      aiInsightsUsedCount: gate.aiInsightsUsedCount,
      freeInsightRemaining: gate.isPremium ? null : Math.max(0, 1 - gate.aiInsightsUsedCount),
    });
  } catch (err) {
    logger.error(`birth-sky ai entitlement: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * GET /api/birth-sky/profiles/:profileId/conversations
 */
router.get("/birth-sky/profiles/:profileId/conversations", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const profileId = String(req.params.profileId);
  try {
    if (!(await loadOwnedProfile(userId, profileId))) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const rows = await db
      .select()
      .from(birthSkyConversationsTable)
      .where(
        and(
          eq(birthSkyConversationsTable.profileId, profileId),
          eq(birthSkyConversationsTable.userId, userId),
        ),
      )
      .orderBy(desc(birthSkyConversationsTable.updatedAt))
      .limit(30);
    res.json({
      conversations: rows.map((r) => ({
        conversationId: r.id,
        snapshotVersion: r.snapshotVersion,
        engineVersion: r.engineVersion,
        entryPoint: r.entryPoint,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    logger.error(`birth-sky list conversations: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * GET /api/birth-sky/conversations/:conversationId
 */
router.get("/birth-sky/conversations/:conversationId", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const conversationId = String(req.params.conversationId);
  try {
    const convs = await db
      .select()
      .from(birthSkyConversationsTable)
      .where(
        and(
          eq(birthSkyConversationsTable.id, conversationId),
          eq(birthSkyConversationsTable.userId, userId),
        ),
      )
      .limit(1);
    const conv = convs[0];
    if (!conv) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const messages = await db
      .select()
      .from(birthSkyMessagesTable)
      .where(eq(birthSkyMessagesTable.conversationId, conversationId))
      .orderBy(asc(birthSkyMessagesTable.sequence));
    res.json({
      conversation: {
        conversationId: conv.id,
        profileId: conv.profileId,
        snapshotVersion: conv.snapshotVersion,
        engineVersion: conv.engineVersion,
        entryPoint: conv.entryPoint,
        status: conv.status,
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString(),
      },
      messages: messages.map(mapMessage),
    });
  } catch (err) {
    logger.error(`birth-sky get conversation: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * POST /api/birth-sky/conversations — create thread
 */
router.post("/birth-sky/conversations", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const schema = z.object({
    profileId: z.string().min(1),
    entryPoint: z.enum(["reflect", "tradition", "sky", "astronomy", "resume"]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }
  try {
    const profile = await loadOwnedProfile(userId, parsed.data.profileId);
    if (!profile) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const snaps = await db
      .select()
      .from(skySnapshotsTable)
      .where(
        and(
          eq(skySnapshotsTable.profileId, profile.id),
          eq(skySnapshotsTable.isCurrent, true),
        ),
      )
      .limit(1);
    const snap = snaps[0];
    if (!snap) {
      res.status(409).json({ error: "snapshot_required" });
      return;
    }
    const id = randomUUID();
    const [row] = await db
      .insert(birthSkyConversationsTable)
      .values({
        id,
        profileId: profile.id,
        userId,
        snapshotVersion: snap.snapshotVersion,
        engineVersion: snap.engineVersion,
        entryPoint: parsed.data.entryPoint,
        status: "active",
      })
      .returning();
    res.status(201).json({
      conversation: {
        conversationId: row!.id,
        profileId: row!.profileId,
        snapshotVersion: row!.snapshotVersion,
        engineVersion: row!.engineVersion,
        entryPoint: row!.entryPoint,
        status: row!.status,
        createdAt: row!.createdAt.toISOString(),
      },
    });
  } catch (err) {
    logger.error(`birth-sky create conversation: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * POST /api/birth-sky/conversations/:conversationId/messages/stream — SSE
 */
router.post(
  "/birth-sky/conversations/:conversationId/messages/stream",
  async (req, res): Promise<void> => {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const conversationId = String(req.params.conversationId);
    const parsed = contextSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
      return;
    }
    const ctx = parsed.data;

    if (!assertSupportedContextSchema(ctx.contextSchemaVersion)) {
      res.status(400).json({ error: "unsupported_context_schema" });
      return;
    }

    const now = Date.now();
    const last = lastStreamAt.get(userId) ?? 0;
    if (now - last < BIRTH_SKY_AI_MIN_INTERVAL_MS) {
      res.status(429).json({ error: "rate_limited" });
      return;
    }

    try {
      const convs = await db
        .select()
        .from(birthSkyConversationsTable)
        .where(
          and(
            eq(birthSkyConversationsTable.id, conversationId),
            eq(birthSkyConversationsTable.userId, userId),
          ),
        )
        .limit(1);
      const conv = convs[0];
      if (!conv) {
        res.status(404).json({ error: "not_found" });
        return;
      }

      // Snapshot immutability: reject if client snapshotVersion does not match conversation binding
      // or current sky (active snapshot may advance later; conversation stays on its versions).
      if (ctx.snapshotVersion !== conv.snapshotVersion) {
        res.status(409).json({ error: "snapshot_version_mismatch" });
        return;
      }

      const gate = await evaluateBirthSkyAiGate(userId, conv.profileId);
      if (!gate.allowed) {
        if ("reason" in gate && gate.reason === "profile_not_found") {
          res.status(404).json({ error: "not_found" });
          return;
        }
        res.status(402).json({
          error: "ai_insight_limit",
          reason: "ai_insight_limit",
          aiInsightsUsedCount: gate.aiInsightsUsedCount,
          isPremium: gate.isPremium,
        });
        return;
      }

      lastStreamAt.set(userId, now);

      const priorTurns = await db
        .select({
          role: birthSkyMessagesTable.role,
          body: birthSkyMessagesTable.body,
          sequence: birthSkyMessagesTable.sequence,
          modelVersion: birthSkyMessagesTable.modelVersion,
        })
        .from(birthSkyMessagesTable)
        .where(eq(birthSkyMessagesTable.conversationId, conversationId))
        .orderBy(desc(birthSkyMessagesTable.sequence))
        .limit(8);

      let nextSeq = (priorTurns[0]?.sequence ?? 0) + 1;

      const userMsgId = randomUUID();
      await db.insert(birthSkyMessagesTable).values({
        id: userMsgId,
        conversationId,
        profileId: conv.profileId,
        userId,
        role: "user",
        body: ctx.userQuestion.trim(),
        sequence: nextSeq,
        snapshotVersion: conv.snapshotVersion,
        engineVersion: conv.engineVersion,
        contextSchemaVersion: ctx.contextSchemaVersion,
        status: "complete",
      });
      nextSeq += 1;

      const jobId = randomUUID();
      const deliveryId = jobId;
      const abort = new AbortController();
      activeAborts.set(jobId, abort);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      const send = (event: string, data: Record<string, unknown>) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      const recentTurns = [...priorTurns]
        .reverse()
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-5)
        .map((m) => ({
          role: m.role as "user" | "assistant",
          body: m.body,
        }));

      const lastAssistantWithModel = [...priorTurns].find(
        (m) => m.role === "assistant" && m.modelVersion,
      );
      const catalog = resolveBirthSkyModelCatalog();
      const priorTier: BirthSkyModelTier | null = lastAssistantWithModel?.modelVersion
        ? lastAssistantWithModel.modelVersion === catalog.fast
          ? "fast"
          : lastAssistantWithModel.modelVersion === catalog.reasoning
            ? "reasoning"
            : /mini|nano|4o-mini/i.test(lastAssistantWithModel.modelVersion)
              ? "fast"
              : "reasoning"
        : null;

      const route = routeBirthSkyModel({
        userText: ctx.userQuestion,
        priorTurnCount: priorTurns.length,
        entryPoint: ctx.entryPoint,
        recentTurns,
        priorTier,
      });
      logger.info(
        {
          conversationId,
          tier: route.tier,
          model: route.model,
          reason: route.reason,
          confidence: route.confidence,
          escalated: route.escalated,
          downgraded: route.downgraded,
          entryPoint: ctx.entryPoint,
          priorTurnCount: priorTurns.length,
          scores: route.scores,
        },
        "birth-sky.ai.model_route",
      );

      send("job", {
        jobId,
        deliveryId,
        conversationId,
        modelVersion: route.model,
        modelTier: route.tier,
        modelRouteReason: route.reason,
        modelRouteConfidence: route.confidence,
        escalated: route.escalated,
        contextSchemaVersion: ctx.contextSchemaVersion,
      });

      const assembled = assembleBirthSkyPrompt(ctx as BirthSkyAiContextInput, {
        recentTurns,
      });
      // Buffer model tokens server-side — never emit chunks until safety approves.
      const streamResult = await streamBirthSkyChat({
        messages: assembled.messages,
        model: route.model,
        signal: abort.signal,
        onChunk: () => {
          /* intentional no-op: moderate-first delivery */
        },
      });

      activeAborts.delete(jobId);

      const emitTelemetry = (
        status: "ok" | "error" | "moderated" | "cancelled" | "timeout",
      ) => {
        const inputTokens = streamResult.usage.inputTokens;
        const outputTokens = streamResult.usage.outputTokens;
        const estimatedCostUsd =
          inputTokens != null && outputTokens != null
            ? estimateBirthSkyCostUsd({
                tier: route.tier,
                inputTokens,
                outputTokens,
              })
            : null;
        recordBirthSkyAiTelemetry({
          conversationId,
          selectedModel: route.model,
          tier: route.tier,
          routingReason: route.reason,
          latencyMs: streamResult.latencyMs,
          inputTokens,
          outputTokens,
          estimatedCostUsd,
          conversationLength: priorTurns.length + 1,
          escalated: route.escalated,
          downgraded: route.downgraded,
          confidence: route.confidence,
          scores: route.scores,
          status,
        });
      };

      if (!streamResult.ok) {
        const status =
          streamResult.error === "cancelled"
            ? "cancelled"
            : streamResult.timedOut
              ? "timeout"
              : "failed";
        emitTelemetry(
          streamResult.error === "cancelled"
            ? "cancelled"
            : streamResult.timedOut
              ? "timeout"
              : "error",
        );
        send("error", {
          jobId,
          deliveryId,
          error: streamResult.error,
          status,
          // Partial text may exist but is NOT delivered for free-consume purposes.
          hadPartial: Boolean(streamResult.text),
          modelVersion: streamResult.modelVersion,
          latencyMs: streamResult.latencyMs,
        });
        res.end();
        return;
      }

      const safety = validateBirthSkyAiOutput(streamResult.text, {
        fallbackSeed: jobId,
      });
      if (!safety.ok) {
        const assistantId = randomUUID();
        await db.insert(birthSkyMessagesTable).values({
          id: assistantId,
          conversationId,
          profileId: conv.profileId,
          userId,
          role: "assistant",
          body: safety.fallback,
          sequence: nextSeq,
          jobId,
          deliveryId,
          modelVersion: streamResult.modelVersion,
          contextSchemaVersion: assembled.contextSchemaVersion,
          snapshotVersion: conv.snapshotVersion,
          engineVersion: conv.engineVersion,
          status: "moderated",
        });
        emitTelemetry("moderated");
        send("moderated", {
          jobId,
          deliveryId,
          code: safety.code,
          messageId: assistantId,
          body: safety.fallback,
          // Fallback is presentable but Pack 2: moderation does NOT consume free insight.
          consumeEligible: false,
          modelVersion: streamResult.modelVersion,
          latencyMs: streamResult.latencyMs,
        });
        res.end();
        return;
      }

      const assistantId = randomUUID();
      await db.insert(birthSkyMessagesTable).values({
        id: assistantId,
        conversationId,
        profileId: conv.profileId,
        userId,
        role: "assistant",
        body: safety.text,
        sequence: nextSeq,
        jobId,
        deliveryId,
        modelVersion: streamResult.modelVersion,
        contextSchemaVersion: assembled.contextSchemaVersion,
        snapshotVersion: conv.snapshotVersion,
        engineVersion: conv.engineVersion,
        status: "complete",
      });

      await db
        .update(birthSkyConversationsTable)
        .set({ updatedAt: new Date() })
        .where(eq(birthSkyConversationsTable.id, conversationId));

      emitTelemetry("ok");

      // Stream only approved text (never raw model output).
      const approved = safety.text;
      const CHUNK = 48;
      let chunkSequence = 0;
      for (let i = 0; i < approved.length; i += CHUNK) {
        chunkSequence += 1;
        send("chunk", {
          jobId,
          deliveryId,
          chunkSequence,
          delta: approved.slice(i, i + CHUNK),
        });
      }

      send("done", {
        jobId,
        deliveryId,
        messageId: assistantId,
        modelVersion: streamResult.modelVersion,
        modelTier: route.tier,
        modelRouteReason: route.reason,
        escalated: route.escalated,
        latencyMs: streamResult.latencyMs,
        inputTokens: streamResult.usage.inputTokens,
        outputTokens: streamResult.usage.outputTokens,
        contextSchemaVersion: assembled.contextSchemaVersion,
        snapshotVersion: conv.snapshotVersion,
        engineVersion: conv.engineVersion,
        consumeEligible: true,
        finalText: safety.text,
      });
      res.end();
    } catch (err) {
      logger.error(`birth-sky stream: ${err instanceof Error ? err.message : String(err)}`);
      if (!res.headersSent) {
        res.status(500).json({ error: "server_error" });
        return;
      }
      res.write(
        `event: error\ndata: ${JSON.stringify({ error: "server_error" })}\n\n`,
      );
      res.end();
    }
  },
);

/**
 * POST /api/birth-sky/deliveries/:deliveryId/ack — exactly-once free consume
 */
router.post("/birth-sky/deliveries/:deliveryId/ack", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const deliveryId = String(req.params.deliveryId);
  const schema = z.object({
    profileId: z.string().min(1),
    conversationId: z.string().min(1),
    jobId: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }
  try {
    const result = await ackBirthSkyDelivery({
      userId,
      profileId: parsed.data.profileId,
      conversationId: parsed.data.conversationId,
      jobId: parsed.data.jobId,
      deliveryId,
    });
    if (!result.ok) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (err) {
    logger.error(`birth-sky ack: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * POST /api/birth-sky/jobs/:jobId/cancel
 */
router.post("/birth-sky/jobs/:jobId/cancel", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const jobId = String(req.params.jobId);
  const ctrl = activeAborts.get(jobId);
  if (ctrl) {
    ctrl.abort();
    activeAborts.delete(jobId);
  }
  res.json({ ok: true, cancelled: Boolean(ctrl) });
});

export default router;
