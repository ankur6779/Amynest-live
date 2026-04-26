import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { useStoriesData } from "@/hooks/useStoriesData";
import { StoryCarousel } from "@/components/StoryCarousel";
import { StoryPlayer } from "@/components/StoryPlayer";
import type { StoryDto } from "@/services/storiesApi";
import { brand } from "@/constants/colors";

type Child = { id: number; name: string; age: number; ageMonths?: number };

export default function StoriesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useColors();
  const { mode } = useTheme();
  const authFetch = useAuthFetch();
  const styles = useMemo(() => makeStyles(c, mode), [c, mode]);

  const { data: children = [], isLoading: childrenLoading } = useQuery<Child[]>({
    queryKey: ["children"],
    queryFn: async () => {
      const r = await authFetch("/api/children");
      if (!r.ok) return [];
      return r.json();
    },
  });

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const effectiveChild = useMemo(() => {
    if (!children.length) return null;
    return selectedId ? children.find((ch) => ch.id === selectedId) ?? children[0] : children[0];
  }, [children, selectedId]);

  const { loading, error, data, refresh, recordProgress } = useStoriesData(
    effectiveChild?.id ?? null,
  );
  const [activeStory, setActiveStory] = useState<StoryDto | null>(null);

  // Multi-child safety: close any open player when the active child changes,
  // so we don't accidentally record the previous child's playback against
  // the newly selected one.
  useEffect(() => {
    setActiveStory(null);
  }, [effectiveChild?.id]);

  const gradient: [string, string] =
    mode === "light" ? ["#FFE4F2", "#FFF4E0"] : ["#1a0d2e", "#2a1340"];

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
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={c.textStrong} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: c.textStrong }]}>🎬 Kids Story Hub</Text>
            <Text style={[styles.subtitle, { color: c.textMuted ?? "#888" }]}>
              Bedtime, moral & fun stories for ages 0–8
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
        ) : !data || data.catalogSize === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={[styles.emptyTitle, { color: c.textStrong }]}>
              No stories yet
            </Text>
            <Text style={[styles.emptyDesc, { color: c.textMuted ?? "#888" }]}>
              New content is added regularly — check back soon!
            </Text>
          </View>
        ) : (
          <View style={{ gap: 4 }}>
            <Text style={[styles.metaLine, { color: c.textMuted ?? "#888" }]}>
              ✨ {data.catalogSize} stories • for {data.child.name}
            </Text>

            <StoryCarousel
              title="Continue Watching"
              stories={data.rows.continueWatching}
              onSelect={setActiveStory}
              size="wide"
            />
            <StoryCarousel
              title="Recommended for You"
              stories={data.rows.recommended}
              onSelect={setActiveStory}
            />
            <StoryCarousel
              title="Trending Stories"
              stories={data.rows.trending}
              onSelect={setActiveStory}
              emptyHint="Once you've watched a few stories, popular picks will appear here."
            />
            <StoryCarousel
              title="All Stories"
              stories={data.rows.allStories}
              onSelect={setActiveStory}
            />
          </View>
        )}
      </ScrollView>

      <StoryPlayer
        story={activeStory}
        onClose={() => {
          setActiveStory(null);
          refresh();
        }}
        onProgress={recordProgress}
      />
    </LinearGradient>
  );
}

function makeStyles(c: ReturnType<typeof useColors>, _mode: "light" | "dark") {
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
    metaLine: { fontSize: 11, paddingHorizontal: 16, marginBottom: 8 },
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
  });
}
