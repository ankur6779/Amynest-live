import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { brand, palette } from "@/constants/colors";
import { getDailyStoryPool, type DailyStory as Story } from "@workspace/age-content";
import { useTranslation } from "react-i18next";
import { useAmyVoice } from "@/hooks/useAmyVoice";

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

/** Build the TTS script for a story: title + story body + moral. */
function storyScript(s: Story): string {
  return `${s.title}. ${s.story} Moral of the story: ${s.moral}`;
}

export function DailyStory({ ageMonths = 36 }: { ageMonths?: number }) {
  const { t } = useTranslation();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const pool = useMemo(() => getDailyStoryPool(ageMonths), [ageMonths]);
  const [idx, setIdx] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // One shared Amy voice instance for the whole component.
  // Only one story can play at a time — tapping another story's button stops
  // the current one and starts the new one automatically (speak() cancels
  // any in-flight request before starting a new one).
  const { speak, stop, speaking, loading: ttsLoading } = useAmyVoice();
  // Track which story ID is currently being spoken so we can show the
  // stop-state only on that card's button.
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  if (pool.length === 0) {
    return (
      <Text style={s.dim}>
        No stories available yet for this age. Try the Story Hub for video stories.
      </Text>
    );
  }

  const featured = pool[idx % pool.length];
  const rest = pool.filter((_, i) => i !== idx % pool.length).slice(0, 4);

  const handleReadAloud = (story: Story) => {
    if ((speaking || ttsLoading) && speakingId === story.id) {
      // Tap again → stop
      stop();
      setSpeakingId(null);
    } else {
      setSpeakingId(story.id);
      void speak(storyScript(story)).then(() => {
        // Natural finish — clear the speaking ID
        setSpeakingId(null);
      });
    }
  };

  const renderCard = (story: Story, isFeatured: boolean) => {
    const color = CAT_COLOR[story.category];
    const isOpen = expandedId === story.id;
    const isThisPlaying = (speaking || ttsLoading) && speakingId === story.id;
    const isThisLoading = ttsLoading && speakingId === story.id;

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
        {/* Action row: Read Story + Read Aloud */}
        <View style={s.actionRow}>
          <Pressable
            onPress={() => setExpandedId(isOpen ? null : story.id)}
            style={[s.cta, { backgroundColor: color, flex: 1 }]}
          >
            <Ionicons name={isOpen ? "close" : "book"} size={14} color="#fff" />
            <Text style={s.ctaText}>{isOpen ? "Close" : "Read Story"}</Text>
          </Pressable>

          {/* Read Aloud button — AI badge */}
          <Pressable
            onPress={() => handleReadAloud(story)}
            style={[
              s.readAloudBtn,
              isThisPlaying && { backgroundColor: "rgba(99,102,241,0.85)" },
            ]}
            accessibilityLabel={isThisPlaying ? t("components.daily_story.stop_reading") : t("components.daily_story.read_aloud")}
          >
            {isThisLoading ? (
              <ActivityIndicator size="small" color="#fff" /* audit-ok: static white on indigo button */ />
            ) : (
              <Ionicons
                name={isThisPlaying ? "stop-circle" : "volume-high"}
                size={14}
                // audit-ok: static white on indigo button
                color="#fff"
              />
            )}
            <Text style={s.readAloudText}>
              {isThisLoading
                ? t("components.daily_story.loading_audio")
                : isThisPlaying
                  ? t("components.daily_story.stop_reading")
                  : t("components.daily_story.read_aloud")}
            </Text>
            {/* AI badge */}
            <View style={s.aiBadge}>
              <Text style={s.aiBadgeText}>AI</Text>
            </View>
          </Pressable>
        </View>
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
          setSpeakingId(null);
          stop();
          setIdx((i) => (i + 1) % pool.length);
        }}
        style={s.shuffle}
      >
        <Ionicons name="shuffle" size={14} color="#fff" /* audit-ok: static white on violet button */ />
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
    actionRow: { flexDirection: "row", gap: 8 },
    cta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 12,
    },
    ctaText: { color: "#fff", fontWeight: "800", fontSize: 13 },
    readAloudBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      // audit-ok: indigo-600 brand color for Read Aloud button
      backgroundColor: "rgba(79,70,229,0.75)",
    },
    readAloudText: {
      // audit-ok: static white on indigo button
      color: "#fff",
      fontWeight: "700",
      fontSize: 12,
    },
    aiBadge: {
      // audit-ok: amber AI feature badge matching brand system
      backgroundColor: "rgba(245,158,11,0.9)",
      borderRadius: 4,
      paddingHorizontal: 4,
      paddingVertical: 1,
    },
    aiBadgeText: {
      // audit-ok: static white on amber badge
      color: "#fff",
      fontSize: 9,
      fontWeight: "900",
    },
    shuffle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 12,
      // audit-ok: violet brand color for shuffle button
      backgroundColor: "rgba(123,63,242,0.35)",
      borderWidth: 1,
      // audit-ok: pink border matching brand accent system
      borderColor: "rgba(255,78,205,0.4)",
    },
    shuffleText: {
      // audit-ok: static white on violet button
      color: "#fff",
      fontWeight: "700",
      fontSize: 13,
    },
  });
}
