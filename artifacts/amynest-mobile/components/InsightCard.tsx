import React from "react";
import { Text, StyleSheet, Pressable, View, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { brand } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "react-i18next";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  title: string;
  description: string;
  category: string;
  readMinutes: number;
  accent: readonly [string, string];
  bookmarked: boolean;
  onPress: () => void;
  onBookmark: () => void;
  testID?: string;
};

export default function InsightCard({
  title,
  description,
  category,
  readMinutes,
  accent,
  bookmarked,
  onPress,
  onBookmark,
  testID,
}: Props) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const c = useColors();

  const { t } = useTranslation();
  return (
    <AnimatedPressable
      testID={testID}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 15, stiffness: 220 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      }}
      onPress={() => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[styles.card, { backgroundColor: c.surface }, style]}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}. ${readMinutes} minute read.`}
    >
      {/* Accent bar */}
      <LinearGradient
        colors={accent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accent}
      />

      <View style={styles.body}>
        <View style={styles.metaRow}>
          <View style={[styles.categoryPill, { backgroundColor: accent[0] + "18", borderColor: accent[0] + "40" }]}>
            <Text style={[styles.categoryText, { color: accent[0] }]}>{category}</Text>
          </View>
          <View style={styles.readMeta}>
            <Ionicons name="time-outline" size={11} color={c.textFaint} />
            <Text style={[styles.readText, { color: c.textFaint }]}>{readMinutes} min</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: c.textStrong }]}>{title}</Text>
        <Text style={[styles.desc, { color: c.textSubtle }]} numberOfLines={2}>{description}</Text>

        <View style={styles.footerRow}>
          <View style={styles.readMore}>
            <Text style={[styles.readMoreText, { color: accent[0] }]}>{t("components.insight_card.read_more")}</Text>
            <Ionicons name="arrow-forward" size={14} color={accent[0]} />
          </View>
          <Pressable
            hitSlop={10}
            onPress={(e) => {
              e.stopPropagation?.();
              if (Platform.OS !== "web") Haptics.selectionAsync();
              onBookmark();
            }}
            accessibilityRole="button"
            accessibilityLabel={bookmarked ? `Remove ${title} from bookmarks` : `Bookmark ${title}`}
            style={styles.bookmarkBtn}
          >
            <Ionicons
              name={bookmarked ? "bookmark" : "bookmark-outline"}
              size={18}
              color={bookmarked ? brand.violet600 : c.textFaint}
            />
          </Pressable>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  accent: {
    height: 4,
    width: "100%",
  },
  body: {
    padding: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  readMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  readText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  title: {
    fontSize: 16.5,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 21,
    marginBottom: 6,
  },
  desc: {
    fontSize: 13.5,
    lineHeight: 19,
    marginBottom: 14,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  readMore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  readMoreText: {
    fontSize: 13,
    fontWeight: "800",
  },
  bookmarkBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
  },
});
