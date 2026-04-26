import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { getApiUrl } from "@/lib/api";
import type { AgeBand } from "@/lib/age-bands";

export interface HubBandProgress {
  band: AgeBand;
  storyTotal: number;
  storyFinished: number;
  phonicsTotal: number;
  phonicsFinished: number;
  totalCount: number;
  finishedCount: number;
  percentage: number;
}

export interface HubStoryDto {
  id: number;
  driveFileId: string;
  title: string;
  category: string;
  thumbnailUrl: string | null;
  durationSec: number | null;
  streamUrl: string;
  ageBand: AgeBand | null;
  isUniversal: boolean;
  previewOnly: boolean;
  positionSec?: number;
  playCount?: number;
  completed?: boolean;
}

export interface HubPhonicsDto {
  id: number;
  ageGroup: string;
  band: AgeBand | null;
  level: number;
  type: string;
  symbol: string;
  sound: string;
  example: string | null;
  emoji: string | null;
  hint: string | null;
  conceptId: string | null;
  isUniversal: boolean;
  previewOnly: boolean;
  playCount?: number;
  mastered?: boolean;
}

export interface HubContentPayload {
  child: { id: number; name: string };
  currentBand: AgeBand;
  nextBand: AgeBand | null;
  bandProgress: HubBandProgress;
  nextBandEarlyUnlocked: boolean;
  unlockedBands: AgeBand[];
  section1: { stories: HubStoryDto[]; phonics: HubPhonicsDto[] };
  section2: {
    mode: "discovery" | "concept-grouped";
    stories: HubStoryDto[];
    phonics: HubPhonicsDto[];
  };
}

export interface UseHubContentResult {
  data: HubContentPayload | null;
  loading: boolean;
  error: string | null;
  /** Set of story ids that should be preview-only when played. */
  previewStoryIds: Set<number>;
  /** Set of phonics ids that should be preview-only when played. */
  previewPhonicsIds: Set<number>;
}

const qkey = (userId: string | null, childId: number | null) =>
  ["hub-content", userId ?? "anon", childId ?? "none"] as const;

/**
 * Parent-Hub progressive-content data hook. Pulls the server-built two-section
 * payload for the active child and exposes derived sets the UI uses to apply
 * the preview-and-lock treatment without re-deriving on every render.
 */
export function useHubContent(childId: number | null): UseHubContentResult {
  const authFetch = useAuthFetch();
  const { isSignedIn, userId } = useAuth();

  const query = useQuery<HubContentPayload>({
    queryKey: qkey(userId, childId),
    enabled: !!isSignedIn && childId !== null,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await authFetch(
        getApiUrl(`/api/hub/content?childId=${encodeURIComponent(String(childId))}`),
      );
      if (!res.ok) throw new Error(`hub-content ${res.status}`);
      return (await res.json()) as HubContentPayload;
    },
  });

  const previewStoryIds = useMemo(() => {
    const s = new Set<number>();
    for (const item of query.data?.section2.stories ?? []) {
      if (item.previewOnly) s.add(item.id);
    }
    return s;
  }, [query.data]);

  const previewPhonicsIds = useMemo(() => {
    const s = new Set<number>();
    for (const item of query.data?.section2.phonics ?? []) {
      if (item.previewOnly) s.add(item.id);
    }
    return s;
  }, [query.data]);

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    previewStoryIds,
    previewPhonicsIds,
  };
}
