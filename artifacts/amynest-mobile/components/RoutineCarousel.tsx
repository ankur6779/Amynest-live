import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
} from "react-native-reanimated";
import type { RoutineTask } from "@/contexts/ProgressContext";
import { ACCENT_PINK, brand, gradients, palette } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  tasks: RoutineTask[];
  onToggle: (id: string) => void;
  onPressCard?: (id: string) => void;
  /**
   * Optional quick-jump handler (Task #191). When provided, completed tasks // audit-ok: task ref not hex
   * with both a `relatedTileId` and a `continueLabel` render a small link
   * under the action button that calls back with the task id. The parent
   * (TodayPlanPage) is responsible for resolving the tile id to a hub
   * section and jumping the pager.
   */
  onContinue?: (id: string) => void;
};

function TaskCard({
  task,
  onToggle,
  onPressCard,
  onContinue,
  index,
}: {
  task: RoutineTask;
  onToggle: () => void;
  onPressCard?: () => void;
  onContinue?: () => void;
  index: number;
}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const c = useColors();

  const isDone = task.done;
  const accent: readonly [string, string] = isDone
    ? [palette.emerald500, palette.emerald600]
    : gradients.violetToPurple;

  const cardA11yLabel = `${task.title}, ${task.time}, ${task.minutes} minutes, ${
    isDone ? "completed" : "pending"
  }`;
  const topRegion = (
    <>
      <LinearGradient
        colors={accent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconWrap}
      >
        <Ionicons name={task.icon as any} size={20} color="#fff" />
      </LinearGradient>

      <Text style={[styles.title, { color: c.textStrong }]} numberOfLines={1}>{task.title}</Text>
      <View style={styles.metaRow}>
        <Ionicons name="time-outline" size={12} color={c.textSubtle} />
        <Text style={[styles.metaText, { color: c.textSubtle }]}>{task.time}</Text>
        <View style={[styles.dot, { backgroundColor: c.border }]} />
        <Text style={[styles.metaText, { color: c.textSubtle }]}>{task.minutes} min</Text>
      </View>
      {task.ageBand && (
        <View style={styles.ageBandChip}>
          <Text style={styles.ageBandChipText}>Ages {task.ageBand.replace("-", "–")}</Text>
        </View>
      )}

      <View style={styles.statusRow}>
        {isDone ? (
          <View style={[styles.statusPill, { backgroundColor: `${palette.emerald500}18` }]}>
            <Ionicons name="checkmark-circle" size={12} color={palette.emerald500} />
            <Text style={[styles.statusText, { color: palette.emerald500 }]}>Completed</Text>
          </View>
        ) : (
          <View style={[styles.statusPill, { backgroundColor: `${brand.purple500}18` }]}>
            <Ionicons name="ellipse-outline" size={11} color={brand.purple500} />
            <Text style={[styles.statusText, { color: brand.purple500 }]}>Pending</Text>
          </View>
        )}
      </View>
    </>
  );

  return (
    <Animated.View entering={FadeIn.duration(400).delay(index * 60)}>
      <View
        accessible={!onPressCard}
        accessibilityLabel={onPressCard ? undefined : cardA11yLabel}
        style={[styles.card, { backgroundColor: c.surface }]}
      >
        {/* Top region — opens the routine detail when tapped, leaving the
            action button below as an independent press target so toggling
            "Done" / "Undo" never triggers navigation. */}
        {onPressCard ? (
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync();
              onPressCard();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Open routine details for ${task.title}`}
            style={({ pressed }) => [
              styles.cardPressArea,
              pressed && { opacity: 0.85 },
            ]}
          >
            {topRegion}
          </Pressable>
        ) : (
          <View style={styles.cardPressArea}>{topRegion}</View>
        )}

        <AnimatedPressable
          onPressIn={() => {
            scale.value = withSpring(0.94, { damping: 15, stiffness: 220 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 12, stiffness: 200 });
          }}
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggle();
          }}
          accessibilityRole="button"
          accessibilityLabel={isDone ? `Mark ${task.title} not done` : `Mark ${task.title} done`}
          style={[styles.actionBtn, style]}
        >
          <LinearGradient
            colors={isDone ? [c.border, c.border] : accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionGrad}
          >
            <Text style={[styles.actionText, isDone && { color: c.textSubtle }]}>
              {isDone ? "Undo" : "Done"}
            </Text>
            <Ionicons
              name={isDone ? "refresh" : "checkmark"}
              size={14}
              color={isDone ? c.textSubtle : "#fff"}
            />
          </LinearGradient>
        </AnimatedPressable>

        {/* Quick-jump link (Task #191): only rendered for completed items
            that carry a related-tile mapping AND when the parent supplied
            an `onContinue` handler. Items without a mapping simply omit
            the link, keeping the card compact. */}
        {isDone && task.relatedTileId && task.continueLabel && onContinue && (
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync();
              onContinue();
            }}
            accessibilityRole="link"
            accessibilityLabel={`${task.continueLabel} for ${task.title}`}
            style={({ pressed }) => [
              styles.continueLink,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.continueText}>{task.continueLabel}</Text>
            <Ionicons name="arrow-forward" size={12} color={ACCENT_PINK} />
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

export default function RoutineCarousel({
  tasks,
  onToggle,
  onPressCard,
  onContinue,
}: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      decelerationRate="fast"
      snapToInterval={188}
      snapToAlignment="start"
    >
      {tasks.map((t, i) => (
        <TaskCard
          key={t.id}
          task={t}
          index={i}
          onToggle={() => onToggle(t.id)}
          onPressCard={onPressCard ? () => onPressCard(t.id) : undefined}
          onContinue={onContinue ? () => onContinue(t.id) : undefined}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    width: 176,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  cardPressArea: {
    // Sits inside the card padding; lays out the icon, title, meta, and status
    // pill the same way they were before the action button was split out.
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 14.5,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
    marginBottom: 10,
  },
  metaText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 2,
  },
  statusRow: {
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  actionBtn: {
    borderRadius: 12,
    overflow: "hidden",
  },
  actionGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
  },
  actionText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  ageBandChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(14,165,233,0.12)" /* audit-ok: sky-500 age badge bg */,
    borderWidth: 1,
    borderColor: "rgba(14,165,233,0.35)" /* audit-ok: sky-500 age badge border */,
    marginBottom: 8,
  },
  ageBandChipText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#0ea5e9" /* audit-ok: sky-500 age badge */,
  },
  continueLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,78,205,0.10)" /* audit-ok: ACCENT_PINK 10% */,
  },
  continueText: {
    color: ACCENT_PINK,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
