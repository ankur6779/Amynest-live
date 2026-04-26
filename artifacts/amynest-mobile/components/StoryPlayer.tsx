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

interface Props {
  story: StoryDto | null;
  onClose: () => void;
  onProgress: (
    storyId: number,
    positionSec: number,
    options?: { durationSec?: number; completed?: boolean; startedSession?: boolean },
  ) => void;
}

export function StoryPlayer({ story, onClose, onProgress }: Props) {
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

  // Reset error / lifecycle flags when story changes or retry is triggered.
  useEffect(() => {
    setErrored(false);
    startedRef.current = false;
    completedRef.current = false;
  }, [story?.id, retryKey]);

  // Resume from last position when video becomes ready.
  useEventListener(player, "statusChange", ({ status }) => {
    if (!story) return;
    if (status === "error") {
      setErrored(true);
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

  // Periodic progress writes; mark startedSession on first play.
  useEventListener(player, "timeUpdate", ({ currentTime }) => {
    if (!story) return;
    const dur = player.duration && Number.isFinite(player.duration) ? player.duration : undefined;
    if (!startedRef.current && currentTime > 0) {
      startedRef.current = true;
      onProgress(story.id, currentTime, { durationSec: dur, startedSession: true });
      return;
    }
    onProgress(story.id, currentTime, { durationSec: dur });
  });

  // Mark completed when playback ends.
  useEventListener(player, "playToEnd", () => {
    if (!story || completedRef.current) return;
    completedRef.current = true;
    const dur = player.duration && Number.isFinite(player.duration) ? player.duration : 0;
    onProgress(story.id, dur, { durationSec: dur, completed: true });
  });

  // Pause when modal closes.
  useEffect(() => {
    if (!story) {
      try {
        player.pause();
      } catch {}
    }
  }, [story, player]);

  const visible = !!story;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
    >
      <View style={styles.backdrop}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {story?.title ?? ""}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.videoWrap}>
          {errored ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={40} color="#fff" />
              <Text style={styles.errorText}>Couldn't play this story.</Text>
              <Pressable
                onPress={() => {
                  if (!sourceUrl) return;
                  setErrored(false);
                  setRetryKey((k) => k + 1);
                  // Just remounting VideoView won't reload a player that's
                  // entered an error state — explicitly re-point it at the
                  // same source so the underlying media pipeline restarts.
                  try {
                    player.replace(sourceUrl);
                    player.play();
                  } catch (err) {
                    console.warn("[stories] retry failed:", err);
                  }
                }}
                style={styles.retryBtn}
              >
                <Ionicons name="refresh" size={16} color="#000" />
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : sourceUrl ? (
            <VideoView
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#000" },
  headerRow: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.85)",
  },
  title: { color: "#fff", fontSize: 14, fontWeight: "600", flex: 1, marginRight: 12 },
  iconBtn: { padding: 4 },
  videoWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  video: { width: "100%", height: "100%" },
  errorBox: { alignItems: "center", justifyContent: "center", padding: 24 },
  errorText: { color: "#fff", marginTop: 12, marginBottom: 16, fontSize: 14 },
  retryBtn: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  retryText: { color: "#000", fontWeight: "700" },
});
