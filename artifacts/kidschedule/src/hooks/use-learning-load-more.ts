import { useCallback, useEffect, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useSubscription } from "@/hooks/use-subscription";
import {
  sanitizeLearningZoneAiObject,
  validateLearningZonePayload,
} from "@/lib/learning-zone-ai-text";
import { readStoredActiveChildId } from "@/lib/coach-age-nav";

export type LearningLoadMoreSection =
  | "smart_study"
  | "smart_math_tricks"
  | "olympiad"
  | "spelling"
  | "phonics"
  | "life_skills";

export interface LoadMoreUsage {
  isPremium: boolean;
  used: number;
  limit: number;
  remaining: number;
  charged?: boolean;
}

export interface LoadMoreResponse {
  ok: true;
  section: LearningLoadMoreSection;
  source: "cache" | "ai";
  fromCache: boolean;
  charged: boolean;
  usage: LoadMoreUsage;
  items: {
    questions?: unknown[];
    words?: unknown[];
    tasks?: unknown[];
    tricks?: unknown[];
  };
}

export function useLearningLoadMore(section: LearningLoadMoreSection) {
  const authFetch = useAuthFetch();
  const { refresh } = useSubscription();
  const [usage, setUsage] = useState<LoadMoreUsage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await authFetch(
        `/api/learning/load-more/status?section=${encodeURIComponent(section)}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as LoadMoreUsage & { ok?: boolean };
      setUsage({
        isPremium: data.isPremium,
        used: data.used,
        limit: data.limit,
        remaining: data.remaining,
      });
    } catch {
      /* best-effort */
    }
  }, [authFetch, section]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const loadMore = useCallback(
    async (body: {
      childId?: number;
      count?: number;
      excludeIds?: string[];
      params?: Record<string, unknown>;
    }): Promise<LoadMoreResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const resolvedChildId = body.childId ?? readStoredActiveChildId() ?? undefined;
        const requestBody = {
          section,
          childId: resolvedChildId,
          count: body.count,
          excludeIds: body.excludeIds,
          params: body.params ?? {},
        };
        const res = await authFetch("/api/learning/load-more", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (res.status === 402) {
          window.dispatchEvent(
            new CustomEvent("amynest:open-paywall", {
              detail: { reason: "learning_locked", section },
            }),
          );
          setError("locked");
          return null;
        }

        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error ?? `load_more_${res.status}`);
        }

        const data = (await res.json()) as LoadMoreResponse;
        let items = data.items;
        const check = validateLearningZonePayload(items);
        if (!check.valid && data.source === "ai") {
          const retry = await authFetch("/api/learning/load-more", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          });
          if (retry.ok) {
            const retryData = (await retry.json()) as LoadMoreResponse;
            items = retryData.items;
          }
        }
        items = sanitizeLearningZoneAiObject(items);
        setUsage(data.usage);
        if (data.charged) {
          refresh();
        }
        return { ...data, items };
      } catch (err) {
        setError(err instanceof Error ? err.message : "load_more_failed");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [authFetch, section, refresh],
  );

  return {
    usage,
    loading,
    error,
    loadMore,
    refreshStatus,
    canLoadMore: usage ? usage.remaining > 0 || usage.isPremium : true,
  };
}
