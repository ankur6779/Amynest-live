import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import { StoryCard } from "@/components/StoryCard";
import type { StoryDto } from "@/services/storiesApi";

interface Props {
  title: string;
  stories: StoryDto[];
  onSelect: (s: StoryDto) => void;
  size?: "regular" | "wide";
  emptyHint?: string;
}

export function StoryCarousel({ title, stories, onSelect, size = "regular", emptyHint }: Props) {
  const c = useColors();
  if (!stories.length && !emptyHint) return null;

  return (
    <View style={styles.row}>
      <Text style={[styles.heading, { color: c.textStrong }]}>{title}</Text>
      {stories.length === 0 ? (
        <Text style={[styles.empty, { color: c.textMuted ?? "#888" }]}>{emptyHint}</Text>
      ) : (
        <FlatList
          data={stories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) => (
            <StoryCard story={item} onPress={onSelect} size={size} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 20 },
  heading: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  empty: { fontSize: 13, paddingHorizontal: 16 },
});
