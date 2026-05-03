import React, { useCallback, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { ageMonthsToGroup, PARENT_TASKS_BY_GROUP } from "@workspace/age-content";
import { useTranslation } from "react-i18next";

/**
 * "Things YOU can do today" companion shown directly under the routine
 * carousel on the Today's Plan page. Checkbox state persists per-child
 * per-day on the server (`/api/parent-tasks`) so it survives reload and
 * gets surfaced in the weekly recap email.
 *
 * Optimistic update + rollback against the
 * `["parent-task-completions", childId, date]` cache so taps feel instant
 * but stay consistent if the API rejects the write.
 */

type Completion = {
  id: number;
  childId: number;
  date: string;
  taskKey: string;
  createdAt: string;
};

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ParentTasks({
  childId,
  ageMonths = 36,
  childName,
}: {
  /**
   * The active child's id. When undefined (e.g. no children added yet) the
   * tasks render as a static, non-interactive preview so the empty state
   * still shows the value of the section.
   */
  childId?: number;
  ageMonths?: number;
  childName?: string;
}) {
  const { t } = useTranslation();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const authFetch = useAuthFetch();
  const qc = useQueryClient();

  const group = ageMonthsToGroup(ageMonths);
  const tasks = PARENT_TASKS_BY_GROUP[group];
  const dateStr = formatYMD(new Date());
  const cacheKey = useMemo(
    () => ["parent-task-completions", childId ?? null, dateStr] as const,
    [childId, dateStr],
  );

  const { data: completions = [] } = useQuery<Completion[]>({
    queryKey: cacheKey,
    enabled: childId != null,
    queryFn: async () => {
      const r = await authFetch(
        `/api/parent-tasks?childId=${childId}&date=${dateStr}`,
      );
      if (!r.ok) return [];
      return (await r.json()) as Completion[];
    },
    staleTime: 60 * 1000,
  });

  const doneSet = useMemo(() => {
    const m = new Set<string>();
    for (const row of completions) m.add(row.taskKey);
    return m;
  }, [completions]);

  const setMut = useMutation({
    mutationFn: async (taskKey: string) => {
      if (childId == null) return;
      const r = await authFetch("/api/parent-tasks", {
        method: "POST",
        body: JSON.stringify({ childId, date: dateStr, taskKey }),
      });
      if (!r.ok) throw new Error(`set failed (${r.status})`);
    },
    onMutate: async (taskKey) => {
      await qc.cancelQueries({ queryKey: cacheKey });
      const prev = qc.getQueryData<Completion[]>(cacheKey) ?? [];
      if (!prev.some((r) => r.taskKey === taskKey)) {
        const optimistic: Completion = {
          id: -Date.now(),
          childId: childId!,
          date: dateStr,
          taskKey,
          createdAt: new Date().toISOString(),
        };
        qc.setQueryData<Completion[]>(cacheKey, [...prev, optimistic]);
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(cacheKey, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: cacheKey });
    },
  });

  const clearMut = useMutation({
    mutationFn: async (taskKey: string) => {
      if (childId == null) return;
      const qs = new URLSearchParams({
        childId: String(childId),
        date: dateStr,
        taskKey,
      }).toString();
      const r = await authFetch(`/api/parent-tasks?${qs}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error(`clear failed (${r.status})`);
    },
    onMutate: async (taskKey) => {
      await qc.cancelQueries({ queryKey: cacheKey });
      const prev = qc.getQueryData<Completion[]>(cacheKey) ?? [];
      qc.setQueryData<Completion[]>(
        cacheKey,
        prev.filter((r) => r.taskKey !== taskKey),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(cacheKey, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: cacheKey });
    },
  });

  const toggle = useCallback(
    (taskKey: string) => {
      if (childId == null) return;
      if (doneSet.has(taskKey)) clearMut.mutate(taskKey);
      else setMut.mutate(taskKey);
    },
    [childId, doneSet, setMut, clearMut],
  );

  return (
    <View style={s.wrap}>
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{t("components.parent_tasks.parent_tasks_for_today")}</Text>
          <Text style={s.subtitle}>
            {childName
              ? `Quick ways to connect with ${childName} today`
              : "Quick ways to connect today"}
          </Text>
        </View>
      </View>
      <View style={{ gap: 8 }}>
        {tasks.map((t) => {
          const isDone = doneSet.has(t.task);
          return (
            <Pressable
              key={t.task}
              onPress={() => toggle(t.task)}
              disabled={childId == null}
              style={[s.task, isDone && s.taskDone]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isDone }}
            >
              <View style={[s.check, isDone && s.checkDone]}>
                {isDone ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
              </View>
              <Text style={s.emoji}>{t.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.taskText, isDone && s.taskTextDone]}>
                  {t.task}
                </Text>
                <Text style={s.taskMeta}>⏱ {t.time}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    wrap: {
      marginTop: 18,
      marginHorizontal: 16,
      backgroundColor: c.calloutBg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.glassBorder,
      padding: 14,
      gap: 12,
    },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    title: { color: c.foreground, fontSize: 15, fontWeight: "800" },
    subtitle: { color: c.textMuted, fontSize: 12, marginTop: 2 },
    task: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.04)",
      borderWidth: 1,
      borderColor: c.glassBorder,
    },
    taskDone: { opacity: 0.6, backgroundColor: "rgba(34,197,94,0.08)" },
    check: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: c.textDim,
      alignItems: "center",
      justifyContent: "center",
    },
    checkDone: { backgroundColor: "#22c55e", borderColor: "#22c55e" }, // audit-ok: success-green checkbox state, intentional brand-neutral colour
    emoji: { fontSize: 22 },
    taskText: { color: c.foreground, fontSize: 13, fontWeight: "600", lineHeight: 18 },
    taskTextDone: { textDecorationLine: "line-through", color: c.textMuted },
    taskMeta: { color: c.textDim, fontSize: 11, marginTop: 2 },
  });
}
