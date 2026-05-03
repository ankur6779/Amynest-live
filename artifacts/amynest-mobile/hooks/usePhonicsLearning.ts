import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthFetch } from "@/hooks/useAuthFetch";

export type PhonicsAgeGroup = "12_24m" | "2_3y" | "3_4y" | "4_5y" | "5_6y";
export const PHONICS_AGE_GROUPS: PhonicsAgeGroup[] = [
  "12_24m",
  "2_3y",
  "3_4y",
  "4_5y",
  "5_6y",
];

export const PHONICS_STAGE_META: Record<
  PhonicsAgeGroup,
  { emoji: string; shortLabel: string; label: string; focus: string }
> = {
  "12_24m": {
    emoji: "👂",
    shortLabel: "Sound Awareness",
    label: "12–24 months • Sound Awareness",
    focus: "Hear it → mimic it → giggle 🎉",
  },
  "2_3y": {
    emoji: "🔤",
    shortLabel: "Basic Phonics",
    label: "2–3 years • Basic Phonics",
    focus: "One letter, one sound, one picture",
  },
  "3_4y": {
    emoji: "🔗",
    shortLabel: "Blending",
    label: "3–4 years • Blending",
    focus: "c–a–t → cat",
  },
  "4_5y": {
    emoji: "📖",
    shortLabel: "Reading",
    label: "4–5 years • Reading",
    focus: "Read it → understand it → smile 😊",
  },
  "5_6y": {
    emoji: "🚀",
    shortLabel: "Fluency",
    label: "5–6 years • Fluency",
    focus: "Read with feeling, not just words",
  },
};

export function getPhonicsAgeGroup(totalAgeMonths: number): PhonicsAgeGroup | null {
  if (totalAgeMonths < 12) return null;
  if (totalAgeMonths < 24) return "12_24m";
  if (totalAgeMonths < 36) return "2_3y";
  if (totalAgeMonths < 48) return "3_4y";
  if (totalAgeMonths < 60) return "4_5y";
  if (totalAgeMonths < 72) return "5_6y";
  return null;
}

export type PhonicsType = "sound" | "letter" | "word" | "sentence" | "story";

export interface PhonicsApiItem {
  id: number;
  ageGroup: string;
  level: number;
  type: PhonicsType;
  symbol: string;
  sound: string;
  phoneme: string | null;
  example: string | null;
  examples: string[] | null;
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

export interface DisplayPhonicsItem {
  id: string;
  contentId?: number;
  symbol: string;
  sound: string;
  phoneme?: string;
  example?: string;
  examples?: string[];
  emoji?: string;
  hint?: string;
  type: PhonicsType;
}

export interface PhonicsProgressMap {
  practiced: Record<string, number>;
  mastered: Record<string, true>;
  lastPracticedAt?: number;
}

const EMPTY_PROGRESS: PhonicsProgressMap = { practiced: {}, mastered: {} };

function progressKey(childId: number | string, ageGroup: string) {
  return `amynest.phonics.progress.${childId}.${ageGroup}`;
}

async function loadLocalProgress(
  childId: number | string,
  ageGroup: string,
): Promise<PhonicsProgressMap> {
  try {
    const raw = await AsyncStorage.getItem(progressKey(childId, ageGroup));
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

async function saveLocalProgress(
  childId: number | string,
  ageGroup: string,
  p: PhonicsProgressMap,
) {
  try {
    await AsyncStorage.setItem(
      progressKey(childId, ageGroup),
      JSON.stringify(p),
    );
  } catch {
    /* quota — ignore */
  }
}

function progressArrayToMap(rows: PhonicsApiProgressRow[]): PhonicsProgressMap {
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

export interface UsePhonicsLearningResult {
  ageGroup: PhonicsAgeGroup | null;
  defaultAgeGroup: PhonicsAgeGroup | null;
  loading: boolean;
  error: string | null;
  items: DisplayPhonicsItem[];
  dailyItems: DisplayPhonicsItem[];
  progress: PhonicsProgressMap;
  insights: PhonicsInsight[];
  recordPlay: (itemId: string, contentId?: number) => void;
  toggleMastered: (itemId: string, contentId?: number) => void;
}

/**
 * Mobile counterpart of the web `usePhonicsData`.
 *
 * - Fetches /api/phonics for the child with optional stage override.
 * - Persists optimistic per-child progress in AsyncStorage so the UI
 *   feels snappy even before the server write returns.
 * - Returns the child's natural stage as `defaultAgeGroup` so the
 *   stage selector can highlight it.
 */
export function usePhonicsLearning(
  childId: number | string,
  totalAgeMonths: number,
  overrideAgeGroup?: PhonicsAgeGroup | null,
): UsePhonicsLearningResult {
  const authFetch = useAuthFetch();
  const defaultAgeGroup = getPhonicsAgeGroup(totalAgeMonths);
  const ageGroup: PhonicsAgeGroup | null =
    overrideAgeGroup ?? defaultAgeGroup;

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<DisplayPhonicsItem[]>([]);
  const [dailyItems, setDailyItems] = useState<DisplayPhonicsItem[]>([]);
  const [insights, setInsights] = useState<PhonicsInsight[]>([]);
  const [progress, setProgress] = useState<PhonicsProgressMap>({
    ...EMPTY_PROGRESS,
  });
  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!ageGroup || !childId) {
      setLoading(false);
      setItems([]);
      setDailyItems([]);
      setInsights([]);
      setProgress({ ...EMPTY_PROGRESS });
      return;
    }
    const myReq = ++reqIdRef.current;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setItems([]);
    setDailyItems([]);
    setInsights([]);

    (async () => {
      // Seed from local cache first so a child switch doesn't flash empty.
      const localSeed = await loadLocalProgress(childId, ageGroup);
      if (cancelled || myReq !== reqIdRef.current) return;
      setProgress(localSeed);

      try {
        const qs = new URLSearchParams({ childId: String(childId) });
        if (overrideAgeGroup) qs.set("ageGroup", overrideAgeGroup);
        const res = await authFetch(`/api/phonics?${qs.toString()}`);
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
          phoneme: it.phoneme ?? undefined,
          example: it.example ?? undefined,
          examples: it.examples ?? undefined,
          emoji: it.emoji ?? undefined,
          hint: it.hint ?? undefined,
          type: it.type,
        });

        const mappedItems = (data.items ?? []).map(mapItem);
        const mappedDaily = (data.dailyItems ?? data.items ?? []).map(mapItem);
        const serverProgress = progressArrayToMap(data.progress ?? []);

        setItems(mappedItems);
        setDailyItems(mappedDaily);
        setInsights(data.insights ?? []);
        setProgress(serverProgress);
        await saveLocalProgress(childId, ageGroup, serverProgress);
      } catch (err) {
        if (cancelled || myReq !== reqIdRef.current) return;
        setError(err instanceof Error ? err.message : "phonics_load_failed");
      } finally {
        if (!cancelled && myReq === reqIdRef.current) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authFetch, childId, ageGroup, overrideAgeGroup]);

  const recordPlay = useCallback(
    (itemId: string, contentId?: number) => {
      setProgress((p) => {
        const next: PhonicsProgressMap = {
          ...p,
          practiced: {
            ...p.practiced,
            [itemId]: (p.practiced[itemId] ?? 0) + 1,
          },
          lastPracticedAt: Date.now(),
        };
        if (ageGroup) void saveLocalProgress(childId, ageGroup, next);
        return next;
      });
      if (contentId !== undefined) {
        void authFetch("/api/phonics/progress", {
          method: "POST",
          body: JSON.stringify({
            childId: typeof childId === "number" ? childId : Number(childId),
            contentId,
            action: "play",
          }),
        }).catch(() => {});
      }
    },
    [authFetch, childId, ageGroup],
  );

  const toggleMastered = useCallback(
    (itemId: string, contentId?: number) => {
      const cur = progressRef.current;
      const isMastered = !!cur.mastered[itemId];
      const hasPlayed = (cur.practiced[itemId] ?? 0) > 0;
      if (!isMastered && !hasPlayed) return;
      const willBeMastered = !isMastered;
      setProgress((p) => {
        const nextMastered = { ...p.mastered };
        if (willBeMastered) nextMastered[itemId] = true;
        else delete nextMastered[itemId];
        const next: PhonicsProgressMap = { ...p, mastered: nextMastered };
        if (ageGroup) void saveLocalProgress(childId, ageGroup, next);
        return next;
      });
      if (contentId !== undefined) {
        void authFetch("/api/phonics/progress", {
          method: "POST",
          body: JSON.stringify({
            childId: typeof childId === "number" ? childId : Number(childId),
            contentId,
            action: willBeMastered ? "mastered" : "unmastered",
          }),
        }).catch(() => {});
      }
    },
    [authFetch, childId, ageGroup],
  );

  return {
    ageGroup,
    defaultAgeGroup,
    loading,
    error,
    items,
    dailyItems,
    progress,
    insights,
    recordPlay,
    toggleMastered,
  };
}
