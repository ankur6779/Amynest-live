import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  withTiming,
  Easing,
  FadeInUp,
} from "react-native-reanimated";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";

import RoutineCard, {
  type Routine,
  CARD_W,
  CARD_GAP,
  SNAP_INTERVAL,
} from "@/components/RoutineCard";
import ProgressBar from "@/components/ProgressBar";
import AppDataStatusBanner from "@/components/AppDataStatusBanner";
import { useAppStore } from "@/store/useAppStore";
import colors, { brand, brandAlpha } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_W } = Dimensions.get("window");
const SIDE_PAD = (SCREEN_W - CARD_W) / 2;

const SAMPLE_ROUTINES: Routine[] = [
  {
    id: "r1",
    title: "Brush Teeth",
    description: "Gentle morning brushing — 2 minutes per side, soft circular strokes.",
    duration: 5,
    icon: "sparkles",
    gradient: [brand.violet500, brand.indigo500] as const,
    steps: [
      "Wet the toothbrush",
      "Apply a pea-sized amount of toothpaste",
      "Brush front teeth in small circles",
      "Brush back molars top and bottom",
      "Gently brush the tongue",
      "Rinse with water",
      "Smile in the mirror!",
    ],
    completed: false,
  },
  {
    id: "r2",
    title: "Get Ready for School",
    description: "Calm, prepared morning — clothes, bag, breakfast, and out the door.",
    duration: 25,
    icon: "school",
    gradient: [brand.purple500, colors.light.primary] as const,
    steps: [
      "Pick out clothes laid out the night before",
      "Get dressed and brush hair",
      "Eat a balanced breakfast",
      "Pack school bag (homework + snack)",
      "Grab water bottle",
      "Put on shoes and jacket",
      "Hugs and out the door",
    ],
    completed: false,
  },
  {
    id: "r3",
    title: "Homework Time",
    description: "Focused 25-minute study with a short break — calm, distraction free.",
    duration: 30,
    icon: "book",
    gradient: [colors.light.primary, brand.purple500] as const,
    steps: [
      "Clear the desk of distractions",
      "Review today's homework list",
      "Start with the hardest subject",
      "Work for 25 focused minutes",
      "Take a 5-minute stretch break",
      "Review work for mistakes",
      "Pack books back into bag",
    ],
    completed: false,
  },
  {
    id: "r4",
    title: "Play Time",
    description: "Free, screen-free creative play — imagination, movement, and fun.",
    duration: 45,
    icon: "happy",
    gradient: [brand.purple600, brand.violet500] as const,
    steps: [
      "Choose between indoor or outdoor play",
      "Invite a sibling or friend (optional)",
      "Pick toys, blocks, or art supplies",
      "Play freely without screens",
      "Switch activities every 15 minutes",
      "Tidy up toys when finished",
      "Wash hands afterward",
    ],
    completed: false,
  },
  {
    id: "r5",
    title: "Sleep Routine",
    description: "Wind down ritual — bath, story, lights low, peaceful sleep.",
    duration: 30,
    icon: "moon",
    gradient: [brand.indigo500, brand.violet500] as const,
    steps: [
      "Warm bath or wash face",
      "Change into pyjamas",
      "Brush teeth",
      "Dim the lights",
      "Read a calming bedtime story",
      "Cuddle and goodnight kisses",
      "Lights out — sweet dreams",
    ],
    completed: false,
  },
];

export default function PremiumRoutineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [routines, setRoutines] = useState<Routine[]>(SAMPLE_ROUTINES);
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollX = useSharedValue(0);
  const headerOpacity = useSharedValue(0);

  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["78%"], []);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: (1 - headerOpacity.value) * 12 }],
  }));

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const raw = Math.round(x / SNAP_INTERVAL);
      const idx = Math.max(0, Math.min(routines.length - 1, raw));
      setActiveIndex(idx);
      if (Platform.OS !== "web") Haptics.selectionAsync();
    },
    [routines.length],
  );

  // Live overlay from /api/app-data — prefer server counts when available
  const liveRoutine = useAppStore((s) => s.data?.routine);
  const localCompletedCount = routines.filter((r) => r.completed).length;
  const completedCount = liveRoutine ? liveRoutine.completedCount : localCompletedCount;
  const totalForBar = liveRoutine ? liveRoutine.totalCount : routines.length;
  const progress = totalForBar > 0 ? completedCount / totalForBar : 0;

  const handleCardPress = useCallback((r: Routine) => {
    setActiveRoutine(r);
    sheetRef.current?.expand();
  }, []);

  const handleToggle = useCallback((r: Routine) => {
    setRoutines((prev) =>
      prev.map((item) => (item.id === r.id ? { ...item, completed: !item.completed } : item)),
    );
    setActiveRoutine((curr) => (curr && curr.id === r.id ? { ...curr, completed: !curr.completed } : curr));
  }, []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.6}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={["#1A0F2E", "#2D1B4E", "#1F0F3A"]} // audit-ok: intentional dark bg / custom color
        locations={[0, 0.55, 1]}
        style={styles.container}
      >
        {/* Decorative blobs */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[styles.blob, { top: -80, left: -60, backgroundColor: brandAlpha.purple500_28 }]} />
          <View style={[styles.blob, { top: 240, right: -80, backgroundColor: brandAlpha.violet500_20, width: 320, height: 320 }]} />
          <View style={[styles.blob, { bottom: -60, left: 40, backgroundColor: brandAlpha.indigo500_20 }]} />
        </View>

        {/* HEADER */}
        <Animated.View style={[styles.header, { paddingTop: insets.top + 8 }, headerStyle]}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              activeOpacity={0.7}
              testID="premium-back"
              accessibilityRole="button"
              accessibilityLabel="Go back"
              accessibilityHint="Returns to the previous screen"
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.eyebrow}>TODAY'S ROUTINES</Text>
              <Text style={styles.headerTitle}>Daily Rhythm</Text>
            </View>
            <View style={styles.progressPill}>
              <Text style={styles.progressPillText}>{Math.round(progress * 100)}%</Text>
            </View>
          </View>

          <View style={{ marginTop: 18 }}>
            <ProgressBar
              progress={progress}
              label={`${completedCount} of ${totalForBar} completed`}
            />
          </View>
        </Animated.View>

        <AppDataStatusBanner />

        {/* CAROUSEL */}
        <Animated.View
          entering={FadeInUp.duration(700).delay(150)}
          style={styles.carouselWrap}
        >
          <Animated.FlatList
            data={routines}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={SNAP_INTERVAL}
            decelerationRate="fast"
            bounces={false}
            contentContainerStyle={{ paddingHorizontal: SIDE_PAD - CARD_GAP / 2 }}
            onScroll={onScroll}
            onMomentumScrollEnd={onMomentumEnd}
            scrollEventThrottle={16}
            renderItem={({ item, index }) => (
              <RoutineCard
                routine={item}
                index={index}
                scrollX={scrollX}
                onPress={handleCardPress}
                onToggle={handleToggle}
              />
            )}
          />

          {/* Pagination dots */}
          <View style={styles.dots}>
            {routines.map((r, i) => (
              <View
                key={r.id}
                style={[
                  styles.dot,
                  i === activeIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>
        </Animated.View>

        {/* Footer hint */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(400)}
          style={[styles.footerHint, { paddingBottom: insets.bottom + 12 }]}
        >
          <Ionicons name="hand-left-outline" size={14} color="rgba(255,255,255,0.55)" />
          <Text style={styles.footerHintText}>Swipe cards · Tap for details</Text>
        </Animated.View>

        {/* BOTTOM SHEET */}
        <BottomSheet
          ref={sheetRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose
          backdropComponent={renderBackdrop}
          handleIndicatorStyle={{ backgroundColor: "rgba(255,255,255,0.4)" }}
          backgroundStyle={{ backgroundColor: "#1A0F2E" }} // audit-ok: intentional dark bg / custom color
        >
          {activeRoutine && (
            <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
              <LinearGradient
                colors={activeRoutine.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sheetIcon}
              >
                <Ionicons name={activeRoutine.icon} size={36} color="#fff" />
              </LinearGradient>

              <Text style={styles.sheetTitle}>{activeRoutine.title}</Text>
              <View style={styles.sheetMetaRow}>
                <View style={styles.sheetBadge}>
                  <Ionicons name="time-outline" size={13} color={brand.violet300} />
                  <Text style={styles.sheetBadgeText}>{activeRoutine.duration} min</Text>
                </View>
                <View style={styles.sheetBadge}>
                  <Ionicons name="list" size={13} color={brand.violet300} />
                  <Text style={styles.sheetBadgeText}>{activeRoutine.steps.length} steps</Text>
                </View>
              </View>

              <Text style={styles.sheetDesc}>{activeRoutine.description}</Text>

              <Text style={styles.sheetSection}>STEPS</Text>
              {activeRoutine.steps.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  handleToggle(activeRoutine);
                  if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
                style={styles.completeBtnWrap}
                accessibilityRole="button"
                accessibilityLabel={
                  activeRoutine.completed ? "Mark routine as incomplete" : "Mark routine as completed"
                }
              >
                <LinearGradient
                  colors={activeRoutine.completed ? [c.completedGradStart, c.completedGradEnd] : [brand.purple500, colors.light.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.completeBtn}
                >
                  <Ionicons
                    name={activeRoutine.completed ? "refresh" : "checkmark-circle"}
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.completeBtnText}>
                    {activeRoutine.completed ? "Mark Incomplete" : "Mark as Completed"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </BottomSheetScrollView>
          )}
        </BottomSheet>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  blob: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 9999,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { alignItems: "center" },
  eyebrow: {
    color: "rgba(196,181,253,0.85)",
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: -0.3,
  },
  progressPill: {
    minWidth: 56,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: brandAlpha.purple500_20,
    borderWidth: 1,
    borderColor: brandAlpha.purple500_45,
    alignItems: "center",
  },
  progressPillText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  carouselWrap: {
    flex: 1,
    justifyContent: "center",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 18,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  dotActive: {
    width: 22,
    backgroundColor: brand.violet300,
  },
  footerHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 8,
  },
  footerHintText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: "500",
  },

  /* Bottom sheet */
  sheetContent: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 40,
  },
  sheetIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  sheetMetaRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  sheetBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: brandAlpha.purple500_15,
    borderWidth: 1,
    borderColor: brandAlpha.purple500_30,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  sheetBadgeText: {
    color: brand.violet300,
    fontSize: 11.5,
    fontWeight: "700",
  },
  sheetDesc: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14.5,
    lineHeight: 21,
    marginBottom: 24,
  },
  sheetSection: {
    color: "rgba(196,181,253,0.85)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: brandAlpha.purple500_20,
    borderWidth: 1,
    borderColor: brandAlpha.purple500_40,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: {
    color: brand.violet300,
    fontSize: 12,
    fontWeight: "800",
  },
  stepText: {
    flex: 1,
    color: "rgba(255,255,255,0.88)",
    fontSize: 14.5,
    lineHeight: 21,
    paddingTop: 3,
  },
  completeBtnWrap: {
    marginTop: 26,
    borderRadius: 18,
    shadowColor: brand.purple500,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
  },
  completeBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
