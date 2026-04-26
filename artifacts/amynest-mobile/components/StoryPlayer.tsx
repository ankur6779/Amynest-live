import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEventListener } from "expo";
import { absoluteStreamUrl, type StoryDto } from "@/services/storiesApi";
import { brand } from "@/constants/colors";

interface Props {
  story: StoryDto | null;
  storyIndex: number;
  totalStories: number;
  /** Countdown seconds before auto-advancing; null = not counting. */
  autoAdvanceIn: number | null;
  /** Show the "All stories watched! 🎉" banner. */
  showLoopBanner: boolean;
  /** Increment to seek back to 0 and replay. */
  replaySignal: number;
  onNext: () => void;
  onReplay: () => void;
  onClose: () => void;
  onEnded: () => void;
  onError: () => void;
  onProgress: (
    storyId: number,
    positionSec: number,
    options?: { durationSec?: number; completed?: boolean; startedSession?: boolean },
  ) => void;
}

export function StoryPlayer({
  story,
  storyIndex,
  totalStories,
  autoAdvanceIn,
  showLoopBanner,
  replaySignal,
  onNext,
  onReplay,
  onClose,
  onEnded,
  onError,
  onProgress,
}: Props) {
  const sourceUrl = story ? absoluteStreamUrl(story.streamUrl) : null;
  const [errored, setErrored] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const startedRef = useRef(false);
  const completedRef = useRef(false);

  const player = useVideoPlayer(sourceUrl, (p) => {
    if (!story) return;
    p.timeUpdateEventInterval = 1;
    p.play();
  });

  // Reset lifecycle flags on story change or retry.
  useEffect(() => {
    setErrored(false);
    startedRef.current = false;
    completedRef.current = false;
  }, [story?.id, retryKey]);

  // Replay signal: seek to start and play.
  useEffect(() => {
    if (replaySignal === 0) return;
    try {
      player.currentTime = 0;
      player.play();
    } catch {}
  }, [replaySignal]);

  // Resume from last position when ready.
  useEventListener(player, "statusChange", ({ status }) => {
    if (!story) return;
    if (status === "error") {
      setErrored(true);
      onError();
      return;
    }
    if (status === "readyToPlay") {
      const resumeFrom = story.positionSec ?? 0;
      const dur = player.duration ?? Infinity;
      if (resumeFrom > 5 && resumeFrom < dur - 5) {
        try {
          player.currentTime = resumeFrom;
        } catch {}
      }
    }
  });

  // Periodic progress writes + startedSession.
  useEventListener(player, "timeUpdate", ({ currentTime }) => {
    if (!story) return;
    const dur =
      player.duration && Number.isFinite(player.duration)
        ? player.duration
        : undefined;
    if (!startedRef.current && currentTime > 0) {
      startedRef.current = true;
      onProgress(story.id, currentTime, {
        durationSec: dur,
        startedSession: true,
      });
      return;
    }
    onProgress(story.id, currentTime, { durationSec: dur });
  });

  // Completed event.
  useEventListener(player, "playToEnd", () => {
    if (!story || completedRef.current) return;
    completedRef.current = true;
    const dur =
      player.duration && Number.isFinite(player.duration)
        ? player.duration
        : 0;
    onProgress(story.id, dur, { durationSec: dur, completed: true });
    onEnded();
  });

  // Pause when the modal closes.
  useEffect(() => {
    if (!story) {
      try {
        player.pause();
      } catch {}
    }
  }, [story, player]);

  const visible = !!story;

  // ── Dot indicator (capped at 15) ──
  const dotCount = Math.min(totalStories, 15);
  const dotIndex = storyIndex % dotCount;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
    >
      <View style={styles.backdrop}>
        {/* Header: title + progress + close */}
        <View style={styles.header}>
          <View style={styles.dotsRow}>
            {Array.from({ length: dotCount }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === dotIndex
                    ? styles.dotActive
                    : i < dotIndex
                    ? styles.dotDone
                    : styles.dotFuture,
                ]}
              />
            ))}
            <Text style={styles.dotLabel}>
              {storyIndex + 1}/{totalStories}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [
              styles.iconBtn,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
        </View>

        {/* Title */}
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {story?.title ?? ""}
          </Text>
          <Text style={styles.category}>{story?.category ?? ""}</Text>
        </View>

        {/* Video or error */}
        <View style={styles.videoWrap}>
          {errored ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={40} color="#fff" />
              <Text style={styles.errorText}>Couldn't play this story.</Text>
              <Text style={styles.errorSubText}>Skipping automatically…</Text>
            </View>
          ) : sourceUrl ? (
            <VideoView
              key={`${story?.id ?? 0}-${retryKey}`}
              player={player}
              style={styles.video}
              allowsFullscreen
              allowsPictureInPicture
              nativeControls
              contentFit="contain"
            />
          ) : (
            <ActivityIndicator color="#fff" />
          )}
        </View>

        {/* Footer controls */}
        <View style={styles.footer}>
          <Pressable
            onPress={onReplay}
            style={({ pressed }) => [
              styles.ctaBtn,
              styles.replayBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.replayText}>Replay</Text>
          </Pressable>
          <Pressable
            onPress={onNext}
            style={({ pressed }) => [
              styles.ctaBtn,
              styles.nextBtn,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={styles.nextText}>Next</Text>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </Pressable>
        </View>

        {/* Auto-advance countdown overlay */}
        {autoAdvanceIn !== null && !showLoopBanner && (
          <View style={styles.countdownOverlay}>
            <Text style={styles.countdownLabel}>Up next</Text>
            <Text style={styles.countdownNum}>
              Next story in {autoAdvanceIn}s…
            </Text>
            <View style={styles.countdownRow}>
              <Pressable
                onPress={onReplay}
                style={({ pressed }) => [
                  styles.ctaBtn,
                  styles.replayBtn,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="refresh" size={14} color="#fff" />
                <Text style={styles.replayText}>Watch again</Text>
              </Pressable>
              <Pressable
                onPress={onNext}
                style={({ pressed }) => [
                  styles.ctaBtn,
                  styles.playNowBtn,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Ionicons name="play" size={14} color="#000" />
                <Text style={styles.playNowText}>Play now</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Loop banner */}
        {showLoopBanner && (
          <View style={styles.loopOverlay}>
            <Text style={styles.loopEmoji}>🎉</Text>
            <Text style={styles.loopTitle}>All stories watched!</Text>
            <Text style={styles.loopSubtitle}>Starting over…</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#000" },

  header: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.85)",
    gap: 12,
  },
  dotsRow: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  dot: { height: 3, borderRadius: 2 },
  dotActive: { width: 20, backgroundColor: "#fff" },
  dotDone: { width: 10, backgroundColor: "rgba(255,255,255,0.4)" },
  dotFuture: { width: 10, backgroundColor: "rgba(255,255,255,0.18)" },
  dotLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    marginLeft: 4,
  },

  titleRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "rgba(0,0,0,0.85)",
  },
  title: { color: "#fff", fontSize: 15, fontWeight: "700" },
  category: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    textTransform: "capitalize",
    marginTop: 2,
  },
  iconBtn: { padding: 4 },

  videoWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  video: { width: "100%", height: "100%" },

  errorBox: { alignItems: "center", justifyContent: "center", padding: 24 },
  errorText: { color: "#fff", marginTop: 12, fontSize: 14, fontWeight: "600" },
  errorSubText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginTop: 4,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "rgba(0,0,0,0.85)",
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  replayBtn: { backgroundColor: "rgba(255,255,255,0.15)" },
  replayText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  nextBtn: { backgroundColor: brand.primary, flex: 1, justifyContent: "center" },
  nextText: { color: "#fff", fontWeight: "700", fontSize: 14, flex: 1 },

  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.80)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  countdownLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontWeight: "500",
  },
  countdownNum: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  countdownRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  playNowBtn: { backgroundColor: "#fff" },
  playNowText: { color: "#000", fontWeight: "700", fontSize: 14 },

  loopOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loopEmoji: { fontSize: 56 },
  loopTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },
  loopSubtitle: { color: "rgba(255,255,255,0.6)", fontSize: 14 },
});
