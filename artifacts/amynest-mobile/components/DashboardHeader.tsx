import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { brand } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import { useSubscriptionStore, selectIsPremium } from "@/store/useSubscriptionStore";
import { useTranslation } from "react-i18next";

type Props = {
  parentName: string;
  childName: string;
  onProfilePress?: () => void;
};

export default function DashboardHeader({ parentName, childName, onProfilePress }: Props) {
  const c = useColors();
  const isPremium = useSubscriptionStore(selectIsPremium);
  const { t } = useTranslation();
  return (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.row}>
      <View style={{ flex: 1 }}>
        <View style={styles.greetRow}>
          <Text style={[styles.greeting, { color: c.textStrong }]}>Hi, {parentName} 👋</Text>
          {isPremium && (
            <LinearGradient
              colors={[brand.purple500, brand.pink500]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.badge}
            >
              <Ionicons name="sparkles" size={10} color="#fff" />
              <Text style={styles.badgeText}>{t("components.dashboard_header.smart_parent")}</Text>
            </LinearGradient>
          )}
        </View>
        <Text style={[styles.subtext, { color: c.textSubtle }]}>
          Let's help <Text style={styles.childName}>{childName}</Text> grow better today
        </Text>
      </View>
      <Pressable
        onPress={onProfilePress}
        accessibilityRole="button"
        accessibilityLabel={t("components.dashboard_header.open_profile")}
        hitSlop={8}
      >
        <LinearGradient
          colors={[brand.purple500, brand.pink500]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatar}
        >
          <Ionicons name="person" size={20} color="#fff" />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  greetRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  subtext: {
    fontSize: 13.5,
    fontWeight: "500",
    marginTop: 4,
  },
  childName: {
    color: brand.violet600,
    fontWeight: "700",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: brand.purple500,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
});
