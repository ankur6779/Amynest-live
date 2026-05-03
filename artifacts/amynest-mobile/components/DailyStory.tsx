import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { brand, palette } from "@/constants/colors";
import { getDailyStoryPool, type DailyStory as Story } from "@workspace/age-content";
import { useTranslation } from "react-i18next";

const CAT_COLOR: Record<Story["category"], string> = {
  moral: brand.purple500,
  fun: palette.amber500,
  animal: palette.emerald500,
  learning: palette.blue500,
};
const CAT_LABEL: Record<Story["category"], string> = {
  moral: "Moral",
  fun: "Fun",
  animal: "Animal",
  learning: "Learning",
};

export function DailyStory({ ageMonths = 36 }: { ageMonths?: number }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const pool = useMemo(() => getDailyStoryPool(ageMonths), [ageMonths]);
  const [idx, setIdx] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (pool.length === 0) {
    const { t } = useTranslation();
    return (
      <Text style={s.dim}>
        No stories available yet for this age. Try the Story Hub for video stories.
      </Text>
    );
  }

  const featured = pool[idx % pool.length];
  const rest = pool.filter((_, i) => i !== idx % pool.length).slice(0, 4);

  const renderCard = (story: Story, isFeatured: boolean) => {
    const color = CAT_COLOR[story.category];
    const isOpen = expandedId === story.id;
    return (
      <View
        key={story.id}
        style={[
          s.card,
          isFeatured && s.cardFeatured,
          isOpen && { borderColor: color + "66" },
        ]}
      >
        <View style={s.row}>
          <View style={[s.emojiWrap, { borderColor: color + "33", backgroundColor: color + "1a" }]}>
            <Text style={s.emoji}>{story.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.titleRow}>
              <Text style={s.title} numberOfLines={2}>
                {story.title}
              </Text>
              <View style={[s.tag, { backgroundColor: color + "1f" }]}>
                <Text style={[s.tagText, { color }]}>{CAT_LABEL[story.category]}</Text>
              </View>
            </View>
            <Text style={s.preview} numberOfLines={isOpen ? undefined : 2}>
              {story.preview}
            </Text>
          </View>
        </View>
        {isOpen && (
          <View style={s.expanded}>
            <Text style={s.story}>"{story.story}"</Text>
            <View style={[s.moralBox, { backgroundColor: color + "14", borderColor: color + "33" }]}>
              <Text style={[s.moralLabel, { color }]}>{t("components.daily_story.moral_of_the_story")}</Text>
              <Text style={s.moralText}>{story.moral}</Text>
            </View>
          </View>
        )}
        <Pressable
          onPress={() => setExpandedId(isOpen ? null : story.id)}
          style={[s.cta, { backgroundColor: color }]}
        >
          <Ionicons name={isOpen ? "close" : "book"} size={14} color="#fff" />
          <Text style={s.ctaText}>{isOpen ? "Close" : "Read Story"}</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={{ gap: 12 }}>
      <Text style={s.lead}>
        🌅 New story every day · pick one to read together.
      </Text>
      {renderCard(featured, true)}
      {rest.length > 0 && (
        <>
          <Text style={s.subhead}>{t("components.daily_story.more_for_today")}</Text>
          {rest.map((st) => renderCard(st, false))}
        </>
      )}
      <Pressable
        onPress={() => {
          setExpandedId(null);
          setIdx((i) => (i + 1) % pool.length);
        }}
        style={s.shuffle}
      >
        <Ionicons name="shuffle" size={14} color="#fff" />
        <Text style={s.shuffleText}>{t("components.daily_story.show_another_featured")}</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    dim: { color: c.textMuted, fontSize: 13 },
    lead: { color: c.textMuted, fontSize: 12.5 },
    subhead: { color: c.textBody, fontSize: 12.5, fontWeight: "700", marginTop: 4 },
    card: {
      backgroundColor: c.calloutBg,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: c.glassBorder,
      gap: 10,
    },
    cardFeatured: { padding: 14 },
    row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
    emojiWrap: {
      width: 48,
      height: 48,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    emoji: { fontSize: 26 },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      marginBottom: 4,
    },
    title: { color: c.foreground, fontSize: 14, fontWeight: "800", flex: 1 },
    tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
    tagText: { fontSize: 10, fontWeight: "800" },
    preview: { color: c.textBody, fontSize: 12.5, lineHeight: 18 },
    expanded: { gap: 10, marginTop: 4 },
    story: { color: c.foreground, fontSize: 13, lineHeight: 19, fontStyle: "italic" },
    moralBox: { borderRadius: 12, padding: 10, borderWidth: 1 },
    moralLabel: { fontSize: 11, fontWeight: "800", marginBottom: 2 },
    moralText: { color: c.foreground, fontSize: 13, fontWeight: "600", lineHeight: 18 },
    cta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 12,
    },
    ctaText: { color: "#fff", fontWeight: "800", fontSize: 13 },
    shuffle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: "rgba(123,63,242,0.35)",
      borderWidth: 1,
      borderColor: "rgba(255,78,205,0.4)",
    },
    shuffleText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  });
}
