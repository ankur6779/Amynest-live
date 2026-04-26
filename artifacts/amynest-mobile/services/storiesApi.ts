import { API_BASE_URL } from "@/constants/api";

export interface StoryDto {
  id: number;
  driveFileId: string;
  title: string;
  category: string;
  thumbnailUrl: string | null;
  durationSec: number | null;
  streamUrl: string;
  positionSec?: number;
  playCount?: number;
  completed?: boolean;
}

export interface StoriesPayload {
  activeChildId: number;
  child: { id: number; name: string };
  catalogSize: number;
  rows: {
    continueWatching: StoryDto[];
    recommended: StoryDto[];
    trending: StoryDto[];
    allStories: StoryDto[];
  };
}

export function absoluteStreamUrl(streamUrl: string): string {
  if (/^https?:\/\//i.test(streamUrl)) return streamUrl;
  const path = streamUrl.startsWith("/") ? streamUrl : `/${streamUrl}`;
  return `${API_BASE_URL}${path}`;
}

export function formatDuration(sec: number | null | undefined): string | null {
  if (!sec || sec <= 0) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
