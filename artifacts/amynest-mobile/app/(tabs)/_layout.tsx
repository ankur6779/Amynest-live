import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { brand } from "@/constants/colors";

type TabKey = "index" | "routines" | "coach" | "hub";

const TAB_META: Record<TabKey, { icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap; label: string }> = {
  index:    { icon: "home-outline",     iconActive: "home",     label: "Dashboard" },
  routines: { icon: "calendar-outline", iconActive: "calendar", label: "Routine" },
  coach:    { icon: "sparkles-outline", iconActive: "sparkles", label: "Coach" },
  hub:      { icon: "book-outline",     iconActive: "book",     label: "Hub" },
};

const VISIBLE_TABS: TabKey[] = ["index", "routines", "coach", "hub"];
const COACH_DISC_SIZE = 50;
const COACH_LIFT = 6;

// ─── Regular Tab Item ──────────────────────────────────────────────────────
function TabItem({
  routeKey,
  focused,
  onPress,
  onLongPress,
}: {
  routeKey: TabKey;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const meta = TAB_META[routeKey];
  const scale = useRef(new Animated.Value(focused ? 1.08 : 1)).current;
  const glow = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: focused ? 1.08 : 1, useNativeDriver: true, friction: 6, tension: 120 }),
      Animated.timing(glow, { toValue: focused ? 1 : 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [focused]);

  const pressDown = () => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, friction: 5 }).start();
  const pressUp = () => Animated.spring(scale, { toValue: focused ? 1.08 : 1, useNativeDriver: true, friction: 5 }).start();

  return (
    <Pressable
      onPress={() => { if (Platform.OS !== "web") Haptics.selectionAsync(); onPress(); }}
      onLongPress={onLongPress}
      onPressIn={pressDown}
      onPressOut={pressUp}
      style={styles.itemHit}
      hitSlop={8}
    >
      <Animated.View style={[styles.itemInner, { transform: [{ scale }] }]}>
        <Ionicons
          name={focused ? meta.iconActive : meta.icon}
          size={focused ? 23 : 21}
          color={focused ? "#FFFFFF" : "rgba(255,255,255,0.5)"}
        />
        <Animated.View
          style={[
            styles.activeDot,
            {
              opacity: glow,
              transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

// ─── Inline Coach Hero Tab ─────────────────────────────────────────────────
function CoachHeroTab({
  focused,
  onPress,
  onLongPress,
}: {
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  const bounce = useRef(new Animated.Value(focused ? 1.08 : 1)).current;

  useEffect(() => {
    Animated.spring(bounce, {
      toValue: focused ? 1.08 : 1,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  }, [focused]);

  useEffect(() => {
    if (!focused) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [focused]);

  const pressDown = () =>
    Animated.spring(bounce, { toValue: 0.92, useNativeDriver: true, friction: 5 }).start();
  const pressUp = () =>
    Animated.spring(bounce, { toValue: focused ? 1.08 : 1, useNativeDriver: true, friction: 5 }).start();

  return (
    <Pressable
      onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPress(); }}
      onLongPress={onLongPress}
      onPressIn={pressDown}
      onPressOut={pressUp}
      style={styles.coachHit}
      hitSlop={6}
    >
      {/* Soft halo behind icon */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.coachHalo,
          {
            opacity: focused ? 0.55 : 0.35,
            transform: [{ scale: pulse }],
          },
        ]}
      />
      <Animated.View style={{ transform: [{ scale: bounce }, { translateY: -COACH_LIFT }] }}>
        <LinearGradient
          colors={focused ? [brand.primaryLight, brand.primary, brand.accent] : [brand.primary, brand.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.coachDisc}
        >
          <MaterialCommunityIcons name="brain" size={24} color="#FFFFFF" />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

// ─── Floating Tab Bar ──────────────────────────────────────────────────────
function FloatingTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 12) + 8;

  const allRoutes = state.routes as Array<{ key: string; name: string }>;

  const makeHandlers = (route: { key: string; name: string }, focused: boolean) => ({
    onPress: () => {
      const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
    },
    onLongPress: () => navigation.emit({ type: "tabLongPress", target: route.key }),
  });

  return (
    <View
      pointerEvents="box-none"
      style={[styles.barWrap, { bottom: bottomOffset }]}
    >
      <View style={styles.barShadow}>
        <BlurView
          intensity={Platform.OS === "android" ? 70 : 50}
          tint="dark"
          style={styles.barBlur}
        >
          <View style={styles.barInner}>
            {VISIBLE_TABS.map((tabName) => {
              const route = allRoutes.find(r => r.name === tabName);
              if (!route) return null;
              const focused = state.index === allRoutes.indexOf(route);
              const { onPress, onLongPress } = makeHandlers(route, focused);
              if (tabName === "coach") {
                return (
                  <CoachHeroTab
                    key={route.key}
                    focused={focused}
                    onPress={onPress}
                    onLongPress={onLongPress}
                  />
                );
              }
              return (
                <TabItem
                  key={route.key}
                  routeKey={tabName}
                  focused={focused}
                  onPress={onPress}
                  onLongPress={onLongPress}
                />
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const colors = useColors();

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index"    options={{ title: "Dashboard" }} />
      <Tabs.Screen name="routines" options={{ title: "Routine" }} />
      <Tabs.Screen name="coach"    options={{ title: "Coach" }} />
      <Tabs.Screen name="hub"      options={{ title: "Hub" }} />
      {/* Hidden from tab bar — accessible via drawer */}
      <Tabs.Screen name="children" options={{ title: "Kids", href: null }} />
      <Tabs.Screen name="profile"  options={{ title: "Profile", href: null }} />
    </Tabs>
  );
}

const PILL_PADDING_V = 10;
const PILL_ITEM_H = 52;

const styles = StyleSheet.create({
  barWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
  },
  barShadow: {
    width: "100%",
    maxWidth: 460,
    borderRadius: 32,
    shadowColor: brand.primary,
    shadowOpacity: 0.45,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
    backgroundColor: "rgba(15,12,41,0.75)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    overflow: "hidden",
  },
  barBlur: {
    width: "100%",
    overflow: "hidden",
    borderRadius: 32,
  },
  barInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 6,
    paddingVertical: PILL_PADDING_V,
    backgroundColor: "rgba(19,16,46,0.5)",
  },
  itemHit: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: PILL_ITEM_H,
  },
  itemInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  activeDot: {
    position: "absolute",
    bottom: -5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: brand.accent,
    shadowColor: brand.accent,
    shadowOpacity: 0.9,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  coachHit: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: PILL_ITEM_H,
  },
  coachHalo: {
    position: "absolute",
    width: COACH_DISC_SIZE + 18,
    height: COACH_DISC_SIZE + 18,
    borderRadius: (COACH_DISC_SIZE + 18) / 2,
    backgroundColor: brand.primary,
    top: (PILL_ITEM_H - (COACH_DISC_SIZE + 18)) / 2 - COACH_LIFT,
    shadowColor: brand.primary,
    shadowOpacity: 0.7,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  coachDisc: {
    width: COACH_DISC_SIZE,
    height: COACH_DISC_SIZE,
    borderRadius: COACH_DISC_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: brand.primary,
    shadowOpacity: 0.7,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 18,
  },
});
