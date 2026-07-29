/**
 * Video DNA — permanent creative profile for every published video.
 */

import { clusterTopicToSeries } from "../../content-intelligence/clustering/series.js";
import { activeIntelligenceSeasons } from "../../content-intelligence/seasonal/engine.js";
import type { ContentPackage } from "../../types/content-package.js";
import type { PublishedVideo } from "../../types/published-video.js";
import type {
  CameraStyleDna,
  CtaVariant,
  HookStyle,
  LearningPlatform,
  MusicStyle,
  ThumbnailStyle,
  VideoDna,
} from "../types.js";

export function extractVideoDna(input: {
  video: PublishedVideo;
  content?: ContentPackage;
  topicId?: string;
  goldenScriptId?: string | null;
  campaign?: string;
  sceneCount?: number;
  musicStyle?: MusicStyle;
  cameraStyle?: CameraStyleDna;
  thumbnailStyle?: ThumbnailStyle;
}): VideoDna {
  const content = input.content;
  const topic = content?.topic;
  const topicId = input.topicId ?? topic?.id ?? "unknown-topic";
  const hook = content?.hook ?? input.video.metadata.title;
  const ctaText = content?.cta ?? "Try AmyNest AI";
  const publishAt =
    input.video.publishedAt ||
    input.video.schedule.publishAt ||
    input.video.uploadedAt;
  const day = new Date(publishAt);
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const asOf = publishAt.slice(0, 10);
  const seasons = activeIntelligenceSeasons(asOf);
  const season = seasons[0]?.name ?? "Evergreen";

  const seriesId = topic
    ? clusterTopicToSeries(topic)
    : "amy-coach-tips";

  return {
    videoId: input.video.videoId,
    publishedVideoId: input.video.id,
    goldenScriptId: input.goldenScriptId ?? null,
    hook,
    hookStyle: classifyHookStyle(hook),
    topicId,
    topicTitle: topic?.title ?? input.video.metadata.title,
    feature: content?.keyPoints[0] ?? topic?.category ?? "AmyNest",
    characters: extractCharacters(content),
    emotion: inferEmotion(content, hook),
    musicStyle: input.musicStyle ?? inferMusicStyle(content),
    cameraStyle: input.cameraStyle ?? "mixed",
    sceneCount:
      input.sceneCount ??
      Math.max(4, content?.captions.length ?? 4),
    durationSeconds: content?.estimatedDuration ?? 30,
    ctaVariant: classifyCta(ctaText),
    ctaText,
    publishTime: publishAt,
    publishHour: day.getUTCHours(),
    dayOfWeek: dayNames[day.getUTCDay()] ?? "Sunday",
    campaign: input.campaign ?? "evergreen",
    season,
    platform: mapProvider(input.video.provider),
    seriesId,
    thumbnailStyle: input.thumbnailStyle ?? classifyThumbnail(input.video),
    createdAt: new Date().toISOString(),
  };
}

function classifyHookStyle(hook: string): HookStyle {
  if (/\?/.test(hook)) return "question";
  if (/\b(stop|never|always|must)\b/i.test(hook)) return "bold-claim";
  if (/\b(learn|tip|how to|guide)\b/i.test(hook)) return "educational";
  if (/\b(once|story|morning|night)\b/i.test(hook)) return "story";
  if (/\b(calm|gentle|overwhelm|tear|hope|feel)\b/i.test(hook)) {
    return "emotional";
  }
  return "emotional";
}

function classifyCta(cta: string): CtaVariant {
  if (/\bwatch how|see how|demo\b/i.test(cta)) return "app-demo";
  if (/\bdownload|get amynest|start now\b/i.test(cta)) return "direct";
  if (/\bhabit|every day|daily\b/i.test(cta)) return "habit";
  return "soft";
}

function extractCharacters(content?: ContentPackage): string[] {
  if (!content) return ["Amy AI"];
  const hay = `${content.story} ${content.voiceScript}`.toLowerCase();
  const chars: string[] = [];
  if (/amy ai|\bamy\b/.test(hay)) chars.push("Amy AI");
  if (/amy girl|little girl/.test(hay)) chars.push("Amy Girl");
  if (/amy boy|little boy/.test(hay)) chars.push("Amy Boy");
  return chars.length ? [...new Set(chars)] : ["Amy AI"];
}

function inferEmotion(content: ContentPackage | undefined, hook: string): string {
  const hay = `${hook} ${content?.story ?? ""}`.toLowerCase();
  if (/hope|tomorrow|lighter/.test(hay)) return "Hope";
  if (/confiden|proud|win/.test(hay)) return "Confidence";
  if (/curious|wonder|discover/.test(hay)) return "Curiosity";
  if (/calm|gentle|peace/.test(hay)) return "Calm";
  if (/bond|together|family/.test(hay)) return "Bonding";
  return "Warmth";
}

function inferMusicStyle(content?: ContentPackage): MusicStyle {
  const cat = content?.topic.category ?? "";
  if (/Amy Astro/i.test(cat)) return "cosmic-soft";
  if (/Games/i.test(cat)) return "playful";
  if (/Sleep|Routine/i.test(cat)) return "calm-piano";
  if (/Learning|Speech/i.test(cat)) return "uplifting";
  return "warm-ambient";
}

function mapProvider(provider: string): LearningPlatform {
  if (provider === "youtube") return "youtube";
  if (provider === "mock") return "youtube";
  return "future";
}

function classifyThumbnail(video: PublishedVideo): ThumbnailStyle {
  if (video.thumbnail.source === "generated") return "emotion-closeup";
  if (video.thumbnail.path.includes("end")) return "brand-end";
  return "parent-child";
}
