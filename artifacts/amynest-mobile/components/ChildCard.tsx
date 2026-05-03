import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import ProgressRing from "./ProgressRing";
import { brand, brandAlpha } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "react-i18next";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  childName: string;
  ageGroup: string;
  focusGoal: string;
  progress: number;
  onContinue: () => void;
};

export default function ChildCard({
  childName,
  ageGroup,
  focusGoal,
  progress,
  onContinue,
}: Props) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const c = useColors();

  const { t } = useTranslation();
  return (
    <Animated.View
      entering={FadeInDown.duration(550).delay(80)}
      style={styles.cardWrap}
    >
      <View style={[styles.card, { backgroundColor: c.surface }]}>
        <View style={styles.row}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <View style={styles.agePill}>
              <Ionicons name="happy" size={11} color={brand.violet600} />
              <Text style={styles.ageText}>{ageGroup}</Text>
            </View>
            <Text style={[styles.childName, { color: c.textStrong }]}>{childName}</Text>
            <Text style={[styles.focusLabel, { color: c.textFaint }]}>{t("components.child_card.current_focus")}</Text>
            <Text style={[styles.focusGoal, { color: c.textBody }]} numberOfLines={2}>{focusGoal}</Text>
          </View>

          <ProgressRing
            size={120}
            stroke={11}
            progress={progress}
            trackColor={brandAlpha.violet600_12}
            gradientFrom={brand.violet300}
            gradientTo={brand.violet600}
            labelColor={brand.violet800}
          />
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
          style={[styles.cta, style]}
          accessibilityRole="button"
          accessibilityLabel={`Continue plan for ${childName}`}
        >
          <Text style={styles.ctaText}>{t("components.child_card.continue_plan")}</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </AnimatedPressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    marginHorizontal: 20,
    borderRadius: 26,
    overflow: "hidden",
    shadowColor: brand.violet600,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
  },
  card: {
    padding: 22,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: brand.violet100,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  agePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: brand.violet100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  ageText: {
    color: brand.violet600,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  childName: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  focusLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  focusGoal: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: brand.violet600,
    paddingVertical: 14,
    borderRadius: 16,
  },
  ctaText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
});
