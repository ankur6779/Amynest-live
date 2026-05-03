import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import {
  View, Text, Image, Pressable, ActivityIndicator, StyleSheet,
  Modal, StatusBar, FlatList, useWindowDimensions,
} from "react-native";
import type { ViewToken } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEventListener } from "expo";
import {
  fetchReelsBatch, type ReelVideo,
  driveThumbnailUrl,
} from "@/services/hubApi";
import { absoluteStreamUrl } from "@/services/storiesApi";
import { useColors } from "@/hooks/useColors";
import { ACCENT_PINK, brand, palette } from "@/constants/colors";
import { useTranslation } from "react-i18next";

const BATCH = 6;

// ─── Single full-screen reel item ──────────────────────────────────────────

function ReelVideoItem({
  video,
  isActive,
  width,
  height,
}: {
  video: ReelVideo;
  isActive: boolean;
  width: number;
  height: number;
}) {
  const displayName = video.name.replace(/\.[^.]+$/, "").replace(/_/g, " ");
  const [errored, setErrored] = useState(false);

  const player = useVideoPlayer(absoluteStreamUrl(video.streamUrl), (p) => {
    p.loop = true;
    if (isActive) p.play();
  });

  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "error") setErrored(true);
  });

  useEffect(() => {
    setErrored(false);
  }, [video.id]);

  useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive]);

  const { t } = useTranslation();
  return (
    <View style={{ width, height, backgroundColor: "#000" }}>
      {!errored ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          nativeControls
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, itemStyles.errorBox]}>
          <Ionicons name="alert-circle-outline" size={48} color="#fff" />
          <Text style={itemStyles.errorText}>{t("components.art_craft_reels.couldn_t_play_this_video")}</Text>
        </View>
      )}
      {/* Bottom title bar */}
      <View style={itemStyles.titleBar} pointerEvents="none">
        <Text numberOfLines={2} style={itemStyles.title}>{displayName}</Text>
        <Text style={itemStyles.swipeHint}>{t("components.art_craft_reels.swipe_up_down_to_browse")}</Text>
      </View>
    </View>
  );
}

const itemStyles = StyleSheet.create({
  errorBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  errorText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    textAlign: "center",
  },
  titleBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingBottom: 32,
    paddingTop: 60,
    backgroundColor: "transparent",
  },
  title: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    marginBottom: 4,
  },
  swipeHint: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

// ─── Reel player (full-screen, vertical-paged FlatList) ───────────────────

function ReelPlayer({
  videos,
  initialIndex,
  onClose,
  onLoadMore,
  loadingMore,
}: {
  videos: ReelVideo[];
  initialIndex: number;
  onClose: () => void;
  onLoadMore: () => void;
  loadingMore: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  );
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 });

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: height, offset: height * index, index }),
    [height],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ReelVideo; index: number }) => (
      <ReelVideoItem
        video={item}
        isActive={index === activeIndex}
        width={width}
        height={height}
      />
    ),
    [activeIndex, width, height],
  );

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <FlatList
          data={videos}
          keyExtractor={(v) => v.id}
          renderItem={renderItem}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={viewabilityConfig.current}
          getItemLayout={getItemLayout}
          initialScrollIndex={initialIndex}
          windowSize={3}
          maxToRenderPerBatch={3}
          removeClippedSubviews
          onEndReachedThreshold={0.5}
          onEndReached={onLoadMore}
          ListFooterComponent={
            loadingMore ? (
              <View
                style={{
                  width,
                  height: height * 0.3,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#000",
                }}
              >
                <ActivityIndicator color={ACCENT_PINK} />
                <Text style={{ color: "rgba(255,255,255,0.45)", marginTop: 10, fontSize: 12 }}>
                  Loading more videos…
                </Text>
              </View>
            ) : null
          }
        />

        {/* Close button — top-left */}
        <Pressable
          onPress={onClose}
          style={[playerStyles.closeBtn, { top: insets.top + 8 }]}
          hitSlop={12}
        >
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>

        {/* Counter — top-right */}
        <View style={[playerStyles.counter, { top: insets.top + 14 }]}>
          <Text style={playerStyles.counterText}>
            {activeIndex + 1} / {videos.length}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const playerStyles = StyleSheet.create({
  closeBtn: {
    position: "absolute",
    left: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    position: "absolute",
    right: 14,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  counterText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});

// ─── Main tile-grid component ──────────────────────────────────────────────

export function ArtCraftReels() {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const [videos, setVideos] = useState<ReelVideo[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [playerIndex, setPlayerIndex] = useState<number | null>(null);
  const initRef = useRef(false);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async (nextOffset: number, isInitial = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (isInitial) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const data = await fetchReelsBatch(nextOffset, BATCH);
      setVideos(prev => {
        const seen = new Set(prev.map(v => v.id));
        return [...prev, ...data.videos.filter(v => !seen.has(v.id))];
      });
      setHasMore(data.nextOffset !== null);
      setOffset(data.nextOffset ?? nextOffset);
    } catch (e) {
      setError((e as Error).message || "Failed to load videos");
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    loadMore(0, true);
  }, [loadMore]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingRef.current) loadMore(offset);
  }, [hasMore, offset, loadMore]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={ACCENT_PINK} />
        <Text style={s.dim}>{t("components.art_craft_reels.loading_videos")}</Text>
      </View>
    );
  }

  if (error && videos.length === 0) {
    return (
      <View style={s.center}>
        <Text style={s.errText}>⚠ {error}</Text>
        <Pressable
          onPress={() => { initRef.current = false; loadMore(0, true); }}
          style={s.retryBtn}
        >
          <Text style={s.retryText}>{t("components.art_craft_reels.try_again")}</Text>
        </Pressable>
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={s.center}>
        <Text style={s.dim}>{t("components.art_craft_reels.no_videos_available_right_now")}</Text>
      </View>
    );
  }

  return (
    <>
      {playerIndex !== null && (
        <ReelPlayer
          videos={videos}
          initialIndex={playerIndex}
          onClose={() => setPlayerIndex(null)}
          onLoadMore={handleLoadMore}
          loadingMore={loadingMore}
        />
      )}

      <View style={{ gap: 10 }}>
        <Text style={s.lead}>{t("components.art_craft_reels.tap_any_video_swipe_up_down_to_browse_al")}</Text>
        <View style={s.grid}>
          {videos.map((v, index) => (
            <ReelTile
              key={v.id}
              video={v}
              onOpen={() => setPlayerIndex(index)}
              styles={s}
            />
          ))}
        </View>

        {hasMore && (
          <Pressable
            onPress={() => loadMore(offset)}
            disabled={loadingMore}
            style={[s.loadMoreBtn, loadingMore && { opacity: 0.6 }]}
          >
            {loadingMore ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="arrow-down-circle" size={16} color="#fff" />
                <Text style={s.loadMoreText}>{t("components.art_craft_reels.load_more_videos")}</Text>
              </>
            )}
          </Pressable>
        )}

        {!hasMore && videos.length > 0 && (
          <Text style={s.endText}>You've seen all {videos.length} videos! 🎉</Text>
        )}

        {error && videos.length > 0 && (
          <Text style={s.errInline}>⚠ {error}</Text>
        )}
      </View>
    </>
  );
}

// ─── Tile card ─────────────────────────────────────────────────────────────

function ReelTile({
  video,
  onOpen,
  styles: s,
}: {
  video: ReelVideo;
  onOpen: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  const displayName = video.name.replace(/\.[^.]+$/, "").replace(/_/g, " ");
  const [failed, setFailed] = useState(false);

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [s.tile, pressed && { opacity: 0.85 }]}
    >
      <View style={s.thumbBox}>
        {failed ? (
          <View style={[s.thumb, { alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ fontSize: 28 }}>🎬</Text>
          </View>
        ) : (
          <Image
            source={{ uri: driveThumbnailUrl(video.id, 480) }}
            style={s.thumb}
            onError={() => setFailed(true)}
            resizeMode="cover"
          />
        )}
        <View style={s.playOverlay}>
          <View style={s.playBtn}>
            <Ionicons name="play" size={22} color="#fff" />
          </View>
        </View>
      </View>
      <Text numberOfLines={2} style={s.tileTitle}>{displayName}</Text>
    </Pressable>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    center: { paddingVertical: 24, alignItems: "center", gap: 8 },
    dim: { color: c.textMuted, fontSize: 13 },
    lead: { color: c.textSubtle, fontSize: 12 },
    errText: { color: c.statusErrorText, fontSize: 13 },
    errInline: { color: c.statusErrorText, fontSize: 12, textAlign: "center", marginTop: 4 },
    retryBtn: {
      backgroundColor: c.surfaceElevated, paddingHorizontal: 18,
      paddingVertical: 9, borderRadius: 10, marginTop: 6,
    },
    retryText: { color: c.foreground, fontWeight: "700", fontSize: 12 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    tile: {
      width: "48%", borderRadius: 14, overflow: "hidden",
      backgroundColor: c.calloutBg, borderWidth: 1, borderColor: c.glassBorder,
    },
    thumbBox: { height: 130, backgroundColor: "#000", position: "relative" },
    thumb: { width: "100%", height: "100%", backgroundColor: palette.gray800 },
    playOverlay: {
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      alignItems: "center", justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.18)",
    },
    playBtn: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center", justifyContent: "center",
      borderWidth: 1.5, borderColor: "rgba(255,255,255,0.5)",
    },
    tileTitle: {
      color: c.foreground, fontSize: 12, fontWeight: "600",
      padding: 8, paddingTop: 6, lineHeight: 16, minHeight: 38,
    },
    loadMoreBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
      backgroundColor: "rgba(123,63,242,0.35)", borderRadius: 12, paddingVertical: 11,
      borderWidth: 1, borderColor: "rgba(255,78,205,0.4)",
    },
    loadMoreText: { color: "#fff", fontWeight: "700", fontSize: 13 },
    endText: { color: c.textMuted, fontSize: 12, textAlign: "center", paddingTop: 4 },
  });
}
