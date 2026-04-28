import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  interpolate,
  Extrapolation,
  useAnimatedStyle,
  SharedValue,
} from "react-native-reanimated";
import { brand, gradients, brandAlpha, palette } from "@/constants/colors";

const { width: SCREEN_W } = Dimensions.get("window");
export const CARD_W = Math.round(SCREEN_W * 0.78);
export const CARD_H = 460;
export const CARD_GAP = 16;
export const SNAP_INTERVAL = CARD_W + CARD_GAP;

export type Routine = {
  id: string;
  title: string;
  description: string;
  duration: number;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string];
  steps: string[];
  completed: boolean;
};

type Props = {
  routine: Routine;
  index: number;
  scrollX: SharedValue<number>;
  onPress: (routine: Routine) => void;
  onToggle: (routine: Routine) => void;
};

export default function RoutineCard({ routine, index, scrollX, onPress, onToggle }: Props) {
  const inputRange = [
    (index - 1) * SNAP_INTERVAL,
    index * SNAP_INTERVAL,
    (index + 1) * SNAP_INTERVAL,
  ];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(scrollX.value, inputRange, [0.88, 1, 0.88], Extrapolation.CLAMP),
      },
      {
        translateY: interpolate(scrollX.value, inputRange, [20, 0, 20], Extrapolation.CLAMP),
      },
    ],
    opacity: interpolate(scrollX.value, inputRange, [0.5, 1, 0.5], Extrapolation.CLAMP),
  }));

  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(routine);
  };

  const handleCta = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggle(routine);
  };

  return (
    <Animated.View style={[{ width: CARD_W, marginRight: CARD_GAP }, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={handlePress}
        style={styles.touchable}
        accessibilityRole="button"
        accessibilityLabel={`${routine.title} routine, ${routine.duration} minutes, ${routine.completed ? "completed" : "pending"}`}
        accessibilityHint="Opens routine details"
      >
        <View style={[styles.card, routine.completed && styles.cardCompleted]}>
          {/* Top row: time badge + status */}
          <View style={styles.topRow}>
            <View style={styles.timeBadge}>
              <Ionicons name="time-outline" size={13} color={brand.violet300} />
              <Text style={styles.timeText}>{routine.duration} min</Text>
            </View>
            <View style={[styles.statusDot, routine.completed && styles.statusDotDone]}>
              {routine.completed ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : (
                <View style={styles.pendingDot} />
              )}
            </View>
          </View>

          {/* Floating Icon — violet gradient */}
          <View style={styles.iconWrap}>
            <View style={styles.iconGlow} />
            <LinearGradient
              colors={gradients.violetToPurple}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconCircle}
            >
              <Ionicons name={routine.icon} size={56} color="#fff" />
            </LinearGradient>
          </View>

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Bottom content */}
          <View style={styles.bottom}>
            <Text style={styles.title} numberOfLines={1}>
              {routine.title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {routine.description}
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleCta}
              style={[styles.cta, routine.completed && styles.ctaCompleted]}
              accessibilityRole="button"
              accessibilityLabel={routine.completed ? `Mark ${routine.title} as not done` : `Start ${routine.title}`}
            >
              <Ionicons
                name={routine.completed ? "checkmark-circle" : "play"}
                size={18}
                color={routine.completed ? palette.emerald500 : brand.purple500}
              />
              <Text style={[styles.ctaText, routine.completed && { color: palette.emerald500 }]}>
                {routine.completed ? "Completed" : "Start"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 24,
    shadowColor: brand.purple500,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 14,
  },
  card: {
    height: CARD_H,
    borderRadius: 24,
    padding: 22,
    overflow: "hidden",
    backgroundColor: "rgba(26,15,46,0.96)",
    borderWidth: 1.5,
    borderColor: brandAlpha.purple500_45,
  },
  cardCompleted: {
    borderColor: "rgba(16,185,129,0.50)",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: brandAlpha.purple500_15,
    borderWidth: 1,
    borderColor: brandAlpha.purple500_35,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  timeText: {
    color: brand.violet300,
    fontSize: 11.5,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  statusDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: brandAlpha.purple500_40,
    backgroundColor: brandAlpha.purple500_10,
  },
  statusDotDone: {
    backgroundColor: palette.emerald500,
    borderColor: palette.emerald500,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(196,181,253,0.6)",
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
  },
  iconGlow: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: brandAlpha.purple500_18,
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(196,181,253,0.30)",
  },
  bottom: {
    gap: 8,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  subtitle: {
    color: brand.violet300,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    opacity: 0.8,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: brandAlpha.purple500_15,
    borderWidth: 1,
    borderColor: brandAlpha.purple500_40,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 4,
  },
  ctaCompleted: {
    backgroundColor: "rgba(16,185,129,0.10)",
    borderColor: "rgba(16,185,129,0.35)",
  },
  ctaText: {
    color: brand.violet300,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
