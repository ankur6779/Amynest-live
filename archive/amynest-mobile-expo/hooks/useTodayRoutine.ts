import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import type { RoutineTask } from "@/contexts/ProgressContext";
import { categoryIcon } from "@/constants/categoryIcons";
import {
  routineCategoryToTileId,
  sectionCtaLabel,
  tileIdToSection,
} from "@/app/(tabs)/hub-sections";
import { normalizeRoutineList, routineItems } from "@/lib/routines";

/**
 * Shared "today's routine" hook used by both the dashboard and the Parent
 * Hub's Today's Plan section. Both screens read/write the same TanStack
 * Query cache (`["routines"]`) so toggling Done/Undo from either surface
 * stays in sync without a network round-trip.
 *
 * The optimistic update + rollback pattern matches the original dashboard
 * implementation so behaviour is unchanged on that screen.
 */

export type ItemStatus = "pending" | "completed" | "skipped" | "delayed";

export type RoutineItem = {
  time: string;
  activity: string;
  duration: number;
  category: string;
  status?: ItemStatus;
  notes?: string;
  ageBand?: "2-5" | "6-10" | "10+";
  /**
   * Optional hub tile id the item is related to. The backend may set this
   * directly; otherwise the hook derives it from `category` via
   * `routineCategoryToTileId`. Used to render the Today's Plan
   * "Open in Modules / Activities / Zones" quick-jump (Task #191).
   */
  relatedTileId?: string;
};

export type Routine = {
  id: number;
  childId: number;
  childName: string;
  date: string;
  title: string;
  items: RoutineItem[];
  createdAt?: string;
};

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface UseTodayRoutineOptions {
  /** When false, the underlying query stays disabled. Defaults to true. */
  enabled?: boolean;
}

export interface UseTodayRoutineResult {
  routines: Routine[];
  todaysRoutine: Routine | null;
  tasks: RoutineTask[];
  isLoading: boolean;
  isRefetching: boolean;
  /** Timestamp (ms) of the last successful routines fetch; 0 if never fetched. */
  dataUpdatedAt: number;
  refetch: () => Promise<unknown>;
  /** Toggle a task by its synthetic id (`t-<routineId>-<idx>`). */
  onToggle: (taskId: string) => void;
  /** Resolve the routine item index from a task id, for navigation links. */
  taskIdToItemIndex: (taskId: string) => number | null;
}

export function useTodayRoutine(
  options: UseTodayRoutineOptions = {},
): UseTodayRoutineResult {
  const { enabled = true } = options;
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const todayStr = formatYMD(new Date());

  const {
    data: routines = [],
    isLoading,
    isRefetching,
    dataUpdatedAt,
    refetch,
  } = useQuery<Routine[]>({
    queryKey: ["routines"],
    queryFn: async () => {
      const res = await authFetch("/api/routines");
      if (!res.ok) return [] as Routine[];
      const raw = await res.json();
      return normalizeRoutineList<Routine>(raw);
    },
    enabled,
    // The hub redesign reads this cache from two surfaces (dashboard +
    // Today's Plan page). A 5-min staleness window plus a 30-min gc keeps
    // swipes/tab switches network-free without holding the cache forever.
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const todaysRoutine = useMemo<Routine | null>(() => {
    return routines.find((r) => (r.date ?? "").slice(0, 10) === todayStr) ?? null;
  }, [routines, todayStr]);

  const tasks = useMemo<RoutineTask[]>(() => {
    if (!todaysRoutine) return [];
    return routineItems(todaysRoutine).map((it, idx) => {
      // Quick-jump target (Task #191): prefer an explicit `relatedTileId`
      // from the backend, otherwise derive one from the category. Tiles
      // outside the partitioned grid (featured / unmapped) yield a null
      // section, in which case we leave the CTA undefined so the carousel
      // simply doesn't render the link.
      const relatedTileId =
        it.relatedTileId ?? routineCategoryToTileId(it.category) ?? undefined;
      const section = relatedTileId ? tileIdToSection(relatedTileId) : null;
      const continueLabel = section ? sectionCtaLabel(section) : undefined;
      return {
        id: `t-${todaysRoutine.id}-${idx}`,
        title: it.activity,
        time: it.time,
        minutes: it.duration ?? 30,
        // Icon resolution moved to a shared `categoryIcon()` helper on
        // main; keep using it so the dashboard and hub stay in sync.
        icon: categoryIcon(it.category),
        done: it.status === "completed",
        ageBand: it.ageBand,
        relatedTileId,
        continueLabel,
      };
    });
  }, [todaysRoutine]);

  const saveMut = useMutation({
    mutationFn: ({ routineId, items }: { routineId: number; items: RoutineItem[] }) =>
      authFetch(`/api/routines/${routineId}/items`, {
        method: "PATCH",
        body: JSON.stringify({ items }),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["routine", String(variables.routineId)] });
      qc.invalidateQueries({ queryKey: ["routines"] });
    },
  });

  const taskIdToItemIndex = useCallback(
    (taskId: string): number | null => {
      const idx = parseInt(taskId.split("-")[2] ?? "-1", 10);
      if (Number.isNaN(idx) || idx < 0 || !todaysRoutine) return null;
      const items = routineItems(todaysRoutine);
      if (idx >= items.length) return null;
      return idx;
    },
    [todaysRoutine],
  );

  const onToggle = useCallback(
    (taskId: string) => {
      if (!todaysRoutine) return;
      const idx = taskIdToItemIndex(taskId);
      if (idx == null) return;
      const items = routineItems(todaysRoutine);
      const cur = items[idx];
      const nextStatus: ItemStatus =
        cur.status === "completed" ? "pending" : "completed";
      const nextItems = items.map((it, i) =>
        i === idx ? { ...it, status: nextStatus } : it,
      );
      const prevSnapshot = qc.getQueryData<Routine[]>(["routines"]);
      qc.setQueryData<Routine[]>(["routines"], (prev) => {
        if (!prev) return prev;
        return prev.map((r) =>
          r.id === todaysRoutine.id ? { ...r, items: nextItems } : r,
        );
      });
      saveMut.mutate(
        { routineId: todaysRoutine.id, items: nextItems },
        {
          onError: () => {
            if (prevSnapshot) qc.setQueryData<Routine[]>(["routines"], prevSnapshot);
            else qc.invalidateQueries({ queryKey: ["routines"] });
          },
        },
      );
    },
    [todaysRoutine, qc, saveMut, taskIdToItemIndex],
  );

  return {
    routines,
    todaysRoutine,
    tasks,
    isLoading,
    isRefetching,
    dataUpdatedAt,
    refetch,
    onToggle,
    taskIdToItemIndex,
  };
}
