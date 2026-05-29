import { useCallback, useEffect, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import type { ContentBankCategory } from "@workspace/content-bank";

export type ContentBankFeedResponse<T = unknown> = {
  ok: true;
  category: ContentBankCategory;
  manifestVersion: string;
  items: T[];
  totalUnlocked: number;
  totalEligible: number;
  offset: number;
  limit: number;
  hasMore: boolean;
};

export type ContentBankStatusResponse = {
  ok: true;
  manifestVersion: string;
  generatedAt: string;
  childAgeBand: string;
  learningLevel: number;
  masteryScore: number;
  categories: Record<
    string,
    { eligible: number; unlocked: number; ageBand: string }
  >;
};

export function useContentBankFeed<T = unknown>(
  category: ContentBankCategory,
  childId: number | undefined,
  opts?: { limit?: number; enabled?: boolean },
) {
  const authFetch = useAuthFetch();
  const [data, setData] = useState<ContentBankFeedResponse<T> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!childId || childId <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const limit = opts?.limit ?? 8;
      const res = await authFetch(
        `/api/content-bank/${category}/feed?childId=${childId}&limit=${limit}`,
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `feed_${res.status}`);
        setData(null);
        return;
      }
      const json = (await res.json()) as ContentBankFeedResponse<T>;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "feed_failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [authFetch, category, childId, opts?.limit]);

  useEffect(() => {
    if (opts?.enabled === false) return;
    void refresh();
  }, [refresh, opts?.enabled]);

  return { data, loading, error, refresh };
}

export function useContentBankItem<T = unknown>(
  category: ContentBankCategory,
  itemId: string | null,
  childId: number | undefined,
) {
  const authFetch = useAuthFetch();
  const [data, setData] = useState<{ item: T; progressActivityId: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!itemId || !childId || childId <= 0) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void authFetch(
      `/api/content-bank/${category}/${encodeURIComponent(itemId)}?childId=${childId}`,
    )
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `item_${res.status}`);
        }
        return res.json() as Promise<{
          ok: true;
          item: T;
          progressActivityId: string;
        }>;
      })
      .then((json) => {
        if (!cancelled) {
          setData({ item: json.item, progressActivityId: json.progressActivityId });
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "item_failed");
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authFetch, category, itemId, childId]);

  return { data, loading, error };
}
