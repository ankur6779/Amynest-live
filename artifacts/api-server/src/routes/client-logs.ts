import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import { recordChatPlatformPromptHiddenFailure } from "../services/chatPlatformRemoteConfig";
import { ingestChatPlatformHealthEvent } from "../services/chatPlatformHealthStore";
import { persistInfantProductAnalyticsEvent } from "../services/infantAnalyticsIngestService";

const router: IRouter = Router();

const ClientLogBody = z.object({
  type: z.union([
    z.enum([
      "crash",
      "slow_api",
      "failed_routine",
      "warning",
      "info",
      "static_audio_play_failed",
      "static_audio_missing_url",
      "static_audio_proxy_failed",
    ]),
    /** Amy voice pipeline telemetry (`use-amy-voice` / `amy-voice-telemetry.ts`). */
    z.string().regex(/^amy_voice_[a-z0-9_]+$/),
    /** LearningProgressEngine retention events (client mirror). */
    z.string().regex(/^learning_progress_[a-z0-9_]+$/),
    /** Subscription funnel events (`subscription-analytics.ts`). */
    z.literal("subscription_funnel"),
    /** Infant parenting product analytics (`infant-hub-analytics.ts`). */
    z.literal("infant_parenting"),
  ]),
  message: z.string().min(1).max(4000),
  context: z.string().max(256).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  durationMs: z.number().optional(),
  route: z.string().max(256).optional(),
});

const MAX_BUFFER = 200;
const recentLogs: Array<{
  ts: number;
  userId: string | null;
  type: string;
  message: string;
}> = [];

async function ingestClientLog(req: Request, res: Response): Promise<void> {
  const parsed = ClientLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId } = getAuth(req);
  const meta =
    parsed.data.meta && typeof parsed.data.meta === "object"
      ? JSON.parse(JSON.stringify(parsed.data.meta).slice(0, 4000))
      : undefined;

  const entry = {
    ts: Date.now(),
    userId: userId ?? null,
    type: parsed.data.type,
    message: parsed.data.message.slice(0, 4000),
    context: parsed.data.context?.slice(0, 256),
    route: parsed.data.route?.slice(0, 256),
    durationMs: parsed.data.durationMs,
    meta,
  };

  recentLogs.push({
    ts: entry.ts,
    userId: entry.userId,
    type: entry.type,
    message: entry.message,
  });
  if (recentLogs.length > MAX_BUFFER) recentLogs.shift();

  const logType = parsed.data.type;
  const message = parsed.data.message;
  const chatPlatformFailure =
    message === "chat_prompt_hidden_after_keyboard_open" ||
    message === "keyboard_visibility_failures" ||
    message === "android_keyboard_layout_conflicts";
  const chatPlatformRecovery = message === "chat_prompt_recovery_triggered";

  if (message === "chat_prompt_hidden_after_keyboard_open") {
    recordChatPlatformPromptHiddenFailure();
  }

  if (
    chatPlatformFailure ||
    chatPlatformRecovery ||
    message === "chat_prompt_recovery_triggered"
  ) {
    ingestChatPlatformHealthEvent({
      ts: entry.ts,
      event: message,
      surface: parsed.data.context?.replace(/^chat_platform:/, ""),
      route: entry.route,
      meta,
      userId: entry.userId,
    });
  }
  const staticAudioError =
    logType === "static_audio_play_failed" || logType === "static_audio_proxy_failed";
  const staticAudioWarn = logType === "static_audio_missing_url";
  const amyVoiceError =
    logType.startsWith("amy_voice_") &&
    (logType.includes("failed") || logType.includes("failure"));
  const amyVoiceWarn = logType.startsWith("amy_voice_") && logType.includes("fallback");

  const logFn =
    logType === "crash" ||
    logType === "failed_routine" ||
    chatPlatformFailure ||
    staticAudioError ||
    amyVoiceError
      ? logger.error.bind(logger)
      : logType === "slow_api" ||
          logType === "warning" ||
          chatPlatformRecovery ||
          staticAudioWarn ||
          amyVoiceWarn
        ? logger.warn.bind(logger)
        : logger.info.bind(logger);

  logFn({ kind: "client_log", ...entry }, `[client:${parsed.data.type}] ${parsed.data.message}`);

  if (logType === "infant_parenting" && userId) {
    const eventName =
      typeof meta?.event === "string" ? meta.event : message.slice(0, 128);
    void persistInfantProductAnalyticsEvent({
      userId,
      event: eventName,
      properties: meta ?? {},
    }).catch((err) => {
      logger.warn(
        { err, event: eventName, userId },
        "infant_analytics_persist_failed",
      );
    });
  }

  res.status(204).end();
}

router.post("/logs", ingestClientLog);
/** Alias for web error boundary / onboarding crash reports. */
router.post("/log-client-error", ingestClientLog);

/** Ops/debug: last N client logs (auth required — mounted after requireAuth). */
router.get("/logs/recent", (_req, res) => {
  res.json({ logs: recentLogs.slice(-50) });
});

/** Trim in-memory client log buffer during periodic cleanup. */
export function trimClientLogBuffer(): void {
  const target = Math.floor(MAX_BUFFER / 2);
  while (recentLogs.length > target) recentLogs.shift();
}

export default router;
