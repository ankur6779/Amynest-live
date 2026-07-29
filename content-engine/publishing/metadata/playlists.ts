/**
 * Topic → AmyNest YouTube playlist mapping.
 * Playlist IDs come from env (YOUTUBE_PLAYLIST_*); names are always set for reports.
 */

import type { ContentPackage } from "../../types/content-package.js";
import type { TopicCategory } from "../../types/index.js";

export type AmyNestPlaylistName =
  | "Study Zone"
  | "Speech"
  | "Health"
  | "Games"
  | "Parent Tips"
  | "Routine";

const PLAYLIST_ENV: Record<AmyNestPlaylistName, string> = {
  "Study Zone": "YOUTUBE_PLAYLIST_STUDY_ZONE",
  Speech: "YOUTUBE_PLAYLIST_SPEECH",
  Health: "YOUTUBE_PLAYLIST_HEALTH",
  Games: "YOUTUBE_PLAYLIST_GAMES",
  "Parent Tips": "YOUTUBE_PLAYLIST_PARENT_TIPS",
  Routine: "YOUTUBE_PLAYLIST_ROUTINE",
};

const CATEGORY_MAP: Partial<Record<TopicCategory, AmyNestPlaylistName>> = {
  Learning: "Study Zone",
  "Brain Development": "Study Zone",
  "Child Development": "Study Zone",
  Speech: "Speech",
  Autism: "Speech",
  ADHD: "Speech",
  Nutrition: "Health",
  "Baby Care": "Health",
  Sleep: "Health",
  Safety: "Health",
  Milestones: "Health",
  Games: "Games",
  "Family Activities": "Games",
  Routines: "Routine",
  "Screen Time": "Routine",
  Parenting: "Parent Tips",
  "Emotional Intelligence": "Parent Tips",
  "Child Psychology": "Parent Tips",
  "Daily Motivation": "Parent Tips",
  "Amy Astro": "Parent Tips",
};

/** Pick the AmyNest playlist name for a content package. */
export function resolvePlaylistName(content: ContentPackage): AmyNestPlaylistName {
  const hay = [
    content.topic.title,
    content.topic.category,
    content.title,
    content.story,
    ...content.topic.keywords,
    ...content.keywords,
    ...content.hashtags,
  ]
    .join(" ")
    .toLowerCase();

  if (/\bstudy\s*zone\b|\blesson\b|\bworksheet\b|\blearning\b|\bphonics\b|\breading\b/.test(hay)) {
    return "Study Zone";
  }
  if (/\bspeech\b|\blanguage\b|\bpronunciation\b|\bstutter\b|\bwords?\b/.test(hay)) {
    return "Speech";
  }
  if (/\bhealth\b|\bnutrition\b|\bsleep\b|\bvaccine\b|\bfever\b|\bgrowth\b/.test(hay)) {
    return "Health";
  }
  if (/\bgames?\b|\bplay\b|\bpuzzle\b|\bactivity\b/.test(hay)) {
    return "Games";
  }
  if (/\broutine\b|\bhabit\b|\bmorning\b|\bbedtime\b|\bschedule\b/.test(hay)) {
    return "Routine";
  }

  return CATEGORY_MAP[content.topic.category] ?? "Parent Tips";
}

/** Resolve a YouTube playlist ID from name + env (optional). */
export function resolvePlaylistId(
  playlistName: AmyNestPlaylistName,
  fallbackPlaylist?: string,
): string {
  const envKey = PLAYLIST_ENV[playlistName];
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return fromEnv;

  const defaultId = process.env.YOUTUBE_PLAYLIST_DEFAULT?.trim();
  if (defaultId) return defaultId;

  const fallback = fallbackPlaylist?.trim() ?? "";
  return fallback;
}

export function looksLikeYouTubePlaylistId(value: string): boolean {
  return /^PL[\w-]{10,}$/i.test(value.trim());
}
