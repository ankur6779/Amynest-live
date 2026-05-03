import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useAmyVoice } from "@/hooks/useAmyVoice";
import { useTheme } from "@/contexts/ThemeContext";
import { brand, palette } from "@/constants/colors";
import {
  PHONICS_AGE_GROUPS,
  PHONICS_STAGE_META,
  usePhonicsLearning,
  type DisplayPhonicsItem,
  type PhonicsAgeGroup,
} from "@/hooks/usePhonicsLearning";

type Child = { id: number; name: string; age: number; ageMonths?: number };

function getTodaySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
function pickTodaysItem(
  items: DisplayPhonicsItem[],
  tick: number,
): DisplayPhonicsItem | null {
  if (items.length === 0) return null;
  return items[(getTodaySeed() + tick) % items.length] ?? null;
}

// ─── ExampleChips ────────────────────────────────────────────────────────────

function ExampleChips({
  words,
  size,
}: {
  words: string[];
  size: "sm" | "md";
}) {
  if (!words || words.length === 0) return null;
  const padH = size === "md" ? 8 : 6;
  const padV = size === "md" ? 2 : 1;
  const fs = size === "md" ? 11 : 10;
  return (
    <View style={styles.chipRow}>
      {words.map((w) => (
        <View
          key={w}
          style={{
            paddingHorizontal: padH,
            paddingVertical: padV,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.16)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.25)",
          }}
        >
          <Text style={{ color: "#fff", fontSize: fs, fontWeight: "700" }}>
            {w}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── PlayButton ──────────────────────────────────────────────────────────────

function PlayButton({
  text,
  mode,
  size = "md",
  onPlay,
}: {
  text: string;
  mode?: "phonics" | "default";
  size?: "sm" | "md" | "lg";
  onPlay?: () => void;
}) {
  const voice = useAmyVoice();
  const dim = size === "lg" ? 56 : size === "md" ? 44 : 36;
  const icon = size === "lg" ? 26 : size === "md" ? 22 : 18;
  const busy = voice.speaking || voice.loading;

  const handle = () => {
    if (busy) {
      voice.stop();
      return;
    }
    onPlay?.();
    void voice.speak(text, { mode });
  };

  return (
    <Pressable
      onPress={handle}
      style={({ pressed }) => [
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fff",
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      hitSlop={6}
      accessibilityLabel={busy ? "Stop sound" : "Play sound"}
    >
      {voice.loading ? (
        <ActivityIndicator color={brand.primary} />
      ) : (
        <Ionicons
          name={voice.speaking ? "stop" : "play"}
          size={icon}
          color={brand.primary}
        />
      )}
    </Pressable>
  );
}

// ─── Stage selector ──────────────────────────────────────────────────────────

function StageSelector({
  active,
  defaultStage,
  onSelect,
}: {
  active: PhonicsAgeGroup | null;
  defaultStage: PhonicsAgeGroup | null;
  onSelect: (g: PhonicsAgeGroup) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
    >
      {PHONICS_AGE_GROUPS.map((g) => {
        const meta = PHONICS_STAGE_META[g];
        const isActive = g === active;
        const isDefault = g === defaultStage;
        return (
          <Pressable
            key={g}
            onPress={() => onSelect(g)}
            testID={`phonics-stage-pill-${g}`}
            style={[
              styles.stagePill,
              isActive
                ? {
                    backgroundColor: brand.primary,
                    borderColor: brand.primary,
                  }
                : {
                    backgroundColor: "rgba(255,255,255,0.10)",
                    borderColor: "rgba(255,255,255,0.25)",
                  },
            ]}
          >
            <Text style={{ fontSize: 14 }}>{meta.emoji}</Text>
            <Text
              style={{
                color: "#fff",
                fontSize: 12,
                fontWeight: "800",
              }}
            >
              {meta.shortLabel}
            </Text>
            {isDefault && (
              <View
                style={{
                  marginLeft: 2,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  borderRadius: 999,
                  backgroundColor: isActive
                    ? "rgba(255,255,255,0.25)"
                    : brand.primary,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: "900",
                    letterSpacing: 0.5,
                  }}
                >
                  YOURS
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── Today's Activity card ───────────────────────────────────────────────────

function TodaysActivityCard({
  dailyItems,
  focus,
  progress,
  onPlay,
  onToggleMastered,
}: {
  dailyItems: DisplayPhonicsItem[];
  focus: string;
  progress: { practiced: Record<string, number>; mastered: Record<string, true> }; // i18n-ok: type signature
  onPlay: (id: string, contentId?: number) => void;
  onToggleMastered: (id: string, contentId?: number) => void;
}) {
  const [tick, setTick] = useState(0);
  const todaysItem = useMemo(
    () => pickTodaysItem(dailyItems, tick),
    [dailyItems, tick],
  );
  const { t } = useTranslation();
  if (!todaysItem) return null;
  const playCount = progress.practiced[todaysItem.id] ?? 0;
  const isMastered = !!progress.mastered[todaysItem.id];
  const canMaster = playCount > 0 || isMastered;
  const isLong =
    todaysItem.type === "sentence" || todaysItem.type === "story";

  return (
    <View
      style={styles.card}
      testID="phonics-todays-activity"
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardIconWrap}>
          <Ionicons name="sparkles" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{t("components.phonics_learning.todays_activity")}</Text>
          <Text style={styles.cardSub}>
            {todaysItem.type === "story" ? "Story time" : focus}
          </Text>
        </View>
        <Pressable
          onPress={() => setTick((t) => t + 1)}
          hitSlop={10}
          accessibilityLabel={t("components.phonics_learning.pick_another_sound")}
          style={styles.refreshBtn}
        >
          <Ionicons name="refresh" size={18} color="#fff" />
        </Pressable>
      </View>

      <LinearGradient
        colors={[brand.violet600, brand.purple500]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.focusTile,
          isLong
            ? { flexDirection: "column", alignItems: "flex-start", gap: 12 }
            : { flexDirection: "row", alignItems: "center", gap: 14 },
        ]}
      >
        {todaysItem.emoji ? (
          <Text style={{ fontSize: isLong ? 36 : 48 }}>{todaysItem.emoji}</Text>
        ) : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[
              styles.focusSymbol,
              isLong ? { fontSize: 20 } : { fontSize: 28 },
            ]}
          >
            {todaysItem.symbol}
          </Text>
          {todaysItem.examples && todaysItem.examples.length > 0 ? (
            <ExampleChips words={todaysItem.examples} size="md" />
          ) : todaysItem.example ? (
            <Text
              style={{
                color: "rgba(255,255,255,0.85)",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              {todaysItem.example}
            </Text>
          ) : null}
        </View>
        <PlayButton
          text={todaysItem.phoneme ?? todaysItem.sound}
          mode={todaysItem.phoneme ? "phonics" : "default"}
          size="lg"
          onPlay={() => onPlay(todaysItem.id, todaysItem.contentId)}
        />
      </LinearGradient>

      <View style={styles.todaysFooter}>
        <Text style={styles.todaysFooterText}>
          {playCount > 0
            ? `Played ${playCount} time${playCount !== 1 ? "s" : ""}`
            : "Not practised yet"}
        </Text>
        <Pressable
          onPress={() =>
            canMaster && onToggleMastered(todaysItem.id, todaysItem.contentId)
          }
          disabled={!canMaster}
          style={[
            styles.masterBtn,
            isMastered
              ? { backgroundColor: brand.primary, borderColor: brand.primary }
              : {
                  backgroundColor: "transparent",
                  borderColor: "rgba(255,255,255,0.35)",
                },
            !canMaster && { opacity: 0.45 },
          ]}
        >
          <Ionicons
            name="checkmark-circle"
            size={14}
            color="#fff"
          />
          <Text style={styles.masterBtnText}>
            {isMastered ? "Mastered!" : "Mark mastered"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Practice Sounds ─────────────────────────────────────────────────────────

function PracticeSoundsCard({
  items,
  progress,
  onPlay,
}: {
  items: DisplayPhonicsItem[];
  progress: { practiced: Record<string, number>; mastered: Record<string, true> }; // i18n-ok: type signature
  onPlay: (id: string, contentId?: number) => void;
}) {
  if (items.length === 0) return null;
  const hasLongForm = items.some(
    (i) => i.type === "sentence" || i.type === "story",
  );
  const { t } = useTranslation();

  return (
    <View style={styles.card} testID="phonics-practice-sounds">
      <View style={styles.cardHeader}>
        <View style={styles.cardIconWrap}>
          <Ionicons name="book" size={16} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{t("components.phonics_learning.practice_sounds")}</Text>
          <Text style={styles.cardSub}>{t("components.phonics_learning.tap_any_tile_to_hear_the_sound")}</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>
            {items.length} {items.length === 1 ? "sound" : "sounds"}
          </Text>
        </View>
      </View>

      {hasLongForm ? (
        <View style={{ gap: 10 }}>
          {items.map((it) => (
            <PracticeRow
              key={it.id}
              item={it}
              count={progress.practiced[it.id] ?? 0}
              mastered={!!progress.mastered[it.id]}
              onPlay={() => onPlay(it.id, it.contentId)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.tileGrid}>
          {items.map((it) => (
            <PracticeTile
              key={it.id}
              item={it}
              count={progress.practiced[it.id] ?? 0}
              mastered={!!progress.mastered[it.id]}
              onPlay={() => onPlay(it.id, it.contentId)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function PracticeTile({
  item,
  count,
  mastered,
  onPlay,
}: {
  item: DisplayPhonicsItem;
  count: number;
  mastered: boolean;
  onPlay: () => void;
}) {
  return (
    <View
      testID={`phonics-tile-${item.id}`}
      style={[
        styles.practiceTile,
        mastered && {
          borderColor: brand.amber400,
          shadowColor: brand.amber400,
          shadowOpacity: 0.5,
          shadowRadius: 6,
        },
      ]}
    >
      {mastered && (
        <View style={styles.masteredPip}>
          <Ionicons name="checkmark" size={12} color={brand.primary} />
        </View>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {item.emoji ? <Text style={{ fontSize: 26 }}>{item.emoji}</Text> : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.tileSymbol}>{item.symbol}</Text>
          {item.examples && item.examples.length > 0 ? (
            <ExampleChips words={item.examples} size="sm" />
          ) : item.example ? (
            <Text
              numberOfLines={1}
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 11,
                marginTop: 2,
              }}
            >
              {item.example}
            </Text>
          ) : null}
        </View>
      </View>
      <View
        style={{
          marginTop: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <PlayButton
          text={item.phoneme ?? item.sound}
          mode={item.phoneme ? "phonics" : "default"}
          size="sm"
          onPlay={onPlay}
        />
        {count > 0 && (
          <Text
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 11,
              fontWeight: "700",
            }}
          >
            {count}×
          </Text>
        )}
      </View>
    </View>
  );
}

function PracticeRow({
  item,
  count,
  mastered,
  onPlay,
}: {
  item: DisplayPhonicsItem;
  count: number;
  mastered: boolean;
  onPlay: () => void;
}) {
  return (
    <View
      testID={`phonics-row-${item.id}`}
      style={[
        styles.practiceRow,
        mastered && { borderColor: brand.amber400 },
      ]}
    >
      {item.emoji ? (
        <Text style={{ fontSize: 22, marginRight: 8 }}>{item.emoji}</Text>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.tileSymbol, { fontSize: 14 }]}>{item.symbol}</Text>
        {item.example ? (
          <Text
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 11,
              marginTop: 2,
            }}
          >
            {item.example}
          </Text>
        ) : null}
      </View>
      {count > 0 && (
        <Text
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: 11,
            fontWeight: "700",
            marginRight: 10,
          }}
        >
          {count}×
        </Text>
      )}
      <PlayButton
        text={item.phoneme ?? item.sound}
        mode={item.phoneme ? "phonics" : "default"}
        size="sm"
        onPlay={onPlay}
      />
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function PhonicsLearningScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ childId?: string }>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const authFetch = useAuthFetch();

  const [children, setChildren] = useState<Child[] | null>(null);
  const [activeChildId, setActiveChildId] = useState<number | null>(null);
  const [stageOverride, setStageOverride] = useState<PhonicsAgeGroup | null>(
    null,
  );
  const [childrenError, setChildrenError] = useState<string | null>(null);

  // Load children on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`/api/children`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list: Child[] = Array.isArray(json?.children)
          ? json.children
          : Array.isArray(json)
            ? json
            : [];
        if (cancelled) return;
        setChildren(list);
        if (list.length === 0) return;
        const initial =
          (params.childId ? Number(params.childId) : NaN) || list[0].id;
        setActiveChildId(Number.isFinite(initial) ? initial : list[0].id);
      } catch (err) {
        if (!cancelled) {
          setChildrenError(
            err instanceof Error ? err.message : "Failed to load children",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, params.childId]);

  // Reset stage override when switching child.
  useEffect(() => {
    setStageOverride(null);
  }, [activeChildId]);

  const activeChild = children?.find((c) => c.id === activeChildId) ?? null;
  const totalAgeMonths = activeChild
    ? activeChild.age * 12 + (activeChild.ageMonths ?? 0)
    : 0;

  const data = usePhonicsLearning(
    activeChildId ?? 0,
    totalAgeMonths,
    stageOverride,
  );
  const { ageGroup, defaultAgeGroup, loading, error, items, dailyItems, progress, recordPlay, toggleMastered } = data;
  const stageMeta = ageGroup ? PHONICS_STAGE_META[ageGroup] : null;

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <LinearGradient
        colors={theme.gradient}
        style={StyleSheet.absoluteFillObject}
      />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("components.phonics_learning.header_title")}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 14 }}
      >
        {/* Child switcher */}
        {children && children.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {children.map((c) => {
              const sel = c.id === activeChildId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setActiveChildId(c.id)}
                  style={[
                    styles.childChip,
                    sel
                      ? {
                          backgroundColor: brand.primary,
                          borderColor: brand.primary,
                        }
                      : {
                          backgroundColor: "rgba(255,255,255,0.08)",
                          borderColor: "rgba(255,255,255,0.2)",
                        },
                  ]}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontWeight: "700",
                    }}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Personalisation banner */}
        {activeChild && stageMeta && (
          <View style={styles.banner}>
            <Text style={{ fontSize: 28 }}>{stageMeta.emoji}</Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.bannerBadge}>
                <Ionicons name="sparkles" size={11} color={brand.primary} />
                <Text style={styles.bannerBadgeText}>
                  Personalised for {activeChild.name}
                </Text>
              </View>
              <Text style={styles.bannerTitle} numberOfLines={1}>
                {stageMeta.label}
              </Text>
              <Text style={styles.bannerSub} numberOfLines={1}>
                {stageMeta.focus}
              </Text>
            </View>
          </View>
        )}

        {/* Stage selector */}
        {activeChild && (
          <StageSelector
            active={ageGroup}
            defaultStage={defaultAgeGroup}
            onSelect={(g) =>
              setStageOverride(g === defaultAgeGroup ? null : g)
            }
          />
        )}

        {/* States */}
        {childrenError && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={20} color="#fff" />
            <Text style={{ color: "#fff", flex: 1 }}>{childrenError}</Text>
          </View>
        )}

        {!childrenError && children && children.length === 0 && (
          <View style={styles.infoBox}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#fff"
            />
            <Text style={{ color: "#fff", flex: 1 }}>
              Add a child first to start phonics learning.
            </Text>
          </View>
        )}

        {activeChild && !ageGroup && !loading && (
          <View style={styles.infoBox}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#fff"
            />
            <Text style={{ color: "#fff", flex: 1 }}>
              {totalAgeMonths < 12
                ? `${activeChild.name} is still building sound awareness through everyday talk.`
                : `${activeChild.name} is ready for chapter books — phonics is no longer the focus.`}
            </Text>
          </View>
        )}

        {loading && items.length === 0 && (
          <View style={{ paddingVertical: 30, alignItems: "center" }}>
            <ActivityIndicator color="#fff" />
          </View>
        )}

        {error && items.length === 0 && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={20} color="#fff" />
            <Text style={{ color: "#fff", flex: 1 }}>{error}</Text>
          </View>
        )}

        {/* Cards */}
        {ageGroup && stageMeta && items.length > 0 && (
          <>
            <TodaysActivityCard
              dailyItems={dailyItems.length > 0 ? dailyItems : items}
              focus={stageMeta.focus}
              progress={progress}
              onPlay={recordPlay}
              onToggleMastered={toggleMastered}
            />
            <PracticeSoundsCard
              items={items}
              progress={progress}
              onPlay={recordPlay}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },

  childChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  bannerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  bannerBadgeText: {
    color: brand.primary,
    fontSize: 10,
    fontWeight: "800",
  },
  bannerTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
    marginTop: 4,
  },
  bannerSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11.5,
    marginTop: 1,
  },

  stagePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },

  card: {
    borderRadius: 22,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: brand.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { color: "#fff", fontWeight: "800", fontSize: 15 },
  cardSub: { color: "rgba(255,255,255,0.7)", fontSize: 11.5, marginTop: 2 },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  focusTile: {
    padding: 16,
    borderRadius: 22,
  },
  focusSymbol: {
    color: "#fff",
    fontWeight: "900",
    lineHeight: 32,
  },

  todaysFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  todaysFooterText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11.5,
  },
  masterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  masterBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },

  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: brand.primary,
  },
  countBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },

  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  practiceTile: {
    width: "48%",
    flexGrow: 1,
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    position: "relative",
  },
  masteredPip: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  tileSymbol: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 18,
  },

  practiceRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: palette.rose500 + "33",
    borderWidth: 1,
    borderColor: palette.rose500,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
});
