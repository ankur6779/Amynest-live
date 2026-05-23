import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { gradients } from "@/constants/colors";

type Props = {
  progress: number;
  label?: string;
  height?: number;
};

export default function ProgressBar({ progress, label, height = 8 }: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(clamped, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [clamped]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={styles.wrap}>
      {label !== undefined && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.percent}>{Math.round(clamped * 100)}%</Text>
        </View>
      )}
      <View style={[styles.track, { height, borderRadius: height / 2 }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: height / 2, overflow: "hidden" }, fillStyle]}>
          <LinearGradient
            colors={gradients.violetToPurple}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1, borderRadius: height / 2 }}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "600",
  },
  percent: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  track: {
    backgroundColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
});
