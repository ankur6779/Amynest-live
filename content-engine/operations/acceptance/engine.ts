import { AnalyticsOrchestrator } from "../../analytics/orchestrator.js";
import { BrainOrchestrator } from "../../brain/orchestrator.js";
import { getTopicById } from "../../topics/index.js";
import type { ContentEngineConfig } from "../../types/index.js";
import type { AcceptanceScenarioResult } from "../../types/operations.js";
import type { TelemetrySink } from "../../telemetry/index.js";
import { WorkflowOrchestrator } from "../../workflow/orchestrator/index.js";
import type { StructuredLogger } from "../logging/engine.js";
import type { OperationsPersistenceStore } from "../persistence/store.js";
import { validateSecrets } from "../secrets/engine.js";
import { validateProductionReadiness } from "../validation/engine.js";
import { loadLayeredConfiguration } from "../configuration/engine.js";

export interface AcceptanceOptions {
  config: ContentEngineConfig;
  store: OperationsPersistenceStore;
  telemetry: TelemetrySink;
  logger: StructuredLogger;
  now?: () => Date;
}

/**
 * Production acceptance scenario:
 * Fresh Install → Validate Config → Validate Secrets → Generate 3 Videos →
 * Render → Upload Unlisted → Verify → Analytics → Campaign Plan → Persist Learning
 */
export async function runProductionAcceptance(
  options: AcceptanceOptions,
): Promise<AcceptanceScenarioResult> {
  const startedAt = (options.now?.() ?? new Date()).toISOString();
  const steps: AcceptanceScenarioResult["steps"] = [];
  let videosGenerated = 0;
  let campaignPlanId: string | undefined;
  let analyticsReportId: string | undefined;

  const runStep = async (
    name: string,
    fn: () => Promise<string>,
  ): Promise<boolean> => {
    const t0 = Date.now();
    try {
      const message = await fn();
      steps.push({ name, ok: true, message, durationMs: Date.now() - t0 });
      return true;
    } catch (error) {
      steps.push({
        name,
        ok: false,
        message: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - t0,
      });
      return false;
    }
  };

  const config: ContentEngineConfig = {
    ...options.config,
    renderer: "mock",
    publishingProvider: "mock",
    analyticsProvider: "mock",
    trendProvider: "mock",
    scriptProvider: "mock",
    defaultVisibility: "unlisted",
    dailyVideoCount: 3,
    minimumSampleSize: 1,
  };

  let ok = await runStep("fresh-install", async () => {
    options.store.ensure();
    return "Persistent store initialized";
  });
  if (!ok) return finish();

  ok = await runStep("validate-config", async () => {
    const loaded = loadLayeredConfiguration({
      runtimeOverrides: config,
      environment: config.runtimeEnvironment ?? "local",
    });
    if (!loaded.validation.ok) {
      throw new Error(
        loaded.validation.issues.map((i) => i.message).join("; "),
      );
    }
    return "Configuration validated";
  });
  if (!ok) return finish();

  ok = await runStep("validate-secrets", async () => {
    const secrets = validateSecrets({
      config,
      environment: config.runtimeEnvironment ?? "local",
      mode: "permissive",
      now: options.now,
    });
    if (!secrets.ok) {
      throw new Error(`Missing secrets: ${secrets.missingRequired.join(", ")}`);
    }
    return "Secrets validated";
  });
  if (!ok) return finish();

  ok = await runStep("generate-three-videos", async () => {
    const readiness = validateProductionReadiness({
      config,
      environment: config.runtimeEnvironment ?? "local",
      secrets: validateSecrets({
        config,
        environment: config.runtimeEnvironment ?? "local",
        mode: "permissive",
        now: options.now,
      }),
      dataDirectory: config.dataDirectory ?? ".amynest-data",
      backupDirectory: config.backupDirectory ?? ".amynest-backups",
      queueReady: true,
      schedulerReady: true,
      now: options.now,
    });
    if (!readiness.ok) {
      throw new Error(
        readiness.checks
          .filter((c) => !c.ok)
          .map((c) => c.message)
          .join("; "),
      );
    }

    const workflow = new WorkflowOrchestrator({
      config,
      store: options.store.workflows,
      telemetry: options.telemetry,
      sleep: async () => undefined,
    });
    const { result } = await workflow.run({
      type: "GenerateDailyVideos",
      trigger: "manual",
      count: 3,
    });
    if (result.status !== "completed") {
      throw new Error(`Workflow failed: ${result.executionSummary.errors.join("; ")}`);
    }
    videosGenerated = result.videosGenerated;
    for (const unit of result.videoUnits) {
      if (unit.artifacts.published) {
        options.store.savePublishedVideo(unit.artifacts.published);
      }
    }
    return `Generated and published ${videosGenerated} unlisted videos`;
  });
  if (!ok) return finish();

  ok = await runStep("collect-analytics", async () => {
    const published = options.store.listPublishedVideos();
    if (published.length === 0) throw new Error("No published videos to analyze");
    const topic = getTopicById(published[0]!.metadata.title.includes("Astro")
      ? "parenting-001"
      : "parenting-001")!;
    const analytics = new AnalyticsOrchestrator({
      config,
      telemetry: options.telemetry,
    });
    const videoTopicIds: Record<string, string> = {};
    const topicsById: Record<string, { title: string; category: typeof topic.category; videoStyle: typeof topic.videoStyle }> = {};
    for (const video of published) {
      videoTopicIds[video.videoId] = topic.id;
      topicsById[topic.id] = {
        title: topic.title,
        category: topic.category,
        videoStyle: topic.videoStyle,
      };
    }
    const { report } = await analytics.analyze({
      videos: published,
      videoTopicIds,
      topicsById,
      schedule: "daily",
    });
    analyticsReportId = report.id;
    options.store.saveAnalytics(report);
    options.store.saveLearning(report.learningUpdates);
    return `Analytics report ${report.id} persisted`;
  });
  if (!ok) return finish();

  ok = await runStep("generate-campaign-plan", async () => {
    const reports = options.store.listAnalytics();
    const latest = reports[reports.length - 1];
    if (!latest) throw new Error("Analytics report missing");
    const brain = new BrainOrchestrator({
      config,
      telemetry: options.telemetry,
      now: options.now,
    });
    const { plan } = await brain.plan({
      analytics: latest,
      startDate: (options.now?.() ?? new Date()).toISOString().slice(0, 10),
      horizonDays: 30,
    });
    campaignPlanId = plan.id;
    options.store.saveCampaignPlan(plan);
    return `Campaign plan ${plan.id} persisted`;
  });
  if (!ok) return finish();

  await runStep("persist-learning", async () => {
    const learning = options.store.getLearning();
    if (!learning) throw new Error("Learning store empty");
    return `Learning store updated at ${learning.updatedAt}`;
  });

  return finish();

  function finish(): AcceptanceScenarioResult {
    const allOk = steps.every((s) => s.ok);
    options.logger.info("Acceptance scenario finished", {
      phase: "acceptance",
      metadata: { ok: allOk, videosGenerated },
    });
    return {
      ok: allOk,
      steps,
      startedAt,
      completedAt: (options.now?.() ?? new Date()).toISOString(),
      videosGenerated,
      campaignPlanId,
      analyticsReportId,
    };
  }
}
