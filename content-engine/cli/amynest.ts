#!/usr/bin/env node
import {
  runOpsCliCommand,
  type OpsCliCommand,
} from "../operations/cli/commands.js";
import { loadLayeredConfiguration } from "../operations/configuration/index.js";
import { loadAmyNestEnvFiles } from "../operations/env/index.js";
import { runProductionPipeline } from "../operations/production-run/index.js";
import { runTestVeoPipeline } from "../asset-engine/veo-test/index.js";
import { runTestGeminiPipeline } from "../asset-engine/gemini-test/index.js";
import { ContentIntelligence } from "../content-intelligence/index.js";
import { resolveYouTubeAccessToken } from "../publishing/youtube/oauth.js";
import { exportWorkflowResult } from "../workflow/export/index.js";
import { WorkflowOrchestrator } from "../workflow/orchestrator/index.js";
import type { WorkflowJobRequest, WorkflowJobType } from "../types/workflow.js";
import type { CampaignModeId } from "../content-intelligence/types.js";
import { join } from "node:path";

const WORKFLOW_COMMANDS: Record<string, WorkflowJobType> = {
  "daily-short": "GenerateDailyVideos",
  "generate-one": "GenerateOneVideo",
  retry: "RetryFailedVideo",
  "publish-only": "PublishOnly",
  "render-only": "RenderOnly",
  weekly: "GenerateWeeklyContent",
  republish: "RepublishVideo",
};

const OPS_COMMANDS = new Set<OpsCliCommand>([
  "doctor",
  "health",
  "workflow-status",
  "resume",
  "backup",
  "restore",
  "logs",
  "metrics",
  "diagnostics",
  "acceptance",
]);

async function main(argv: string[]): Promise<void> {
  const [command, ...rest] = argv;
  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  const flags = parseFlags(rest);
  const repoRoot = findRepoRoot();
  loadAmyNestEnvFiles(repoRoot);
  loadAmyNestEnvFiles(process.cwd());

  if (command === "production-run") {
    const report = await runProductionPipeline({
      cwd: repoRoot,
      count: flags.count ? Number(flags.count) : 3,
      visibility: (flags.visibility as "unlisted" | "private" | "public") ?? "unlisted",
      dataDirectory: flags["data-dir"],
      backupDirectory: flags["backup-dir"],
      outputDirectory: flags["output-dir"],
    });
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.ok ? 0 : 1;
    return;
  }

  if (command === "test-veo") {
    const result = await runTestVeoPipeline({
      cwd: repoRoot,
      outputDirectory: flags["output-dir"],
      reportPath:
        flags.report ??
        join(repoRoot, "content-engine", "docs", "operations", "TEST_VEO_REPORT.md"),
      skipRender: flags["skip-render"] === "true",
    });
    console.log(result.reportMarkdown);
    console.log(
      JSON.stringify(
        {
          ok: result.ok,
          reportPath: result.reportPath,
          videoPath: result.generated?.videoPath,
          finalVideoPath: result.finalVideoPath,
          errors: result.errors,
        },
        null,
        2,
      ),
    );
    process.exitCode = result.ok ? 0 : 1;
    return;
  }

  if (command === "test-gemini") {
    const result = await runTestGeminiPipeline({
      cwd: repoRoot,
      outputDirectory: flags["output-dir"],
      reportPath:
        flags.report ??
        join(repoRoot, "content-engine", "docs", "operations", "TEST_GEMINI_REPORT.md"),
      skipMusic: flags["skip-music"] === "true",
    });
    console.log(result.reportMarkdown);
    console.log(
      JSON.stringify(
        {
          ok: result.ok,
          reportPath: result.reportPath,
          finalVideoPath: result.finalVideoPath,
          errors: result.errors,
        },
        null,
        2,
      ),
    );
    process.exitCode = result.ok ? 0 : 1;
    return;
  }

  if (command === "intelligence") {
    const campaignMode = (flags.campaign as CampaignModeId | undefined) ?? "none";
    const intel = new ContentIntelligence({ campaignMode });
    const plan = intel.plan({
      campaignMode,
      startDate: flags["start-date"],
    });
    console.log(
      JSON.stringify(
        {
          version: plan.version,
          campaignMode: plan.campaignMode,
          calendar: {
            id: plan.calendar.id,
            startDate: plan.calendar.startDate,
            endDate: plan.calendar.endDate,
            daysPlanned: plan.calendar.days.filter((d) => d.topicId).length,
            categoryBalance: plan.calendar.categoryBalance,
            seriesBalance: plan.calendar.seriesBalance,
            sampleWeek: plan.calendar.days.slice(0, 7),
          },
          dashboard: plan.dashboard,
          seasonalFocus: plan.seasonalFocus.map((e) => e.name),
          availableCampaigns: plan.availableCampaigns.map((c) => c.id),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (OPS_COMMANDS.has(command as OpsCliCommand)) {
    const result = await runOpsCliCommand(command as OpsCliCommand, flags);
    if (result.stdout) console.log(result.stdout);
    process.exitCode = result.exitCode;
    return;
  }

  const jobType = WORKFLOW_COMMANDS[command];
  if (!jobType) {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exitCode = 1;
    return;
  }

  const production = flags.production === "true" || process.env.AMYNEST_ENV === "production";
  if (production) {
    await resolveYouTubeAccessToken({ persistToEnv: true }).catch(() => undefined);
  }

  const productionOverrides = production
    ? {
        providerFallbackMode: "none" as const,
        secretValidationMode: "strict" as const,
        renderer: (process.env.AMYNEST_RENDERER as "ffmpeg" | "mock" | undefined) ?? "ffmpeg",
        publishingProvider:
          (process.env.AMYNEST_PUBLISHING_PROVIDER as "youtube" | "mock" | undefined) ??
          "youtube",
        analyticsProvider:
          (process.env.AMYNEST_ANALYTICS_PROVIDER as "youtube" | "mock" | undefined) ??
          "youtube",
        scriptProvider:
          (process.env.AMYNEST_SCRIPT_PROVIDER as
            | "gemini"
            | "openai"
            | "mock"
            | undefined) ??
          (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
            ? ("gemini" as const)
            : process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY
              ? ("openai" as const)
              : ("mock" as const)),
        fallbackProvider:
          (process.env.AMYNEST_FALLBACK_PROVIDER as
            | "openai"
            | "gemini"
            | "mock"
            | undefined) ??
          (process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY
            ? ("openai" as const)
            : ("mock" as const)),
        defaultVisibility:
          (process.env.AMYNEST_DEFAULT_VISIBILITY as
            | "public"
            | "private"
            | "unlisted"
            | undefined) ?? ("unlisted" as const),
      }
    : {};

  const loaded = loadLayeredConfiguration({
    environment: production ? "production" : undefined,
    runtimeOverrides: {
      ...(flags.concurrency
        ? { workflowConcurrency: Number(flags.concurrency) }
        : {}),
      ...(flags.count ? { dailyVideoCount: Number(flags.count) } : {}),
      ...productionOverrides,
    },
  });

  if (!loaded.validation.ok) {
    console.error(
      JSON.stringify(
        {
          error: "Invalid configuration",
          issues: loaded.validation.issues,
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
    return;
  }

  const config = loaded.config;
  const request: WorkflowJobRequest = {
    type: jobType,
    trigger: (flags.trigger as WorkflowJobRequest["trigger"]) ?? "manual",
    topicId: flags.topic,
    workflowId: flags.workflow,
    videoUnitId: flags.unit,
    count: flags.count ? Number(flags.count) : undefined,
    priority: flags.priority ? Number(flags.priority) : undefined,
  };

  const orchestrator = new WorkflowOrchestrator({
    config,
    sleep: async () => undefined,
  });

  const { result } = flags.queue
    ? await orchestrator.enqueueAndRun(request)
    : flags.resume && flags.workflow
      ? await orchestrator.resume(flags.workflow)
      : await orchestrator.run(request);

  const report = exportWorkflowResult(result, "workflow-report-v1");
  console.log(report.content);
  if (result.status === "failed") process.exitCode = 1;
}

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--") continue;
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    if (!key) continue;
    const next = args[i + 1];
    if (!next || next === "--" || next.startsWith("--")) {
      flags[key] = "true";
    } else {
      flags[key] = next;
      i += 1;
    }
  }
  return flags;
}

function findRepoRoot(): string {
  // Prefer monorepo root when CLI is invoked from content-engine package.
  const cwd = process.cwd();
  if (cwd.endsWith("content-engine")) {
    return `${cwd}/..`;
  }
  return cwd;
}

function printHelp(): void {
  console.log(`AmyNest Content Engine CLI (Phases 7 + 10)

Workflow commands:
  pnpm amynest:daily-short [--production]
  pnpm amynest:generate-one [--topic <topicId>] [--production]
  pnpm amynest:retry --workflow <workflowId> [--unit <videoUnitId>]
  pnpm amynest:publish-only --workflow <workflowId> [--unit <videoUnitId>]
  pnpm amynest:render-only --workflow <workflowId> [--unit <videoUnitId>]

Production:
  pnpm amynest:production-run [--count 3] [--visibility unlisted]
  pnpm amynest:test-veo [--output-dir <path>] [--report <path>] [--skip-render]
  pnpm amynest:test-gemini [--output-dir <path>] [--report <path>] [--skip-music]

Content Intelligence (above pipeline — no new phase):
  pnpm amynest:intelligence [--campaign <mode>] [--start-date YYYY-MM-DD]

Operations commands:
  pnpm amynest:doctor
  pnpm amynest:health
  pnpm amynest:workflow-status
  pnpm amynest:resume [--workflow <workflowId>]
  pnpm amynest:backup
  pnpm amynest:restore --backup <backupId>
  pnpm amynest:logs
  pnpm amynest:metrics

Options:
  --production         Fail-closed real providers (ffmpeg/youtube) via env
  --visibility <mode>  public|private|unlisted for production-run
  --topic <id>         Topic id for single-video jobs
  --workflow <id>      Existing workflow id for retry/resume/publish/render
  --unit <id>          Video unit id inside a workflow
  --backup <id>        Backup id for restore
  --count <n>          Override batch size
  --concurrency <n>    Override workflow concurrency
  --priority <n>       Queue priority
  --queue              Enqueue through the workflow queue
  --resume             Resume from latest checkpoint
  --trigger <name>     manual|cron|coolify|docker|cloud
  --memory             Use in-memory ops store (doctor/acceptance)
`);
}

const args = process.argv.slice(2);
main(args).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
