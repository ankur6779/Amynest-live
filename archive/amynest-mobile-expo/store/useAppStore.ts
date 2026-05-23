import { create } from "zustand";
import { fetchAppData, postAppDataRefresh, type AppDataResponse } from "@/services/api";
import { readAppDataCache, writeAppDataCache, clearAppDataCache } from "@/utils/cache";

type Status = "idle" | "loading" | "refreshing" | "ready" | "error";

type AppStoreState = {
  data: AppDataResponse | null;
  status: Status;
  error: string | null;
  lastUpdated: number | null;
  fromCache: boolean;
  hydrated: boolean;
  userId: string | null;
  requestId: number;
  queueLength: number;
  syncing: boolean;
};

type AppStoreActions = {
  hydrateFromCache: (userId: string | null) => Promise<void>;
  fetchAppData: (opts?: { silent?: boolean; userId?: string | null }) => Promise<void>;
  refresh: (opts?: { userId?: string | null }) => Promise<void>;
  setData: (data: AppDataResponse) => void;
  reset: () => Promise<void>;
  setQueueLength: (n: number) => void;
  setSyncing: (v: boolean) => void;
};

const initialState: AppStoreState = {
  data: null,
  status: "idle",
  error: null,
  lastUpdated: null,
  fromCache: false,
  hydrated: false,
  userId: null,
  requestId: 0,
  queueLength: 0,
  syncing: false,
};

export const useAppStore = create<AppStoreState & AppStoreActions>((set, get) => ({
  ...initialState,

  hydrateFromCache: async (userId) => {
    const state = get();
    // Re-hydrate when user identity changes (account switch)
    if (state.hydrated && state.userId === userId) return;
    const cached = await readAppDataCache(userId);
    if (cached) {
      set({
        data: cached.data,
        status: "ready",
        lastUpdated: cached.cachedAt,
        fromCache: true,
        hydrated: true,
        userId,
      });
    } else {
      set({ data: null, hydrated: true, userId, status: "idle", lastUpdated: null });
    }
  },

  fetchAppData: async (opts = {}) => {
    const { silent = false, userId = get().userId } = opts;
    const hasData = !!get().data;
    const reqId = get().requestId + 1;
    set({
      status: hasData ? "refreshing" : "loading",
      error: silent ? get().error : null,
      requestId: reqId,
      userId,
    });
    try {
      const data = await fetchAppData();
      // Drop stale response if a newer request started or user switched
      if (get().requestId !== reqId || get().userId !== userId) return;
      await writeAppDataCache(data, userId);
      set({
        data,
        status: "ready",
        error: null,
        lastUpdated: Date.now(),
        fromCache: false,
      });
    } catch (err) {
      if (get().requestId !== reqId || get().userId !== userId) return;
      const message = err instanceof Error ? err.message : "Failed to load data";
      if (hasData) {
        set({ status: "ready", error: message });
      } else {
        set({ status: "error", error: message });
      }
    }
  },

  refresh: async (opts = {}) => {
    const { userId = get().userId } = opts;
    const reqId = get().requestId + 1;
    set({ status: "refreshing", error: null, requestId: reqId, userId });
    try {
      const data = await postAppDataRefresh();
      if (get().requestId !== reqId || get().userId !== userId) return;
      await writeAppDataCache(data, userId);
      set({
        data,
        status: "ready",
        error: null,
        lastUpdated: Date.now(),
        fromCache: false,
      });
    } catch (err) {
      if (get().requestId !== reqId || get().userId !== userId) return;
      const message = err instanceof Error ? err.message : "Failed to refresh";
      const hasData = !!get().data;
      set({
        status: hasData ? "ready" : "error",
        error: message,
      });
    }
  },

  setData: (data) => {
    const userId = get().userId;
    set({ data, status: "ready", lastUpdated: Date.now(), fromCache: false });
    void writeAppDataCache(data, userId);
  },

  reset: async () => {
    await clearAppDataCache();
    set({ ...initialState });
  },

  setQueueLength: (n) => set({ queueLength: n }),
  setSyncing: (v) => set({ syncing: v }),
}));

// Convenience selectors
export const selectDashboard = (s: AppStoreState) => s.data?.dashboard ?? null;
export const selectRoutine = (s: AppStoreState) => s.data?.routine ?? null;
export const selectCoach = (s: AppStoreState) => s.data?.coach ?? null;
export const selectBehavior = (s: AppStoreState) => s.data?.behavior ?? null;
export const selectInsights = (s: AppStoreState) => s.data?.insights ?? [];
export const selectRecommendations = (s: AppStoreState) => s.data?.recommendations ?? [];
export const selectChildren = (s: AppStoreState) => s.data?.children ?? [];
export const selectUser = (s: AppStoreState) => s.data?.user ?? null;
