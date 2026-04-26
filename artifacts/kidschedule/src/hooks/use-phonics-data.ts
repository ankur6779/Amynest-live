import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetHubContentQueryKey } from "@workspace/api-client-react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  getPhonicsLevel,
  type PhonicsLevel,
} from "@/lib/phonics-content";

// ─── Types mirrored from the API ─────────────────────────────────────────────

export type PhonicsType = "sound" | "letter" | "word" | "sentence" | "story";

export interface PhonicsApiItem {
  id: number;
  ageGroup: string;
  level: number;
  type: PhonicsType;
  symbol: string;
  sound: string;
  example: string | null;
  emoji: string | null;
  hint: string | null;
}

export interface PhonicsApiProgressRow {
  contentId: number;
  playCount: number;
  mastered: boolean;
  lastPlayedAt: string | null;
}

export interface PhonicsInsight {
  tone: "good" | "warn" | "info";
  emoji: string;
  text: string;
}

/**
 * Display item — unified shape used by the four cards. Sourced either from
 * the API (with `contentId` set, allowing server writes) or from the static
 * fallback (no contentId, writes go to localStorage only).
 */
export interface DisplayPhonicsItem {
  /** Stable string key — `String(contentId)` when from API, slug when fallback. */
  id: string;
  contentId?: number;
  symbol: string;
  sound: string;
  example?: string;
  emoji?: string;
  hint?: string;
  type: PhonicsType;
}

export interface PhonicsProgressMap {
  /** id → number of plays */
  practiced: Record<string, number>;
  /** id → true if marked mastered */
  mastered: Record<string, true>;
  lastPracticedAt?: number;
}

const EMPTY_PROGRESS: PhonicsProgressMap = { practiced: {}, mastered: {} };

// ─── localStorage fallback ──────────────────────────────────────────────────

function progressKey(childId: number | string, ageGroup: string) {
  return `amynest_phonics_${childId}_${ageGroup}`;
}

function loadLocalProgress(
  childId: number | string,
  ageGroup: string,
): PhonicsProgressMap {
  try {
    const raw = localStorage.getItem(progressKey(childId, ageGroup));
    if (!raw) return { ...EMPTY_PROGRESS };
    const parsed = JSON.parse(raw);
    return {
      practiced: parsed.practiced ?? {},
      mastered: parsed.mastered ?? {},
      lastPracticedAt: parsed.lastPracticedAt,
    };
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}

function saveLocalProgress(
  childId: number | string,
  ageGroup: string,
  p: PhonicsProgressMap,
) {
  try {
    localStorage.setItem(progressKey(childId, ageGroup), JSON.stringify(p));
  } catch {
    /* quota exceeded / private mode — silently ignore */
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function inferType(itemId: string, ageGroup: string): PhonicsType {
  if (ageGroup === "12_24m") return "sound";
  if (ageGroup === "5_6y") return itemId.includes(" ") ? "sentence" : "letter";
  if (ageGroup === "4_5y") return itemId.includes(" ") ? "sentence" : "letter";
  if (ageGroup === "3_4y") return "word";
  return "letter";
}

function progressArrayToMap(
  rows: PhonicsApiProgressRow[],
): PhonicsProgressMap {
  const practiced: Record<string, number> = {};
  const mastered: Record<string, true> = {};
  let last = 0;
  for (const r of rows) {
    const k = String(r.contentId);
    if (r.playCount > 0) practiced[k] = r.playCount;
    if (r.mastered) mastered[k] = true;
    if (r.lastPlayedAt) {
      const t = new Date(r.lastPlayedAt).getTime();
      if (Number.isFinite(t) && t > last) last = t;
    }
  }
  return {
    practiced,
    mastered,
    lastPracticedAt: last > 0 ? last : undefined,
  };
}

/**
 * Merge offline-saved local progress into freshly fetched server progress.
 * Local writes that happened while the API was unreachable would otherwise
 * be wiped on reconnect — this preserves them visually and queues a sync.
 *   - playCount: keep the higher of the two (local can be ahead).
 *   - mastered: union (true wins).
 *   - lastPracticedAt: latest of the two.
 */
function mergeProgress(
  server: PhonicsProgressMap,
  local: PhonicsProgressMap,
): PhonicsProgressMap {
  const practiced: Record<string, number> = { ...server.practiced };
  for (const [k, n] of Object.entries(local.practiced)) {
    practiced[k] = Math.max(practiced[k] ?? 0, n);
  }
  const mastered: Record<string, true> = { ...server.mastered };
  for (const k of Object.keys(local.mastered)) mastered[k] = true;
  const lastA = server.lastPracticedAt ?? 0;
  const lastB = local.lastPracticedAt ?? 0;
  const last = Math.max(lastA, lastB);
  return {
    practiced,
    mastered,
    lastPracticedAt: last > 0 ? last : undefined,
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UsePhonicsDataResult {
  level: PhonicsLevel | null;
  source: "api" | "fallback";
  loading: boolean;
  items: DisplayPhonicsItem[];
  dailyItems: DisplayPhonicsItem[];
  progress: PhonicsProgressMap;
  insights: PhonicsInsight[] | null;
  recordPlay: (itemId: string, contentId?: number) => void;
  toggleMastered: (itemId: string, contentId?: number) => void;
  refresh: () => void;
}

export function usePhonicsData(
  childId: number | string,
  totalAgeMonths: number,
): UsePhonicsDataResult {
  const authFetch = useAuthFetch();
  const queryClient = useQueryClient();
  const level = getPhonicsLevel(totalAgeMonths);
  const ageGroup = level?.ageGroup ?? "";

  // ── State, all keyed by childId/ageGroup ────────────────────────────────
  const [source, setSource] = useState<"api" | "fallback">("api");
  const [loading, setLoading] = useState<boolean>(true);
  const [apiItems, setApiItems] = useState<DisplayPhonicsItem[]>([]);
  const [apiDaily, setApiDaily] = useState<DisplayPhonicsItem[]>([]);
  const [insights, setInsights] = useState<PhonicsInsight[] | null>(null);
  // Always seed from this child's local key so a quick child-switch never
  // shows the previous child's data, even before the API fetch lands.
  const [progress, setProgress] = useState<PhonicsProgressMap>(() =>
    level ? loadLocalProgress(childId, level.ageGroup) : { ...EMPTY_PROGRESS },
  );

  // Refs let mutation callbacks read the *current* state synchronously
  // without depending on React's batching.
  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const sourceRef = useRef(source);
  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  const [refreshTick, setRefreshTick] = useState(0);
  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  // Track the latest request so a slow response from a stale (childId,
  // ageGroup) doesn't overwrite fresher state.
  const reqIdRef = useRef(0);

  // ── Fetch from API ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!level) {
      setLoading(false);
      return;
    }
    const myReq = ++reqIdRef.current;
    let cancelled = false;

    // FIX (architect #1): wipe per-child caches *immediately* when childId or
    // ageGroup changes so the old child's items/progress never flash on screen.
    setLoading(true);
    setApiItems([]);
    setApiDaily([]);
    setInsights(null);
    setProgress(loadLocalProgress(childId, level.ageGroup));

    (async () => {
      try {
        const res = await authFetch(
          `/api/phonics?childId=${encodeURIComponent(String(childId))}`,
        );
        if (cancelled || myReq !== reqIdRef.current) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          ageGroup: string | null;
          items: PhonicsApiItem[];
          dailyItems: PhonicsApiItem[];
          progress: PhonicsApiProgressRow[];
          insights: PhonicsInsight[];
        };
        if (cancelled || myReq !== reqIdRef.current) return;

        const mapItem = (it: PhonicsApiItem): DisplayPhonicsItem => ({
          id: String(it.id),
          contentId: it.id,
          symbol: it.symbol,
          sound: it.sound,
          example: it.example ?? undefined,
          emoji: it.emoji ?? undefined,
          hint: it.hint ?? undefined,
          type: it.type,
        });

        const apiItemsMapped = data.items.map(mapItem);
        const apiDailyMapped = (data.dailyItems ?? data.items).map(mapItem);
        const serverProgress = progressArrayToMap(data.progress ?? []);

        // FIX (architect #3): merge any offline writes still living in
        // localStorage so reconnect doesn't silently wipe them. Then queue a
        // best-effort replay so the server eventually catches up.
        const local = loadLocalProgress(childId, level.ageGroup);
        const merged = mergeProgress(serverProgress, local);

        setApiItems(apiItemsMapped);
        setApiDaily(apiDailyMapped);
        setInsights(data.insights ?? []);
        setProgress(merged);
        setSource("api");

        // Best-effort replay: for any item where local is *ahead* of the
        // server, fire the missing writes. We don't await — failures are
        // benign because the next refresh will re-merge.
        void replayLocalDeltas({
          authFetch,
          childId: typeof childId === "number" ? childId : Number(childId),
          items: apiItemsMapped,
          local,
          server: serverProgress,
        });
      } catch (err) {
        if (cancelled || myReq !== reqIdRef.current) return;
        console.warn("[phonics] API unavailable, falling back to local:", err);
        setSource("fallback");
        // (state already cleared above to per-child local snapshot)
      } finally {
        if (!cancelled && myReq === reqIdRef.current) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authFetch, childId, ageGroup, refreshTick]);

  // ── Derive display items ────────────────────────────────────────────────
  let items: DisplayPhonicsItem[];
  let dailyItems: DisplayPhonicsItem[];
  if (source === "api" && apiItems.length > 0) {
    items = apiItems;
    dailyItems = apiDaily.length > 0 ? apiDaily : apiItems;
  } else if (level) {
    items = level.items.map((it) => ({
      id: it.id,
      symbol: it.symbol,
      sound: it.sound,
      example: it.example,
      emoji: it.emoji,
      hint: it.hint,
      type: inferType(it.id, level.ageGroup),
    }));
    dailyItems = items.slice(0, 10);
  } else {
    items = [];
    dailyItems = [];
  }

  // ── Mutations ───────────────────────────────────────────────────────────

  const recordPlay = useCallback(
    (itemId: string, contentId?: number) => {
      // Optimistic local update.
      setProgress((p) => {
        const next: PhonicsProgressMap = {
          ...p,
          practiced: {
            ...p.practiced,
            [itemId]: (p.practiced[itemId] ?? 0) + 1,
          },
          lastPracticedAt: Date.now(),
        };
        if (level) saveLocalProgress(childId, level.ageGroup, next);
        return next;
      });

      if (contentId !== undefined && sourceRef.current === "api") {
        void authFetch("/api/phonics/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childId: typeof childId === "number" ? childId : Number(childId),
            contentId,
            action: "play",
          }),
        })
          .then(() => {
            const numericId =
              typeof childId === "number" ? childId : Number(childId);
            if (Number.isFinite(numericId)) {
              void queryClient.invalidateQueries({
                queryKey: getGetHubContentQueryKey({ childId: numericId }),
              });
            }
          })
          .catch((err) => {
            console.warn("[phonics] play write failed:", err);
          });
      }
    },
    [authFetch, childId, level, queryClient],
  );

  const toggleMastered = useCallback(
    (itemId: string, contentId?: number) => {
      // FIX (architect #2): read the canonical current snapshot from a ref so
      // the action we send to the server matches what we render — no race
      // window between scheduled state updates and the network call.
      const cur = progressRef.current;
      const isMastered = !!cur.mastered[itemId];
      const hasPlayed = (cur.practiced[itemId] ?? 0) > 0;
      if (!isMastered && !hasPlayed) return; // can't master something never played
      const willBeMastered = !isMastered;

      // Update local state explicitly (no toggle inside the updater).
      setProgress((p) => {
        const nextMastered = { ...p.mastered };
        if (willBeMastered) nextMastered[itemId] = true;
        else delete nextMastered[itemId];
        const next: PhonicsProgressMap = { ...p, mastered: nextMastered };
        if (level) saveLocalProgress(childId, level.ageGroup, next);
        return next;
      });

      if (contentId !== undefined && sourceRef.current === "api") {
        void authFetch("/api/phonics/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childId: typeof childId === "number" ? childId : Number(childId),
            contentId,
            action: willBeMastered ? "mastered" : "unmastered",
          }),
        })
          .then(() => {
            // Mastery flips drive the early-unlock evaluator — invalidate
            // the Parent Hub query so newly-unlocked items go live without
            // re-login.
            const numericId =
              typeof childId === "number" ? childId : Number(childId);
            if (Number.isFinite(numericId)) {
              void queryClient.invalidateQueries({
                queryKey: getGetHubContentQueryKey({ childId: numericId }),
              });
            }
          })
          .catch((err) => {
            console.warn("[phonics] mastery write failed:", err);
          });
      }
    },
    [authFetch, childId, level, queryClient],
  );

  return {
    level,
    source,
    loading,
    items,
    dailyItems,
    progress,
    insights,
    recordPlay,
    toggleMastered,
    refresh,
  };
}

// ─── Replay helper (offline deltas → server) ─────────────────────────────────

async function replayLocalDeltas(args: {
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  childId: number;
  items: DisplayPhonicsItem[];
  local: PhonicsProgressMap;
  server: PhonicsProgressMap;
}) {
  const { authFetch, childId, items, local, server } = args;
  for (const item of items) {
    if (!item.contentId) continue;
    const k = item.id;
    const localPlays = local.practiced[k] ?? 0;
    const serverPlays = server.practiced[k] ?? 0;
    const missingPlays = Math.max(0, localPlays - serverPlays);
    for (let i = 0; i < Math.min(missingPlays, 20); i++) {
      try {
        await authFetch("/api/phonics/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childId,
            contentId: item.contentId,
            action: "play",
          }),
        });
      } catch {
        return; // network failed again — give up, next refresh will retry
      }
    }
    if (local.mastered[k] && !server.mastered[k]) {
      try {
        await authFetch("/api/phonics/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childId,
            contentId: item.contentId,
            action: "mastered",
          }),
        });
      } catch {
        return;
      }
    }
  }
}
