import { Router, type IRouter } from "express";
import { z } from "zod";
import { asyncRoute } from "../middlewares/async-route.js";
import { logger } from "../lib/logger.js";
import {
  mintRealtimeClientSecret,
  REALTIME_VOICE,
  getSpeechCoachV2RealtimeModel,
  getRealtimeCallsUrl,
} from "../services/speechCoachV2RealtimeService.js";

const router: IRouter = Router();

function assertInfraDebugAllowed(): void {
  const allowed =
    process.env.NODE_ENV !== "production"
    || process.env.OPENAI_REALTIME_DEBUG === "1"
    || process.env.OPENAI_REALTIME_DEBUG === "true"
    || process.env.SPEECH_COACH_V2_DEBUG === "1"
    || process.env.SPEECH_COACH_V2_DEBUG === "true";
  if (!allowed) {
    const err = new Error("OpenAI Realtime infra debug is disabled");
    (err as Error & { status: number }).status = 404;
    throw err;
  }
}

function openAiApiKey(): string | null {
  return (
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim()
    || process.env.OPENAI_API_KEY?.trim()
    || null
  );
}

function openAiBaseUrl(): string {
  return (
    process.env.AI_INTEGRATIONS_OPENAI_BASE_URL?.trim()
    || "https://api.openai.com"
  ).replace(/\/$/, "");
}

async function probeOpenAiReachable(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${openAiBaseUrl()}/v1/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(12_000),
    });
    return res.ok;
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "openai_realtime_health_reachability_failed",
    );
    return false;
  }
}

/** Infra health — no DB, session, quota, or analytics. */
router.get(
  "/debug/openai-realtime-health",
  asyncRoute(async (_req, res) => {
    assertInfraDebugAllowed();

    const apiKey = openAiApiKey();
    if (!apiKey) {
      res.json({
        openaiReachable: false,
        model: getSpeechCoachV2RealtimeModel(),
        tokenMint: false,
        error: "OPENAI_API_KEY not configured",
      });
      return;
    }

    const openaiReachable = await probeOpenAiReachable(apiKey);

    let tokenMint = false;
    let mintDetail: Record<string, unknown> | undefined;
    let resolvedCallsUrl = getRealtimeCallsUrl();
    try {
      const minted = await mintRealtimeClientSecret({
        userId: "openai-realtime-infra-health",
        instructions: "Say exactly: Hello from Amy.",
      });
      tokenMint = Boolean(minted.clientSecret);
      resolvedCallsUrl = minted.callsUrl;
      mintDetail = {
        expiresAt: minted.expiresAt,
        model: minted.model,
        voice: minted.voice,
        secretPrefix: minted.clientSecret.slice(0, 8),
      };
      logger.info(
        { model: minted.model, voice: minted.voice, expiresAt: minted.expiresAt },
        "openai_realtime_health_mint_ok",
      );
    } catch (err) {
      mintDetail = {
        error: err instanceof Error ? err.message : String(err),
      };
      logger.error({ mintDetail }, "openai_realtime_health_mint_failed");
    }

    res.json({
      openaiReachable,
      model: getSpeechCoachV2RealtimeModel(),
      voice: REALTIME_VOICE,
      tokenMint,
      callsUrl: resolvedCallsUrl,
      mintDetail,
    });
  }),
);

/** Mint-only token for /openai-realtime-test — no DB writes. */
router.post(
  "/debug/openai-realtime-token",
  asyncRoute(async (req, res) => {
    assertInfraDebugAllowed();
    const body = z
      .object({
        instructions: z.string().min(10).max(4000).optional(),
      })
      .parse(req.body ?? {});

    const minted = await mintRealtimeClientSecret({
      userId: "openai-realtime-test",
      instructions:
        body.instructions
        ?? "You are Amy. When the session starts, say exactly: Hello from Amy.",
    });

    logger.info(
      { model: minted.model, voice: minted.voice },
      "openai_realtime_test_token_minted",
    );

    res.json({
      clientSecret: minted.clientSecret,
      expiresAt: minted.expiresAt,
      model: minted.model,
      voice: minted.voice,
      callsUrl: minted.callsUrl,
      sessionId: minted.sessionId,
      mintResponse: minted.mintResponse,
    });
  }),
);

export default router;
