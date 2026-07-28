import { createHash } from "node:crypto";
import { AssetOrchestrator } from "../../asset-engine/index.js";
import type { ContentEngineConfig } from "../../types/index.js";
import type { Topic } from "../../types/index.js";
import { PublishingOrchestrator } from "../../publishing/index.js";
import { createDefaultPublishingRegistry } from "../../publishing/youtube/index.js";
import { RenderOrchestrator } from "../../render-engine/index.js";
import { createDefaultRenderRegistry } from "../../render-engine/providers/index.js";
import {
  ContentPackageService,
  InMemoryHistoryStore,
  selectTopic,
  type HistoryStore,
} from "../../services/index.js";
import { StoryboardPlanner } from "../../storyboard/index.js";
import { getAllTopics, getTopicById } from "../../topics/index.js";
import type {
  CheckpointName,
  WorkflowCheckpoint,
  WorkflowEvent,
  WorkflowJobType,
  WorkflowPhase,
  WorkflowVideoUnit,
} from "../../types/workflow.js";
import {
  createCheckpoint,
  hasCheckpoint,
} from "../checkpoints/index.js";
import {
  completePhaseTiming,
  startPhaseTiming,
} from "../telemetry/index.js";

export interface PipelineServices {
  content: ContentPackageService;
  storyboard: StoryboardPlanner;
  assets: AssetOrchestrator;
  render: RenderOrchestrator;
  publishing: PublishingOrchestrator;
  history: HistoryStore;
}

export function createPipelineServices(config: ContentEngineConfig): PipelineServices {
  const fallbackMode = config.providerFallbackMode ?? "mock";
  return {
    content: new ContentPackageService({ config }),
    storyboard: new StoryboardPlanner({ config }),
    assets: new AssetOrchestrator({ config }),
    render: new RenderOrchestrator({
      config,
      registry: createDefaultRenderRegistry({ fallbackMode }),
    }),
    publishing: new PublishingOrchestrator({
      config,
      registry: createDefaultPublishingRegistry({ fallbackMode }),
    }),
    history: new InMemoryHistoryStore(),
  };
}

export function createVideoUnit(topic: Topic): WorkflowVideoUnit {
  return {
    id: `vu_${createHash("sha256")
      .update(`${topic.id}|${Date.now()}|${Math.random()}`)
      .digest("hex")
      .slice(0, 12)}`,
    topicId: topic.id,
    topicTitle: topic.title,
    status: "queued",
    currentPhase: "topic-selection",
    latestCheckpoint: null,
    artifacts: { topic },
    errors: [],
    warnings: [],
    retries: 0,
    phaseTimings: [],
  };
}

export async function runVideoPipeline(input: {
  workflowId: string;
  unit: WorkflowVideoUnit;
  services: PipelineServices;
  jobType: WorkflowJobType;
  emit: (event: WorkflowEvent) => void;
  persistCheckpoint: (checkpoint: WorkflowCheckpoint, unit: WorkflowVideoUnit) => void;
}): Promise<WorkflowVideoUnit> {
  const unit = structuredClone(input.unit);
  unit.status = "running";
  const skipPublish = input.jobType === "RenderOnly";
  const publishOnly = input.jobType === "PublishOnly" || input.jobType === "RepublishVideo";

  try {
    if (!publishOnly) {
      await runPhase(unit, "topic-selection", async () => {
        if (!unit.artifacts.topic) {
          throw new Error(`Missing topic for video unit ${unit.id}`);
        }
      });

      if (!hasCheckpoint(unit, "ContentGenerated")) {
        await runPhase(unit, "content-generation", async () => {
          const generated = await input.services.content.generateFromTopic(
            unit.artifacts.topic!,
          );
          unit.artifacts.content = generated.package;
          if (generated.quality.overall < 60) {
            unit.warnings.push(`Low quality score: ${generated.quality.overall}`);
          }
          markCheckpoint(input, unit, "ContentGenerated");
          input.emit({
            kind: "ContentGenerated",
            at: new Date().toISOString(),
            workflowId: input.workflowId,
            videoUnitId: unit.id,
            message: `Content generated for ${unit.topicTitle}`,
          });
        });
      }

      if (!hasCheckpoint(unit, "StoryboardReady")) {
        await runPhase(unit, "storyboard-planning", async () => {
          const planned = input.services.storyboard.planFromContentPackage(
            unit.artifacts.content!,
          );
          unit.artifacts.storyboard = planned.package;
          markCheckpoint(input, unit, "StoryboardReady");
          input.emit({
            kind: "StoryboardGenerated",
            at: new Date().toISOString(),
            workflowId: input.workflowId,
            videoUnitId: unit.id,
            message: `Storyboard ready for ${unit.topicTitle}`,
          });
        });
      }

      if (!hasCheckpoint(unit, "AssetsReady")) {
        await runPhase(unit, "asset-resolution", async () => {
          const assets = await input.services.assets.orchestrate(
            unit.artifacts.storyboard!,
          );
          unit.artifacts.assets = assets.package;
          markCheckpoint(input, unit, "AssetsReady");
          input.emit({
            kind: "AssetsResolved",
            at: new Date().toISOString(),
            workflowId: input.workflowId,
            videoUnitId: unit.id,
            message: `Assets resolved for ${unit.topicTitle}`,
          });
        });
      }

      if (!hasCheckpoint(unit, "Rendered")) {
        await runPhase(unit, "rendering", async () => {
          const rendered = await input.services.render.render({
            storyboard: unit.artifacts.storyboard!,
            assets: unit.artifacts.assets!,
          });
          unit.artifacts.render = rendered.package;
          markCheckpoint(input, unit, "Rendered");
          input.emit({
            kind: "Rendered",
            at: new Date().toISOString(),
            workflowId: input.workflowId,
            videoUnitId: unit.id,
            message: `Rendered ${unit.topicTitle}`,
            details: { cacheHit: rendered.cacheHit },
          });
        });
      }
    }

    if (!skipPublish && !hasCheckpoint(unit, "Published")) {
      await runPhase(unit, "publishing", async () => {
        if (!unit.artifacts.render || !unit.artifacts.content) {
          throw new Error(
            `Publish requires render + content artifacts for unit ${unit.id}`,
          );
        }
        const published = await input.services.publishing.publish({
          render: unit.artifacts.render,
          content: unit.artifacts.content,
          idempotencyKey: `${input.workflowId}:${unit.id}`,
        });
        unit.artifacts.published = published.video;
        unit.videoId = published.video.videoId;
        unit.url = published.video.url;
        markCheckpoint(input, unit, "Published");
        input.emit({
          kind: "Published",
          at: new Date().toISOString(),
          workflowId: input.workflowId,
          videoUnitId: unit.id,
          message: `Published ${unit.topicTitle}`,
          details: { videoId: published.video.videoId },
        });
      });
    }

    await runPhase(unit, "reporting", async () => {
      unit.currentPhase = "completed";
    });

    unit.status = "completed";
    unit.currentPhase = "completed";
    return unit;
  } catch (error) {
    unit.status = "failed";
    unit.errors.push(error instanceof Error ? error.message : String(error));
    return unit;
  }
}

export function selectTopicsForJob(input: {
  jobType: WorkflowJobType;
  topicId?: string;
  count: number;
  history: HistoryStore;
  date: string;
  existingUnit?: WorkflowVideoUnit;
}): Topic[] {
  if (
    input.jobType === "RetryFailedVideo" ||
    input.jobType === "RepublishVideo" ||
    input.jobType === "RenderOnly" ||
    input.jobType === "PublishOnly"
  ) {
    if (input.existingUnit?.artifacts.topic) return [input.existingUnit.artifacts.topic];
    if (input.topicId) {
      const topic = getTopicById(input.topicId);
      if (!topic) throw new Error(`Unknown topic id: ${input.topicId}`);
      return [topic];
    }
    throw new Error(`${input.jobType} requires topicId or existing video unit`);
  }

  if (input.topicId) {
    const topic = getTopicById(input.topicId);
    if (!topic) throw new Error(`Unknown topic id: ${input.topicId}`);
    return [topic];
  }

  const topics = getAllTopics();
  const selected: Topic[] = [];
  const exclude = new Set<string>();
  for (let i = 0; i < input.count; i++) {
    const pick = selectTopic(topics, input.history, input.date, {
      windowDays: 45,
      excludeTopicIds: exclude,
    });
    if (!pick) {
      throw new Error(
        `Unable to select topic ${i + 1} of ${input.count}; rotation pool exhausted`,
      );
    }
    selected.push(pick.topic);
    exclude.add(pick.topic.id);
    input.history.record({
      topicId: pick.topic.id,
      usedAt: new Date().toISOString(),
      date: input.date,
      category: pick.topic.category,
    });
  }
  return selected;
}

async function runPhase(
  unit: WorkflowVideoUnit,
  phase: WorkflowPhase,
  work: () => Promise<void>,
): Promise<void> {
  unit.currentPhase = phase;
  const started = startPhaseTiming(phase);
  await work();
  unit.phaseTimings.push(completePhaseTiming(started));
}

function markCheckpoint(
  input: {
    workflowId: string;
    persistCheckpoint: (checkpoint: WorkflowCheckpoint, unit: WorkflowVideoUnit) => void;
  },
  unit: WorkflowVideoUnit,
  name: CheckpointName,
): void {
  unit.latestCheckpoint = name;
  const checkpoint = createCheckpoint(input.workflowId, unit.id, name);
  input.persistCheckpoint(checkpoint, unit);
}
