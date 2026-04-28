import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  runOnJS, interpolate, Extrapolation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { palette } from "@/constants/colors";

const KNOB = 44;
const PADDING = 4;

interface Props {
  onComplete: () => void;
  disabled?: boolean;
  label?: string;
}

export default function SlideToComplete({ onComplete, disabled = false, label = "Slide to complete" }: Props) {
  const c = useColors();
  const { mode } = useTheme();
  const s = useMemo(() => makeStyles(c, mode), [c, mode]);

  const [trackW, setTrackW] = useState(0);
  const [done, setDone] = useState(false);

  const x = useSharedValue(0);
  const startX = useSharedValue(0);

  const maxX = Math.max(0, trackW - KNOB - PADDING * 2);

  const completeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (completeTimer.current) clearTimeout(completeTimer.current);
    };
  }, []);

  const finishOnJS = useCallback(() => {
    setDone(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (completeTimer.current) clearTimeout(completeTimer.current);
    completeTimer.current = setTimeout(() => {
      completeTimer.current = null;
      onComplete();
    }, 280);
  }, [onComplete]);

  const pan = Gesture.Pan()
    .enabled(!disabled && !done)
    .onStart(() => {
      startX.value = x.value;
    })
    .onUpdate((e) => {
      const next = Math.min(Math.max(0, startX.value + e.translationX), maxX);
      x.value = next;
    })
    .onEnd(() => {
      const progress = maxX > 0 ? x.value / maxX : 0;
      if (progress >= 0.85) {
        x.value = withTiming(maxX, { duration: 160 });
        runOnJS(finishOnJS)();
      } else {
        x.value = withSpring(0, { damping: 14, stiffness: 180 });
      }
    });

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: x.value + KNOB / 2 + PADDING,
    opacity: interpolate(x.value, [0, maxX || 1], [0.18, 0.85], Extrapolation.CLAMP),
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [0, (maxX || 1) * 0.4], [1, 0], Extrapolation.CLAMP),
  }));

  const successStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [(maxX || 1) * 0.55, (maxX || 1) * 0.95], [0, 1], Extrapolation.CLAMP),
  }));

  const onLayout = (e: LayoutChangeEvent) => setTrackW(e.nativeEvent.layout.width);

  const knobIconColor = done ? palette.green600 : (mode === "light" ? "#fff" : palette.slate400);

  return (
    <View style={[s.track, disabled && { opacity: 0.5 }]} onLayout={onLayout}>
      <Animated.View style={[s.fill, fillStyle]} pointerEvents="none" />

      <Animated.View style={[s.labelWrap, labelStyle]} pointerEvents="none">
        <Text style={s.label}>{done ? "✅ Completed!" : `${label}  →`}</Text>
      </Animated.View>

      <Animated.View style={[s.labelWrap, successStyle]} pointerEvents="none">
        <Text style={s.successLabel}>✅ Release to complete!</Text>
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[s.knob, knobStyle]}>
          <Ionicons name="checkmark" size={20} color={knobIconColor} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>, mode: "light" | "dark") {
  return StyleSheet.create({
    track: {
      height: KNOB + PADDING * 2,
      borderRadius: (KNOB + PADDING * 2) / 2,
      backgroundColor: c.calloutBg,
      borderWidth: 1,
      borderColor: c.glassBorder,
      overflow: "hidden",
      justifyContent: "center",
      position: "relative",
    },
    fill: {
      position: "absolute",
      top: 0, bottom: 0, left: 0,
      backgroundColor: "rgba(34,197,94,0.55)",
      borderRadius: (KNOB + PADDING * 2) / 2,
    },
    labelWrap: {
      position: "absolute",
      top: 0, bottom: 0, left: 0, right: 0,
      alignItems: "center", justifyContent: "center",
    },
    label: {
      color: c.textMuted,
      fontSize: 13,
      fontWeight: "700",
      letterSpacing: 0.4,
    },
    successLabel: {
      color: mode === "light" ? palette.green700 : "#bbf7d0", // audit-ok: emerald-100 for dark-mode success label
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 0.4,
    },
    knob: {
      position: "absolute",
      left: PADDING,
      width: KNOB, height: KNOB,
      borderRadius: KNOB / 2,
      backgroundColor: mode === "light" ? c.primary : "#fff",
      alignItems: "center", justifyContent: "center",
      shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
  });
}
