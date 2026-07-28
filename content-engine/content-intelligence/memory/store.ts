/**
 * Permanent content memory — track every generated video; prevent duplicates.
 */

import { createHash } from "node:crypto";
import type { ContentPackage } from "../../types/content-package.js";
import type { PerformancePrediction } from "../../types/campaign-plan.js";
import { clusterTopicToSeries } from "../clustering/series.js";
import type {
  PublishPlatform,
  VideoMemoryRecord,
} from "../types.js";

export interface ContentMemoryStore {
  list(): VideoMemoryRecord[];
  get(videoId: string): VideoMemoryRecord | undefined;
  hasTopic(topicId: string): boolean;
  findNearDuplicate(input: {
    topicId: string;
    hook: string;
    feature: string;
  }): VideoMemoryRecord | undefined;
  remember(record: VideoMemoryRecord): void;
  rememberFromPackage(input: {
    content: ContentPackage;
    videoId?: string;
    platform?: PublishPlatform;
    publishDate?: string | null;
    predicted?: PerformancePrediction | null;
  }): VideoMemoryRecord;
  updateActual(
    videoId: string,
    actual: NonNullable<VideoMemoryRecord["actual"]>,
  ): void;
}

export class InMemoryContentMemoryStore implements ContentMemoryStore {
  private readonly byId = new Map<string, VideoMemoryRecord>();

  constructor(seed: VideoMemoryRecord[] = []) {
    for (const record of seed) this.byId.set(record.videoId, record);
  }

  list(): VideoMemoryRecord[] {
    return [...this.byId.values()].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
  }

  get(videoId: string): VideoMemoryRecord | undefined {
    return this.byId.get(videoId);
  }

  hasTopic(topicId: string): boolean {
    return this.list().some((r) => r.topicId === topicId);
  }

  findNearDuplicate(input: {
    topicId: string;
    hook: string;
    feature: string;
  }): VideoMemoryRecord | undefined {
    const hookKey = normalize(input.hook);
    const featureKey = normalize(input.feature);
    return this.list().find((r) => {
      if (r.topicId === input.topicId) return true;
      return (
        normalize(r.hook) === hookKey &&
        normalize(r.feature) === featureKey &&
        hookKey.length > 12
      );
    });
  }

  remember(record: VideoMemoryRecord): void {
    this.byId.set(record.videoId, record);
  }

  rememberFromPackage(input: {
    content: ContentPackage;
    videoId?: string;
    platform?: PublishPlatform;
    publishDate?: string | null;
    predicted?: PerformancePrediction | null;
  }): VideoMemoryRecord {
    const topic = input.content.topic;
    const videoId =
      input.videoId ??
      `mem_${createHash("sha256")
        .update(`${topic.id}|${input.content.hook}|${input.content.generatedAt}`)
        .digest("hex")
        .slice(0, 12)}`;
    const record: VideoMemoryRecord = {
      videoId,
      topicId: topic.id,
      topicTitle: topic.title,
      feature: input.content.keyPoints[0] ?? topic.category,
      hook: input.content.hook,
      emotion: inferEmotion(input.content),
      characters: extractCharacters(input.content),
      durationSeconds: input.content.estimatedDuration,
      publishDate: input.publishDate ?? null,
      platform: input.platform ?? "youtube-short",
      cta: input.content.cta,
      seriesId: clusterTopicToSeries(topic),
      predicted: input.predicted ?? null,
      actual: null,
      createdAt: new Date().toISOString(),
    };
    this.remember(record);
    return record;
  }

  updateActual(
    videoId: string,
    actual: NonNullable<VideoMemoryRecord["actual"]>,
  ): void {
    const existing = this.byId.get(videoId);
    if (!existing) return;
    this.byId.set(videoId, {
      ...existing,
      actual: { ...existing.actual, ...actual },
    });
  }
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function inferEmotion(content: ContentPackage): string {
  const hay = `${content.hook} ${content.story} ${content.cta}`.toLowerCase();
  if (/hope|better|tomorrow/.test(hay)) return "Hope";
  if (/confiden|proud|win/.test(hay)) return "Confidence";
  if (/curious|wonder|discover/.test(hay)) return "Curiosity";
  if (/calm|routine|gentle/.test(hay)) return "Calm";
  return "Warmth";
}

function extractCharacters(content: ContentPackage): string[] {
  const hay = `${content.story} ${content.hook}`.toLowerCase();
  const chars: string[] = [];
  if (hay.includes("amy ai") || hay.includes("amy")) chars.push("Amy AI");
  if (hay.includes("amy girl") || hay.includes("girl")) chars.push("Amy Girl");
  if (hay.includes("amy boy") || hay.includes("boy")) chars.push("Amy Boy");
  return chars.length ? chars : ["Amy AI"];
}
