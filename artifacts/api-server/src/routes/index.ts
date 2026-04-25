import { Router, type IRouter } from "express";
import healthRouter from "./health";
import childrenRouter from "./children";
import routinesRouter from "./routines";
import behaviorsRouter from "./behaviors";
import dashboardRouter from "./dashboard";
import parentProfileRouter from "./parent-profile";
import babysittersRouter from "./babysitters";
import aiRouter from "./ai";
import aiCoachRouter from "./ai-coach";
import appDataRouter from "./app-data";
import subscriptionRouter from "./subscription";
import reelsRouter from "./reels";
import worksheetsRouter from "./worksheets";
import onboardingRouter from "./onboarding";
import futurePredictorRouter from "./future-predictor";
import referralsRouter from "./referrals";
import featuresRouter from "./features";
import mealsRouter from "./meals";
import accountRouter from "./account";
import pushRouter from "./push";
import notificationsRouter from "./notifications";
import notificationPrefsRouter from "./notification-prefs";
import authDebugRouter from "./auth-debug";
import featureFeedbackRouter from "./feature-feedback";
import featureUsageRouter from "./feature-usage";
import giftTokensRouter from "./gift-tokens";
import recipesRouter from "./recipes";
import ttsRouter, { ttsPublicRouter } from "./tts";
import audioLessonsRouter from "./audio-lessons";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/reels", reelsRouter);
router.use(worksheetsRouter);
// Subscription router contains the public RevenueCat webhook endpoint
// (authenticated by REVENUECAT_WEBHOOK_SECRET), so it must be mounted
// BEFORE the global requireAuth gate. Authenticated subscription
// endpoints inside the router enforce auth on a per-route basis.
router.use(subscriptionRouter);
// Auth diagnostic endpoint must be BEFORE requireAuth so it works even when
// the JWT is invalid/expired — that's when we need it most.
router.use(authDebugRouter);
// /api/meals/suggest is pure local computation (no user data) — public.
// /api/meals/generate has its own auth guard inside the handler.
router.use(mealsRouter);
// /api/tts/audio/:key.mp3 — content-addressed (SHA256) MP3 stream. Safe to
// serve unauthenticated because keys can only originate from an authed
// /api/tts/synthesize call. Lets <audio>/expo-audio load it without headers.
router.use(ttsPublicRouter);
router.use(requireAuth);
router.use(onboardingRouter);
router.use(childrenRouter);
router.use(routinesRouter);
router.use(behaviorsRouter);
router.use(dashboardRouter);
router.use(parentProfileRouter);
router.use(babysittersRouter);
router.use(aiRouter);
router.use(aiCoachRouter);
router.use(appDataRouter);
router.use(futurePredictorRouter);
router.use(referralsRouter);
router.use(featuresRouter);
router.use(featureFeedbackRouter);
router.use(featureUsageRouter);
router.use(giftTokensRouter);
router.use(accountRouter);
router.use(pushRouter);
router.use(notificationsRouter);
router.use(notificationPrefsRouter);
router.use(recipesRouter);
router.use(ttsRouter);
router.use(audioLessonsRouter);

export default router;
