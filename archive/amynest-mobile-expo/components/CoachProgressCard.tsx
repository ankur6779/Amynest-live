import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform, LayoutChangeEvent } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { brand, gradients } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "react-i18next";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  index: number;
  total: number;
  title: string;
  summary: string;
  progress: number;
  onContinue: () => void;
  delay?: number;
};

export default function CoachProgressCard({
  index,
  total,
  title,
  summary,
  progress,
  onContinue,
  delay = 0,
}: Props) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const c = useColors();

  const [trackWidth, setTrackWidth] = useState(0);
  const barW = useSharedValue(0);
  React.useEffect(() => {
    barW.value = withTiming(Math.min(1, Math.max(0, progress)) * trackWidth, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, trackWidth, barW]);

  const animatedBar = useAnimatedStyle(() => ({
    width: barW.value,
  }));

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const { t } = useTranslation();
  return (
    <Animated.View entering={FadeInDown.duration(500).delay(delay)} style={styles.cardWrap}>
      <LinearGradient
        colors={[c.card, c.surfaceElevated]}
        style={styles.card}
      >
        <View style={styles.headerRow}>
          <LinearGradient
            colors={gradients.violetToPurple}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Ionicons name="sparkles" size={18} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t("components.coach_progress_card.amy_coach")}</Text>
            <Text style={[styles.step, { color: c.textStrong }]}>Step {index} of {total}</Text>
          </View>
          <View style={styles.percentPill}>
            <Text style={styles.percentText}>{Math.round(progress * 100)}%</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: c.textStrong }]}>{title}</Text>
        <Text style={[styles.summary, { color: c.textSubtle }]} numberOfLines={3}>{summary}</Text>

        {/* Animated progress bar */}
        <View style={styles.barTrack} onLayout={onTrackLayout}>
          <Animated.View style={[styles.barFillWrap, animatedBar]}>
            <LinearGradient
              colors={gradients.violetToPurple}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.barFill}
            />
          </Animated.View>
        </View>

        <AnimatedPressable
          onPressIn={() => {
            scale.value = withSpring(0.96, { damping: 15, stiffness: 220 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 12, stiffness: 200 });
          }}
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onContinue();
          }}
          accessibilityRole="button"
          accessibilityLabel={t("components.coach_progress_card.continue_amy_coaching")}
          style={[styles.cta, style]}
        >
          <LinearGradient
            colors={gradients.violetToPurple}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGrad}
          >
            <Text style={styles.ctaText}>{t("components.coach_progress_card.continue_coaching")}</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </LinearGradient>
        </AnimatedPressable>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    marginHorizontal: 20,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: brand.purple500,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  card: {
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: `${brand.purple500}12`,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: brand.purple500,
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  step: {
    fontSize: 14.5,
    fontWeight: "800",
    marginTop: 1,
  },
  percentPill: {
    backgroundColor: `${brand.purple500}12`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  percentText: {
    color: brand.violet600,
    fontSize: 12.5,
    fontWeight: "800",
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  summary: {
    fontSize: 13.5,
    lineHeight: 19,
    marginBottom: 16,
  },
  barTrack: {
    backgroundColor: `${brand.purple500}12`,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 16,
  },
  barFillWrap: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    flex: 1,
    borderRadius: 4,
  },
  cta: {
    borderRadius: 14,
    overflow: "hidden",
  },
  ctaGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
  },
  ctaText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
});
