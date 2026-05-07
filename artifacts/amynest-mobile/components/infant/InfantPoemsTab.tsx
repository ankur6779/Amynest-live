/**
 * InfantPoemsTab — mobile twin of the web infant-poems module.
 *
 * Features:
 *  - 3 age sub-tabs (0–6m, 6–12m, 12–24m) defaulting to child's age
 *  - Tile grid (2 columns) with big emoji + title + mood badge
 *  - "Load More Poems" pagination (3 initial, +5 each tap)
 *  - Bottom-sheet modal player with loop toggle, play/pause, stop
 *  - TTS via useAmyVoice (same pipeline as DailyStory read-aloud)
 *  - Loop toggle persisted per-session in component state
 */
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  ALL_POEMS,
  POEM_AGE_GROUPS,
  POEM_ICON_EMOJI,
  POEM_TINT,
  getDefaultPoemAgeGroup,
  getPoemsForGroup,
  type InfantPoem,
  type PoemAgeGroup,
} from "@workspace/infant-hub";
import { useAmyVoice } from "@/hooks/useAmyVoice";
import { brand } from "@/constants/colors";

const INITIAL_VISIBLE = 3;
const PAGE_SIZE = 5;

interface Props {
  ageMonths: number;
}

export default function InfantPoemsTab({ ageMonths }: Props) {
  const { t } = useTranslation();
  const [group, setGroup] = useState<PoemAgeGroup>(
    () => getDefaultPoemAgeGroup(ageMonths),
  );
  const [visible, setVisible] = useState(INITIAL_VISIBLE);
  const [openPoem, setOpenPoem] = useState<InfantPoem | null>(null);
  const [loop, setLoop] = useState(true);

  const voice = useAmyVoice();

  const poemsInGroup = useMemo(() => getPoemsForGroup(group), [group]);
  const visiblePoems = useMemo(
    () => poemsInGroup.slice(0, visible),
    [poemsInGroup, visible],
  );
  const hasMore = visible < poemsInGroup.length;

  const handleGroupChange = (g: PoemAgeGroup) => {
    setGroup(g);
    setVisible(INITIAL_VISIBLE);
  };

  const handleTilePress = useCallback(
    async (poem: InfantPoem) => {
      setOpenPoem(poem);
      try {
        await voice.speak(poem.lines.join(" "));
      } catch {
        // error shown in player via voice.error
      }
    },
    [voice],
  );

  const handleClose = useCallback(() => {
    voice.stop();
    setOpenPoem(null);
  }, [voice]);

  const handlePlayPause = useCallback(async () => {
    if (!openPoem) return;
    if (voice.loading) return;
    if (!voice.speaking) {
      try {
        await voice.speak(openPoem.lines.join(" "));
      } catch {
        // error surfaced via voice.error
      }
    } else {
      voice.stop();
    }
  }, [openPoem, voice]);

  const handleLoopToggle = useCallback(() => {
    setLoop((l) => !l);
  }, []);

  // Auto-loop: when playback finishes and loop is on, replay.
  const prevSpeakingRef = React.useRef(false);
  React.useEffect(() => {
    const wasSpeaking = prevSpeakingRef.current;
    prevSpeakingRef.current = voice.speaking;
    if (wasSpeaking && !voice.speaking && loop && openPoem && !voice.loading) {
      void voice.speak(openPoem.lines.join(" "));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.speaking]);

  return (
    <View style={{ gap: 12 }}>
      {/* Header strip */}
      <View style={styles.headerStrip}>
        <Ionicons name="sparkles" size={14} color={brand.primary} /* audit-ok: brand primary on card bg */ />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t("infant_hub.poems.title")}</Text>
          <Text style={styles.headerSub}>{t("infant_hub.poems.subtitle")}</Text>
        </View>
      </View>

      {/* Age sub-tabs */}
      <View style={styles.ageTabs}>
        {POEM_AGE_GROUPS.map((g) => (
          <Pressable
            key={g.id}
            onPress={() => handleGroupChange(g.id)}
            style={[styles.ageTab, group === g.id && styles.ageTabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: group === g.id }}
            accessibilityLabel={g.label}
          >
            <Text
              style={[
                styles.ageTabText,
                group === g.id && styles.ageTabTextActive,
              ]}
            >
              {g.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Group blurb */}
      <Text style={styles.blurb}>
        {POEM_AGE_GROUPS.find((g) => g.id === group)?.blurb}
      </Text>

      {/* Tile grid */}
      <View style={styles.tileGrid}>
        {visiblePoems.map((poem) => {
          const isActive = openPoem?.id === poem.id;
          return (
            <PoemTile
              key={poem.id}
              poem={poem}
              isActive={isActive}
              isPlaying={isActive && voice.speaking}
              isLoading={isActive && voice.loading}
              onPress={() => void handleTilePress(poem)}
            />
          );
        })}
      </View>

      {/* Empty fallback */}
      {visiblePoems.length === 0 && (
        <View style={styles.emptyBox}>
          <Ionicons name="musical-notes" size={20} color="rgba(255,255,255,0.40)" /* audit-ok: muted white on dark empty state */ />
          <Text style={styles.emptyText}>{t("infant_hub.poems.no_poems")}</Text>
        </View>
      )}

      {/* Load More */}
      {hasMore && (
        <Pressable
          onPress={() =>
            setVisible((v) =>
              Math.min(poemsInGroup.length, v + PAGE_SIZE),
            )
          }
          style={styles.loadMoreBtn}
          accessibilityRole="button"
        >
          <Ionicons name="add" size={14} color={brand.primary} />
          <Text style={styles.loadMoreText}>{t("infant_hub.poems.load_more")}</Text>
        </Pressable>
      )}

      {/* Fullscreen bottom-sheet player */}
      <Modal
        visible={openPoem !== null}
        animationType="slide"
        transparent
        onRequestClose={handleClose}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismiss} onPress={handleClose} />
          <View style={styles.playerSheet}>
            {openPoem && (
              <PoemPlayer
                poem={openPoem}
                isPlaying={voice.speaking}
                isLoading={voice.loading}
                loop={loop}
                error={voice.error ?? null}
                onPlayPause={() => void handlePlayPause()}
                onLoop={handleLoopToggle}
                onClose={handleClose}
                t={t}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Tile ─────────────────────────────────────────────────────────────────────
function PoemTile({
  poem,
  isActive,
  isPlaying,
  isLoading,
  onPress,
}: {
  poem: InfantPoem;
  isActive: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const tint = POEM_TINT[poem.id] ?? brand.primary;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tile,
        { borderColor: isActive ? tint : "rgba(255,255,255,0.12)" },
        isActive && { backgroundColor: `${tint}22` },
      ]}
      accessibilityRole="button"
      accessibilityLabel={t("infant_hub.poems.play_poem", { title: poem.title })}
    >
      {/* Icon orb */}
      <View style={[styles.tileOrb, { backgroundColor: `${tint}33` }]}>
        <Text style={{ fontSize: 24 }}>{POEM_ICON_EMOJI[poem.icon]}</Text>
      </View>

      {/* Status badge */}
      {(isPlaying || isLoading) && (
        <View style={[styles.statusBadge, { backgroundColor: `${tint}CC` }]}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" /* audit-ok: white spinner on tinted badge */ />
          ) : (
            <Text style={styles.statusBadgeText}>{t("infant_hub.poems.now_playing")}</Text>
          )}
        </View>
      )}

      <Text style={styles.tileTitle} numberOfLines={2}>
        {poem.title}
      </Text>
      <View style={[styles.moodPill, { backgroundColor: `${tint}33` }]}>
        <Text style={[styles.moodText, { color: tint }]}>{poem.mood}</Text>
      </View>
    </Pressable>
  );
}

// ─── Bottom-sheet player ──────────────────────────────────────────────────────
function PoemPlayer({
  poem,
  isPlaying,
  isLoading,
  loop,
  error,
  onPlayPause,
  onLoop,
  onClose,
  t,
}: {
  poem: InfantPoem;
  isPlaying: boolean;
  isLoading: boolean;
  loop: boolean;
  error: string | null;
  onPlayPause: () => void;
  onLoop: () => void;
  onClose: () => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const tint = POEM_TINT[poem.id] ?? brand.primary;

  return (
    <ScrollView
      contentContainerStyle={styles.playerContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Drag handle + close */}
      <View style={styles.sheetHandle} />
      <Pressable
        onPress={onClose}
        style={styles.closeBtn}
        accessibilityLabel={t("infant_hub.poems.close_player")}
      >
        <Ionicons name="chevron-down" size={22} color="rgba(255,255,255,0.7)" /* audit-ok: white close icon on dark sheet */ />
      </Pressable>

      {/* Glowing orb */}
      <View style={[styles.glowOrb, { shadowColor: tint, backgroundColor: `${tint}55` }]}>
        <Text style={{ fontSize: 48 }}>{POEM_ICON_EMOJI[poem.icon]}</Text>
      </View>

      <Text style={styles.playerTitle}>{poem.title}</Text>
      <Text style={[styles.playerMood, { color: tint }]}>{poem.mood}</Text>

      {/* Lyrics */}
      <View style={styles.lyricsBox}>
        {poem.lines.map((line, i) => (
          <Text key={i} style={styles.lyricLine}>
            {line}
          </Text>
        ))}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable
          onPress={onLoop}
          style={[styles.controlBtn, loop && { backgroundColor: `${tint}44`, borderColor: tint }]}
          accessibilityLabel={loop ? t("infant_hub.poems.loop_on") : t("infant_hub.poems.loop_off")}
          accessibilityState={{ selected: loop }}
        >
          <Ionicons
            name="repeat"
            size={20}
            color={loop ? tint : "rgba(255,255,255,0.5)"}
          />
        </Pressable>

        <Pressable
          onPress={onPlayPause}
          disabled={isLoading}
          style={[styles.playBigBtn, { backgroundColor: tint }]}
          accessibilityLabel={isLoading ? t("infant_hub.poems.loading") : isPlaying ? t("infant_hub.poems.stop") : "Play"}
        >
          {isLoading ? (
            <ActivityIndicator size="large" color="#fff" /* audit-ok: white spinner on tinted play button */ />
          ) : isPlaying ? (
            <Ionicons name="stop" size={30} color="#fff" /* audit-ok: white icon on tinted button */ />
          ) : (
            <Ionicons name="play" size={30} color="#fff" /* audit-ok: white icon on tinted button */ />
          )}
        </Pressable>

        {/* Spacer to balance layout */}
        <View style={styles.controlBtn} />
      </View>

      {error && (
        <Text style={styles.errorText}>{t("infant_hub.poems.error")}</Text>
      )}
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  headerStrip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    padding: 12,
  },
  headerTitle: { color: "#fff", fontWeight: "800", fontSize: 13 },
  headerSub: { color: "rgba(255,255,255,0.65)", fontSize: 11.5, marginTop: 2, lineHeight: 16 },

  ageTabs: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 4,
  },
  ageTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 9,
  },
  ageTabActive: { backgroundColor: brand.primary },
  ageTabText: { color: "rgba(255,255,255,0.55)", fontWeight: "700", fontSize: 12 },
  ageTabTextActive: { color: "#fff" },

  blurb: { color: "rgba(255,255,255,0.55)", fontSize: 11, paddingHorizontal: 2 },

  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 14,
    gap: 8,
    alignItems: "flex-start",
  },
  tileOrb: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  tileTitle: { color: "#fff", fontWeight: "800", fontSize: 12.5, lineHeight: 17 },
  moodPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  moodText: { fontSize: 10, fontWeight: "800" },

  emptyBox: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 24,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.15)",
  },
  emptyText: { color: "rgba(255,255,255,0.5)", fontSize: 12 },

  loadMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  loadMoreText: { color: brand.primary, fontWeight: "800", fontSize: 12.5 },

  // Modal / player
  modalBackdrop: { flex: 1, justifyContent: "flex-end" },
  modalDismiss: { flex: 1 },
  playerSheet: {
    backgroundColor: "#0f0f1a", // audit-ok: static dark modal backdrop, no brand token for near-black
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  playerContent: { padding: 24, paddingTop: 14, alignItems: "center", gap: 14 },

  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginBottom: 8,
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  glowOrb: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 12,
  },

  playerTitle: { color: "#fff", fontWeight: "900", fontSize: 20, textAlign: "center" },
  playerMood: { fontWeight: "700", fontSize: 12, letterSpacing: 1 },

  lyricsBox: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    gap: 4,
  },
  lyricLine: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14.5,
    lineHeight: 22,
    textAlign: "center",
    fontStyle: "italic",
  },

  controls: { flexDirection: "row", alignItems: "center", gap: 20, marginTop: 4 },
  controlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  playBigBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },

  errorText: { color: brand.rose400, fontSize: 11, textAlign: "center" },
});

// Silence unused import
void ALL_POEMS;
