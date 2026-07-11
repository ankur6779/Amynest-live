import { parseGrowthTimeRange } from "../growth-dashboard/timeRange.js";
import { computeGrowthDashboard } from "../growth-dashboard/index.js";
import { getCacheKey, getCachedSection, setCachedSection } from "./cache.js";
import { getAlertsWorkflowPayload, updateAlertWorkflow } from "./alerts/index.js";
import { getCampaignHub } from "./campaign-hub/index.js";
import { exploreCohorts, type CohortType } from "./cohort-explorer/index.js";
import { answerCopilotQuestion } from "./copilot/index.js";
import {
  getDecisionCenterPayload,
  listDecisions,
  updateDecisionStatus,
} from "./decision-center/index.js";
import { getExperimentCenterPayload, listExperiments, upsertExperiment } from "./experiment-center/index.js";
import { computeFeatureImpactLab } from "./feature-impact/index.js";
import { buildGrowthCalendar } from "./growth-calendar/index.js";
import { exploreJourney, listJourneyFilterOptions } from "./journey-explorer/index.js";
import { computePredictionsV2 } from "./prediction-engine/index.js";
import { buildRevenueAttribution } from "./revenue-attribution/index.js";
import { computePreSignupFunnel } from "./pre-signup-funnel/index.js";
import { loadGrowthOsPayload, updateSettings } from "./store.js";
import { computeGrowthObservatory, computeDailyBrief } from "../growth-observatory/index.js";
import { computeGrowthOperations } from "../growth-os-v2/index.js";
import { computeRevenueIntelligence } from "../revenue-intelligence/index.js";
import type { GrowthOsExperiment, GrowthOsSettings } from "./types.js";

export type GosSection =
  | "overview"
  | "executive"
  | "acquisition"
  | "activation"
  | "retention"
  | "revenue"
  | "campaigns"
  | "experiments"
  | "intelligence"
  | "recommendations"
  | "alerts"
  | "predictions"
  | "settings"
  | "attribution"
  | "journey"
  | "cohorts"
  | "calendar"
  | "feature-impact"
  | "decisions"
  | "copilot"
  | "pre-signup"
  | "observatory"
  | "operations"
  | "revenue-intelligence";

export async function loadGosSection(
  section: GosSection,
  input: { preset?: string; start?: string; end?: string; [key: string]: string | undefined },
) {
  const range = parseGrowthTimeRange(input);
  const cacheKey = getCacheKey(section, range, input);
  const cached = getCachedSection(cacheKey);
  if (cached) return cached;

  const dashboard = await computeGrowthDashboard(input);
  const exec = dashboard.executive;
  const osPayload = await loadGrowthOsPayload();

  let payload: unknown;

  switch (section) {
    case "overview":
    case "executive":
      payload = { dashboard, section };
      break;
    case "acquisition":
      payload = {
        kpis: {
          downloads: dashboard.kpis.downloads,
          newUsers: dashboard.kpis.newUsers,
          appOpens: dashboard.kpis.appOpens,
        },
        funnel: dashboard.funnel.filter((f) =>
          ["store_visit", "install", "first_open", "signup"].includes(f.key),
        ),
        topCampaigns: dashboard.tables.topCampaigns,
      };
      break;
    case "activation":
      payload = {
        funnel: dashboard.funnel.filter((f) =>
          ["signup", "onboarding_completed", "routine_generated", "speech_coach_started"].includes(f.key),
        ),
        features: dashboard.features,
      };
      break;
    case "retention":
      payload = { retention: dashboard.retention };
      break;
    case "revenue": {
      const revenueIntelligence = await computeRevenueIntelligence(input);
      payload = {
        subscriptions: dashboard.subscriptions,
        charts: {
          revenue: dashboard.charts.revenue,
          subscriptionGrowth: dashboard.charts.subscriptionGrowth,
        },
        kpis: {
          mrr: dashboard.kpis.mrr,
          arr: dashboard.kpis.arr,
          subscriptionRevenue: dashboard.kpis.subscriptionRevenue,
        },
        attribution: buildRevenueAttribution(dashboard.funnel),
        revenueIntelligence,
      };
      break;
    }
    case "campaigns":
      payload = await getCampaignHub(range);
      break;
    case "experiments":
      payload = await getExperimentCenterPayload();
      break;
    case "intelligence":
      payload = {
        amyInsights: exec.amyInsights,
        rootCauses: exec.rootCauses,
        insights: dashboard.insights,
      };
      break;
    case "recommendations":
    case "decisions":
      payload = await getDecisionCenterPayload(exec.recommendations);
      break;
    case "alerts":
      payload = await getAlertsWorkflowPayload(exec.alerts);
      break;
    case "predictions":
      payload = {
        v1: exec.predictions,
        v2: computePredictionsV2({
          kpis: dashboard.kpis,
          subscriptions: dashboard.subscriptions,
          retention: dashboard.retention,
          settings: osPayload.settings,
        }),
      };
      break;
    case "settings":
      payload = { settings: osPayload.settings };
      break;
    case "attribution":
      payload = buildRevenueAttribution(dashboard.funnel);
      break;
    case "journey":
      payload = {
        ...(await exploreJourney(range, {
          country: input.country,
          platform: input.platform,
          campaign: input.campaign,
          appVersion: input.appVersion,
          feature: input.feature,
        })),
        filterOptions: await listJourneyFilterOptions(range),
      };
      break;
    case "cohorts":
      payload = {
        cohortType: (input.cohortType as CohortType) ?? "install",
        rows: await exploreCohorts(range, (input.cohortType as CohortType) ?? "install"),
      };
      break;
    case "calendar":
      payload = { events: await buildGrowthCalendar(range) };
      break;
    case "feature-impact":
      payload = { features: await computeFeatureImpactLab(range) };
      break;
    case "copilot":
      payload = answerCopilotQuestion({ question: input.question ?? "" });
      break;
    case "pre-signup":
      payload = await computePreSignupFunnel(range);
      break;
    case "observatory": {
      const [observatory, brief, operations] = await Promise.all([
        computeGrowthObservatory(input),
        computeDailyBrief(input),
        computeGrowthOperations({ ...input, persistKnowledge: true }),
      ]);
      payload = { observatory, brief, operations };
      break;
    }
    case "operations":
      payload = await computeGrowthOperations({ ...input, persistKnowledge: true });
      break;
    case "revenue-intelligence":
      payload = await computeRevenueIntelligence(input);
      break;
    default:
      payload = { dashboard };
  }

  const result = {
    ok: true,
    section,
    generatedAt: new Date().toISOString(),
    timeRange: dashboard.timeRange,
    data: payload,
  };
  setCachedSection(cacheKey, result);
  return result;
}

export {
  listDecisions,
  updateDecisionStatus,
  listExperiments,
  upsertExperiment,
  updateAlertWorkflow,
  updateSettings,
  answerCopilotQuestion,
};
export type { GrowthOsExperiment, GrowthOsSettings };
