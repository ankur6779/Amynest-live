import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useColors } from "@/hooks/useColors";
import { brand } from "@/constants/colors";
import { StoryCard } from "@/components/StoryCard";
import { StoryPlayer } from "@/components/StoryPlayer";
import type { StoryDto } from "@/services/storiesApi";

export const HUB_CONTENT_QUERY_KEY = (childId: number | null | undefined) =>
  ["hub-content", childId] as const;

type HubAgeBand = "0-2" | "2-4" | "4-6" | "6-8" | "8-10" | "10-12" | "12-15";

interface HubStory {
  id: number;
  driveFileId: string;
  title: string;
  category: string;
  thumbnailUrl: string | null;
  durationSec: number | null;
  streamUrl: string;
  ageBand: HubAgeBand | null;
  isUniversal: boolean;
  previewOnly: boolean;
  positionSec?: number;
  playCount?: number;
  completed?: boolean;
}

interface HubPhonics {
  id: number;
  ageGroup: string;
  band: HubAgeBand | null;
  level: number;
  type: string;
  symbol: string;
  sound: string;
  example: string | null;
  emoji: string | null;
  hint: string | null;
  conceptId: string | null;
  isUniversal: boolean;
  previewOnly: boolean;
  playCount?: number;
  mastered?: boolean;
}

interface HubContent {
  child: { id: number; name: string };
  currentBand: HubAgeBand;
  nextBand: HubAgeBand | null;
  bandProgress: {
    band: HubAgeBand;
    storyTotal: number;
    storyFinished: number;
    phonicsTotal: number;
    phonicsFinished: number;
    totalCount: number;
    finishedCount: number;
    percentage: number;
  };
  nextBandEarlyUnlocked: boolean;
  unlockedBands: HubAgeBand[];
  section1: { stories: HubStory[]; phonics: HubPhonics[] };
  section2: {
    mode: "discovery" | "concept-grouped";
    stories: HubStory[];
    phonics: HubPhonics[];
  };
}

function bandRangeLabel(band: HubAgeBand): string {
  return `${band.replace("-", "–")} years`;
}

function hubStoryToDto(s: HubStory): StoryDto {
  return {
    id: s.id,
    driveFileId: s.driveFileId,
    title: s.title,
    category: s.category,
    thumbnailUrl: s.thumbnailUrl,
    durationSec: s.durationSec,
    streamUrl: s.streamUrl,
    positionSec: s.positionSec,
    playCount: s.playCount,
    completed: s.completed,
  };
}

interface Props {
  childId: number;
  childName: string;
}

export default function HubProgressiveContent({ childId, childName }: Props) {
  const c = useColors();
  const authFetch = useAuthFetch();
  const queryClient = useQueryClient();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [activeStory, setActiveStory] = useState<StoryDto | null>(null);

  const { data, isLoading, error, refetch } = useQuery<HubContent>({
    queryKey: HUB_CONTENT_QUERY_KEY(childId),
    queryFn: async () => {
      const r = await authFetch(`/api/hub/content?childId=${childId}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const showComingNext = (label: string, band?: HubAgeBand | null) => {
    const bandLine = band
      ? `Unlocks at age ${bandRangeLabel(band)} — or earlier when ${childName} finishes 75% of their current band.`
      : `Unlocks as ${childName} finishes their current band.`;
    Alert.alert(`🔒 Coming next — ${label}`, bandLine);
  };

  const handleStoryTap = (s: HubStory) => {
    if (s.previewOnly) {
      showComingNext(s.title, s.ageBand);
    } else {
      setActiveStory(hubStoryToDto(s));
    }
  };

  const handlePhonicsTap = (p: HubPhonics) => {
    if (p.previewOnly) {
      showComingNext(`${p.symbol} (${p.sound})`, p.band);
    } else {
      Alert.alert(
        `${p.emoji ?? "🔤"} ${p.symbol} — ${p.sound}`,
        p.example
          ? `Try saying it: "${p.example}"`
          : "Open the Phonics section for full practice.",
      );
    }
  };

  const recordStoryProgress = (
    storyId: number,
    positionSec: number,
    options?: { durationSec?: number; completed?: boolean; startedSession?: boolean },
  ) => {
    void authFetch("/api/stories/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childId,
        storyId,
        positionSec: Math.floor(positionSec),
        ...(options?.durationSec !== undefined
          ? { durationSec: Math.floor(options.durationSec) }
          : {}),
        ...(options?.completed !== undefined ? { completed: options.completed } : {}),
        ...(options?.startedSession !== undefined
          ? { startedSession: options.startedSession }
          : {}),
      }),
    })
      .then(async (r) => {
        if (options?.completed && r.ok) {
          // Re-fetch hub immediately so unlocks reflect the new state.
          await queryClient.invalidateQueries({
            queryKey: HUB_CONTENT_QUERY_KEY(childId),
          });
          refetch();
        }
      })
      .catch(() => {});
  };

  if (isLoading) {
    return (
      <View style={styles.cardLoading} testID="hub-progressive-loading">
        <ActivityIndicator color={brand.primary} />
        <Text style={styles.loadingText}>Loading library for {childName}…</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.cardError} testID="hub-progressive-error">
        <Text style={styles.errorText}>Couldn't load progressive library.</Text>
        <Pressable onPress={() => refetch()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const pct = Math.round(data.bandProgress.percentage ?? 0);

  return (
    <View style={styles.wrap} testID="hub-progressive-content">
      {/* Band progress header */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeaderRow}>
          <View style={styles.progressHeaderLeft}>
            <Ionicons name="sparkles" size={14} color={brand.primary} />
            <Text style={styles.progressLabel}>CURRENT BAND</Text>
            <View style={styles.bandPill}>
              <Text style={styles.bandPillText}>{bandRangeLabel(data.currentBand)}</Text>
            </View>
          </View>
          <Text style={styles.pctText} testID="hub-band-progress-pct">
            {pct}%
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              { width: `${Math.min(100, Math.max(0, pct))}%` },
            ]}
            testID="hub-band-progress-bar"
          />
        </View>
        <Text style={styles.progressMeta}>
          {data.bandProgress.finishedCount}/{data.bandProgress.totalCount} items complete
          {" · "}
          {data.nextBandEarlyUnlocked
            ? "Next band early-unlocked! 🎉"
            : "Reach 75% to early-unlock the next band."}
        </Text>
      </View>

      {/* Section 1 */}
      <Section
        kind="live"
        title={`Available now for ${childName}`}
        subtitle="Play any item — it counts toward unlocking the next band."
        stories={data.section1.stories}
        phonics={data.section1.phonics}
        onStoryTap={handleStoryTap}
        onPhonicsTap={handlePhonicsTap}
        styles={styles}
      />

      {/* Section 2 */}
      <Section
        kind="preview"
        title={
          data.section2.mode === "discovery"
            ? `Discover next for ${childName}`
            : `Coming next for ${childName}`
        }
        subtitle={
          data.nextBand
            ? `Peek at ${bandRangeLabel(data.nextBand)} content — tap any locked item to see when it unlocks.`
            : "Bonus content — preview to plan ahead."
        }
        stories={data.section2.stories}
        phonics={data.section2.phonics}
        onStoryTap={handleStoryTap}
        onPhonicsTap={handlePhonicsTap}
        styles={styles}
      />

      <StoryPlayer
        story={activeStory}
        onClose={() => {
          setActiveStory(null);
          refetch();
        }}
        onProgress={recordStoryProgress}
      />
    </View>
  );
}

function Section({
  kind,
  title,
  subtitle,
  stories,
  phonics,
  onStoryTap,
  onPhonicsTap,
  styles,
}: {
  kind: "live" | "preview";
  title: string;
  subtitle: string;
  stories: HubStory[];
  phonics: HubPhonics[];
  onStoryTap: (s: HubStory) => void;
  onPhonicsTap: (p: HubPhonics) => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  const isPreview = kind === "preview";
  const hasContent = stories.length > 0 || phonics.length > 0;
  const testID = kind === "live" ? "hub-section1" : "hub-section2";

  return (
    <View testID={testID} style={styles.sectionWrap}>
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.sectionTitleRow}>
            {isPreview && <Ionicons name="lock-closed" size={12} color="#D97706" />}
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
          <Text style={styles.sectionSub}>{subtitle}</Text>
        </View>
        {isPreview && (
          <View style={styles.comingNextPill}>
            <Text style={styles.comingNextText}>Coming next</Text>
          </View>
        )}
      </View>

      {!hasContent && (
        <Text style={styles.emptyHint} testID={`${testID}-empty`}>
          Nothing here yet — check back as new content lands.
        </Text>
      )}

      {stories.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          <View style={styles.kindHeaderRow}>
            <Ionicons name="play" size={11} color="#888" />
            <Text style={styles.kindLabel}>STORIES</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 16 }}
          >
            {stories.map((s) => (
              <View
                key={s.id}
                style={s.previewOnly ? styles.dimmedTile : null}
                testID={s.previewOnly ? "hub-story-preview" : "hub-story-live"}
              >
                <StoryCard
                  story={hubStoryToDto(s)}
                  onPress={() => onStoryTap(s)}
                />
                {s.previewOnly && (
                  <View style={styles.lockBadge}>
                    <Ionicons name="lock-closed" size={9} color="#fff" />
                    <Text style={styles.lockBadgeText}>Locked</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {phonics.length > 0 && (
        <View>
          <View style={styles.kindHeaderRow}>
            <Ionicons name="musical-notes" size={11} color="#888" />
            <Text style={styles.kindLabel}>PHONICS</Text>
          </View>
          <View style={styles.phonicsGrid}>
            {phonics.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => onPhonicsTap(p)}
                style={[styles.phonicsTile, p.previewOnly && styles.dimmedTile]}
                testID={p.previewOnly ? "hub-phonics-preview" : "hub-phonics-live"}
              >
                {p.previewOnly && (
                  <Ionicons
                    name="lock-closed"
                    size={10}
                    color="#D97706"
                    style={{ position: "absolute", top: 4, right: 4 }}
                  />
                )}
                <Text style={styles.phonicsEmoji}>{p.emoji ?? "🔤"}</Text>
                <Text style={styles.phonicsSymbol}>{p.symbol}</Text>
                <Text style={styles.phonicsSound}>{p.sound}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    wrap: { gap: 14 },
    cardLoading: {
      padding: 18,
      borderRadius: 16,
      backgroundColor: "rgba(255,255,255,0.04)",
      alignItems: "center",
      gap: 8,
    },
    loadingText: { color: c.textMuted ?? "#aaa", fontSize: 12 },
    cardError: {
      padding: 18,
      borderRadius: 16,
      backgroundColor: "rgba(248,113,113,0.1)",
      borderWidth: 1,
      borderColor: "rgba(248,113,113,0.3)",
      gap: 10,
    },
    errorText: { color: "#fca5a5", fontSize: 13 },
    retryBtn: {
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: brand.primary,
    },
    retryText: { color: "#fff", fontWeight: "700", fontSize: 12 },
    progressCard: {
      borderRadius: 16,
      padding: 14,
      backgroundColor: "rgba(168,85,247,0.08)",
      borderWidth: 1,
      borderColor: "rgba(168,85,247,0.2)",
      gap: 8,
    },
    progressHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    progressHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flex: 1,
    },
    progressLabel: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1,
      color: brand.primary,
    },
    bandPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: "rgba(168,85,247,0.15)",
    },
    bandPillText: { fontSize: 10, fontWeight: "700", color: brand.primary },
    pctText: { fontSize: 13, fontWeight: "800", color: brand.primary },
    progressTrack: {
      height: 6,
      borderRadius: 999,
      backgroundColor: "rgba(168,85,247,0.15)",
      overflow: "hidden",
    },
    progressBar: {
      height: "100%",
      backgroundColor: brand.primary,
      borderRadius: 999,
    },
    progressMeta: { fontSize: 11, color: c.textMuted ?? "#aaa" },
    sectionWrap: { gap: 8 },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: c.textStrong ?? "#fff",
    },
    sectionSub: { fontSize: 11, color: c.textMuted ?? "#aaa", marginTop: 2 },
    comingNextPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: "rgba(245,158,11,0.18)",
      borderWidth: 1,
      borderColor: "rgba(245,158,11,0.3)",
    },
    comingNextText: {
      fontSize: 9,
      fontWeight: "800",
      color: "#D97706",
      letterSpacing: 0.5,
    },
    emptyHint: {
      fontSize: 12,
      fontStyle: "italic",
      color: c.textMuted ?? "#aaa",
    },
    kindHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginBottom: 4,
    },
    kindLabel: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.8,
      color: c.textMuted ?? "#888",
    },
    phonicsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    phonicsTile: {
      width: 64,
      height: 64,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.05)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.1)",
      alignItems: "center",
      justifyContent: "center",
      padding: 4,
      position: "relative",
    },
    phonicsEmoji: { fontSize: 18 },
    phonicsSymbol: {
      fontSize: 13,
      fontWeight: "800",
      color: c.textStrong ?? "#fff",
    },
    phonicsSound: {
      fontSize: 8,
      color: c.textMuted ?? "#888",
    },
    dimmedTile: { opacity: 0.55, position: "relative" },
    lockBadge: {
      position: "absolute",
      top: 6,
      right: 18,
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      backgroundColor: "rgba(245,158,11,0.95)",
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 999,
    },
    lockBadgeText: { color: "#fff", fontWeight: "800", fontSize: 8 },
  });
}
