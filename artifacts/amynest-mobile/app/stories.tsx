import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { useStoriesData } from "@/hooks/useStoriesData";
import { StoryPlayer } from "@/components/StoryPlayer";
import type { StoryDto } from "@/services/storiesApi";
import { brand } from "@/constants/colors";

type Child = { id: number; name: string; age: number; ageMonths?: number };

// ─── Per-child index persistence ─────────────────────────────────────────────

const FLOW_KEY = (childId: number) => `story_flow_v1_${childId}`;

async function readStoredIndex(
  childId: number,
  max: number,
): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(FLOW_KEY(childId));
    if (raw === null) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 && n < max ? n : 0;
  } catch {
    return 0;
  }
}

async function writeStoredIndex(
  childId: number,
  index: number,
): Promise<void> {
  try {
    await AsyncStorage.setItem(FLOW_KEY(childId), String(index));
  } catch {}
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StoriesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useColors();
  const { mode } = useTheme();
  const authFetch = useAuthFetch();
  const styles = useMemo(() => makeStyles(c, mode), [c, mode]);

  const { data: children = [], isLoading: childrenLoading } = useQuery<Child[]>(
    {
      queryKey: ["children"],
      queryFn: async () => {
        const r = await authFetch("/api/children");
        if (!r.ok) return [];
        return r.json();
      },
    },
  );

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const effectiveChild = useMemo(() => {
    if (!children.length) return null;
    return selectedId
      ? (children.find((ch) => ch.id === selectedId) ?? children[0])
      : children[0];
  }, [children, selectedId]);

  const { loading, error, data, refresh, recordProgress } = useStoriesData(
    effectiveChild?.id ?? null,
  );

  // Sorted catalog — consistent ordering by title.
  const stories: StoryDto[] = useMemo(() => {
    if (!data?.rows.allStories?.length) return [];
    return [...data.rows.allStories].sort((a, b) =>
      a.title.localeCompare(b.title),
    );
  }, [data]);

  // ── Flow state ──
  const [flowIndex, setFlowIndex_] = useState(0);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [autoAdvanceIn, setAutoAdvanceIn] = useState<number | null>(null);
  const [showLoopBanner, setShowLoopBanner] = useState(false);
  const [replaySignal, setReplaySignal] = useState(0);

  const setFlowIndex = useCallback(
    (idx: number) => {
      setFlowIndex_(idx);
      if (effectiveChild) void writeStoredIndex(effectiveChild.id, idx);
    },
    [effectiveChild],
  );

  // Restore index when child/stories change.
  const restoredForChild = useRef<number | null>(null);
  useEffect(() => {
    if (!effectiveChild || !stories.length) return;
    if (restoredForChild.current === effectiveChild.id) return;
    restoredForChild.current = effectiveChild.id;
    readStoredIndex(effectiveChild.id, stories.length).then((idx) => {
      setFlowIndex_(idx);
    });
    setPlayerOpen(false);
    setAutoAdvanceIn(null);
    setShowLoopBanner(false);
  }, [effectiveChild?.id, stories.length]);

  // Close player on child switch.
  useEffect(() => {
    restoredForChild.current = null;
    setPlayerOpen(false);
    setAutoAdvanceIn(null);
    setShowLoopBanner(false);
  }, [effectiveChild?.id]);

  // ── Countdown management ──
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setAutoAdvanceIn(null);
  }, []);

  const advanceToNext = useCallback(() => {
    clearCountdown();
    setReplaySignal(0);
    setFlowIndex_((prev) => {
      const next = prev + 1;
      if (next >= stories.length) {
        if (effectiveChild) void writeStoredIndex(effectiveChild.id, 0);
        setShowLoopBanner(true);
        setTimeout(() => setShowLoopBanner(false), 3000);
        return 0;
      }
      if (effectiveChild) void writeStoredIndex(effectiveChild.id, next);
      return next;
    });
  }, [clearCountdown, stories.length, effectiveChild]);

  const startCountdown = useCallback(() => {
    clearCountdown();
    setAutoAdvanceIn(3);
    let remaining = 3;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
        setAutoAdvanceIn(null);
        advanceToNext();
      } else {
        setAutoAdvanceIn(remaining);
      }
    }, 1000);
  }, [clearCountdown, advanceToNext]);

  // Error auto-skip (2 s).
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleError = useCallback(() => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => advanceToNext(), 2000);
  }, [advanceToNext]);

  useEffect(
    () => () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    },
    [],
  );

  const handleNext = useCallback(() => {
    clearCountdown();
    setShowLoopBanner(false);
    advanceToNext();
  }, [clearCountdown, advanceToNext]);

  const handleReplay = useCallback(() => {
    clearCountdown();
    setShowLoopBanner(false);
    setReplaySignal((s) => s + 1);
  }, [clearCountdown]);

  const handleClose = useCallback(() => {
    clearCountdown();
    setPlayerOpen(false);
    setShowLoopBanner(false);
    refresh();
  }, [clearCountdown, refresh]);

  const currentStory = stories[flowIndex] ?? null;

  // ── Colour scheme ──
  const gradient: [string, string] =
    mode === "light" ? ["#FFE4F2", "#FFF4E0"] : ["#1a0d2e", "#2a1340"];

  // ── Render ──
  return (
    <LinearGradient colors={gradient} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={24} color={c.textStrong} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: c.textStrong }]}>
              🎬 Kids Story Hub
            </Text>
            <Text style={[styles.subtitle, { color: c.textMuted ?? "#888" }]}>
              Bedtime, moral &amp; fun stories for ages 0–8
            </Text>
          </View>
        </View>

        {/* Child selector */}
        {children.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {children.map((ch) => {
              const isSel = effectiveChild?.id === ch.id;
              return (
                <Pressable
                  key={ch.id}
                  onPress={() => setSelectedId(ch.id)}
                  style={[styles.chip, isSel && styles.chipActive]}
                >
                  <Text
                    style={[
                      styles.chipName,
                      { color: isSel ? "#fff" : c.textStrong },
                    ]}
                  >
                    {ch.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Body */}
        {childrenLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={brand.primary} />
          </View>
        ) : !effectiveChild ? (
          <View style={styles.emptyCard}>
            <Text style={[styles.emptyTitle, { color: c.textStrong }]}>
              Add a child first
            </Text>
            <Text style={[styles.emptyDesc, { color: c.textMuted ?? "#888" }]}>
              Stories are personalised per child.
            </Text>
          </View>
        ) : loading && !data ? (
          <View style={styles.center}>
            <ActivityIndicator color={brand.primary} />
            <Text style={[styles.dim, { color: c.textMuted ?? "#888" }]}>
              Loading {effectiveChild.name}'s stories…
            </Text>
          </View>
        ) : error && !data ? (
          <View style={styles.emptyCard}>
            <Text style={[styles.emptyTitle, { color: c.textStrong }]}>
              Couldn't load stories
            </Text>
            <Pressable onPress={refresh} style={styles.retryBtn}>
              <Ionicons name="refresh" size={14} color="#fff" />
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : !stories.length ? (
          <View style={styles.emptyCard}>
            <Text style={[styles.emptyTitle, { color: c.textStrong }]}>
              No stories yet
            </Text>
            <Text style={[styles.emptyDesc, { color: c.textMuted ?? "#888" }]}>
              New content is added regularly — check back soon!
            </Text>
          </View>
        ) : currentStory ? (
          <View style={styles.body}>
            {/* Catalog meta */}
            <Text style={[styles.metaLine, { color: c.textMuted ?? "#888" }]}>
              ✨ {stories.length} stories • for {data?.child.name ?? effectiveChild.name}
            </Text>

            {/* Now-playing hero card */}
            <View
              style={[
                styles.heroCard,
                { backgroundColor: mode === "dark" ? "#1e1034" : "#fff" },
              ]}
            >
              {/* Thumbnail */}
              <View style={styles.thumbWrap}>
                {currentStory.thumbnailUrl ? (
                  <Image
                    source={{ uri: currentStory.thumbnailUrl }}
                    style={styles.thumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.thumbPlaceholder}>
                    <Ionicons name="film-outline" size={48} color="rgba(255,255,255,0.3)" />
                  </View>
                )}

                {/* Story counter badge */}
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    Story {flowIndex + 1} of {stories.length}
                  </Text>
                </View>

                {/* Central play button */}
                <Pressable
                  onPress={() => setPlayerOpen(true)}
                  style={({ pressed }) => [
                    styles.playOverlay,
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <View style={styles.playCircle}>
                    <Ionicons
                      name="play"
                      size={28}
                      color={brand.primary}
                      style={{ marginLeft: 3 }}
                    />
                  </View>
                </Pressable>
              </View>

              {/* Story info */}
              <View style={styles.heroInfo}>
                <View style={styles.heroText}>
                  <Text
                    style={[styles.heroTitle, { color: c.textStrong }]}
                    numberOfLines={2}
                  >
                    {currentStory.title}
                  </Text>
                  <Text
                    style={[styles.heroCategory, { color: c.textMuted ?? "#888" }]}
                  >
                    {currentStory.category}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setPlayerOpen(true)}
                  style={({ pressed }) => [
                    styles.watchBtn,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Ionicons name="play" size={14} color="#fff" />
                  <Text style={styles.watchBtnText}>Watch</Text>
                </Pressable>
              </View>
            </View>

            {/* Upcoming stories mini list */}
            {stories.length > 1 && (
              <View style={styles.upNextSection}>
                <Text style={[styles.upNextLabel, { color: c.textMuted ?? "#888" }]}>
                  Up Next
                </Text>
                {stories
                  .slice(flowIndex + 1, flowIndex + 4)
                  .concat(
                    flowIndex + 4 > stories.length
                      ? stories.slice(0, Math.max(0, 3 - (stories.length - flowIndex - 1)))
                      : [],
                  )
                  .map((s, i) => (
                    <Pressable
                      key={s.id}
                      onPress={() => {
                        const target = (flowIndex + 1 + i) % stories.length;
                        setFlowIndex(target);
                        setPlayerOpen(true);
                      }}
                      style={({ pressed }) => [
                        styles.upNextRow,
                        {
                          backgroundColor:
                            mode === "dark"
                              ? "rgba(255,255,255,0.05)"
                              : "rgba(0,0,0,0.04)",
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <View style={styles.upNextThumb}>
                        {s.thumbnailUrl ? (
                          <Image
                            source={{ uri: s.thumbnailUrl }}
                            style={StyleSheet.absoluteFill}
                            resizeMode="cover"
                          />
                        ) : (
                          <Ionicons
                            name="film-outline"
                            size={20}
                            color="rgba(255,255,255,0.4)"
                          />
                        )}
                      </View>
                      <Text
                        style={[styles.upNextTitle, { color: c.textStrong }]}
                        numberOfLines={2}
                      >
                        {s.title}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={c.textMuted ?? "#888"}
                      />
                    </Pressable>
                  ))}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* Full-screen story player */}
      <StoryPlayer
        story={playerOpen ? currentStory : null}
        storyIndex={flowIndex}
        totalStories={stories.length}
        autoAdvanceIn={autoAdvanceIn}
        showLoopBanner={showLoopBanner}
        replaySignal={replaySignal}
        onNext={handleNext}
        onReplay={handleReplay}
        onClose={handleClose}
        onEnded={startCountdown}
        onError={handleError}
        onProgress={recordProgress}
      />
    </LinearGradient>
  );
}

function makeStyles(c: ReturnType<typeof useColors>, mode: "light" | "dark") {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      gap: 8,
      marginBottom: 12,
    },
    backBtn: { padding: 4 },
    title: { fontSize: 22, fontWeight: "800" },
    subtitle: { fontSize: 12, marginTop: 2 },
    chipsRow: { gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: "rgba(0,0,0,0.06)",
    },
    chipActive: { backgroundColor: brand.primary },
    chipName: { fontSize: 13, fontWeight: "700" },
    center: { paddingVertical: 60, alignItems: "center", gap: 8 },
    dim: { fontSize: 12 },
    emptyCard: {
      margin: 16,
      padding: 20,
      borderRadius: 14,
      backgroundColor: "rgba(0,0,0,0.05)",
      alignItems: "center",
      gap: 8,
    },
    emptyTitle: { fontSize: 15, fontWeight: "700" },
    emptyDesc: { fontSize: 12, textAlign: "center" },
    retryBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: brand.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      marginTop: 8,
    },
    retryText: { color: "#fff", fontWeight: "700" },

    body: { paddingHorizontal: 16, gap: 16 },
    metaLine: { fontSize: 11 },

    heroCard: {
      borderRadius: 18,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    thumbWrap: {
      width: "100%",
      aspectRatio: 16 / 9,
      backgroundColor: "#0a0a0a",
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
    },
    thumb: { ...StyleSheet.absoluteFillObject },
    thumbPlaceholder: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#1a0d2e",
      width: "100%",
    },
    badge: {
      position: "absolute",
      top: 10,
      left: 10,
      backgroundColor: "rgba(0,0,0,0.65)",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    badgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
    playOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.35)",
    },
    playCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: "rgba(255,255,255,0.92)",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    heroInfo: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 12,
    },
    heroText: { flex: 1 },
    heroTitle: { fontSize: 16, fontWeight: "700" },
    heroCategory: { fontSize: 11, textTransform: "capitalize", marginTop: 3 },
    watchBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: brand.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
    },
    watchBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

    upNextSection: { gap: 8 },
    upNextLabel: { fontSize: 13, fontWeight: "700" },
    upNextRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: 12,
      padding: 10,
    },
    upNextThumb: {
      width: 60,
      height: 36,
      borderRadius: 6,
      backgroundColor: "rgba(0,0,0,0.2)",
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    upNextTitle: { flex: 1, fontSize: 13, fontWeight: "500" },
  });
}
