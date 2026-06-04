import { Router, type IRouter } from "express";
import healthRouter from "./health";
import {
  startupTelemetryAdminRouter,
  startupTelemetryPublicRouter,
} from "./startup-telemetry";
import remoteConfigRouter from "./remote-config";
import chatPlatformHealthRouter from "./chat-platform-health";
import clientLogsRouter from "./client-logs";
import childrenRouter from "./children";
import routinesRouter from "./routines";
import behaviorsRouter from "./behaviors";
import dashboardRouter from "./dashboard";
import parentProfileRouter from "./parent-profile";
import babysittersRouter from "./babysitters";
import aiRouter from "./ai";
import aiJobsRouter from "./ai-jobs";
import resultRouter from "./result";
import aiCoachRouter from "./ai-coach";
import aiTutorRouter from "./ai-tutor";
import appDataRouter from "./app-data";
import subscriptionRouter from "./subscription";
import reelsRouter from "./reels";
import driveRouter from "./drive";
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
import journeyRouter from "./journey";
import hubJourneyRouter from "./hub-journey";
import learningProgressRouter from "./learning-progress";
import coachJourneyRouter from "./coach-journey";
import routineJourneyRouter from "./routine-journey";
import giftTokensRouter from "./gift-tokens";
import recipesRouter from "./recipes";
import ttsRouter, { ttsPublicRouter } from "./tts";
import { staticAudioPublicRouter } from "./static-audio";
import audioLessonsRouter from "./audio-lessons";
import phonicsRouter, { phonicsPublicRouter } from "./phonics";
import { phonicsLibraryPublicRouter } from "./phonics-library";
import { animalWorldLibraryPublicRouter } from "./animal-world-library";
import { worldsLibraryPublicRouter } from "./worlds-library";
import { spellingLibraryPublicRouter } from "./spelling-library";
import abacusRouter from "./abacus";
import gamingRewardsRouter from "./gaming-rewards";
import spellingRouter, { spellingPublicRouter } from "./spelling";
import dailyPuzzleRouter from "./daily-puzzle";
import coloringRouter from "./coloring";
import funsheetsRouter from "./funsheets";
import nutritionLibraryRouter from "./nutrition-library";
import kidsHowLibraryRouter from "./kids-how-library";
import storiesRouter, { storiesPublicRouter } from "./stories";
import cryInsightRouter from "./cryInsight";
import sleepPredictRouter from "./sleepPredict";
import vaccinationsRouter from "./vaccinations";
import infantMilestonesRouter from "./infant-milestones";
import infantCareRouter from "./infant-care";
import infantGrowthRouter from "./infant-growth";
import infantWellbeingRouter from "./infant-wellbeing";
import infantTodayRouter from "./infant-today";
import infantDoctorReportRouter from "./infant-doctor-report";
import childCaregiversRouter from "./child-caregivers";
import infantNotificationsRouter from "./infant-notifications";
import infantActivationRouter from "./infant-activation";
import parentTasksRouter from "./parent-tasks";
import smartStudyRouter from "./smart-study";
import olympiadRouter from "./olympiad";
import lifeSkillsRouter from "./life-skills";
import learningLoadMoreRouter, {
  learningSeedPublicRouter,
} from "./learning-load-more";
import childIntelligenceRouter from "./child-intelligence";
import familyIntelligenceRouter from "./family-intelligence";
import amyOperatingRouter from "./amy-operating";
import intentRecoveryRouter from "./intent-recovery";
import realityValidationRouter from "./reality-validation";
import householdRouter from "./household";
import explainRouter from "./explain";
import safetyRouter from "./safety";
import speechRouter from "./speech";
import speechConverseRouter from "./speech-converse";
import debugRouter from "./debug";
import authRouter from "./auth";
import environmentRouter from "./environment";
import userFeedbackRouter from "./user-feedback";
import audioHealthRouter from "./audio-health";
import infantAnalyticsAdminRouter from "./infant-analytics-admin";
import otaRouter from "./ota";
import contentOrchestrationRouter from "./content-orchestration";
import eventPrepRouter from "./event-prep";
import contentBankRouter from "./content-bank";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/reels", reelsRouter);
router.use(driveRouter);
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
// /api/phonics-library/phonics/{category}/{id}.mp3 — GCS phonics library stream.
router.use(phonicsLibraryPublicRouter);
// /api/animal-world-library/animal-world/{category}/{animal}/{file} — GCS animal sounds/images.
router.use(animalWorldLibraryPublicRouter);
// /api/worlds-library/worlds/{vehicles|nature|home|instruments}/... — new discovery worlds (Animal World unchanged).
router.use(worldsLibraryPublicRouter);
// /api/spelling-library/spelling/v{n}/{slug}.mp3 — GCS spelling library stream.
router.use(spellingLibraryPublicRouter);
// /api/static-audio/:hash.mp3 — MD5-addressed catalog MP3 stream from GCS.
router.use(staticAudioPublicRouter);
// Capacitor OTA (Capgo) — public POST, patch-only web bundles (Apple Guideline 2.5.2).
router.use(otaRouter);
router.use(storiesPublicRouter);
router.use(learningSeedPublicRouter);
router.use(startupTelemetryPublicRouter);
router.use(remoteConfigRouter);
router.use(requireAuth);
router.use(chatPlatformHealthRouter);
router.use(startupTelemetryAdminRouter);
router.use(clientLogsRouter);
router.use(onboardingRouter);
router.use(childrenRouter);
router.use(routinesRouter);
router.use(behaviorsRouter);
router.use(dashboardRouter);
router.use(parentProfileRouter);
router.use(babysittersRouter);
router.use(aiRouter);
router.use(aiJobsRouter);
router.use(resultRouter);
router.use(aiCoachRouter);
router.use(aiTutorRouter);
router.use(appDataRouter);
router.use(futurePredictorRouter);
router.use(referralsRouter);
router.use(featuresRouter);
router.use(featureFeedbackRouter);
router.use(featureUsageRouter);
router.use(journeyRouter);
router.use(hubJourneyRouter);
router.use(learningProgressRouter);
router.use(coachJourneyRouter);
router.use(routineJourneyRouter);
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
router.use(gamingRewardsRouter);
router.use(spellingRouter);
router.use(dailyPuzzleRouter);
router.use(coloringRouter);
router.use(funsheetsRouter);
router.use(nutritionLibraryRouter);
router.use(kidsHowLibraryRouter);
router.use("/stories", storiesRouter);
router.use(cryInsightRouter);
router.use(sleepPredictRouter);
router.use(vaccinationsRouter);
router.use(infantMilestonesRouter);
router.use(infantCareRouter);
router.use(infantGrowthRouter);
router.use(infantWellbeingRouter);
router.use(infantTodayRouter);
router.use(infantDoctorReportRouter);
router.use(childCaregiversRouter);
router.use(infantNotificationsRouter);
router.use(infantActivationRouter);
router.use(parentTasksRouter);
router.use(smartStudyRouter);
router.use(olympiadRouter);
router.use(lifeSkillsRouter);
router.use(learningLoadMoreRouter);
router.use(childIntelligenceRouter);
router.use(familyIntelligenceRouter);
router.use(amyOperatingRouter);
router.use(intentRecoveryRouter);
router.use(realityValidationRouter);
router.use(householdRouter);
router.use(explainRouter);
router.use(safetyRouter);
router.use(speechRouter);
router.use(speechConverseRouter);
router.use(debugRouter);
router.use(environmentRouter);
router.use(userFeedbackRouter);
router.use(audioHealthRouter);
router.use(infantAnalyticsAdminRouter);
router.use(contentOrchestrationRouter);
router.use(eventPrepRouter);
router.use(contentBankRouter);

export default router;
