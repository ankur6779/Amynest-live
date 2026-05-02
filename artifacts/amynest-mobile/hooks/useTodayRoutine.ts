import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import type { RoutineTask } from "@/contexts/ProgressContext";
import { categoryIcon } from "@/constants/categoryIcons";

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
    refetch,
  } = useQuery<Routine[]>({
    queryKey: ["routines"],
    queryFn: () =>
      authFetch("/api/routines").then((r) =>
        r.ok ? (r.json() as Promise<Routine[]>) : ([] as Routine[]),
      ),
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
    return todaysRoutine.items.map((it, idx) => ({
      id: `t-${todaysRoutine.id}-${idx}`,
      title: it.activity,
      time: it.time,
      minutes: it.duration ?? 30,
      icon: categoryIcon(it.category),
      done: it.status === "completed",
      ageBand: it.ageBand,
    }));
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
      if (Number.isNaN(idx) || idx < 0) return null;
      if (!todaysRoutine || idx >= todaysRoutine.items.length) return null;
      return idx;
    },
    [todaysRoutine],
  );

  const onToggle = useCallback(
    (taskId: string) => {
      if (!todaysRoutine) return;
      const idx = taskIdToItemIndex(taskId);
      if (idx == null) return;
      const cur = todaysRoutine.items[idx];
      const nextStatus: ItemStatus =
        cur.status === "completed" ? "pending" : "completed";
      const nextItems = todaysRoutine.items.map((it, i) =>
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
    refetch,
    onToggle,
    taskIdToItemIndex,
  };
}
