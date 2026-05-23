import React, { useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { brand } from "@/constants/colors";

type GlowWrapperProps = Omit<PressableProps, "style" | "children"> & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glowColor?: string;
  pressScale?: number;
  hoverScale?: number;
  borderRadius?: number;
  disabled?: boolean;
  intensity?: "subtle" | "normal" | "strong";
};

const intensityMap = {
  subtle: { opacity: 0.35, radius: 10 },
  normal: { opacity: 0.5, radius: 15 },
  strong: { opacity: 0.75, radius: 22 },
};

export default function GlowWrapper({
  children,
  style,
  glowColor = brand.primary,
  pressScale = 0.96,
  hoverScale = 1.02,
  borderRadius = 16,
  disabled = false,
  intensity = "normal",
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  ...rest
}: GlowWrapperProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const cfg = intensityMap[intensity];

  const animateTo = (toScale: number, toGlow: number) => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: toScale,
        useNativeDriver: true,
        friction: 7,
        tension: 140,
      }),
      Animated.timing(glow, {
        toValue: toGlow,
        duration: 180,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();
  };

  const handlePressIn = (e: any) => {
    if (!disabled) animateTo(pressScale, 1);
    onPressIn?.(e);
  };
  const handlePressOut = (e: any) => {
    if (!disabled) animateTo(1, 0);
    onPressOut?.(e);
  };
  const handleHoverIn = (e: any) => {
    if (!disabled && Platform.OS === "web") animateTo(hoverScale, 0.7);
    onHoverIn?.(e);
  };
  const handleHoverOut = (e: any) => {
    if (!disabled && Platform.OS === "web") animateTo(1, 0);
    onHoverOut?.(e);
  };

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
    >
      <Animated.View
        style={[
          { borderRadius, transform: [{ scale }] },
          style,
          Platform.OS !== "web"
            ? {
                shadowColor: glowColor,
                shadowOpacity: glow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, cfg.opacity],
                }) as any,
                shadowRadius: cfg.radius,
                shadowOffset: { width: 0, height: 0 },
              }
            : null,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius,
              opacity: glow.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.25],
              }),
              backgroundColor: glowColor,
            },
          ]}
        />
        <View style={{ borderRadius, overflow: "hidden" }}>{children}</View>
      </Animated.View>
    </Pressable>
  );
}
