import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, Image, Pressable, ActivityIndicator, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import {
  fetchReelsBatch, type ReelVideo,
  driveThumbnailUrl, drivePreviewUrl,
} from "@/services/hubApi";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { ACCENT_PINK } from "@/constants/colors";

const BATCH = 6;

export function ArtCraftReels() {
  const c = useColors();
  const { mode } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const [videos, setVideos] = useState<ReelVideo[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
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

  const [openErr, setOpenErr] = useState<string | null>(null);
  const onOpen = useCallback(async (video: ReelVideo) => {
    setOpenErr(null);
    try {
      await WebBrowser.openBrowserAsync(drivePreviewUrl(video.id), {
        toolbarColor: mode === "light" ? "#FFFFFF" : "#000000",
        controlsColor: mode === "light" ? "#0F172A" : "#FFFFFF",
        showTitle: true,
      });
    } catch {
      setOpenErr("Could not open the video. Please try again.");
    }
  }, [mode]);

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
        <Pressable onPress={() => { initRef.current = false; loadMore(0); }} style={s.retryBtn}>
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
    <View style={{ gap: 10 }}>
      <Text style={s.lead}>🎨 Tap any video to play in fullscreen</Text>
      <View style={s.grid}>
        {videos.map(v => (
          <ReelTile key={v.id} video={v} onOpen={() => onOpen(v)} styles={s} />
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

      {openErr && (
        <Text style={s.errInline}>⚠ {openErr}</Text>
      )}
    </View>
  );
}

function ReelTile({ video, onOpen, styles: s }: { video: ReelVideo; onOpen: () => void; styles: ReturnType<typeof makeStyles> }) {
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

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    center: { paddingVertical: 24, alignItems: "center", gap: 8 },
    dim: { color: c.textMuted, fontSize: 13 },
    lead: { color: c.textSubtle, fontSize: 12 },
    errText: { color: c.statusErrorText, fontSize: 13 },
    errInline: { color: c.statusErrorText, fontSize: 12, textAlign: "center", marginTop: 4 },
    retryBtn: { backgroundColor: c.surfaceElevated, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10, marginTop: 6 },
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
