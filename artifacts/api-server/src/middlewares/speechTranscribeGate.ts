import type { Request, Response, NextFunction } from "express";
import { getAuth } from "../lib/auth";
import {
  getOrCreateSubscription,
  incrementFeatureUsage,
  isPremiumNow,
  nextResetAtFor,
  speechTranscribeDailyLimit,
} from "../services/subscriptionService.js";

/**
 * Daily STT quota for POST /speech/transcribe.
 * Free: 20/day. Premium: higher cap (default 100/day, env override).
 */
export function speechTranscribeGate() {
  return async function speechTranscribeGateMw(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const sub = await getOrCreateSubscription(userId);
    const isPremium = isPremiumNow(sub);
    const limit = speechTranscribeDailyLimit(isPremium);

    const newCount = await incrementFeatureUsage(userId, "speech_transcribe", 1);
    if (newCount > limit) {
      await incrementFeatureUsage(userId, "speech_transcribe", -1).catch(() => undefined);
      res.status(402).json({
        error: "feature_locked",
        feature: "speech_transcribe",
        message: "Daily speech transcription limit reached. Upgrade for a higher allowance.",
        limit,
        used: limit,
        resetsAt: nextResetAtFor("speech_transcribe"),
      });
      return;
    }

    const origEnd = res.end.bind(res);
    let settled = false;
    res.end = function (...args: unknown[]) {
      if (!settled) {
        settled = true;
        if (res.statusCode < 200 || res.statusCode >= 300) {
          void incrementFeatureUsage(userId, "speech_transcribe", -1).catch(() => undefined);
        }
      }
      // @ts-expect-error - express.end has multiple overloads
      return origEnd(...args);
    };

    next();
  };
}
