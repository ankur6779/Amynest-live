import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { ageMonthsToGroup, PARENT_TASKS_BY_GROUP } from "@workspace/age-content";

/**
 * Lightweight "Things YOU can do today" companion shown directly under the
 * routine carousel on the Today's Plan page. Tasks are read-only suggestions
 * — local-only checkbox state lets the parent visually mark them as done
 * without needing a server round-trip.
 */
export function ParentTasks({
  ageMonths = 36,
  childName,
}: {
  ageMonths?: number;
  childName?: string;
}) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const group = ageMonthsToGroup(ageMonths);
  const tasks = PARENT_TASKS_BY_GROUP[group];
  const [done, setDone] = useState<Record<string, boolean>>({});

  const toggle = (key: string) =>
    setDone((d) => ({ ...d, [key]: !d[key] }));

  return (
    <View style={s.wrap}>
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>👨‍👩‍👧 Parent Tasks for Today</Text>
          <Text style={s.subtitle}>
            {childName
              ? `Quick ways to connect with ${childName} today`
              : "Quick ways to connect today"}
          </Text>
        </View>
      </View>
      <View style={{ gap: 8 }}>
        {tasks.map((t) => {
          const isDone = !!done[t.task];
          return (
            <Pressable
              key={t.task}
              onPress={() => toggle(t.task)}
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
    checkDone: { backgroundColor: "#22c55e", borderColor: "#22c55e" },
    emoji: { fontSize: 22 },
    taskText: { color: c.foreground, fontSize: 13, fontWeight: "600", lineHeight: 18 },
    taskTextDone: { textDecorationLine: "line-through", color: c.textMuted },
    taskMeta: { color: c.textDim, fontSize: 11, marginTop: 2 },
  });
}
