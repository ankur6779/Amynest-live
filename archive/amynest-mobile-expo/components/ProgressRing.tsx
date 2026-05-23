import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { brand, brandAlpha } from "@/constants/colors";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  size?: number;
  stroke?: number;
  progress: number;
  trackColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  centerSubtext?: string;
  labelColor?: string;
};

export default function ProgressRing({
  size = 140,
  stroke = 12,
  progress,
  trackColor = brandAlpha.violet600_12,
  gradientFrom = brand.violet300,
  gradientTo = brand.violet600,
  centerSubtext,
  labelColor,
}: Props) {
  const clamped = Math.min(1, Math.max(0, progress));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const animated = useSharedValue(0);

  useEffect(() => {
    animated.value = withTiming(clamped, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [clamped, animated]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animated.value),
  }));

  const percentColor = labelColor ?? gradientTo;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={gradientFrom} stopOpacity="1" />
            <Stop offset="1" stopColor={gradientTo} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.percent, { fontSize: size * 0.22, color: percentColor }]}>
          {Math.round(clamped * 100)}%
        </Text>
        {centerSubtext && (
          <Text style={[styles.subtext, { fontSize: size * 0.085, color: percentColor }]} numberOfLines={1}>
            {centerSubtext}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  percent: {
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtext: {
    fontWeight: "600",
    marginTop: 2,
    letterSpacing: 0.2,
  },
});
