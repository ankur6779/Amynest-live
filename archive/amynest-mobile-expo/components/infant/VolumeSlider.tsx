import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  PanResponder,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { brand, palette } from "@/constants/colors";

type Props = {
  value: number;
  onChange: (v: number) => void;
  label: string;
  minLabel: string;
  maxLabel: string;
};

const TRACK_HEIGHT = 6;
const THUMB = 16;

/**
 * Lightweight horizontal volume slider — no third-party deps.
 *
 * Tapping the track jumps to that fraction; dragging the thumb scrubs.
 * Falls back to two +/- buttons (10% step) for screen-readers and any
 * environment where pan gestures aren't wired (e.g. jsdom in tests).
 */
export default function VolumeSlider({
  value,
  onChange,
  label,
  minLabel,
  maxLabel,
}: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const widthRef = useRef(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setTrackWidth(w);
  }, []);

  const updateFromX = useCallback(
    (x: number) => {
      const w = widthRef.current;
      if (!w || w <= 0) return;
      const fraction = Math.max(0, Math.min(1, x / w));
      onChange(fraction);
    },
    [onChange],
  );

  const onTrackPress = useCallback(
    (e: GestureResponderEvent) => {
      updateFromX(e.nativeEvent.locationX);
    },
    [updateFromX],
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        updateFromX(e.nativeEvent.locationX);
      },
      onPanResponderMove: (e) => {
        updateFromX(e.nativeEvent.locationX);
      },
    }),
  ).current;

  const safe = Math.max(0, Math.min(1, value));
  const fillWidth = trackWidth > 0 ? Math.round(trackWidth * safe) : 0;
  const thumbLeft = Math.max(0, fillWidth - THUMB / 2);
  const pct = Math.round(safe * 100);

  const decrement = useCallback(() => {
    onChange(Math.max(0, Math.round((safe - 0.1) * 100) / 100));
  }, [safe, onChange]);
  const increment = useCallback(() => {
    onChange(Math.min(1, Math.round((safe + 0.1) * 100) / 100));
  }, [safe, onChange]);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Ionicons name="volume-medium" size={14} color={palette.emerald400} />
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{pct}%</Text>
      </View>
      <View style={styles.row}>
        <Pressable
          onPress={decrement}
          accessibilityRole="button"
          accessibilityLabel={minLabel}
          hitSlop={8}
          style={styles.stepBtn}
        >
          <Ionicons name="remove" size={14} color="#fff" />
        </Pressable>
        <Pressable
          onPress={onTrackPress}
          onLayout={onLayout}
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min: 0, max: 100, now: pct }}
          style={styles.trackHit}
          {...panResponder.panHandlers}
        >
          <View style={styles.track}>
            <View style={[styles.fill, { width: fillWidth }]} />
            <View style={[styles.thumb, { left: thumbLeft }]} />
          </View>
        </Pressable>
        <Pressable
          onPress={increment}
          accessibilityRole="button"
          accessibilityLabel={maxLabel}
          hitSlop={8}
          style={styles.stepBtn}
        >
          <Ionicons name="add" size={14} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  head: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: {
    color: palette.emerald400,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    flex: 1,
  },
  value: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  trackHit: {
    flex: 1,
    paddingVertical: 8,
    justifyContent: "center",
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "visible",
    position: "relative",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: brand.purple500,
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: "absolute",
    top: -((THUMB - TRACK_HEIGHT) / 2),
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: brand.purple500,
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },
});
