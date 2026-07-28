/**
 * Content Intelligence Orchestrator — strategist facade ABOVE the pipeline.
 * Plans, scores, and gates topics before script generation.
 */

import type { ContentPackage } from "../types/content-package.js";
import type { Topic } from "../types/index.js";
import { buildEditorialCalendar90d } from "./calendar/ninety-day.js";
import { getCampaignMode, listCampaignModes } from "./campaign/modes.js";
import { clusterTopicToSeries, CONTENT_SERIES } from "./clustering/series.js";
import { buildIntelligenceDashboard } from "./dashboard/snapshot.js";
import { isContentIntelligenceEnabled } from "./enable.js";
import {
  InMemoryContentMemoryStore,
  type ContentMemoryStore,
} from "./memory/store.js";
import { recommendPublishingStrategy } from "./publishing/strategy.js";
import { buildDerivativePlan } from "./reuse/derivatives.js";
import { evaluateTopic } from "./scoring/topic-gate.js";
import { activeIntelligenceSeasons } from "./seasonal/engine.js";
import type {
  CampaignModeId,
  EditorialCalendar90d,
  EvaluateTopicInput,
  IntelligenceDashboard,
  TopicGateResult,
  VideoMemoryRecord,
} from "./types.js";
import { CONTENT_INTELLIGENCE_VERSION } from "./types.js";

export interface ContentIntelligenceOptions {
  memory?: ContentMemoryStore;
  campaignMode?: CampaignModeId;
  now?: () => Date;
}

export interface ContentIntelligencePlanResult {
  version: typeof CONTENT_INTELLIGENCE_VERSION;
  calendar: EditorialCalendar90d;
  dashboard: IntelligenceDashboard;
  campaignMode: CampaignModeId;
  seasonalFocus: ReturnType<typeof activeIntelligenceSeasons>;
  seriesCatalog: typeof CONTENT_SERIES;
  availableCampaigns: ReturnType<typeof listCampaignModes>;
}

/**
 * Additive strategist layer. Does not run storyboard/render/publish.
 */
export class ContentIntelligence {
  private readonly memory: ContentMemoryStore;
  private campaignMode: CampaignModeId;
  private readonly now: () => Date;

  constructor(options: ContentIntelligenceOptions = {}) {
    this.memory = options.memory ?? new InMemoryContentMemoryStore();
    this.campaignMode = options.campaignMode ?? "none";
    this.now = options.now ?? (() => new Date());
  }

  setCampaignMode(mode: CampaignModeId): void {
    this.campaignMode = mode;
  }

  getMemoryStore(): ContentMemoryStore {
    return this.memory;
  }

  evaluateTopic(
    topic: Topic,
    overrides: Partial<EvaluateTopicInput> = {},
  ): TopicGateResult {
    const asOfDate =
      overrides.asOfDate ?? this.now().toISOString().slice(0, 10);
    return evaluateTopic({
      topic,
      asOfDate,
      memory: this.memory.list(),
      campaignMode: overrides.campaignMode ?? this.campaignMode,
      publishedTopicIds: overrides.publishedTopicIds,
      avoidedTopicIds: overrides.avoidedTopicIds,
      saturatedTopicIds: overrides.saturatedTopicIds,
      recentSeriesIds:
        overrides.recentSeriesIds ??
        this.memory.list().slice(-14).map((m) => m.seriesId),
    });
  }

  /** Plan 90-day editorial calendar + dashboard snapshot. */
  plan(input: {
    startDate?: string;
    campaignMode?: CampaignModeId;
    topics?: readonly Topic[];
  } = {}): ContentIntelligencePlanResult {
    const mode = input.campaignMode ?? this.campaignMode;
    const calendar = buildEditorialCalendar90d({
      startDate: input.startDate,
      campaignMode: mode,
      memory: this.memory.list(),
      topics: input.topics,
    });
    const asOfDate = this.now().toISOString().slice(0, 10);
    const dashboard = buildIntelligenceDashboard({
      calendar,
      memory: this.memory.list(),
      asOfDate,
      topics: input.topics,
    });
    return {
      version: CONTENT_INTELLIGENCE_VERSION,
      calendar,
      dashboard,
      campaignMode: mode,
      seasonalFocus: activeIntelligenceSeasons(asOfDate),
      seriesCatalog: CONTENT_SERIES,
      availableCampaigns: listCampaignModes(),
    };
  }

  rememberPackage(content: ContentPackage, videoId?: string): VideoMemoryRecord {
    return this.memory.rememberFromPackage({ content, videoId });
  }

  reuse(content: ContentPackage) {
    return buildDerivativePlan({ content });
  }

  publishingStrategy(topic: Topic) {
    return recommendPublishingStrategy({ topic });
  }

  cluster(topic: Topic) {
    return clusterTopicToSeries(topic);
  }

  campaign(mode: CampaignModeId = this.campaignMode) {
    return getCampaignMode(mode);
  }
}

export { isContentIntelligenceEnabled };

/** Filter a topic list through the intelligence gate (used by topic selection). */
export function filterTopicsWithIntelligence(input: {
  topics: Topic[];
  asOfDate: string;
  memory?: VideoMemoryRecord[];
  campaignMode?: CampaignModeId;
  publishedTopicIds?: string[];
  avoidedTopicIds?: string[];
}): { approved: Topic[]; rejected: TopicGateResult[] } {
  if (!isContentIntelligenceEnabled()) {
    return { approved: input.topics, rejected: [] };
  }
  const memory = input.memory ?? [];
  const approved: Topic[] = [];
  const rejected: TopicGateResult[] = [];
  const recentSeriesIds = memory.slice(-14).map((m) => m.seriesId);

  for (const topic of input.topics) {
    const gate = evaluateTopic({
      topic,
      asOfDate: input.asOfDate,
      memory,
      campaignMode: input.campaignMode ?? "none",
      publishedTopicIds: [
        ...(input.publishedTopicIds ?? []),
        ...approved.map((t) => t.id),
      ],
      avoidedTopicIds: input.avoidedTopicIds,
      recentSeriesIds: [
        ...recentSeriesIds,
        ...approved.map((t) => clusterTopicToSeries(t)),
      ],
    });
    if (gate.ok) approved.push(topic);
    else rejected.push(gate);
  }
  return { approved, rejected };
}
