import React, { useState } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { formatDuration, type StoryDto } from "@/services/storiesApi";

type Size = "regular" | "wide";

interface Props {
  story: StoryDto;
  onPress: (s: StoryDto) => void;
  size?: Size;
}

export function StoryCard({ story, onPress, size = "regular" }: Props) {
  const c = useColors();
  const [thumbErr, setThumbErr] = useState(false);
  const dims =
    size === "wide"
      ? { width: 220, height: 124 }
      : { width: 144, height: 96 };

  const showImage = !!story.thumbnailUrl && !thumbErr;
  const durationLabel = formatDuration(story.durationSec ?? null);
  const progressPct =
    story.positionSec && story.durationSec && story.durationSec > 0
      ? Math.min(100, Math.max(0, (story.positionSec / story.durationSec) * 100))
      : 0;

  return (
    <Pressable
      onPress={() => onPress(story)}
      style={({ pressed }) => [
        styles.wrap,
        { width: dims.width, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View
        style={[
          styles.thumb,
          { width: dims.width, height: dims.height, backgroundColor: c.surfaceMuted ?? "#1f1933" },
        ]}
      >
        {showImage ? (
          <Image
            source={{ uri: story.thumbnailUrl! }}
            style={{ width: dims.width, height: dims.height }}
            resizeMode="cover"
            onError={() => setThumbErr(true)}
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="play-circle-outline" size={36} color="#fff" />
          </View>
        )}

        {durationLabel && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{durationLabel}</Text>
          </View>
        )}

        {progressPct > 0 && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${progressPct}%` }]} />
          </View>
        )}
      </View>
      <Text
        style={[styles.title, { color: c.textStrong }]}
        numberOfLines={2}
      >
        {story.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginRight: 12 },
  thumb: {
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3a2c5e",
  },
  badge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  progressTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  progressBar: { height: 3, backgroundColor: "#FF4ECD" },
  title: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
});
