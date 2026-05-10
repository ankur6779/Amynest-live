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
import aiTutorRouter from "./ai-tutor";
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
import phonicsRouter, { phonicsPublicRouter } from "./phonics";
import abacusRouter from "./abacus";
import spellingRouter, { spellingPublicRouter } from "./spelling";
import dailyPuzzleRouter from "./daily-puzzle";
import coloringRouter from "./coloring";
import funsheetsRouter from "./funsheets";
import storiesRouter from "./stories";
import cryInsightRouter from "./cryInsight";
import sleepPredictRouter from "./sleepPredict";
import vaccinationsRouter from "./vaccinations";
import parentTasksRouter from "./parent-tasks";
import smartStudyRouter from "./smart-study";
import lifeSkillsRouter from "./life-skills";
import childIntelligenceRouter from "./child-intelligence";
import householdRouter from "./household";
import debugRouter from "./debug";
import authRouter from "./auth";
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
// Public auth helpers (e.g. check-reset-email) — no JWT needed.
router.use(authRouter);
// /api/meals/suggest is pure local computation (no user data) — public.
// /api/meals/generate has its own auth guard inside the handler.
router.use(mealsRouter);
// /api/tts/audio/:key.mp3 — content-addressed (SHA256) MP3 stream. Safe to
// serve unauthenticated because keys can only originate from an authed
// /api/tts/synthesize call. Lets <audio>/expo-audio load it without headers.
router.use(ttsPublicRouter);
// /api/spelling/sessions/:token/audio/:idx.mp3 — content-addressed MP3 stream
// scoped by an unguessable session token. Mounted BEFORE requireAuth so
// <audio> tags can fetch without juggling bearer tokens; the session token
// itself authenticates (only the parent who owns the child receives it).
router.use(spellingPublicRouter);
// /api/phonics/sound/:letter.mp3 — bounded-input (a-z + curated digraphs)
// public phoneme audio. Mounted BEFORE requireAuth so <audio>/expo-audio
// can fetch without bearer tokens. See PHONEME_PROMPTS in phonics.ts.
router.use(phonicsPublicRouter);
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
router.use(aiTutorRouter);
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
router.use(phonicsRouter);
router.use(abacusRouter);
router.use(spellingRouter);
router.use(dailyPuzzleRouter);
router.use(coloringRouter);
router.use(funsheetsRouter);
router.use("/stories", storiesRouter);
router.use(cryInsightRouter);
router.use(sleepPredictRouter);
router.use(vaccinationsRouter);
router.use(parentTasksRouter);
router.use(smartStudyRouter);
router.use(lifeSkillsRouter);
router.use(childIntelligenceRouter);
router.use(householdRouter);
router.use(debugRouter);

export default router;
