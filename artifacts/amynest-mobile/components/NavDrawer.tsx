import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Switch } from "react-native";
import { useDrawer } from "@/contexts/DrawerContext";
import { useUser, useAuth } from "@/lib/firebase-auth";
import { useTheme } from "@/contexts/ThemeContext";
import { useSubscriptionStore, selectIsPremium } from "@/store/useSubscriptionStore";
import { brand } from "@/constants/colors";
import { BRAND } from "@/constants/brand";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

const DRAWER_WIDTH = 280;

type NavItem = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  badge?: string;
  badgeColor?: string;
};

const NAV_ITEMS: NavItem[] = [
  // Primary navigation — ordered per product spec
  { id: "dashboard",     label: "Dashboard",      icon: "home-outline",                route: "/(tabs)/" },
  { id: "routines",      label: "Routines",       icon: "calendar-outline",            route: "/(tabs)/routines" },
  { id: "hub",           label: "Parenting Hub",  icon: "book-outline",                route: "/(tabs)/hub" },
  // Secondary navigation
  { id: "coach",         label: `${BRAND.aiName} Coach`,      icon: "sparkles-outline",            route: "/(tabs)/coach" },
  { id: "progress",      label: "Progress",       icon: "trending-up-outline",         route: "/progress" },
  { id: "insights",      label: "Insights",       icon: "bar-chart-outline",           route: "/insights" },
  { id: "behavior",      label: "Behavior",       icon: "heart-outline",               route: "/behavior" },
  { id: "nutrition",     label: "Nutrition Hub",  icon: "nutrition-outline",           route: "/nutrition" },
  { id: "kids-control",  label: "Kids Control",   icon: "shield-checkmark-outline",    route: "/kids-control-center" },
  { id: "children",      label: "Children",       icon: "people-outline",              route: "/children" },
  { id: "rewards",       label: "Rewards",        icon: "star-outline",                route: "/rewards" },
  { id: "amy-ai",        label: `${BRAND.aiName} AI`,         icon: "chatbubble-ellipses-outline", route: "/amy-ai" },
  { id: "games",         label: "Gaming Reward",  icon: "game-controller-outline",     route: "/games" },
  { id: "recipes",       label: "My Recipes",     icon: "restaurant-outline",          route: "/recipes" },
  // Settings-area
  { id: "profile",       label: "My Profile",     icon: "person-outline",              route: "/(tabs)/profile" },
  { id: "pricing",       label: "Pricing",        icon: "pricetag-outline",            route: "/paywall" },
  { id: "referrals",     label: "Referrals",      icon: "share-social-outline",        route: "/referrals" },
];

export function NavDrawer() {
  const { isOpen, closeDrawer } = useDrawer();
  const { user } = useUser();
  const { signOut } = useAuth();
  const { theme, mode, toggleTheme } = useTheme();
  const isPremium = useSubscriptionStore(selectIsPremium);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const slideX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(slideX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 14,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideX, {
          toValue: -DRAWER_WIDTH,
          useNativeDriver: true,
          tension: 120,
          friction: 14,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, slideX, backdropOpacity]);

  const handleNav = (route: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    closeDrawer();
    setTimeout(() => router.push(route as never), 10);
  };

  const handleSignOut = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    closeDrawer();
    qc.clear();
    await signOut();
  };

  const displayName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "Parent";
  const email = user?.emailAddresses?.[0]?.emailAddress || "";
  const initials = displayName.slice(0, 2).toUpperCase();
  const tierLabel = isPremium ? "SMART PARENT" : "FREE PLAN";

  const { t } = useTranslation();

  if (!isOpen) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents={isOpen ? "auto" : "none"}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
      </Animated.View>

      {/* Drawer panel */}
      <Animated.View
        style={[
          styles.drawer,
          { transform: [{ translateX: slideX }], paddingTop: insets.top },
        ]}
      >
        <LinearGradient
          colors={[theme.gradient[0], theme.gradient[2] ?? theme.gradient[0]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: brand.primary }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.displayName} numberOfLines={1}>{displayName}</Text>
                {isPremium && (
                  <View style={styles.premiumBadge}>
                    <MaterialCommunityIcons name="paw" size={9} color="#fff" />
                    <Text style={styles.premiumText}>{tierLabel}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.email} numberOfLines={1}>{email}</Text>
            </View>
            <Pressable
              onPress={closeDrawer}
              style={styles.closeBtn}
              hitSlop={12}
            >
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Nav items */}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {NAV_ITEMS.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.navItem,
                pressed && styles.navItemPressed,
              ]}
              onPress={() => handleNav(item.route)}
            >
              <Ionicons name={item.icon} size={18} color="rgba(255,255,255,0.75)" style={styles.navIcon} />
              <Text style={styles.navLabel}>{item.label}</Text>
              {item.badge && (
                <View style={[styles.badge, { backgroundColor: item.badgeColor ?? brand.primary }]}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.divider} />

          {/* Dark mode toggle */}
          <View style={styles.toggleRow}>
            <Ionicons
              name={mode === "dark" ? "moon-outline" : "sunny-outline"}
              size={18}
              color="rgba(255,255,255,0.75)"
              style={styles.navIcon}
            />
            <Text style={styles.navLabel}>{t("components.nav_drawer.dark_mode")}</Text>
            <Switch
              value={mode === "dark"}
              onValueChange={() => {
                if (Platform.OS !== "web") Haptics.selectionAsync();
                toggleTheme();
              }}
              trackColor={{ false: "rgba(255,255,255,0.2)", true: brand.primary }}
              thumbColor="#fff"
              ios_backgroundColor="rgba(255,255,255,0.2)"
            />
          </View>

          {/* Sign out */}
          <Pressable
            style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={18} color="rgba(255,100,100,0.85)" style={styles.navIcon} />
            <Text style={[styles.navLabel, { color: "rgba(255,120,120,0.9)" }]}>{t("components.nav_drawer.sign_out")}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  displayName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: brand.primary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  premiumText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  email: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 16,
    marginVertical: 4,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginHorizontal: 8,
    marginVertical: 1,
    gap: 12,
  },
  navItemPressed: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  navIcon: {
    width: 20,
    textAlign: "center",
  },
  navLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  footer: {
    gap: 0,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    marginVertical: 1,
    gap: 12,
  },
});
