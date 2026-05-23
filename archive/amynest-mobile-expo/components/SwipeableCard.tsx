import React from "react";
import { StyleSheet, Platform, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence,
  withDelay, runOnJS, interpolate, Extrapolation,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { brand, palette } from "@/constants/colors";
import { useTranslation } from "react-i18next";

const THRESHOLD = 100;
const COMPLETE_COLOR = palette.green500;
const DELETE_COLOR = palette.red500;
const SKIP_COLOR = palette.red500;
const SPRING = { damping: 18, stiffness: 200, mass: 0.7 } as const;

function hImpact() { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }
function hSelect() { if (Platform.OS !== "web") Haptics.selectionAsync(); }
function hSuccess() { if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }

export type SwipeableCardProps = {
  children: React.ReactNode;
  onTap?: () => void;
  onLongPress?: () => void;
  onSwipeRight?: () => void; // mark complete
  onSwipeLeft?: () => void;  // skip or delete (see leftActionMode)
  leftActionMode?: "skip" | "delete"; // skip = pulse + snap back; delete = slide out + collapse
  disableSwipeRight?: boolean;
  disableSwipeLeft?: boolean;
  borderRadius?: number;
  glowColor?: string;
};

export default function SwipeableCard({
  children, onTap, onLongPress, onSwipeRight, onSwipeLeft,
  leftActionMode = "skip",
  disableSwipeRight, disableSwipeLeft, borderRadius = 18, glowColor = brand.primary,
}: SwipeableCardProps) {
  const tx = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const collapse = useSharedValue(1);     // 1=full, 0=removed
  const glow = useSharedValue(0);
  const crossed = useSharedValue(false);

  const fireRight = () => { hSuccess(); onSwipeRight?.(); };
  const fireLeft = () => { hSuccess(); onSwipeLeft?.(); };
  const fireTap = () => { hSelect(); onTap?.(); };
  const fireLong = () => { hImpact(); onLongPress?.(); };

  // ─ Pan ───────────────────────────────────────────────────────────────
  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-18, 18])
    .onBegin(() => {
      scale.value = withSpring(0.985, SPRING);
      glow.value = withTiming(1, { duration: 140 });
    })
    .onUpdate((e) => {
      const r = e.translationX;
      // Soft elastic past threshold
      const elastic = Math.abs(r) > THRESHOLD
        ? Math.sign(r) * (THRESHOLD + (Math.abs(r) - THRESHOLD) * 0.55)
        : r;
      tx.value = elastic;
      const past = Math.abs(elastic) > THRESHOLD;
      const allowed = (r > 0 && !disableSwipeRight) || (r < 0 && !disableSwipeLeft); // i18n-ok: code expression
      if (past && allowed && !crossed.value) {
        crossed.value = true;
        runOnJS(hImpact)();
      } else if (!past && crossed.value) {
        crossed.value = false;
      }
    })
    .onEnd(() => {
      const dx = tx.value;
      scale.value = withSpring(1, SPRING);
      glow.value = withTiming(0, { duration: 200 });

      if (dx > THRESHOLD && !disableSwipeRight && onSwipeRight) {
        // satisfying complete pulse: shoot, bounce back
        tx.value = withSequence(
          withTiming(180, { duration: 140 }),
          withDelay(40, withSpring(0, { damping: 14, stiffness: 220 })),
        );
        scale.value = withSequence(
          withTiming(1.04, { duration: 130 }),
          withSpring(1, SPRING),
        );
        runOnJS(fireRight)();
      } else if (dx < -THRESHOLD && !disableSwipeLeft && onSwipeLeft) {
        if (leftActionMode === "delete") {
          tx.value = withTiming(-520, { duration: 220 });
          opacity.value = withTiming(0, { duration: 200 });
          collapse.value = withDelay(160, withTiming(0, { duration: 200 }, (done) => {
            if (done) runOnJS(fireLeft)();
          }));
        } else {
          // skip: pulse + snap back, item stays in list
          tx.value = withSequence(
            withTiming(-180, { duration: 140 }),
            withDelay(40, withSpring(0, { damping: 14, stiffness: 220 })),
          );
          scale.value = withSequence(
            withTiming(1.04, { duration: 130 }),
            withSpring(1, SPRING),
          );
          runOnJS(fireLeft)();
        }
      } else {
        tx.value = withSpring(0, { damping: 16, stiffness: 240 });
      }
      crossed.value = false;
    });

  // ─ Tap ───────────────────────────────────────────────────────────────
  const tap = Gesture.Tap()
    .maxDuration(280)
    .onBegin(() => {
      scale.value = withSpring(0.96, SPRING);
      glow.value = withTiming(1, { duration: 120 });
    })
    .onFinalize(() => {
      scale.value = withSpring(1, SPRING);
      glow.value = withTiming(0, { duration: 220 });
    })
    .onEnd((_, success) => {
      if (success) runOnJS(fireTap)();
    });

  // ─ Long press ────────────────────────────────────────────────────────
  const longPress = Gesture.LongPress()
    .minDuration(380)
    .onStart(() => { runOnJS(fireLong)(); });

  const gesture = Gesture.Race(pan, longPress, tap);

  // ─ Animated styles ───────────────────────────────────────────────────
  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { scale: scale.value },
      { rotateZ: `${interpolate(tx.value, [-200, 0, 200], [-3, 0, 3], Extrapolation.CLAMP)}deg` },
    ],
    opacity: opacity.value * interpolate(Math.abs(tx.value), [0, 200], [1, 0.85], Extrapolation.CLAMP),
    shadowColor: glowColor,
    shadowOpacity: interpolate(glow.value, [0, 1], [0, 0.55]),
    shadowRadius: interpolate(glow.value, [0, 1], [0, 16]),
    shadowOffset: { width: 0, height: 4 },
    elevation: interpolate(glow.value, [0, 1], [0, 12]),
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: collapse.value }],
    marginBottom: 10 * collapse.value,
    opacity: collapse.value,
    overflow: collapse.value < 1 ? "hidden" : "visible",
  }));

  const rightBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [10, THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));
  const leftBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-THRESHOLD, -10], [1, 0], Extrapolation.CLAMP),
  }));
  const rightIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [30, THRESHOLD], [0, 1], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(tx.value, [0, THRESHOLD, THRESHOLD + 60], [0.5, 1.1, 1.3], Extrapolation.CLAMP) },
      { rotateZ: `${interpolate(tx.value, [0, THRESHOLD * 1.5], [-30, 0], Extrapolation.CLAMP)}deg` },
    ],
  }));
  const leftIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-THRESHOLD, -30], [1, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(tx.value, [-(THRESHOLD + 60), -THRESHOLD, 0], [1.3, 1.1, 0.5], Extrapolation.CLAMP) },
      { rotateZ: `${interpolate(tx.value, [-(THRESHOLD * 1.5), 0], [0, 30], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const { t } = useTranslation();
  return (
    <Animated.View style={[styles.outer, containerStyle]}>
      {/* Reveal backdrops */}
      <View style={[styles.bgRow, { borderRadius }]} pointerEvents="none">
        <Animated.View style={[styles.bg, { borderRadius, alignItems: "flex-start", paddingLeft: 24 }, rightBgStyle]}>
          <LinearGradient
            colors={[COMPLETE_COLOR, palette.green600]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius }]}
          />
          <Animated.View style={rightIconStyle}>
            <Ionicons name="checkmark-circle" size={28} color="#FFFFFF" />
          </Animated.View>
        </Animated.View>
        <Animated.View style={[styles.bg, { borderRadius, alignItems: "flex-end", paddingRight: 24 }, leftBgStyle]}>
          <LinearGradient
            colors={[palette.red400, DELETE_COLOR]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius }]}
          />
          <Animated.View style={leftIconStyle}>
            <Ionicons name={leftActionMode === "delete" ? "trash" : "play-skip-forward"} size={24} color="#FFFFFF" />
          </Animated.View>
        </Animated.View>
      </View>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.cardWrap, { borderRadius }, cardStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: { position: "relative" },
  bgRow: { ...StyleSheet.absoluteFillObject },
  bg: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
  },
  cardWrap: {},
});
