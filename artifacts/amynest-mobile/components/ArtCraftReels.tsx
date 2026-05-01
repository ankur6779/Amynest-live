import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, Image, Pressable, ActivityIndicator, StyleSheet,
  Modal, StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  fetchReelsBatch, type ReelVideo,
  driveThumbnailUrl,
} from "@/services/hubApi";
import { absoluteStreamUrl } from "@/services/storiesApi";
import { useColors } from "@/hooks/useColors";
import { ACCENT_PINK, brand } from "@/constants/colors";

const BATCH = 6;

// ─── Full-screen video player (Story Hub style) ────────────────────────────

function ArtCraftVideoPlayer({
  video,
  onClose,
}: {
  video: ReelVideo | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const sourceUrl = video ? absoluteStreamUrl(video.streamUrl) : null;
  const [errored, setErrored] = useState(false);

  const player = useVideoPlayer(sourceUrl, (p) => {
    if (!video) return;
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    setErrored(false);
  }, [video?.id]);

  const displayName = video
    ? video.name.replace(/\.[^.]+$/, "").replace(/_/g, " ")
    : "";

  return (
    <Modal
      visible={!!video}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.playerBg}>
        {/* Video */}
        {!errored ? (
          <VideoView
            player={player}
            style={styles.videoView}
            contentFit="contain"
            nativeControls
          />
        ) : (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={48} color="#fff" />
            <Text style={styles.errorText}>Couldn't play this video</Text>
            <Pressable
              onPress={() => { setErrored(false); player.play(); }}
              style={styles.retryPill}
            >
              <Text style={styles.retryPillText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* Header bar */}
        <View style={[styles.playerHeader, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
          <Text numberOfLines={1} style={styles.playerTitle}>{displayName}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>
    </Modal>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export function ArtCraftReels() {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const [videos, setVideos] = useState<ReelVideo[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [playerVideo, setPlayerVideo] = useState<ReelVideo | null>(null);
  const initRef = useRef(false);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async (nextOffset: number) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
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
    }
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    loadMore(0);
  }, [loadMore]);

  if (loading && videos.length === 0) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={ACCENT_PINK} />
        <Text style={s.dim}>Loading videos…</Text>
      </View>
    );
  }

  if (error && videos.length === 0) {
    return (
      <View style={s.center}>
        <Text style={s.errText}>⚠ {error}</Text>
        <Pressable
          onPress={() => { initRef.current = false; loadMore(0); }}
          style={s.retryBtn}
        >
          <Text style={s.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={s.center}>
        <Text style={s.dim}>No videos available right now.</Text>
      </View>
    );
  }

  return (
    <>
      <ArtCraftVideoPlayer
        video={playerVideo}
        onClose={() => setPlayerVideo(null)}
      />

      <View style={{ gap: 10 }}>
        <Text style={s.lead}>🎨 Tap any video to watch</Text>
        <View style={s.grid}>
          {videos.map(v => (
            <ReelTile
              key={v.id}
              video={v}
              onOpen={() => setPlayerVideo(v)}
              styles={s}
            />
          ))}
        </View>

        {hasMore && (
          <Pressable
            onPress={() => loadMore(offset)}
            disabled={loading}
            style={[s.loadMoreBtn, loading && { opacity: 0.6 }]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="arrow-down-circle" size={16} color="#fff" />
                <Text style={s.loadMoreText}>Load more videos</Text>
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

// ─── Tile ──────────────────────────────────────────────────────────────────

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

// ─── Player styles (fullscreen) ────────────────────────────────────────────

const styles = StyleSheet.create({
  playerBg: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
  },
  videoView: {
    flex: 1,
  },
  playerHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  playerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  errorBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  errorText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    textAlign: "center",
  },
  retryPill: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: brand.primary,
    marginTop: 4,
  },
  retryPillText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});

// ─── Grid styles ───────────────────────────────────────────────────────────

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
    thumb: { width: "100%", height: "100%", backgroundColor: "#1f1f1f" },
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
