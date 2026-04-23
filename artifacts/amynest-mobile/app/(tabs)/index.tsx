import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, FlatList, Platform, ActivityIndicator,
  Modal, Pressable, Animated, Dimensions, Easing, Image,
} from "react-native";
import { useUser } from "@/lib/firebase-auth";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import Svg, { Circle } from "react-native-svg";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useTheme } from "@/contexts/ThemeContext";
import type { ThemePalette } from "@/lib/theme";
import { useTranslation } from "react-i18next";
import { LanguageRow } from "@/components/LanguageRow";
import { useProfileComplete } from "@/hooks/useProfileComplete";
import { ProfileLockScreen } from "@/components/ProfileLockScreen";
import { brand, brandAlpha } from "@/constants/colors";
import { useSubscriptionStore, selectIsPremium } from "@/store/useSubscriptionStore";
import LockedBlock from "@/components/LockedBlock";

const LOGO_IMG = require("../../assets/images/amynest-logo.png");

type Colors = ReturnType<typeof useColors>;

type DashboardSummary = {
  totalChildren: number;
  totalRoutines: number;
  positiveBehaviorsToday: number;
  negativeBehaviorsToday: number;
  routinesGeneratedThisWeek: number;
};

type RoutineItem = {
  time: string;
  activity: string;
  duration: number;
  category: string;
  notes?: string;
  status?: string;
};

type Routine = {
  id: number;
  title: string;
  date: string;
  childId: number;
  childName: string;
  items: RoutineItem[];
};

type Child = { id: number; name: string; age: number; ageMonths?: number };

type BehaviorStat = {
  childId: number;
  childName: string;
  positive: number;
  negative: number;
  neutral: number;
};

type ParentProfile = { name?: string };

// ─── Helpers ──────────────────────────────────────────────────────────────
function getGreetingKey(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "dashboard.good_morning";
  if (h >= 12 && h < 17) return "dashboard.good_afternoon";
  return "dashboard.good_evening";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatAge(age: number, ageMonths?: number): string {
  if (age === 0 && ageMonths) return `${ageMonths} month${ageMonths !== 1 ? "s" : ""}`;
  return `${age} year${age !== 1 ? "s" : ""}${ageMonths ? ` ${ageMonths}m` : ""}`;
}

function getAgeGroupInfo(age: number, palette: { statusRoseBg: string; statusInfoBg: string }): { emoji: string; bg: string; color: string } {
  if (age <= 1) return { emoji: "👶", bg: palette.statusRoseBg, color: "#BE185D" };
  if (age <= 3) return { emoji: "🧒", bg: "#FEF3C7", color: "#B45309" };
  if (age <= 6) return { emoji: "🧒", bg: "#DCFCE7", color: "#15803D" };
  if (age <= 10) return { emoji: "🧑", bg: palette.statusInfoBg, color: "#1D4ED8" };
  return { emoji: "🧑‍🎓", bg: brand.violet100, color: brand.violet700 };
}

function pct(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

function parseTimeToMinutes(t: string): number {
  const [timePart, period] = (t ?? "").split(" ");
  const [hours, minutes] = timePart.split(":").map(Number);
  let h = hours;
  if (period === "PM" && hours !== 12) h += 12;
  if (period === "AM" && hours === 12) h = 0;
  return h * 60 + (minutes || 0);
}

function computeStreak(routines: Routine[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateSet = new Set(routines.map((r) => r.date.slice(0, 10)));
  let streak = 0;
  while (true) {
    const d = new Date(today);
    d.setDate(d.getDate() - streak);
    const key = d.toISOString().slice(0, 10);
    if (dateSet.has(key)) streak++;
    else break;
  }
  return streak;
}

// ─── Hero Greeting ────────────────────────────────────────────────────────
function HeroGreeting({
  displayName, hasChildren, onMenu, onAskAmy,
}: { displayName: string; hasChildren: boolean; onMenu: () => void; onAskAmy: () => void }) {
  const styles = useThemedStyles();
  const { t } = useTranslation();
  return (
    <LinearGradient
      colors={["rgba(123,63,242,0.30)", "rgba(255,78,205,0.22)", "rgba(20,20,43,0.0)"] as const}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroGreeting}
    >
      <View style={styles.heroTopRow}>
        <View style={styles.heroBrandRow}>
          <Image source={LOGO_IMG} style={styles.heroLogo} resizeMode="contain" />
          <Text style={styles.heroBrand}>Amy Nest</Text>
          <LinearGradient
            colors={[brand.primary, "#FF4ECD"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.aiBadge}
          >
            <Text style={styles.aiBadgeText}>AI</Text>
          </LinearGradient>
          <TouchableOpacity
            onPress={onAskAmy}
            hitSlop={8}
            activeOpacity={0.8}
            style={styles.amyAiHeaderBtn}
          >
            <LinearGradient
              colors={[brand.primary, "#FF4ECD"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.amyAiHeaderBtnGrad}
            >
              <AmyFace size={15} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onMenu} hitSlop={10} style={styles.menuBtn} activeOpacity={0.8}>
          <Ionicons name="menu" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <Text style={styles.heroEyebrow}>{t(getGreetingKey()).toUpperCase()}</Text>
      <Text style={styles.heroTitle}>
        👋 {displayName ? t("dashboard.greeting_with_name", { name: displayName }) : t("dashboard.greeting_no_name")}
      </Text>
      <Text style={styles.heroSub}>
        {hasChildren ? `${t("dashboard.planned_for_you")} ❤️` : `${t("dashboard.setup_first")} 🌟`}
      </Text>
    </LinearGradient>
  );
}

// ─── Children Strip ───────────────────────────────────────────────────────
function ChildrenStrip({ children, onPressChild, onAdd }: {
  children: Child[];
  onPressChild: (id: number) => void;
  onAdd: () => void;
}) {
  const styles = useThemedStyles();
  const { t } = useTranslation();
  const palette = useColors();
  if (children.length === 0) return null;
  return (
    <View style={{ marginBottom: 18 }}>
      <View style={styles.stripHeader}>
        <Text style={styles.stripEyebrow}>{t("dashboard.your_little_ones").toUpperCase()}</Text>
      </View>
      <FlatList
        horizontal
        data={[...children, { id: -1, name: "Add", age: -1 } as Child]}
        keyExtractor={(c) => String(c.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingHorizontal: 2 }}
        renderItem={({ item: c }) => {
          if (c.id === -1) {
            return (
              <TouchableOpacity style={styles.childAddCard} onPress={onAdd} testID="add-child-chip">
                <Text style={styles.childAddPlus}>➕</Text>
                <Text style={styles.childAddText}>{t("dashboard.add_child")}</Text>
              </TouchableOpacity>
            );
          }
          const info = getAgeGroupInfo(c.age, palette);
          return (
            <TouchableOpacity
              style={[styles.childCard, { backgroundColor: info.bg }]}
              onPress={() => onPressChild(c.id)}
              testID={`child-card-${c.id}`}
              activeOpacity={0.85}
            >
              <View style={styles.childCardRow}>
                <View style={styles.childEmojiBubble}>
                  <Text style={styles.childEmojiText}>{info.emoji}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.childName, { color: info.color }]} numberOfLines={1}>{c.name}</Text>
                  <Text style={styles.childAge}>{formatAge(c.age, c.ageMonths)}</Text>
                </View>
              </View>
              <Text style={styles.childTagline} numberOfLines={1}>{t("dashboard.personalised_for", { name: c.name })}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

// ─── Now / Next Timeline ──────────────────────────────────────────────────
function NowNextTimeline({ routines, onGenerate, onOpen, onSeeAll }: {
  routines: Routine[];
  onGenerate: () => void;
  onOpen: (id: number) => void;
  onSeeAll: () => void;
}) {
  const styles = useThemedStyles();
  const { t } = useTranslation();
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRoutines = routines.filter((r) => r.date.slice(0, 10) === todayStr);

  if (todayRoutines.length === 0) {
    return (
      <View style={styles.timelineEmpty}>
        <Text style={{ fontSize: 32 }}>🗓️</Text>
        <Text style={styles.timelineEmptyTitle}>{t("dashboard.no_plan_today")}</Text>
        <Text style={styles.timelineEmptySub}>{t("dashboard.no_plan_subtitle")}</Text>
        <TouchableOpacity onPress={onGenerate} activeOpacity={0.9}>
          <LinearGradient
            colors={[brand.primary, brand.purple500] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.timelineEmptyBtn}
          >
            <Ionicons name="sparkles" size={16} color="#fff" />
            <Text style={styles.timelineEmptyBtnText}>{t("dashboard.plan_my_day")}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const allItems = todayRoutines.flatMap((r) =>
    r.items.map((item) => ({ ...item, childName: r.childName, routineId: r.id }))
  ).sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

  let currentIdx = -1;
  for (let i = 0; i < allItems.length; i++) {
    const itemMinutes = parseTimeToMinutes(allItems[i].time);
    const nextMinutes = i + 1 < allItems.length ? parseTimeToMinutes(allItems[i + 1].time) : 24 * 60;
    if (itemMinutes <= nowMinutes && nowMinutes < nextMinutes) { currentIdx = i; break; }
  }

  const displayItems = currentIdx >= 0
    ? allItems.slice(currentIdx, currentIdx + 3)
    : allItems.filter((item) => parseTimeToMinutes(item.time) > nowMinutes).slice(0, 3);

  if (displayItems.length === 0) {
    return (
      <View style={styles.timelineDone}>
        <Text style={{ fontSize: 28 }}>🌙</Text>
        <Text style={styles.timelineDoneTitle}>{t("dashboard.day_complete")}</Text>
        <Text style={styles.timelineDoneSub}>{t("dashboard.day_complete_sub")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.timelineCard}>
      <View style={styles.timelineHeader}>
        <View style={styles.timelineHeaderLeft}>
          <Ionicons name="time-outline" size={16} color={brand.violet600} />
          <Text style={styles.timelineHeaderTitle}>{t("dashboard.todays_timeline")}</Text>
        </View>
        <TouchableOpacity onPress={onSeeAll} style={styles.timelineHeaderRight}>
          <Text style={styles.timelineHeaderLink}>View all</Text>
          <Ionicons name="arrow-forward" size={12} color={brand.violet600} />
        </TouchableOpacity>
      </View>
      <View style={{ padding: 10, gap: 8 }}>
        {displayItems.map((item, idx) => {
          const isCurrent = currentIdx >= 0 && idx === 0;
          const isNext = idx === (currentIdx >= 0 ? 1 : 0);
          const completed = item.status === "completed";
          const wrapperProps = isCurrent
            ? { style: [styles.timelineRow, styles.timelineRowCurrent] }
            : { style: styles.timelineRow };
          return (
            <TouchableOpacity
              key={`${item.routineId}-${idx}`}
              activeOpacity={0.85}
              onPress={() => onOpen(item.routineId)}
            >
              <View {...wrapperProps}>
                <View style={styles.timelineTime}>
                  <Text style={[styles.timelineTimeText, isCurrent && { color: "#fff" }]}>{item.time}</Text>
                  {isCurrent && (
                    <View style={styles.timelineNowBadge}>
                      <Text style={styles.timelineNowText}>NOW</Text>
                    </View>
                  )}
                  {!isCurrent && isNext && (
                    <View style={styles.timelineNextBadge}>
                      <Text style={styles.timelineNextText}>NEXT</Text>
                    </View>
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[
                      styles.timelineActivity,
                      isCurrent && { color: "#fff" },
                      completed && { textDecorationLine: "line-through", opacity: 0.6 },
                    ]}
                    numberOfLines={2}
                  >
                    {item.activity}
                  </Text>
                  <Text style={[styles.timelineMeta, isCurrent && { color: "rgba(255,255,255,0.85)" }]}>
                    {item.childName} · {item.duration}m
                  </Text>
                </View>
                {completed && !isCurrent && (
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Streak Card ──────────────────────────────────────────────────────────
function StreakCard({ streak, onPress }: { streak: number; onPress: () => void }) {
  const styles = useThemedStyles();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ flex: 1 }}>
      <View style={styles.streakCard}>
        <Text style={[styles.streakEmoji, streak === 0 && { opacity: 0.5 }]}>🔥</Text>
        <Text style={styles.streakNum}>{streak}</Text>
        <Text style={styles.streakLabel}>Day Streak</Text>
        <Text style={styles.streakSub}>
          {streak === 0 ? "Start today!" : "Tap for progress"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Amy AI Avatar (cute animated face with blinking) ────────────────────
function AmyFace({ size }: { size: number }) {
  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const seq = Animated.loop(
      Animated.sequence([
        Animated.delay(2200),
        Animated.timing(blink, { toValue: 0.05, duration: 90, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 110, useNativeDriver: true }),
        Animated.delay(180),
        Animated.timing(blink, { toValue: 0.05, duration: 90, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 110, useNativeDriver: true }),
      ])
    );
    seq.start();
    return () => seq.stop();
  }, [blink]);

  const eyeW = Math.max(2, Math.round(size * 0.13));
  const eyeH = Math.max(2, Math.round(size * 0.16));
  const eyeGap = Math.round(size * 0.22);
  const cheekSize = Math.max(2, Math.round(size * 0.11));
  const smileW = Math.round(size * 0.32);
  const smileH = Math.max(2, Math.round(size * 0.16));
  const smileBorder = Math.max(1.2, size * 0.045);

  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: "#FFE0BC",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* eyes row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: eyeGap,
          marginTop: -size * 0.06,
        }}
      >
        <Animated.View
          style={{
            width: eyeW, height: eyeH, borderRadius: eyeW / 2,
            backgroundColor: "#1A1530",
            transform: [{ scaleY: blink }],
          }}
        />
        <Animated.View
          style={{
            width: eyeW, height: eyeH, borderRadius: eyeW / 2,
            backgroundColor: "#1A1530",
            transform: [{ scaleY: blink }],
          }}
        />
      </View>
      {/* cheeks */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: size * 0.55,
          left: size * 0.12,
          width: cheekSize, height: cheekSize, borderRadius: cheekSize / 2,
          backgroundColor: "rgba(255,150,180,0.65)",
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: size * 0.55,
          right: size * 0.12,
          width: cheekSize, height: cheekSize, borderRadius: cheekSize / 2,
          backgroundColor: "rgba(255,150,180,0.65)",
        }}
      />
      {/* smile */}
      <View
        style={{
          marginTop: size * 0.08,
          width: smileW, height: smileH,
          borderBottomLeftRadius: smileW,
          borderBottomRightRadius: smileW,
          borderColor: "#7A3A2A",
          borderWidth: smileBorder,
          borderTopWidth: 0,
          borderLeftWidth: smileBorder * 0.9,
          borderRightWidth: smileBorder * 0.9,
        }}
      />
    </View>
  );
}

function AmyAvatar({ size = 28, animated = false }: { size?: number; animated?: boolean }) {
  const float = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const rot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -6, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
      ])
    );
    const rotLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(rot, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(rot, { toValue: -1, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    floatLoop.start();
    pulseLoop.start();
    rotLoop.start();
    return () => {
      floatLoop.stop();
      pulseLoop.stop();
      rotLoop.stop();
    };
  }, [animated, float, pulse, rot]);

  const ringPad = Math.max(2, Math.round(size * 0.08));
  const inner = size - ringPad * 2;
  const rotate = rot.interpolate({ inputRange: [-1, 1], outputRange: ["-4deg", "4deg"] });

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        transform: [{ translateY: float }, { scale: pulse }, { rotate }],
      }}
    >
      <LinearGradient
        colors={[brand.primary, "#FF4ECD", "#4FC3F7"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#FF4ECD",
          shadowOpacity: 0.6,
          shadowRadius: size * 0.4,
          shadowOffset: { width: 0, height: 0 },
          elevation: 8,
        }}
      >
        <AmyFace size={inner} />
      </LinearGradient>
    </Animated.View>
  );
}

// ─── Side Drawer (right slide-in nav) ─────────────────────────────────────
const DRAWER_ITEMS: { key: string; labelKey: string; icon: keyof typeof Ionicons.glyphMap; route: string }[] = [
  { key: "dashboard",   labelKey: "nav.dashboard",     icon: "home-outline",          route: "/(tabs)/index" },
  { key: "hub",         labelKey: "nav.parenting_hub", icon: "book-outline",          route: "/(tabs)/hub" },
  { key: "coach",       labelKey: "nav.amy_coach",     icon: "sparkles-outline",      route: "/(tabs)/coach" },
  { key: "children",    labelKey: "nav.children",      icon: "people-outline",        route: "/(tabs)/children" },
  { key: "routines",    labelKey: "nav.routines",      icon: "calendar-outline",      route: "/(tabs)/routines" },
  { key: "progress",    labelKey: "nav.progress",      icon: "trending-up-outline",   route: "/progress" },
  { key: "behavior",    labelKey: "nav.behavior",      icon: "happy-outline",         route: "/behavior" },
  { key: "amy",         labelKey: "nav.amy_ai",        icon: "chatbubbles-outline",   route: "/amy-ai" },
  { key: "games",         labelKey: "nav.gaming_reward",  icon: "game-controller-outline", route: "/games" },
  { key: "audio-lessons", labelKey: "nav.audio_lessons",  icon: "headset-outline",         route: "/audio-lessons" },
  { key: "profile",       labelKey: "nav.profile",        icon: "person-outline",          route: "/(tabs)/profile" },
];

function ThemeToggleRow() {
  const styles = useThemedStyles();
  const { mode, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const isDark = mode === "dark";
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={toggleTheme}
      style={{ marginTop: 12, marginBottom: 6 }}
    >
      <View style={[styles.drawerItem, { justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)", paddingTop: 14, marginTop: 4 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Ionicons name={isDark ? "moon" : "sunny"} size={18} color={isDark ? brand.violet400 : "#F59E0B"} />
          <Text style={styles.drawerItemLabel}>{isDark ? t("nav.dark_mode") : t("nav.light_mode")}</Text>
        </View>
        <View style={{
          width: 42, height: 24, borderRadius: 12,
          backgroundColor: isDark ? "rgba(123,63,242,0.35)" : "rgba(255,255,255,0.18)",
          borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
          padding: 2, justifyContent: "center",
        }}>
          <View style={{
            width: 18, height: 18, borderRadius: 9,
            backgroundColor: isDark ? brand.primary : "#F59E0B",
            transform: [{ translateX: isDark ? 18 : 0 }],
            shadowColor: isDark ? brand.primary : "#F59E0B",
            shadowOpacity: 0.6, shadowRadius: 6,
          }} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ThemeMenuRow() {
  const styles = useThemedStyles();
  const { mode, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const isDark = mode === "dark";
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={toggleTheme} style={{ marginTop: 6 }}>
      <View style={[styles.drawerItem, { justifyContent: "space-between" }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Ionicons name={isDark ? "moon" : "sunny"} size={18} color={isDark ? brand.violet400 : "#F59E0B"} />
          <Text style={styles.drawerItemLabel}>{isDark ? t("nav.dark_mode") : t("nav.light_mode")}</Text>
        </View>
        <View style={{
          width: 42, height: 24, borderRadius: 12,
          backgroundColor: isDark ? "rgba(123,63,242,0.35)" : "rgba(255,255,255,0.18)",
          borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
          padding: 2, justifyContent: "center",
        }}>
          <View style={{
            width: 18, height: 18, borderRadius: 9,
            backgroundColor: isDark ? brand.primary : "#F59E0B",
            transform: [{ translateX: isDark ? 18 : 0 }],
            shadowColor: isDark ? brand.primary : "#F59E0B",
            shadowOpacity: 0.6, shadowRadius: 6,
          }} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SideDrawer({
  open, onClose, activeKey, onNavigate,
}: { open: boolean; onClose: () => void; activeKey: string; onNavigate: (route: string) => void }) {
  const styles = useThemedStyles();
  const { t } = useTranslation();
  const screenW = Dimensions.get("window").width;
  const drawerW = Math.min(300, screenW * 0.82);
  const tx = useRef(new Animated.Value(drawerW)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(tx, { toValue: open ? 0 : drawerW, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fade, { toValue: open ? 1 : 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [open, tx, fade, drawerW]);

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.drawerScrim, { opacity: fade }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.drawerPanel,
          { width: drawerW, transform: [{ translateX: tx }] },
        ]}
      >
        <LinearGradient
          colors={["#0B0B1A", "#14142B", "#1B1B3A"]}
          style={{ flex: 1, paddingTop: 56, paddingHorizontal: 16, paddingBottom: 20 }}
        >
          <View style={styles.drawerHeader}>
            <View style={{ flexDirection: "column", gap: 2 }}>
              <Text style={styles.drawerBrand}>AmyNest AI</Text>
              <Text style={styles.drawerBrandSub}>Where Smart Parenting Starts</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ marginTop: 10 }} showsVerticalScrollIndicator={false}>
            {DRAWER_ITEMS.map((item) => {
              const active = item.key === activeKey;
              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.85}
                  onPress={() => { onClose(); setTimeout(() => onNavigate(item.route), 220); }}
                  style={{ marginBottom: 6 }}
                >
                  {active ? (
                    <LinearGradient
                      colors={[brand.primary, "#FF4ECD"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.drawerItem, styles.drawerItemActive]}
                    >
                      <Ionicons name={item.icon} size={18} color="#FFFFFF" />
                      <Text style={[styles.drawerItemLabel, { color: "#FFFFFF" }]}>{t(item.labelKey)}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.drawerItem}>
                      <Ionicons name={item.icon} size={18} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.drawerItemLabel}>{t(item.labelKey)}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
            <LanguageRow />
            <ThemeMenuRow />
          </ScrollView>
        </LinearGradient>
      </Animated.View>
    </Modal>
  );
}

// ─── Floating Amy AI button ───────────────────────────────────────────────
function AmyFAB({ onPress, bottomOffset }: { onPress: () => void; bottomOffset: number }) {
  const styles = useThemedStyles();
  return (
    <View pointerEvents="box-none" style={[styles.fabWrap, { bottom: bottomOffset }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.fabHit}>
        <View style={styles.fabRing}>
          <AmyAvatar size={56} animated />
        </View>
        <View style={styles.fabTooltip}>
          <Text style={styles.fabTooltipText}>Talk to Amy AI</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ─── Stat Card (flat-bordered, violet accent) ─────────────────────────────
function StatCard({ label, value, sub, icon, onPress }: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress?: () => void;
}) {
  const styles = useThemedStyles();
  return (
    <TouchableOpacity activeOpacity={onPress ? 0.85 : 1} onPress={onPress} style={styles.statCardWrap}>
      <View style={styles.statCard}>
        <View style={styles.statTopRow}>
          <Text style={styles.statLabel}>{label}</Text>
          <Ionicons name={icon} size={14} color={brand.violet600} />
        </View>
        <View style={styles.statBottom}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statSub}>{sub}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Amy AI Suggests ──────────────────────────────────────────────────────
function AmySuggestsCard({ routines, streak }: { routines: Routine[]; streak: number }) {
  const styles = useThemedStyles();
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRoutines = routines.filter((r) => r.date.slice(0, 10) === todayStr);
  const allItems = todayRoutines.flatMap((r) => r.items);
  const total = allItems.length;
  const completed = allItems.filter((i) => i.status === "completed").length;
  const p = total > 0 ? Math.round((completed / total) * 100) : 0;
  const hour = new Date().getHours();

  const suggestions: { emoji: string; text: string; bg: string; border: string; color: string }[] = [];

  if (total === 0) {
    suggestions.push({ emoji: "📅", text: "No routine for today yet. Generate one to get started!", bg: brandAlpha.indigo500_16, border: brandAlpha.indigo500_35, color: "#C7D2FE" });
  } else if (p < 30 && hour >= 14) {
    suggestions.push({ emoji: "⚡", text: "Your child seems behind today — try shorter, easier tasks to build momentum.", bg: "rgba(245,158,11,0.16)", border: "rgba(245,158,11,0.35)", color: "#FDE68A" });
  } else if (p >= 80) {
    suggestions.push({ emoji: "🌟", text: "Amazing progress today! Consider a small reward to celebrate.", bg: "rgba(34,197,94,0.16)", border: "rgba(34,197,94,0.35)", color: "#BBF7D0" });
  }
  if (hour >= 15 && hour <= 17) {
    suggestions.push({ emoji: "❤️", text: "Good time for a 15-min bonding activity — a quick walk or board game goes a long way.", bg: "rgba(244,63,94,0.16)", border: "rgba(244,63,94,0.35)", color: "#FECDD3" });
  }
  if (streak >= 3) {
    suggestions.push({ emoji: "🔥", text: `You're on a ${streak}-day streak! Keep the momentum going — consistency builds habits.`, bg: "rgba(249,115,22,0.16)", border: "rgba(249,115,22,0.35)", color: "#FED7AA" });
  } else if (streak === 0 && hour < 10) {
    suggestions.push({ emoji: "☀️", text: "Fresh start today! Generate a routine to set a positive tone for the day.", bg: "rgba(79,195,247,0.16)", border: "rgba(79,195,247,0.35)", color: "#BAE6FD" });
  }
  if (hour >= 19) {
    suggestions.push({ emoji: "🌙", text: "Wind-down time! Make sure screen time ends 30 min before sleep for better rest.", bg: "rgba(123,63,242,0.16)", border: "rgba(123,63,242,0.35)", color: "#C7D2FE" });
  }

  const display = suggestions.slice(0, 3);

  return (
    <View style={styles.amyCard}>
      <View style={styles.amyHeader}>
        <View style={styles.amyHeaderLeft}>
          <View style={styles.amyAvatar}>
            <Ionicons name="heart" size={14} color="#fff" />
          </View>
          <View>
            <Text style={styles.amyTitle}>Amy AI Suggests</Text>
            <Text style={styles.amySub}>Caring nudges from Amy 💜</Text>
          </View>
        </View>
      </View>
      <View style={{ padding: 12, gap: 8 }}>
        {display.length === 0 ? (
          <View style={[styles.amyTip, { backgroundColor: "#1B1B3A", borderColor: "rgba(255,255,255,0.08)" }]}>
            <Text style={{ fontSize: 16 }}>💜</Text>
            <Text style={[styles.amyTipText, { color: "rgba(255,255,255,0.85)" }]}>Looking good — keep it going!</Text>
          </View>
        ) : (
          display.map((s, i) => (
            <View key={i} style={[styles.amyTip, { backgroundColor: s.bg, borderColor: s.border }]}>
              <Text style={{ fontSize: 16 }}>{s.emoji}</Text>
              <Text style={[styles.amyTipText, { color: s.color }]}>{s.text}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

// ─── Parent Score Card ────────────────────────────────────────────────────
function ParentScoreCard({ routines, streak }: { routines: Routine[]; streak: number }) {
  const styles = useThemedStyles();
  const p = useColors();
  const last7 = routines.slice(0, 7);
  const items = last7.flatMap((r) => r.items);
  const total = items.length;
  const done = items.filter((i) => i.status === "completed").length;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
  const daysActive = last7.length;
  const streakBonus = Math.min(streak * 5, 30);
  const score = Math.min(Math.round(completionRate * 0.5 + daysActive * 5 + streakBonus), 100);
  const percentile = score >= 80 ? 90 : score >= 60 ? 70 : score >= 40 ? 50 : score >= 20 ? 30 : 15;
  const grade = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";
  const ringColor = score >= 80 ? "#22C55E" : score >= 60 ? "#3B82F6" : score >= 40 ? "#F59E0B" : "#EF4444";

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;

  return (
    <View style={styles.scoreCard}>
      <View style={styles.scoreHeader}>
        <Ionicons name="sparkles" size={14} color={brand.violet600} />
        <View style={{ flex: 1 }}>
          <Text style={styles.scoreTitle}>Your Parent Score</Text>
          <Text style={styles.scoreSub}>Based on last 7 days</Text>
        </View>
      </View>
      <View style={styles.scoreBody}>
        <View style={styles.scoreRingWrap}>
          <Svg width={70} height={70} viewBox="0 0 70 70">
            <Circle cx={35} cy={35} r={radius} stroke={p.surfaceTrack} strokeWidth={5} fill="none" />
            <Circle
              cx={35}
              cy={35}
              r={radius}
              stroke={ringColor}
              strokeWidth={5}
              fill="none"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeLinecap="round"
              transform="rotate(-90 35 35)"
            />
          </Svg>
          <View style={styles.scoreRingCenter}>
            <Text style={[styles.scoreGrade, { color: ringColor }]}>{grade}</Text>
            <Text style={styles.scoreOf}>{score}/100</Text>
          </View>
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={styles.scoreBetter}>
            Better than <Text style={{ color: brand.purple500, fontFamily: "Inter_700Bold" }}>{percentile}%</Text> of parents!
          </Text>
          <View>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreRowLabel}>Task completion</Text>
              <Text style={styles.scoreRowValue}>{completionRate}%</Text>
            </View>
            <View style={styles.scoreBar}>
              <View style={[styles.scoreBarFill, { width: `${completionRate}%`, backgroundColor: brand.purple500 }]} />
            </View>
          </View>
          <View>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreRowLabel}>Days active</Text>
              <Text style={styles.scoreRowValue}>{daysActive}/7</Text>
            </View>
            <View style={styles.scoreBar}>
              <View style={[styles.scoreBarFill, { width: `${(daysActive / 7) * 100}%`, backgroundColor: brand.primary }]} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Onboarding Screen ────────────────────────────────────────────────────
function OnboardingScreen({ displayName, onAddChild, onCoach }: {
  displayName: string;
  onAddChild: () => void;
  onCoach: () => void;
}) {
  const styles = useThemedStyles();
  const palette = useColors();
  const features = [
    { emoji: "🧠", label: "Amy AI Routine Generator", desc: "Smart daily schedules tailored to your child's age and needs.", bg: brandAlpha.indigo500_14, border: brandAlpha.indigo500_35, grad: ["#3B82F6", brand.indigo500] as const },
    { emoji: "📊", label: "Progress Tracking", desc: "Monitor growth, streaks, and milestones in one beautiful view.", bg: "rgba(16,185,129,0.14)", border: "rgba(16,185,129,0.35)", grad: ["#10B981", "#14B8A6"] as const },
    { emoji: "🎯", label: "Daily Activities", desc: "Age-based activities that build skills while keeping kids engaged.", bg: "rgba(249,115,22,0.14)", border: "rgba(249,115,22,0.35)", grad: ["#F97316", "#F59E0B"] as const },
    { emoji: "🧩", label: "Learning & Puzzles", desc: "Adaptive daily puzzles that grow harder as your child levels up.", bg: brandAlpha.purple500_16, border: brandAlpha.purple500_40, grad: [brand.purple500, brand.purple600] as const },
    { emoji: "❤️", label: "Parenting Tips", desc: "Expert-curated tips, sleep guides, and milestone insights.", bg: "rgba(244,63,94,0.14)", border: "rgba(244,63,94,0.35)", grad: ["#F43F5E", "#EC4899"] as const },
  ];

  return (
    <View style={{ paddingHorizontal: 4 }}>
      <LinearGradient
        colors={["#2563EB", brand.indigo500, brand.primary] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.onbHero}
      >
        <View style={styles.onbHeroEmoji}>
          <Text style={{ fontSize: 64 }}>👨‍👧✨</Text>
        </View>
        <Text style={styles.onbHeroEyebrow}>MEET AMY AI</Text>
        <Text style={styles.onbHeroTitle}>
          👋 Hi{displayName ? `, ${displayName}` : ""} 😊
        </Text>
        <Text style={[styles.onbHeroSub, { color: palette.onGradientSubtext }]}>I'm Amy — your smart parenting partner ❤️</Text>
        <Text style={styles.onbHeroBody}>
          Create personalised routines, track progress, and make parenting easier — one day at a time.
        </Text>
      </LinearGradient>

      <View style={styles.onbDivider}>
        <View style={styles.onbDividerLine} />
        <Text style={styles.onbDividerText}>Start your child's smart routine today 🚀</Text>
        <View style={styles.onbDividerLine} />
      </View>

      <View style={{ gap: 10, marginBottom: 20 }}>
        {features.map((f) => (
          <View key={f.label} style={[styles.onbFeature, { backgroundColor: f.bg, borderColor: f.border }]}>
            <LinearGradient colors={f.grad} style={styles.onbFeatureIcon}>
              <Text style={{ fontSize: 18 }}>{f.emoji}</Text>
            </LinearGradient>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.onbFeatureLabel}>{f.emoji} {f.label}</Text>
              <Text style={styles.onbFeatureDesc}>{f.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={palette.textFaint} />
          </View>
        ))}
      </View>

      <TouchableOpacity onPress={onCoach} activeOpacity={0.9}>
        <LinearGradient
          colors={[brand.indigo500, brand.purple500] as const}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.onbPrimary}
        >
          <Ionicons name="sparkles" size={18} color="#fff" />
          <Text style={styles.onbPrimaryText}>✨ Experience Now</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity onPress={onAddChild} activeOpacity={0.85} style={styles.onbSecondary}>
        <Ionicons name="person-add-outline" size={16} color={palette.textBody} />
        <Text style={styles.onbSecondaryText}>Add your first child</Text>
      </TouchableOpacity>

      <Text style={styles.onbFooter}>Works for ages 0–15 years · Science-backed parenting plans</Text>
    </View>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────
export default function HomeScreen() {
  const { profileComplete, isLoading: profileLoading } = useProfileComplete();
  const styles = useThemedStyles();
  const { user } = useUser();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const [profileName, setProfileName] = useState<string | null>(null);
  const isPremium = useSubscriptionStore(selectIsPremium);

  useEffect(() => {
    authFetch("/api/parent-profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ParentProfile | null) => { if (d?.name) setProfileName(d.name); })
      .catch(() => {});
  }, [authFetch]);

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary"],
    queryFn: () => authFetch("/api/dashboard/summary").then((r) => r.json()),
  });

  const { data: recentRoutines = [], refetch: refetchRecent } = useQuery<Routine[]>({
    queryKey: ["dashboard-recent-routines"],
    queryFn: () => authFetch("/api/dashboard/recent-routines").then((r) => r.json()),
  });

  const { data: allRoutines = [], refetch: refetchAll } = useQuery<Routine[]>({
    queryKey: ["routines-all"],
    queryFn: () => authFetch("/api/routines").then((r) => r.json()),
  });

  const { data: childrenList = [], refetch: refetchChildren } = useQuery<Child[]>({
    queryKey: ["children"],
    queryFn: () => authFetch("/api/children").then((r) => r.json()),
  });

  const { data: behaviorStats = [], refetch: refetchStats } = useQuery<BehaviorStat[]>({
    queryKey: ["behavior-stats"],
    queryFn: () => authFetch("/api/dashboard/behavior-stats").then((r) => r.json()),
  });

  const onRefresh = useCallback(() => {
    refetchSummary(); refetchRecent(); refetchAll(); refetchChildren(); refetchStats();
  }, [refetchSummary, refetchRecent, refetchAll, refetchChildren, refetchStats]);

  const displayName = useMemo(
    () => profileName || user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "",
    [profileName, user]
  );

  const streak = useMemo(() => computeStreak(allRoutines), [allRoutines]);
  const noChildren = !summaryLoading && (summary?.totalChildren ?? 0) === 0;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  if (profileLoading || summaryLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profileComplete) {
    return <ProfileLockScreen sectionName="Dashboard" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: botPad + 110, paddingHorizontal: 16 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {noChildren ? (
        <OnboardingScreen
          displayName={displayName}
          onAddChild={() => router.push("/children/new")}
          onCoach={() => router.push("/(tabs)/coach")}
        />
      ) : (
        <>
          <HeroGreeting
            displayName={displayName}
            hasChildren={(childrenList.length ?? 0) > 0}
            onMenu={() => setDrawerOpen(true)}
            onAskAmy={() => router.push("/amy-ai")}
          />

          <View style={{ height: 16 }} />

          <ChildrenStrip
            children={childrenList}
            onPressChild={(id) => router.push(`/children/${id}`)}
            onAdd={() => router.push("/children/new")}
          />

          {/* Timeline + Streak */}
          <View style={styles.timelineRowWrap}>
            <View style={{ flex: 1 }}>
              <NowNextTimeline
                routines={allRoutines}
                onGenerate={() => router.push("/routines/generate")}
                onOpen={(id) => router.push(`/routines/${id}`)}
                onSeeAll={() => router.push("/(tabs)/routines")}
              />
            </View>
            <View style={{ width: 120 }}>
              <StreakCard streak={streak} onPress={() => router.push("/(tabs)/routines")} />
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard
              label="Routines"
              value={summary?.routinesGeneratedThisWeek ?? 0}
              sub="this week"
              icon="calendar-outline"
              onPress={() => router.push("/(tabs)/routines")}
            />
            <StatCard
              label="Great Job"
              value={summary?.positiveBehaviorsToday ?? 0}
              sub="today"
              icon="trending-up-outline"
            />
            <StatCard
              label="Challenging"
              value={summary?.negativeBehaviorsToday ?? 0}
              sub="today"
              icon="trending-down-outline"
            />
            <StatCard
              label="Children"
              value={summary?.totalChildren ?? 0}
              sub="total"
              icon="people-outline"
              onPress={() => router.push("/(tabs)/children")}
            />
          </View>

          {/* Amy Suggests */}
          <AmySuggestsCard routines={allRoutines} streak={streak} />

          {/* Parent Score */}
          <ParentScoreCard routines={allRoutines} streak={streak} />

          {/* Recent Routines */}
          <View style={styles.listCard}>
            <View style={styles.listHeader}>
              <View style={styles.listHeaderLeft}>
                <Ionicons name="calendar" size={16} color={brand.purple500} />
                <View>
                  <Text style={styles.listTitle}>Recent Routines</Text>
                  <Text style={styles.listSub}>Latest generated schedules</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => router.push("/(tabs)/routines")} style={styles.listLink}>
                <Text style={styles.listLinkText}>View all</Text>
                <Ionicons name="arrow-forward" size={12} color={brand.purple500} />
              </TouchableOpacity>
            </View>
            {recentRoutines.length === 0 ? (
              <View style={styles.listEmpty}>
                <Ionicons name="calendar-outline" size={36} color={colors.textFaint} />
                <Text style={styles.listEmptyText}>No routines created yet.</Text>
                <TouchableOpacity onPress={() => router.push("/(tabs)/coach")}>
                  <Text style={styles.listEmptyLink}>Create your first routine</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                {recentRoutines.slice(0, 4).map((r) => {
                  const items = r.items ?? [];
                  const done = items.filter((i) => i.status === "completed").length;
                  const p = pct(done, items.length);
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={styles.listRow}
                      onPress={() => router.push(`/routines/${r.id}`)}
                      activeOpacity={0.85}
                      testID={`recent-routine-${r.id}`}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.listRowTitle} numberOfLines={1}>{r.title}</Text>
                        <View style={styles.listRowMeta}>
                          <View style={styles.listChildPill}>
                            <Text style={styles.listChildPillText}>{r.childName}</Text>
                          </View>
                          <Text style={styles.listRowDate}>{formatDate(r.date)}</Text>
                        </View>
                      </View>
                      {items.length > 0 && (
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={styles.listRowPct}>{p}%</Text>
                          <Text style={styles.listRowDone}>{done}/{items.length}</Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Behavior Highlights */}
          <View style={styles.listCard}>
            <View style={styles.listHeader}>
              <View style={styles.listHeaderLeft}>
                <Ionicons name="pulse" size={16} color="#EC4899" />
                <View>
                  <Text style={styles.listTitle}>Behavior Highlights</Text>
                  <Text style={styles.listSub}>Overall stats by child</Text>
                </View>
              </View>
            </View>
            {behaviorStats.length === 0 ? (
              <View style={styles.listEmpty}>
                <Ionicons name="star-outline" size={36} color={colors.textFaint} />
                <Text style={styles.listEmptyText}>No behavior logged yet.</Text>
              </View>
            ) : (
              <View>
                {behaviorStats.map((stat) => (
                  <View key={stat.childId} style={styles.behaviorRow}>
                    <Text style={styles.behaviorChild}>{stat.childName}</Text>
                    <View style={styles.behaviorStats}>
                      <View style={[styles.behaviorChip, { backgroundColor: colors.behaviorGoodBg }]}>
                        <Ionicons name="trending-up" size={12} color="#10B981" />
                        <Text style={[styles.behaviorChipText, { color: colors.behaviorGoodText }]}>{stat.positive}</Text>
                      </View>
                      <View style={[styles.behaviorChip, { backgroundColor: colors.behaviorBadBg }]}>
                        <Ionicons name="trending-down" size={12} color="#EF4444" />
                        <Text style={[styles.behaviorChipText, { color: colors.behaviorBadText }]}>{stat.negative}</Text>
                      </View>
                      <View style={[styles.behaviorChip, { backgroundColor: colors.glass }]}>
                        <Ionicons name="remove" size={12} color={colors.textSubtle} />
                        <Text style={[styles.behaviorChipText, { color: colors.textBody }]}>{stat.neutral}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Gaming Reward + Audio Lessons quick-nav row */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
            <TouchableOpacity
              onPress={() => router.push("/games")}
              activeOpacity={0.88}
              style={{ flex: 1, borderRadius: 18, overflow: "hidden" }}
            >
              <LinearGradient
                colors={["#7b3ff2", "#a855f7"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 16 }}
              >
                <Ionicons name="game-controller" size={22} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13, lineHeight: 17 }}>Gaming Reward</Text>
                  <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 10.5, marginTop: 1 }}>Play & earn points</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            </TouchableOpacity>

            <LockedBlock
              locked={!isPremium}
              reason="audio_lessons"
              label="Premium"
              cta="Unlock Audio Lessons"
              style={{ flex: 1, borderRadius: 18 }}
            >
              <TouchableOpacity
                onPress={() => router.push("/audio-lessons")}
                activeOpacity={0.88}
                style={{ flex: 1, borderRadius: 18, overflow: "hidden" }}
              >
                <LinearGradient
                  colors={["#0e7490", "#0891b2"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 16 }}
                >
                  <Ionicons name="headset" size={22} color="#fff" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13, lineHeight: 17 }}>Audio Lessons</Text>
                    <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 10.5, marginTop: 1 }}>Listen while parenting</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
                </LinearGradient>
              </TouchableOpacity>
            </LockedBlock>
          </View>

          {/* Big primary CTA */}
          <TouchableOpacity onPress={() => router.push("/(tabs)/coach")} activeOpacity={0.9} style={{ marginTop: 4 }}>
            <LinearGradient
              colors={[brand.primary, brand.purple500] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.bigCta}
            >
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text style={styles.bigCtaText}>✨ Plan My Child's Day</Text>
            </LinearGradient>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>

    {!noChildren && (
      <AmyFAB
        onPress={() => router.push("/amy-ai")}
        bottomOffset={botPad + 96}
      />
    )}

    <SideDrawer
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      activeKey="dashboard"
      onNavigate={(route) => router.push(route as any)}
    />
    </View>
  );
}

function makeStyles(theme: ThemePalette) {
  const isLight = theme.mode === "light";
  const cardBg = isLight ? "#FFFFFF" : "#14142B";
  const cardBorder = isLight ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.08)";
  const subtleSurface = isLight ? "rgba(15,23,42,0.04)" : "rgba(255,255,255,0.04)";
  const headerOverlay = isLight ? "rgba(15,23,42,0.03)" : "rgba(244,244,245,0.4)";
  const rowOverlay = isLight ? "rgba(15,23,42,0.04)" : "rgba(244,244,245,0.5)";
  const onCardPrimary = theme.text.primary;
  const onCardSecondary = isLight ? "rgba(15,23,42,0.65)" : "rgba(255,255,255,0.7)";
  const onCardMuted = isLight ? "rgba(15,23,42,0.45)" : "rgba(255,255,255,0.6)";
  const onScreenSecondary = isLight ? "rgba(15,23,42,0.55)" : "rgba(255,255,255,0.6)";

  return StyleSheet.create({
  container: { flex: 1 },

  /* HERO */
  heroGreeting: {
    borderRadius: 24,
    padding: 22,
  },
  heroEyebrow: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
    color: "rgba(146,64,14,0.85)",
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.78)",
  },

  /* CHILDREN STRIP */
  stripHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4, marginBottom: 8 },
  stripEyebrow: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2, color: onScreenSecondary },
  childCard: {
    minWidth: 180,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.04)",
  },
  childCardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  childEmojiBubble: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: "#14142B",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  childEmojiText: { fontSize: 22 },
  childName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  childAge: { fontSize: 11, color: "rgba(31,41,55,0.6)", fontFamily: "Inter_400Regular", marginTop: 2 },
  childTagline: { fontSize: 11, color: "rgba(31,41,55,0.6)", fontFamily: "Inter_400Regular", fontStyle: "italic", marginTop: 8 },
  childAddCard: {
    minWidth: 130, borderRadius: 22, padding: 14, borderWidth: 1.5, borderStyle: "dashed",
    borderColor: theme.borderMuted, backgroundColor: "rgba(244,244,245,0.4)",
    alignItems: "center", justifyContent: "center",
  },
  childAddPlus: { fontSize: 22, marginBottom: 4 },
  childAddText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "rgba(31,41,55,0.7)" },

  /* TIMELINE */
  timelineRowWrap: { flexDirection: "row", gap: 10, marginBottom: 16, alignItems: "stretch" },
  timelineCard: {
    backgroundColor: cardBg, borderRadius: 22, overflow: "hidden",
    borderWidth: 1, borderColor: cardBorder,
    shadowColor: "#000", shadowOpacity: isLight ? 0.06 : 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  timelineHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, paddingHorizontal: 14 },
  timelineHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  timelineHeaderTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: onCardPrimary },
  timelineHeaderRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  timelineHeaderLink: { fontSize: 11, fontFamily: "Inter_700Bold", color: brand.violet600 },
  timelineRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: rowOverlay, borderRadius: 16, padding: 10,
  },
  timelineRowCurrent: { backgroundColor: brand.primary },
  timelineTime: { width: 56, alignItems: "center", gap: 4 },
  timelineTimeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: onCardSecondary },
  timelineNowBadge: { backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  timelineNowText: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.5 },
  timelineNextBadge: { backgroundColor: brand.violet100, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  timelineNextText: { fontSize: 8, fontFamily: "Inter_700Bold", color: brand.violet700, letterSpacing: 0.5 },
  timelineActivity: { fontSize: 13, fontFamily: "Inter_700Bold", color: onCardPrimary },
  timelineMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: onCardSecondary, marginTop: 2 },
  timelineEmpty: {
    borderRadius: 16, padding: 20, alignItems: "center", gap: 8,
    borderWidth: 1.5, borderStyle: "dashed", borderColor: brandAlpha.violet600_30,
    backgroundColor: isLight ? brandAlpha.violet600_03 : brandAlpha.violet600_08,
  },
  timelineEmptyTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: theme.text.primary },
  timelineEmptySub: { fontSize: 11, color: theme.text.secondary, textAlign: "center", fontFamily: "Inter_400Regular" },
  timelineEmptyBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, marginTop: 6 },
  timelineEmptyBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13 },
  timelineDone: {
    borderRadius: 16, padding: 18, alignItems: "center", gap: 4,
    borderWidth: 1.5, borderColor: brandAlpha.violet600_22,
    backgroundColor: isLight ? brandAlpha.violet600_04 : brandAlpha.violet600_10,
  },
  timelineDoneTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: isLight ? brand.violet900 : brand.violet300 },
  timelineDoneSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: isLight ? "rgba(76,29,149,0.65)" : "rgba(196,181,253,0.75)" },

  /* STREAK */
  streakCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 150,
    backgroundColor: cardBg,
    borderWidth: 1.5,
    borderColor: brandAlpha.violet600_22,
  },
  streakEmoji: { fontSize: 26, marginBottom: 2 },
  streakNum: { fontSize: 26, fontFamily: "Inter_700Bold", lineHeight: 30, color: brand.violet600 },
  streakLabel: { fontSize: 11, fontFamily: "Inter_700Bold", marginTop: 2, color: isLight ? brand.violet900 : brand.violet300 },
  streakSub: { fontSize: 9, fontFamily: "Inter_500Medium", marginTop: 4, textAlign: "center", color: isLight ? "rgba(76,29,149,0.6)" : "rgba(196,181,253,0.7)" },

  /* STATS */
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statCardWrap: { width: "47.8%", flexGrow: 1 },
  statCard: {
    borderRadius: 16, padding: 14, minHeight: 92, justifyContent: "space-between",
    backgroundColor: cardBg,
    borderWidth: 1.5, borderColor: brandAlpha.violet600_18,
  },
  statTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statLabel: { fontSize: 11, fontFamily: "Inter_700Bold", color: isLight ? brand.violet900 : brand.violet300 },
  statBottom: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 6 },
  statValue: { fontSize: 26, fontFamily: "Inter_700Bold", color: brand.violet600 },
  statSub: { fontSize: 10, fontFamily: "Inter_500Medium", color: isLight ? "rgba(76,29,149,0.65)" : "rgba(196,181,253,0.75)" },

  /* AMY CARD */
  amyCard: {
    backgroundColor: cardBg, borderRadius: 18, overflow: "hidden", marginBottom: 16,
    borderWidth: 1.5, borderColor: brandAlpha.violet600_22,
  },
  amyHeader: { flexDirection: "row", padding: 12, alignItems: "center", borderBottomWidth: 1, borderBottomColor: brandAlpha.violet600_15, backgroundColor: isLight ? brandAlpha.violet600_04 : brandAlpha.violet600_10 },
  amyHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  amyAvatar: { width: 28, height: 28, borderRadius: 10, backgroundColor: brand.primary, alignItems: "center", justifyContent: "center" },
  amyTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: onCardPrimary },
  amySub: { fontSize: 11, color: onCardMuted, fontFamily: "Inter_400Regular", marginTop: 1 },
  amyTip: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  amyTipText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: "Inter_500Medium" },

  /* SCORE */
  scoreCard: { backgroundColor: cardBg, borderRadius: 18, overflow: "hidden", marginBottom: 16, borderWidth: 1.5, borderColor: brandAlpha.violet600_22 },
  scoreHeader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: brandAlpha.violet600_15, backgroundColor: isLight ? brandAlpha.violet600_04 : brandAlpha.violet600_10 },
  scoreTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: onCardPrimary },
  scoreSub: { fontSize: 11, color: onCardMuted, fontFamily: "Inter_400Regular", marginTop: 1 },
  scoreBody: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14 },
  scoreRingWrap: { width: 70, height: 70, alignItems: "center", justifyContent: "center" },
  scoreRingCenter: { position: "absolute", alignItems: "center", justifyContent: "center" },
  scoreGrade: { fontSize: 20, fontFamily: "Inter_700Bold", lineHeight: 22 },
  scoreOf: { fontSize: 9, color: onCardMuted, fontFamily: "Inter_500Medium" },
  scoreBetter: { fontSize: 12, fontFamily: "Inter_500Medium", color: onCardPrimary },
  scoreRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  scoreRowLabel: { fontSize: 11, color: onCardMuted, fontFamily: "Inter_400Regular" },
  scoreRowValue: { fontSize: 11, color: onCardPrimary, fontFamily: "Inter_700Bold" },
  scoreBar: { height: 5, backgroundColor: subtleSurface, borderRadius: 3, overflow: "hidden", marginBottom: 6 },
  scoreBarFill: { height: "100%", borderRadius: 3 },

  /* LIST CARDS */
  listCard: { backgroundColor: cardBg, borderRadius: 18, marginBottom: 16, borderWidth: 1, borderColor: cardBorder, overflow: "hidden" },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, backgroundColor: headerOverlay, borderBottomWidth: 1, borderBottomColor: cardBorder },
  listHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  listTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: onCardPrimary },
  listSub: { fontSize: 11, color: onCardMuted, fontFamily: "Inter_400Regular", marginTop: 1 },
  listLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  listLinkText: { fontSize: 11, fontFamily: "Inter_700Bold", color: brand.purple500 },
  listEmpty: { alignItems: "center", padding: 24, gap: 8 },
  listEmptyText: { fontSize: 13, color: onCardMuted, fontFamily: "Inter_500Medium" },
  listEmptyLink: { fontSize: 13, color: brand.purple500, fontFamily: "Inter_700Bold", marginTop: 4 },
  listRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: cardBorder },
  listRowTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: onCardPrimary },
  listRowMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  listChildPill: { backgroundColor: brandAlpha.purple500_10, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  listChildPillText: { fontSize: 10, fontFamily: "Inter_700Bold", color: brand.violet600 },
  listRowDate: { fontSize: 11, color: onCardMuted, fontFamily: "Inter_400Regular" },
  listRowPct: { fontSize: 12, fontFamily: "Inter_700Bold", color: onCardPrimary },
  listRowDone: { fontSize: 9, color: onCardMuted, fontFamily: "Inter_400Regular" },

  /* BEHAVIOR */
  behaviorRow: { padding: 14, borderBottomWidth: 1, borderBottomColor: cardBorder },
  behaviorChild: { fontSize: 13, fontFamily: "Inter_700Bold", color: onCardPrimary, marginBottom: 8 },
  behaviorStats: { flexDirection: "row", gap: 8 },
  behaviorChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 8, borderRadius: 10 },
  behaviorChipText: { fontSize: 13, fontFamily: "Inter_700Bold" },

  /* BIG CTA */
  bigCta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 16, borderRadius: 22,
    shadowColor: brand.violet600, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  bigCtaText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },

  /* ONBOARDING */
  onbHero: {
    borderRadius: 26, padding: 26, alignItems: "center", marginBottom: 22,
    shadowColor: brand.indigo500, shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10,
  },
  onbHeroEmoji: { marginBottom: 12 },
  onbHeroEyebrow: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 2, color: "#BFDBFE", marginBottom: 6 },
  onbHeroTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center", marginBottom: 8 },
  onbHeroSub: { fontSize: 15, fontFamily: "Inter_500Medium", textAlign: "center", marginBottom: 8 },
  onbHeroBody: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular", color: "rgba(219,234,254,0.85)", textAlign: "center" },
  onbDivider: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 },
  onbDividerLine: { flex: 1, height: 1, backgroundColor: theme.dividerMuted },
  onbDividerText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "rgba(255,255,255,0.6)" },
  onbFeature: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, borderWidth: 1 },
  onbFeatureIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  onbFeatureLabel: { fontSize: 13, fontFamily: "Inter_700Bold", color: onCardPrimary },
  onbFeatureDesc: { fontSize: 11, fontFamily: "Inter_400Regular", color: onCardSecondary, marginTop: 2 },
  onbPrimary: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 16, borderRadius: 18, marginBottom: 10,
    shadowColor: brand.purple500, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  onbPrimaryText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  onbSecondary: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, borderRadius: 18, borderWidth: 1.5, borderColor: cardBorder,
    backgroundColor: cardBg, marginBottom: 14,
  },
  onbSecondaryText: { fontSize: 14, fontFamily: "Inter_700Bold", color: onCardPrimary },
  onbFooter: { fontSize: 11, color: onScreenSecondary, textAlign: "center", fontFamily: "Inter_400Regular", marginBottom: 8 },

  /* HERO TOP ROW (brand + menu) */
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  heroBrandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  heroLogo: { width: 30, height: 30, borderRadius: 8 },
  heroBrand: { fontSize: 16, fontFamily: "Inter_700Bold", color: theme.text.primary, letterSpacing: 0.2 },
  aiBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999,
    shadowColor: "#FF4ECD", shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 4,
  },
  aiBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: 1.2 },
  heroRightRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  heroFaceRing: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    backgroundColor: subtleSurface,
    borderWidth: 1, borderColor: cardBorder,
    shadowColor: brand.primary, shadowOpacity: 0.55, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6,
  },
  menuBtn: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    backgroundColor: subtleSurface,
    borderWidth: 1, borderColor: cardBorder,
  },
  amyAiHeaderBtn: {
    borderRadius: 14, overflow: "hidden",
    shadowColor: "#FF4ECD", shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 6,
  },
  amyAiHeaderBtnGrad: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },

  /* DRAWER */
  drawerScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  drawerPanel: {
    position: "absolute",
    top: 0, bottom: 0, right: 0,
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: -8, height: 0 },
    elevation: 24,
  },
  drawerHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)",
  },
  drawerBrand: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  drawerBrandSub: { fontSize: 11, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.6)" },
  drawerItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  drawerItemActive: {
    shadowColor: "#FF4ECD", shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  drawerItemLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.85)" },

  /* AMY FAB */
  fabWrap: {
    position: "absolute",
    right: 18,
    alignItems: "flex-end",
  },
  fabHit: {
    alignItems: "center",
  },
  fabRing: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(11,11,26,0.6)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#FF4ECD", shadowOpacity: 0.55, shadowRadius: 22, shadowOffset: { width: 0, height: 0 }, elevation: 14,
  },
  fabTooltip: {
    marginTop: 6,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(11,11,26,0.85)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.10)",
  },
  fabTooltipText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.85)" },
  });
}

function useThemedStyles() {
  const { theme } = useTheme();
  return useMemo(() => makeStyles(theme), [theme]);
}
