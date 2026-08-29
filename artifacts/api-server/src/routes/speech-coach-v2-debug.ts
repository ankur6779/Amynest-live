import { Router, type IRouter } from "express";
import { z } from "zod";
import { asyncRoute } from "../middlewares/async-route.js";
import {
  mintRealtimeClientSecret,
  REALTIME_VOICE,
} from "../services/speechCoachV2RealtimeService.js";

const router: IRouter = Router();

/** Mint-only OpenAI Realtime token — guarded by realtimeDebugGuard + requireAuth. */
router.post(
  "/speech/v2/debug/realtime-token",
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        instructions: z.string().min(10).max(4000).optional(),
      })
      .parse(req.body ?? {});

    const minted = await mintRealtimeClientSecret({
      userId: "speech-coach-v2-debug",
      instructions:
        body.instructions
        ?? "You are Amy, a warm speech coach for children. Greet the child in one friendly sentence.",
    });

    res.json({
      clientSecret: minted.clientSecret,
      expiresAt: minted.expiresAt,
      model: minted.model,
      voice: minted.voice,
      callsUrl: minted.callsUrl,
      sessionId: minted.sessionId,
    });
  }),
);

export default router;
