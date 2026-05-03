import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal,
  ActivityIndicator, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ARTICLES,
  AGE_TAG_LABELS,
  getArticlesForAgeMonths,
  getArticleHero,
  articleToSpeechSections,
  type Article,
  type ArticleCategory,
  type ArticleSection,
} from "@workspace/parenting-articles";
import { useAmyVoice } from "@/hooks/useAmyVoice";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { brand } from "@/constants/colors";
import { useTranslation } from "react-i18next";

const CATEGORIES: ArticleCategory[] = [
  "Sleep",
  "Behavior",
  "Nutrition",
  "Development",
  "Emotional",
  "Screen Time",
  "Bonding",
];

// ─── Hero banner ───────────────────────────────────────────────────────────
function ArticleHeroBanner({ article, large = false }: { article: Article; large?: boolean }) {
  const hero = getArticleHero(article.category);
  const { t } = useTranslation();
  return (
    <LinearGradient
      colors={[hero.gradient[0], hero.gradient[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, large ? styles.heroLarge : styles.heroSmall]}
    >
      <Text
        style={[
          styles.heroBgEmoji,
          large ? styles.heroBgEmojiLarge : styles.heroBgEmojiSmall,
          { textShadowColor: hero.accent },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {hero.bgEmoji}
      </Text>
      <Text style={[styles.heroEmoji, large ? styles.heroEmojiLarge : styles.heroEmojiSmall]}>
        {article.emoji}
      </Text>
    </LinearGradient>
  );
}

// ─── Per-section listen button ─────────────────────────────────────────────
function SectionListenBtn({
  state,
  onPress,
  accentColor,
}: {
  state: "idle" | "loading" | "playing";
  onPress: () => void;
  accentColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={
        state === "playing" ? "Stop reading section" : state === "loading" ? "Loading audio" : "Listen to section"
      }
      style={({ pressed }) => [
        styles.sectionBtn,
        state !== "idle" && { backgroundColor: accentColor },
        state === "idle" && { backgroundColor: "rgba(255,255,255,0.10)" },
        pressed && { opacity: 0.7 },
      ]}
    >
      {state === "loading" ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Ionicons
          name={state === "playing" ? "stop" : "volume-high"}
          size={14}
          color="#fff"
        />
      )}
    </Pressable>
  );
}

// ─── Article modal ─────────────────────────────────────────────────────────
function ArticleModal({ article, onClose }: { article: Article; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const hero = getArticleHero(article.category);

  const speechSections = useMemo(() => articleToSpeechSections(article), [article]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [autoAdvance, setAutoAdvance] = useState(false);

  const handleFinished = useCallback(() => {
    if (!autoAdvance) {
      setActiveIdx(null);
      return;
    }
    setActiveIdx((i) => {
      if (i === null || i + 1 >= speechSections.length) {
        setAutoAdvance(false);
        return null;
      }
      return i + 1;
    });
  }, [autoAdvance, speechSections.length]);

  const { speak, stop, speaking, loading, error } = useAmyVoice({ onFinished: handleFinished });

  // Replay whenever the active index changes (covers both per-section taps
  // and onFinished-driven auto-advance through the same code path).
  useEffect(() => {
    if (activeIdx === null) return;
    void speak(speechSections[activeIdx]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  // Tear down audio when the modal closes.
  useEffect(() => () => stop(), [stop]);

  const stopPlayback = useCallback(() => {
    setAutoAdvance(false);
    setActiveIdx(null);
    stop();
  }, [stop]);

  const playFromStart = () => {
    setAutoAdvance(true);
    setActiveIdx(0);
  };

  const playSection = (idx: number) => {
    setAutoAdvance(false);
    setActiveIdx(idx);
  };

  const isFullPlayingMode = activeIdx !== null && autoAdvance;
  const fullState: "idle" | "loading" | "playing" =
    isFullPlayingMode && loading ? "loading" : isFullPlayingMode && speaking ? "playing" : "idle";

  const sectionState = (idx: number): "idle" | "loading" | "playing" => {
    if (activeIdx !== idx) return "idle";
    if (loading) return "loading";
    if (speaking) return "playing";
    return "idle";
  };

  const renderSection = (section: ArticleSection, i: number) => {
    const speechIdx = i + 1;
    const state = sectionState(speechIdx);
    const isActive = activeIdx === speechIdx;
    const wrapperStyle = [
      styles.sectionWrap,
      isActive && { backgroundColor: hero.accent + "22", borderColor: hero.accent },
    ];

    const listenBtn = (
      <SectionListenBtn
        state={state}
        accentColor={hero.accent}
        onPress={() => (state === "idle" ? playSection(speechIdx) : stopPlayback())}
      />
    );

    if (section.type === "intro") {
      return (
        <View key={i} style={wrapperStyle}>
          <View style={[styles.introBox, { borderLeftColor: hero.accent }]}>
            <Text style={[styles.introText, { color: c.foreground }]}>{section.text}</Text>
            <View style={styles.sectionBtnRow}>{listenBtn}</View>
          </View>
        </View>
      );
    }
    if (section.type === "heading") {
      return (
        <View key={i} style={[wrapperStyle, styles.headingRow]}>
          <Text style={[styles.headingText, { color: c.foreground }]}>{section.text}</Text>
          {listenBtn}
        </View>
      );
    }
    if (section.type === "paragraph") {
      return (
        <View key={i} style={[wrapperStyle, styles.paragraphRow]}>
          <Text style={[styles.paragraphText, { color: c.foreground }]}>{section.text}</Text>
          <View style={styles.sectionBtnRow}>{listenBtn}</View>
        </View>
      );
    }
    if (section.type === "bullets" && section.items) {
      return (
        <View key={i} style={[wrapperStyle, styles.bulletsRow]}>
          <View style={{ flex: 1 }}>
            {section.items.map((item, j) => (
              <View key={j} style={styles.bulletItem}>
                <View style={[styles.bulletDot, { backgroundColor: hero.accent }]} />
                <Text style={[styles.bulletText, { color: c.foreground }]}>{item}</Text>
              </View>
            ))}
          </View>
          <View style={styles.sectionBtnRow}>{listenBtn}</View>
        </View>
      );
    }
    if (section.type === "tip") {
      return (
        <View key={i} style={wrapperStyle}>
          <LinearGradient
            colors={[brand.violet500 + "26", brand.pink400 + "26"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.tipBox, { borderColor: hero.accent + "55" }]}
          >
            <Text style={styles.tipSparkle}>✨</Text>
            <Text style={[styles.tipText, { color: c.foreground }]}>{section.text}</Text>
            {listenBtn}
          </LinearGradient>
        </View>
      );
    }
    return null;
  };

  return (
    <Modal animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { backgroundColor: c.background, paddingTop: insets.top }]}>
        {/* Sticky header */}
        <View style={[styles.modalHeader, { backgroundColor: c.background, borderBottomColor: c.border }]}>
          <View style={styles.modalHeaderLeft}>
            <Text style={styles.modalHeaderEmoji}>{article.emoji}</Text>
            <View style={[styles.categoryPill, { backgroundColor: hero.gradient[0] + "33" }]}>
              <Text style={[styles.categoryPillText, { color: hero.accent }]}>{article.category}</Text>
            </View>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn} accessibilityLabel={t("components.parenting_articles.close_article")}>
            <Ionicons name="close" size={22} color={c.foreground} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero banner */}
          <ArticleHeroBanner article={article} large />

          <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 16 }}>
            {/* Title block */}
            <View style={{ gap: 8 }}>
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={14} color={c.mutedForeground} />
                <Text style={[styles.metaText, { color: c.mutedForeground }]}>
                  {article.readTime} min read · {article.ageTags.map((t) => AGE_TAG_LABELS[t]).join(", ")}
                </Text>
              </View>
              <Text style={[styles.title, { color: c.foreground }]}>{article.title}</Text>
              <Text style={[styles.summary, { color: c.mutedForeground }]}>{article.summary}</Text>

              {/* Listen to article CTA */}
              <View style={styles.listenRow}>
                <Pressable
                  onPress={fullState === "idle" ? playFromStart : stopPlayback}
                  accessibilityRole="button"
                  accessibilityLabel={fullState === "idle" ? "Listen to article" : "Stop reading"}
                  style={({ pressed }) => [styles.listenBtnWrap, pressed && { opacity: 0.85 }]}
                >
                  <LinearGradient
                    colors={[hero.gradient[0], hero.gradient[1]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.listenBtn}
                  >
                    {fullState === "loading" ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons
                        name={fullState === "playing" ? "stop" : "volume-high"}
                        size={16}
                        color="#fff"
                      />
                    )}
                    <Text style={styles.listenBtnText}>
                      {fullState === "loading"
                        ? "Loading…"
                        : fullState === "playing"
                        ? "Stop reading"
                        : "Listen to article"}
                    </Text>
                  </LinearGradient>
                </Pressable>
                {isFullPlayingMode && activeIdx !== null && (
                  <Text style={[styles.metaText, { color: c.mutedForeground }]}>
                    Reading {activeIdx + 1} of {speechSections.length}
                  </Text>
                )}
              </View>
              {error && (
                <Text style={[styles.errorText, { color: c.destructive }]}>
                  Couldn't play audio. Tap again to retry.
                </Text>
              )}
            </View>

            {/* Sections */}
            <View style={{ gap: 12 }}>{article.content.map(renderSection)}</View>

            {/* Disclaimer */}
            <Text style={[styles.disclaimer, { color: c.mutedForeground }]}>
              Amy AI articles are curated from evidence-based child development research. Always
              consult your paediatrician for medical concerns.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Article card (collapsed list item) ───────────────────────────────────
function ArticleCard({ article, onPress }: { article: Article; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.card, borderColor: c.border },
        pressed && { opacity: 0.85 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Open article ${article.title}`}
    >
      <ArticleHeroBanner article={article} />
      <View style={styles.cardBody}>
        <View style={styles.cardMetaRow}>
          <View style={[styles.categoryPill, { backgroundColor: getArticleHero(article.category).gradient[1] + "26" }]}>
            <Text style={[styles.categoryPillText, { color: getArticleHero(article.category).accent }]}>
              {article.category}
            </Text>
          </View>
          <Text style={[styles.cardMetaSmall, { color: c.mutedForeground }]}>
            {article.ageTags.slice(0, 2).map((t) => AGE_TAG_LABELS[t]).join(", ")}
          </Text>
          <View style={{ flex: 1 }} />
          <Ionicons name="time-outline" size={11} color={c.mutedForeground} />
          <Text style={[styles.cardMetaSmall, { color: c.mutedForeground }]}>{article.readTime}m</Text>
        </View>
        <Text style={[styles.cardTitle, { color: c.foreground }]} numberOfLines={2}>
          {article.title}
        </Text>
        <Text style={[styles.cardSummary, { color: c.mutedForeground }]} numberOfLines={2}>
          {article.summary}
        </Text>
        <View style={styles.cardCtaRow}>
          <Text style={[styles.cardCta, { color: c.primary }]}>{t("components.parenting_articles.read_article")}</Text>
          <View style={styles.readAloudHint}>
            <Ionicons name="volume-high" size={11} color={c.mutedForeground} />
            <Text style={[styles.cardMetaSmall, { color: c.mutedForeground }]}>{t("components.parenting_articles.read_aloud")}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Main exported component ──────────────────────────────────────────────
export interface ParentingArticlesProps {
  childAgeMonths: number;
}

export function ParentingArticles({ childAgeMonths }: ParentingArticlesProps) {
  const c = useColors();
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [activeCategory, setActiveCategory] = useState<ArticleCategory | null>(null);
  const [showAll, setShowAll] = useState(false);

  const ageArticles = useMemo(() => getArticlesForAgeMonths(childAgeMonths), [childAgeMonths]);
  const filtered = activeCategory ? ageArticles.filter((a) => a.category === activeCategory) : ageArticles;
  const visible = showAll ? filtered : filtered.slice(0, 4);

  return (
    <View style={{ gap: 12 }}>
      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
      >
        <Pressable
          onPress={() => {
            setActiveCategory(null);
            setShowAll(false);
          }}
          style={[
            styles.chip,
            !activeCategory ? { backgroundColor: c.primary, borderColor: c.primary } : { borderColor: c.border },
          ]}
        >
          <Text style={[styles.chipText, { color: !activeCategory ? "#fff" : c.mutedForeground }]}>{t("components.parenting_articles.all")}</Text>
        </Pressable>
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          const heroCat = getArticleHero(cat);
          return (
            <Pressable
              key={cat}
              onPress={() => {
                setActiveCategory(cat === activeCategory ? null : cat);
                setShowAll(false);
              }}
              style={[
                styles.chip,
                isActive
                  ? { backgroundColor: heroCat.accent, borderColor: heroCat.accent }
                  : { borderColor: c.border },
              ]}
            >
              <Text style={[styles.chipText, { color: isActive ? "#fff" : c.mutedForeground }]}>{cat}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Cards */}
      {filtered.length === 0 ? (
        <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
          No articles in this category for this age group yet.
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {visible.map((a) => (
            <ArticleCard key={a.id} article={a} onPress={() => setActiveArticle(a)} />
          ))}
          {filtered.length > 4 && (
            <Pressable onPress={() => setShowAll((v) => !v)} style={{ paddingVertical: 8, alignItems: "center" }}>
              <Text style={[styles.seeMoreText, { color: c.primary }]}>
                {showAll ? "Show less" : `Explore ${filtered.length - 4} more articles`}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Modal */}
      {activeArticle && (
        <ArticleModal article={activeArticle} onClose={() => setActiveArticle(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // hero
  hero: {
    width: "100%",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  heroSmall: { height: 64 },
  heroLarge: { height: 140 },
  heroBgEmoji: {
    position: "absolute",
    opacity: 0.25,
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 18,
  },
  heroBgEmojiSmall: { right: -8, top: -10, fontSize: 90 },
  heroBgEmojiLarge: { right: -20, top: -30, fontSize: 200 },
  heroEmoji: {
    position: "absolute",
  },
  heroEmojiSmall: { left: 12, top: 8, fontSize: 30 },
  heroEmojiLarge: { left: 20, top: 24, fontSize: 64 },

  // card
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: "hidden",
  },
  cardBody: { padding: 12, gap: 4 },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  cardMetaSmall: { fontSize: 10, fontWeight: "500" },
  cardTitle: { fontSize: 14, fontWeight: "700", lineHeight: 18 },
  cardSummary: { fontSize: 12, lineHeight: 16 },
  cardCtaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  cardCta: { fontSize: 12, fontWeight: "700" },
  readAloudHint: { flexDirection: "row", alignItems: "center", gap: 4 },

  // chips
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontSize: 12, fontWeight: "700" },

  // category pill
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  categoryPillText: { fontSize: 10, fontWeight: "800" },

  // see more / empty
  emptyText: { fontSize: 12, textAlign: "center", paddingVertical: 12 },
  seeMoreText: { fontSize: 13, fontWeight: "700" },

  // modal
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  modalHeaderEmoji: { fontSize: 22 },
  closeBtn: { padding: 4 },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 12, fontWeight: "500" },
  title: { fontSize: 22, fontWeight: "800", lineHeight: 28 },
  summary: { fontSize: 14, lineHeight: 20 },

  listenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 4,
  },
  listenBtnWrap: { borderRadius: 999, overflow: "hidden" },
  listenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  listenBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  errorText: { fontSize: 12, marginTop: 4 },

  // sections
  sectionWrap: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  sectionBtnRow: { alignSelf: "flex-end", marginTop: 6 },
  sectionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  introBox: {
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  introText: { fontSize: 14, lineHeight: 20 },

  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6,
    paddingBottom: 2,
  },
  headingText: { fontSize: 16, fontWeight: "800", flex: 1, marginRight: 8 },

  paragraphRow: { paddingVertical: 2 },
  paragraphText: { fontSize: 14, lineHeight: 21 },

  bulletsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 4,
  },
  bulletItem: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 3 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 20 },

  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tipSparkle: { fontSize: 16 },
  tipText: { flex: 1, fontSize: 13, fontWeight: "500", lineHeight: 19 },

  disclaimer: { fontSize: 11, lineHeight: 16, marginTop: 12, ...Platform.select({ ios: { fontStyle: "italic" }, default: {} }) },
});
