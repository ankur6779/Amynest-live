import React, { useRef } from "react";
import { View, StyleSheet, PanResponder } from "react-native";

interface TtsSliderProps {
  value: number;
  minimumValue: number;
  maximumValue: number;
  onValueChange?: (v: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  testID?: string;
  style?: object;
}

/**
 * Lightweight seek-bar slider built from core React Native primitives.
 * Shows a filled track with a round thumb knob. Scrubbing is handled via
 * PanResponder so it works without any third-party packages.
 *
 * Note: swap this out for @react-native-community/slider for a richer
 * native feel once that package is added to the project.
 */
export function TtsSlider({
  value,
  minimumValue,
  maximumValue,
  onValueChange,
  minimumTrackTintColor = "rgba(167,139,250,0.9)",
  maximumTrackTintColor = "rgba(255,255,255,0.2)",
  thumbTintColor = "rgba(167,139,250,0.9)",
  testID,
  style,
}: TtsSliderProps) {
  const trackWidthRef = useRef<number>(0);

  const range = Math.max(maximumValue - minimumValue, 1);
  const fillRatio = Math.min(Math.max((value - minimumValue) / range, 0), 1);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const x = e.nativeEvent.locationX;
      const newValue = minimumValue + (x / trackWidthRef.current) * range;
      onValueChange?.(Math.min(Math.max(newValue, minimumValue), maximumValue));
    },
    onPanResponderMove: (e) => {
      const x = e.nativeEvent.locationX;
      const newValue = minimumValue + (x / trackWidthRef.current) * range;
      onValueChange?.(Math.min(Math.max(newValue, minimumValue), maximumValue));
    },
  });

  return (
    <View
      testID={testID}
      style={[styles.track, style]}
      onLayout={(e) => {
        trackWidthRef.current = e.nativeEvent.layout.width;
      }}
      {...panResponder.panHandlers}
    >
      <View
        style={[
          styles.fill,
          { width: `${fillRatio * 100}%` as unknown as number, backgroundColor: minimumTrackTintColor },
        ]}
      />
      <View style={[styles.thumb, { backgroundColor: thumbTintColor }]} />
      <View
        style={[
          styles.remaining,
          { flex: 1, backgroundColor: maximumTrackTintColor },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  fill: {
    height: 3,
    borderRadius: 2,
  },
  thumb: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  remaining: {
    height: 3,
    borderRadius: 2,
  },
});
