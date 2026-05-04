import React, {  useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator,
  Image, Platform, LayoutAnimation, UIManager,
} from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// `findNodeHandle` was used by the previous (single ScrollView) layout to
// scroll the Explore Next Stage group into view; the swipe-pager layout
// gives each section its own ScrollView so the helper is no longer
// needed. The import is intentionally dropped along with `scrollToBand`.
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useTheme } from "@/contexts/ThemeContext";
import { LifeSkillsZone } from "@/components/LifeSkillsZone";
import InfantHub from "@/components/InfantHub";
import { ParentingArticles } from "@/components/ParentingArticles";
import { ArtCraftReels } from "@/components/ArtCraftReels";
import { PrintableWorksheets } from "@/components/PrintableWorksheets";
import { AmazingFacts } from "@/components/AmazingFacts";
import FuturePredictor from "@/components/FuturePredictor";
import AiMealGenerator from "@/components/AiMealGenerator";
import ParentCommandCenter from "@/components/ParentCommandCenter";
import { PhonicsTestCard } from "@/components/PhonicsTestCard";
import { PhonicsLearningCard } from "@/components/PhonicsLearningCard";
import { SmartMathTricks } from "@/components/SmartMathTricks";
import { AbacusZone } from "@/components/AbacusZone";
import { ColoringBooks } from "@/components/ColoringBooks";
import { FunSheets } from "@/components/FunSheets";
import { SkillsFocus } from "@/components/SkillsFocus";
import { DailyStory } from "@/components/DailyStory";
import { ParentTasks } from "@/components/ParentTasks";
import { DailyPuzzle } from "@/components/DailyPuzzle";
import { HubDebugOverlay } from "@/components/HubDebugOverlay";
import { useDebugMode } from "@/contexts/DebugContext";
import { HubTile } from "@/components/HubTile";
import RoutineCarousel from "@/components/RoutineCarousel";
import { useTodayRoutine } from "@/hooks/useTodayRoutine";
import { isInfantHubAge } from "@workspace/infant-hub";
import { HUB_AGE_BANDS, getAgeBand, HUB_CONTENT_AGE_BANDS, HUB_TILE_AGE_MONTHS, partitionTilesByBand } from "./hub-bands";
export { HUB_AGE_BANDS, getAgeBand, HUB_CONTENT_AGE_BANDS, HUB_TILE_AGE_MONTHS, partitionTilesByBand };
import { useTranslation } from "react-i18next";
import { LanguageRow } from "@/components/LanguageRow";
import { useProfileComplete } from "@/hooks/useProfileComplete";
import { useFeatureUsage } from "@/hooks/useFeatureUsage";
import LockedBlock from "@/components/LockedBlock";
import TryFreeBadge from "@/components/TryFreeBadge";
import { ProfileLockScreen } from "@/components/ProfileLockScreen";
import colors, { brand, brandAlpha, ACCENT_PINK, palette } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";

const LOGO = require("../../assets/images/amynest-logo.png");

// Avatar gradient palette for child selector cards — matches web ChildSelectorPanel
// AVATAR_COLORS, adapted to the brand gradient token system (expo-linear-gradient).
const AVATAR_GRADIENTS: readonly [string, string][] = [
  [brand.violet500, brand.violet600],
  [brand.pink500, brand.rose400],
  [brand.sky300, brand.indigo500],
  [palette.emerald500, palette.emerald700],
  [palette.amber500, palette.orange500],
  [brand.rose400, brand.pink500],
] as const;

function getChildInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

type Child = { id: number; name: string; age: number; ageMonths?: number };

// Stable identifiers used for i18n key lookup. Emojis stay co-located with
// the data while the user-visible label / prompt text is resolved at render
// time via `useAmyPrompts()` / `useEmotionalCards()` so a language switch
// re-renders these chips immediately.
const AMY_PROMPT_KEYS = [
  { key: "sleep",          emoji: "😴" },
  { key: "tantrums",       emoji: "😤" },
  { key: "picky_eating",   emoji: "🥦" },
  { key: "school_anxiety", emoji: "📚" },
  { key: "screen_time",    emoji: "📱" },
  { key: "language",       emoji: "💬" },
] as const;

const EMOTIONAL_KEYS = [
  { key: "overwhelmed",        emoji: "🫂"   },
  { key: "child_anxious",      emoji: "😰"   },
  { key: "struggling_connect", emoji: "😔"   },
  { key: "need_break",         emoji: "😮‍💨" },
] as const;

function useAmyPrompts() {
  const { t } = useTranslation();
  return AMY_PROMPT_KEYS.map((p) => ({
    emoji: p.emoji,
    label: t(`parent_hub.amy.prompts.${p.key}.label`),
    prompt: t(`parent_hub.amy.prompts.${p.key}.prompt`),
  }));
}

function useEmotionalCards() {
  const { t } = useTranslation();
  return EMOTIONAL_KEYS.map((e) => ({
    emoji: e.emoji,
    title: t(`parent_hub.emotional.cards.${e.key}.title`),
    prompt: t(`parent_hub.emotional.cards.${e.key}.prompt`),
  }));
}

// Returns the emoji + i18n key for an age band. The label is resolved at
// render time via `useAgeGroupLabel()` so a language switch updates the
// chip without remounting.
function ageGroupKey(age: number, months = 0): { key: "infant" | "toddler" | "preschool" | "school_age" | "teen"; emoji: string } {
  const total = age * 12 + months;
  if (total < 12) return { key: "infant", emoji: "👶" };
  if (total < 36) return { key: "toddler", emoji: "🧒" };
  if (total < 60) return { key: "preschool", emoji: "🎨" };
  if (total < 144) return { key: "school_age", emoji: "📚" };
  return { key: "teen", emoji: "🎒" };
}

function useAgeGroupLabel() {
  const { t } = useTranslation();
  return (age: number, months = 0) => {
    const g = ageGroupKey(age, months);
    return { emoji: g.emoji, label: t(`parent_hub.age_groups.${g.key}`) };
  };
}

// 2-section Parent Hub age band system: HUB_AGE_BANDS / getAgeBand /
// HUB_CONTENT_AGE_BANDS are defined in ./hub-bands so they can be unit-tested
// without loading this whole component file. Re-exported above for callers.


export default function HubScreen() {
  const { profileComplete, isLoading: profileLoading } = useProfileComplete();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const { theme, mode } = useTheme();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c, mode), [c, mode]);
  const { t } = useTranslation();
  const amyPrompts = useAmyPrompts();
  const emotionalCards = useEmotionalCards();
  const resolveAgeGroup = useAgeGroupLabel();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [openSection, setOpenSection] = useState<string | null>("amy");
  // Lazy-load Section 2 ("Explore") so the primary band content paints first.
  // Reset on child switch so the deferred render happens fresh per child.
  const [showExplore, setShowExplore] = useState(false);
  // Quick band switcher (Task #108): when set to a future band, that group is // audit-ok: task ref not hex
  // shown in full opacity (un-dimmed) and we scroll to it. Tapping the current
  // band chip clears it and returns to the default 2-section view.
  const [previewBand, setPreviewBand] = useState<number | null>(null);
  // Tile id to highlight after a Today's Plan quick-jump (Task #191). // audit-ok: task ref, not a hex color
  // Cleared by `triggerHighlight` after ~2.4s, or cancelled if the parent
  // jumps to a different tile in the meantime.
  const [highlightedTileId, setHighlightedTileId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const groupRefs = useRef<Record<number, View | null>>({});

  // Single-scroll deep-link support: main scroll ref + per-tile y-cache
  const mainScrollRef = useRef<ScrollView>(null);
  const tileYRef = useRef<Record<string, number>>({});

  // Dev-mode activation: 7 quick taps on the logo toggles DebugContext, which
  // persists to AsyncStorage and shows both the HubDebugOverlay and the global
  // DebugPanel. Single source of truth — no local devMode state needed.
  const { debugMode, toggle: toggleDebugMode } = useDebugMode();
  const logoTapCount = useRef(0);
  const logoTapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maybeScrollToTile = useCallback((tileId: string) => {
    const y = tileYRef.current[tileId];
    if (y == null) return;
    mainScrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
  }, []);

  // Briefly mark a tile as highlighted so the SectionPage can scroll to it
  // and HubTile draws a fading accent ring. Re-triggering with a new tile
  // cancels the previous timer so the ring follows the latest jump.
  const triggerHighlight = useCallback((tileId: string | null) => {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
    setHighlightedTileId(tileId);
    if (tileId) {
      highlightTimerRef.current = setTimeout(() => {
        setHighlightedTileId((cur) => (cur === tileId ? null : cur));
        highlightTimerRef.current = null;
      }, 2400);
    }
  }, []);

  // Clear any pending highlight timer on unmount so we don't `setState`
  // on an unmounted screen if the user navigates away mid-fade.
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = null;
      }
    };
  }, []);

  // Today's Plan → quick-jump: highlight the tile and scroll to it.
  const onContinueFromTodayPlan = useCallback(
    (tileId: string) => {
      triggerHighlight(tileId);
      setTimeout(() => maybeScrollToTile(tileId), 50);
    },
    [triggerHighlight, maybeScrollToTile],
  );

  // First-Time Free + Preview Lock — every Parent Hub feature is usable ONCE
  // for free (server-tracked). After that, free users see a locked overlay;
  // premium users always get full access.
  const hubUsage = useFeatureUsage();
  const tryFreeFor = (id: string) =>
    !hubUsage.isPremium && !hubUsage.hasUsedFeature(id);

  const { data: children = [], isLoading } = useQuery<Child[]>({
    queryKey: ["children"],
    queryFn: async () => {
      const r = await authFetch("/api/children");
      if (!r.ok) return [];
      return r.json();
    },
  });

  const effective = useMemo(() => {
    if (!children?.length) return null;
    return selectedId ? children.find(c => c.id === selectedId) ?? children[0] : children[0];
  }, [children, selectedId]);

  const grp = effective ? resolveAgeGroup(effective.age, effective.ageMonths ?? 0) : null;
  const currentBand = effective ? getAgeBand(effective.age, effective.ageMonths ?? 0) : 0;
  const childName = effective?.name ?? "your child";

  // Reset + lazy-mount Section 2 every time the active child changes so the
  // primary "For You" content paints first.
  useEffect(() => {
    setShowExplore(false);
    setPreviewBand(null);
    const t = setTimeout(() => setShowExplore(true), 250);
    return () => clearTimeout(t);
  }, [effective?.id, currentBand]);


  const handleBandChipPress = (band: number) => {
    LayoutAnimation.configureNext({
      duration: 220,
      create: { type: "easeInEaseOut", property: "opacity" },
      update: { type: "easeInEaseOut" },
      delete: { type: "easeInEaseOut", property: "opacity" },
    });
    if (band === currentBand) {
      setPreviewBand(null);
      return;
    }
    setPreviewBand(band);
  };

  // 7-tap logo tap-counter: each tap within a 1.5 s window increments the
  // counter; on reaching 7 it calls toggleDebugMode() from DebugContext,
  // which handles AsyncStorage persistence. Works in all build types
  // (debug and release) so testers can access overlays without a custom build.
  const handleLogoTap = useCallback(() => {
    logoTapCount.current += 1;
    if (logoTapTimeout.current) clearTimeout(logoTapTimeout.current);
    if (logoTapCount.current >= 7) {
      logoTapCount.current = 0;
      toggleDebugMode();
    } else {
      logoTapTimeout.current = setTimeout(() => {
        logoTapCount.current = 0;
        logoTapTimeout.current = null;
      }, 1500);
    }
  }, [toggleDebugMode]);

  const askAmy = (q: string) => {
    router.push({ pathname: "/amy-ai", params: { q } });
  };

  // 2-col tile grid: when a section is open it spans the full row; collapsed
  // siblings use flexBasis 48% + flexGrow 1 so an orphan (last item with no
  // partner, or a tile sharing a row with an opened sibling that wrapped)
  // stretches to fill the remaining space instead of leaving an empty gap.
  // Single-column layout on mobile — every tile spans the full row for a
  // cleaner, easier-to-scan parent hub. (`openSection` is still used for
  // accordion behaviour inside each Section, just not for sizing anymore.)
  const tileW = (_id: string): { width: "100%" } => ({ width: "100%" });

  if (profileLoading) {
    return (
      <LinearGradient colors={theme.gradient} style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={c.primary} />
      </LinearGradient>
    );
  }

  if (!profileComplete) {
    return <ProfileLockScreen sectionName="Hub" />;
  }

  // Dev-only: snapshot of what the IIFE below renders, captured by reference
  // so the floating HubDebugOverlay (mounted as a sibling outside the
  // ScrollView) can show a live mobile-vs-web tile diff without us having
  // to refactor the imperative allTiles builder. Mutated synchronously
  // during render — same render pass, JS execution order — and only read
  // by the overlay component, never used for hub render decisions.
  const debugSnapshot: {
    section1Ids: string[];
    section2Ids: string[];
    showsSection2: boolean;
  } = { section1Ids: [], section2Ids: [], showsSection2: false };

  // Dev-only: capture which featured tiles (rendered above the IIFE) the
  // mobile hub is actually showing right now, so the overlay diff doesn't
  // produce false "missing on mobile" warnings for command-center / infant-hub
  // / tomorrow-forecast (web treats those as Section 1 featured tiles too).
  // Mirrors the gating used by the JSX immediately below.
  const debugFeaturedIds: string[] = [];
  if (effective) {
    debugFeaturedIds.push("command-center");
    const selMonthsForDebug =
      effective.age * 12 + (effective.ageMonths ?? 0);
    const anyInfantChild =
      isInfantHubAge(selMonthsForDebug) ||
      children.some(
        (c) => isInfantHubAge(c.age * 12 + (c.ageMonths ?? 0)),
      );
    if (anyInfantChild) debugFeaturedIds.push("infant-hub");
    debugFeaturedIds.push("tomorrow-forecast");
  }

  // Build the featured-tile nodes (rendered inside the Recommended Zones
  // page). They are NOT part of the partitioned grid because they are
  // singletons (one Command Center, one InfantHub, one FuturePredictor)
  // and live above the grid in the same page.
  const renderInfantHub = (): React.ReactNode => {
    const selMonths = effective ? effective.age * 12 + (effective.ageMonths ?? 0) : -1;
    const target = isInfantHubAge(selMonths)
      ? effective
      : children
          .map(c => ({ child: c, months: c.age * 12 + (c.ageMonths ?? 0) }))
          .filter(x => isInfantHubAge(x.months))
          .sort((a, b) => a.months - b.months)[0]?.child;
    if (!target) return null;
    const m = target.age * 12 + (target.ageMonths ?? 0);
    return <InfantHub childId={target.id} childName={target.name} ageMonths={m} />;
  };

  return (
    <LinearGradient colors={theme.gradient} style={{ flex: 1 }}>
      {/* Sticky header above the swipeable pager */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          paddingBottom: 8,
          gap: 12,
        }}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={handleLogoTap} accessibilityRole="button" accessibilityLabel="AmyNest logo" /* audit-ok — brand name, not translatable prose */>
            <View>
              <Image source={LOGO} style={styles.logo} resizeMode="contain" />
              {debugMode && (
                <View style={styles.devBadge}>
                  {/* i18n-ok: developer mode indicator — not user-facing, intentionally not translated */}
                  <Text style={styles.devBadgeText}>DEV</Text>
                </View>
              )}
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={styles.eyebrowRow}>
              <Ionicons name="sparkles" size={11} color={brand.purple500} />
              <Text style={styles.eyebrow}>{t("parent_hub.shell.eyebrow")}</Text>
            </View>
            <Text style={styles.title}>{t("parent_hub.shell.title")}</Text>
            <Text style={styles.subtitle}>{t("parent_hub.shell.subtitle_mobile")}</Text>
          </View>
          <Pressable
            onPress={() => router.push("/amy-ai")}
            style={styles.askAmyBtn}
          >
            <LinearGradient colors={[brand.amber400, ACCENT_PINK, brand.primary]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.askAmyGrad}>
              <Ionicons name="chatbubbles" size={14} color="#fff" />
              <Text style={styles.askAmyText}>{t("parent_hub.shell.ask_amy")}</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Inline language switcher so caregivers can toggle English / Hindi /
            Hinglish without leaving the Parent Hub. Reuses the shared
            `LanguageRow` modal already used in onboarding & settings. */}
        <LanguageRow />

        {isLoading && (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator color={ACCENT_PINK} />
          </View>
        )}

        {!isLoading && children.length === 0 && (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="baby-face-outline" size={48} color={ACCENT_PINK} />
            <Text style={styles.emptyTitle}>{t("parent_hub.shell.no_child_title")}</Text>
            <Text style={styles.emptyDesc}>{t("parent_hub.shell.no_child_desc")}</Text>
            <Pressable onPress={() => router.push("/children/new")} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>{t("parent_hub.shell.add_child")}</Text>
            </Pressable>
          </View>
        )}

        {/* Child selector — web-parity rich avatar cards.
            Each card shows a gradient avatar with initials, name, and age-group
            label. The selected card gains a purple border glow + checkmark icon
            + "VIEWING" pill, matching the web ChildSelectorPanel design.
            Visible for any number of children (including single-child families)
            so caregivers always see who content is personalised for. */}
        {children.length > 0 && (
          <View style={styles.childSelectorWrap}>
            <View style={styles.childSelectorHeader}>
              <Ionicons name="people" size={13} color={brand.primary} />
              <Text style={styles.childSelectorLabel}>
                {children.length === 1
                  ? t("parent_hub.headers.current_child")
                  : t("parent_hub.headers.select_child")}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.childSelectorRow}
            >
              {children.map((ch, idx) => {
                const g = resolveAgeGroup(ch.age, ch.ageMonths ?? 0);
                const isSel = effective?.id === ch.id;
                const grad = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
                return (
                  <Pressable
                    key={ch.id}
                    onPress={() => setSelectedId(ch.id)}
                    style={[styles.childCard, isSel && styles.childCardSel]}
                  >
                    {isSel && (
                      <View style={styles.childCardCheck}>
                        <Ionicons name="checkmark-circle" size={16} color={brand.primary} />
                      </View>
                    )}
                    <LinearGradient
                      colors={grad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.childAvatar, isSel && styles.childAvatarSel]}
                    >
                      <Text style={styles.childAvatarText}>{getChildInitials(ch.name)}</Text>
                    </LinearGradient>
                    <View style={styles.childCardInfo}>
                      <Text
                        style={[styles.childCardName, isSel && styles.childCardNameSel]}
                        numberOfLines={1}
                      >
                        {ch.name}
                      </Text>
                      <Text style={styles.childCardAge} numberOfLines={1}>
                        {g.emoji} {g.label}
                      </Text>
                    </View>
                    {isSel && (
                      <View style={styles.viewingChip}>
                        <Text style={styles.viewingChipText}>{t("parent_hub.headers.viewing")}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {effective && grp && (
          <View style={styles.agePillRow}>
            <View style={styles.agePill}>
              <Text style={{ color: brand.amber400, fontWeight: "700" }}>{grp.emoji} {grp.label}</Text>
            </View>
            <Text style={styles.personalised}>
              {t("parent_hub.shell.personalised_for")}{" "}
              <Text style={{ color: "#fff", fontWeight: "700" }}>{effective.name}</Text>
            </Text>
          </View>
        )}


      </View>

        {/* === 2-section age-band content system ===================
            Only rendered when an active child is selected — the no-child
            case is already covered upstream by the add-child empty state. */}
          {effective && (() => {
            type Tile = {
              id: string;
              ageBands: readonly number[];
              node: React.ReactNode;
              ageMonthsMin?: number;
              ageMonthsMax?: number;
            };
            const allTiles: Tile[] = [];

            allTiles.push({
            id: "amy",
            ageBands: HUB_CONTENT_AGE_BANDS.amy,
            node: (
              <View style={tileW("amy")}>
              <Section
                id="amy"
                icon={<MaterialCommunityIcons name="brain" size={20} color="#fff" />}
                emoji="🤖"
                accent={[brand.primary, ACCENT_PINK]}
                title={t("parent_hub.amy.title")}
                desc={t("parent_hub.amy.desc")}
                open={openSection === "amy"}
                onToggle={() => setOpenSection(s => s === "amy" ? null : "amy")}
                tryFree={tryFreeFor("hub_amy")}
              >
                <Text style={styles.sectionLead}>{t("parent_hub.amy.lead_short")}</Text>
                <View style={styles.promptsGrid}>
                  {amyPrompts.map(p => (
                    <Pressable key={p.label} onPress={() => askAmy(p.prompt)} style={styles.promptChip}>
                      <Text style={{ fontSize: 18 }}>{p.emoji}</Text>
                      <Text style={styles.promptLabel}>{p.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable onPress={() => router.push("/amy-ai")} style={styles.askAmyFull}>
                  <Ionicons name="chatbubbles" size={16} color="#fff" />
                  <Text style={styles.askAmyFullText}>{t("parent_hub.amy.ask_anything")}</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </Pressable>
              </Section>
              </View>
            ),
          });
          allTiles.push({
            id: "articles",
            ageBands: HUB_CONTENT_AGE_BANDS.articles,
            node: (
              <View style={tileW("articles")}>
              <LockedBlock
                reason="hub_locked"
                locked={hubUsage.isFeatureLocked("hub_articles")}
              >
              <Section
                id="articles"
                icon={<Ionicons name="book" size={20} color="#fff" />}
                emoji="📚"
                accent={[palette.emerald500, palette.emerald400]}
                title={t("parent_hub.tiles.articles.title")}
                desc={t("parent_hub.tiles.articles.desc")}
                open={openSection === "articles"}
                onToggle={() => setOpenSection(s => s === "articles" ? null : "articles")}
                onOpen={() => hubUsage.markFeatureUsed("hub_articles")}
                tryFree={tryFreeFor("hub_articles")}
              >
                <Text style={styles.sectionLead}>
                  {effective
                    ? `Curated for ${effective.name}'s age. Tap any article to read or listen.`
                    : "Add a child to see matched articles."}
                </Text>
                {effective && (
                  <ParentingArticles
                    childAgeMonths={effective.age * 12 + (effective.ageMonths ?? 0)}
                  />
                )}
              </Section>
              </LockedBlock>
              </View>
            ),
          });
          allTiles.push({
            id: "tips",
            ageBands: HUB_CONTENT_AGE_BANDS.tips,
            node: (
              <View style={tileW("tips")}>
              <LockedBlock
                reason="hub_locked"
                locked={hubUsage.isFeatureLocked("hub_tips")}
              >
              <Section
                id="tips"
                icon={<Ionicons name="sparkles" size={20} color="#fff" />}
                emoji="💡"
                accent={[brand.violet400, colors.light.primary]}
                title={t("parent_hub.tiles.tips.title")}
                desc={t("parent_hub.tiles.tips.desc")}
                open={openSection === "tips"}
                onToggle={() => setOpenSection(s => s === "tips" ? null : "tips")}
                onOpen={() => hubUsage.markFeatureUsed("hub_tips")}
                tryFree={tryFreeFor("hub_tips")}
              >
                {effective ? (
                  <View style={styles.tipsList}>
                    {(() => {
                      // Defensive: in test environments without a real
                      // i18n instance, `t(..., {returnObjects:true})` may
                      // return the key string instead of an array, which
                      // would crash `.map`. Coerce to [] in that case.
                      const raw = t("parent_hub.tips_fallbacks", { returnObjects: true });
                      const list = Array.isArray(raw) ? (raw as string[]) : [];
                      return list.map((tip, i) => (
                        <View key={i} style={styles.tipCard}>
                          <Text style={styles.tipNum}>{i + 1}</Text>
                          <Text style={styles.tipText}>{tip}</Text>
                        </View>
                      ));
                    })()}
                  </View>
                ) : (
                  <Text style={styles.sectionLead}>{t("parent_hub.tiles.tips.empty")}</Text>
                )}
              </Section>
              </LockedBlock>
              </View>
            ),
          });
          allTiles.push({
            id: "emotional",
            ageBands: HUB_CONTENT_AGE_BANDS.emotional,
            node: (
              <View style={tileW("emotional")}>
              <LockedBlock
                reason="hub_locked"
                locked={hubUsage.isFeatureLocked("hub_emotional")}
              >
              <Section
                id="emotional"
                icon={<Ionicons name="heart" size={20} color="#fff" />}
                emoji="💖"
                accent={[brand.pink400, ACCENT_PINK]}
                title={t("parent_hub.emotional.title")}
                desc={t("parent_hub.emotional.desc")}
                open={openSection === "emotional"}
                onToggle={() => setOpenSection(s => s === "emotional" ? null : "emotional")}
                onOpen={() => hubUsage.markFeatureUsed("hub_emotional")}
                tryFree={tryFreeFor("hub_emotional")}
              >
                <Text style={styles.sectionLead}>{t("parent_hub.emotional.desc")}</Text>
                <View style={styles.emotionalGrid}>
                  {emotionalCards.map(e => (
                    <Pressable key={e.title} onPress={() => askAmy(e.prompt)} style={styles.emoCard}>
                      <Text style={{ fontSize: 22 }}>{e.emoji}</Text>
                      <Text style={styles.emoTitle}>{e.title}</Text>
                    </Pressable>
                  ))}
                </View>
              </Section>
              </LockedBlock>
              </View>
            ),
          });
          allTiles.push({
            id: "ptm-prep",
            ageBands: HUB_CONTENT_AGE_BANDS["ptm-prep"],
            node: (
              <View style={tileW("ptm-prep")}>
              <LockedBlock
                reason="hub_locked"
                locked={hubUsage.isFeatureLocked("hub_ptm_prep")}
                radius={18}
              >
                <Pressable
                  onPress={() => {
                    hubUsage.markFeatureUsed("hub_ptm_prep");
                    router.push({
                      pathname: "/ptm-prep" as never,
                      params: effective ? { childId: effective.id, childName: effective.name } as never : undefined,
                    });
                  }}
                  style={{ borderRadius: 18, overflow: "hidden" }}
                >
                  <LinearGradient
                    colors={[brand.violet500, brand.pink500]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ padding: 16, gap: 8 }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 22 }}>📋</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{t("parent_hub.tiles.ptm-prep.title")}</Text>
                          {tryFreeFor("hub_ptm_prep") ? <TryFreeBadge /> : null}
                        </View>
                        <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 11.5, marginTop: 2 }}>{t("parent_hub.tiles.ptm-prep.sublabel")}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
                    </View>
                  </LinearGradient>
                </Pressable>
              </LockedBlock>
              </View>
            ),
          });
          allTiles.push({
            id: "smart-study",
            ageBands: HUB_CONTENT_AGE_BANDS["smart-study"],
            node: (
              <View style={tileW("smart-study")}>
              <LockedBlock
                reason="hub_locked"
                locked={hubUsage.isFeatureLocked("hub_smart_study")}
                radius={18}
              >
                <Pressable
                  onPress={() => {
                    hubUsage.markFeatureUsed("hub_smart_study");
                    router.push("/study" as never);
                  }}
                  style={{ borderRadius: 18, overflow: "hidden" }}
                >
                  <LinearGradient
                    colors={[palette.indigo500, brand.purple500]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ padding: 16, gap: 8 }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 22 }}>🎓</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{t("parent_hub.tiles.smart-study.title")}</Text>
                          {tryFreeFor("hub_smart_study") ? <TryFreeBadge /> : null}
                        </View>
                        <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 11.5, marginTop: 2 }}>{t("parent_hub.tiles.smart-study.sublabel")}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
                    </View>
                  </LinearGradient>
                </Pressable>
              </LockedBlock>
              </View>
            ),
          });
          allTiles.push({
            id: "morning-flow",
            ageBands: HUB_CONTENT_AGE_BANDS["morning-flow"],
            node: (
              <View style={tileW("morning-flow")}>
              <LockedBlock
                reason="hub_locked"
                locked={hubUsage.isFeatureLocked("hub_morning_flow")}
                radius={18}
              >
                <Pressable
                  onPress={() => {
                    hubUsage.markFeatureUsed("hub_morning_flow");
                    router.push("/morning-flow" as never);
                  }}
                  style={{ borderRadius: 18, overflow: "hidden" }}
                >
                  <LinearGradient
                    colors={[palette.orange500, palette.amber400]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ padding: 16, gap: 8 }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 22 }}>🌅</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{t("parent_hub.tiles.morning-flow.title")}</Text>
                          {tryFreeFor("hub_morning_flow") ? <TryFreeBadge /> : null}
                        </View>
                        <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 11.5, marginTop: 2 }}>{t("parent_hub.tiles.morning-flow.sublabel")}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
                    </View>
                  </LinearGradient>
                </Pressable>
              </LockedBlock>
              </View>
            ),
          });
          allTiles.push({
            id: "olympiad",
            ageBands: HUB_CONTENT_AGE_BANDS.olympiad,
            node: (
              <View style={tileW("olympiad")}>
              <LockedBlock
                reason="hub_locked"
                locked={hubUsage.isFeatureLocked("hub_olympiad")}
                radius={18}
              >
                <Pressable
                  onPress={() => {
                    hubUsage.markFeatureUsed("hub_olympiad");
                    router.push("/olympiad" as never);
                  }}
                  style={{ borderRadius: 18, overflow: "hidden" }}
                >
                  <LinearGradient
                    colors={[palette.amber500, palette.red500]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ padding: 16, gap: 8 }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 22 }}>🏆</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{t("parent_hub.tiles.olympiad.title")}</Text>
                          {tryFreeFor("hub_olympiad") ? <TryFreeBadge /> : null}
                        </View>
                        <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 11.5, marginTop: 2 }}>{t("parent_hub.tiles.olympiad.sublabel")}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
                    </View>
                  </LinearGradient>
                </Pressable>
              </LockedBlock>
              </View>
            ),
          });
          allTiles.push({
            id: "phonics-learning",
            ageBands: HUB_CONTENT_AGE_BANDS.phonics,
            node: (
              <View style={tileW("phonics-learning")}>
                <LockedBlock
                  reason="hub_phonics_learning"
                  locked={hubUsage.isFeatureLocked("hub_phonics_learning")}
                  radius={18}
                >
                  <View>
                    <PhonicsLearningCard
                      childId={effective?.id}
                      onPress={() => {
                        hubUsage.markFeatureUsed("hub_phonics_learning");
                        if (effective?.id != null) {
                          router.push({
                            pathname: "/phonics-learning" as never,
                            params: { childId: String(effective.id) } as never,
                          });
                        } else {
                          router.push("/phonics-learning" as never);
                        }
                      }}
                    />
                    {tryFreeFor("hub_phonics_learning") ? (
                      <View style={styles.tileBadgeOverlay} pointerEvents="none">
                        <TryFreeBadge />
                      </View>
                    ) : null}
                  </View>
                </LockedBlock>
              </View>
            ),
          });
          allTiles.push({
            id: "phonics",
            ageBands: HUB_CONTENT_AGE_BANDS.phonics,
            node: (
              <View style={tileW("phonics")}>
                <LockedBlock
                  reason="hub_phonics_test"
                  locked={hubUsage.isFeatureLocked("hub_phonics_test")}
                  radius={18}
                >
                  <View>
                    <PhonicsTestCard
                      childId={effective?.id}
                      onPress={() => {
                        hubUsage.markFeatureUsed("hub_phonics_test");
                        if (effective?.id != null) {
                          router.push({
                            pathname: "/phonics-test" as never,
                            params: { childId: String(effective.id) } as never,
                          });
                        } else {
                          router.push("/phonics-test" as never);
                        }
                      }}
                    />
                    {tryFreeFor("hub_phonics_test") ? (
                      <View style={styles.tileBadgeOverlay} pointerEvents="none">
                        <TryFreeBadge />
                      </View>
                    ) : null}
                  </View>
                </LockedBlock>
              </View>
            ),
          });
          allTiles.push({
            id: "kids-control-center",
            ageBands: HUB_CONTENT_AGE_BANDS["kids-control-center"],
            node: (
              <View style={tileW("kids-control-center")}>
                <Pressable
                  onPress={() => router.push("/kids-control-center" as never)}
                  style={{ borderRadius: 18, overflow: "hidden" }}
                  testID="card-kids-control-center"
                >
                  <LinearGradient
                    colors={[brand.violet600, brand.pink500, palette.amber500]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ padding: 16, gap: 8 }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 22 }}>👶</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{t("parent_hub.tiles.kids-control-center.title")}</Text>
                          {tryFreeFor("hub_kids_control_center") ? <TryFreeBadge /> : null}
                        </View>
                        <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 11.5, marginTop: 2 }}>{t("parent_hub.tiles.kids-control-center.sublabel")}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.85)" />
                    </View>
                  </LinearGradient>
                </Pressable>
              </View>
            ),
          });
          allTiles.push({
            id: "meals",
            ageBands: HUB_CONTENT_AGE_BANDS.meals,
            node: (
              <View style={tileW("meals")}>
              <LockedBlock
                reason="hub_locked"
                locked={hubUsage.isFeatureLocked("hub_meals_tile")}
                radius={18}
              >
                <Pressable
                  onPress={() => {
                    hubUsage.markFeatureUsed("hub_meals_tile");
                    router.push("/meals" as never);
                  }}
                  style={{ borderRadius: 18, overflow: "hidden" }}
                >
                  <LinearGradient
                    colors={[palette.emerald500, palette.lime500]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ padding: 16, gap: 8 }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 22 }}>🍎</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{t("parent_hub.tiles.meals.title")}</Text>
                          {tryFreeFor("hub_meals_tile") ? <TryFreeBadge /> : null}
                        </View>
                        <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 11.5, marginTop: 2 }}>{t("parent_hub.tiles.meals.sublabel")}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
                    </View>
                  </LinearGradient>
                </Pressable>
              </LockedBlock>
              </View>
            ),
          });
          allTiles.push({
            id: "nutrition",
            ageBands: HUB_CONTENT_AGE_BANDS.nutrition,
            node: (
              <View style={tileW("nutrition")}>
              <LockedBlock
                reason="hub_nutrition"
                locked={hubUsage.isFeatureLocked("hub_nutrition")}
                radius={18}
              >
                <Pressable
                  onPress={() => {
                    hubUsage.markFeatureUsed("hub_nutrition");
                    router.push("/nutrition" as never);
                  }}
                  style={{ borderRadius: 18, overflow: "hidden" }}
                >
                  <LinearGradient
                    colors={[brand.violet600, palette.indigo600]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ padding: 16, gap: 8 }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 22 }}>🥗</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{t("parent_hub.tiles.nutrition.title")}</Text>
                          {tryFreeFor("hub_nutrition") ? <TryFreeBadge /> : null}
                        </View>
                        <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 11.5, marginTop: 2 }}>{t("parent_hub.tiles.nutrition.sublabel")}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
                    </View>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {(() => {
                        const raw = t("parent_hub.nutrition_tags", { returnObjects: true });
                        const list = Array.isArray(raw) ? (raw as string[]) : [];
                        return list.map(tag => (
                          <View key={tag} style={{ backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
                            <Text style={{ color: "#fff", fontSize: 9, fontWeight: "600" }}>{tag}</Text>
                          </View>
                        ));
                      })()}
                    </View>
                  </LinearGradient>
                </Pressable>
              </LockedBlock>
              </View>
            ),
          });
          allTiles.push({
            id: "event-prep",
            ageBands: HUB_CONTENT_AGE_BANDS["event-prep"],
            node: (
              <View style={tileW("event-prep")}>
              <LockedBlock
                reason="hub_locked"
                locked={hubUsage.isFeatureLocked("hub_event_prep")}
                radius={18}
              >
                <Pressable
                  onPress={() => {
                    hubUsage.markFeatureUsed("hub_event_prep");
                    router.push("/event-prep" as never);
                  }}
                  style={{ borderRadius: 18, overflow: "hidden" }}
                >
                  <LinearGradient
                    colors={[brand.pink500, palette.orange500]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ padding: 16, gap: 8 }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 22 }}>🎉</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{t("parent_hub.tiles.event-prep.title")}</Text>
                          {tryFreeFor("hub_event_prep") ? <TryFreeBadge /> : null}
                        </View>
                        <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 11.5, marginTop: 2 }}>{t("parent_hub.tiles.event-prep.sublabel")}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
                    </View>
                  </LinearGradient>
                </Pressable>
              </LockedBlock>
              </View>
            ),
          });
          allTiles.push({
            id: "activities",
            ageBands: HUB_CONTENT_AGE_BANDS.activities,
            node: (
              <LockedBlock
                reason="hub_locked"
                locked={hubUsage.isFeatureLocked("hub_activities")}
                style={tileW("activities")}
              >
              <Section
                id="activities"
                icon={<Ionicons name="color-palette" size={20} color="#fff" />}
                emoji="🎨"
                accent={[brand.rose400, palette.amber500]}
                title={t("parent_hub.tiles.activities.title")}
                desc={t("parent_hub.tiles.activities.desc")}
                open={openSection === "activities"}
                onToggle={() => setOpenSection(s => s === "activities" ? null : "activities")}
                onOpen={() => hubUsage.markFeatureUsed("hub_activities")}
                tryFree={tryFreeFor("hub_activities")}
              >
                <Text style={styles.sectionLead}>{t("parent_hub.tiles.activities.lead")}</Text>

                {/* Gaming Reward entry */}
                <View style={{ marginTop: 4 }}>
                <LockedBlock
                  reason="hub_gaming_rewards"
                  locked={hubUsage.isFeatureLocked("hub_gaming_rewards")}
                  radius={14}
                >
                <Pressable
                  onPress={() => {
                    hubUsage.markFeatureUsed("hub_gaming_rewards");
                    router.push("/games" as never);
                  }}
                  style={{ borderRadius: 14, overflow: "hidden" }}
                >
                  <LinearGradient
                    colors={[brand.violet600, brand.purple500]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 22 }}>🎮</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>{t("parent_hub.tiles_activity.gaming_reward.title")}</Text>
                        {tryFreeFor("hub_gaming_rewards") ? <TryFreeBadge /> : null}
                      </View>
                      <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11.5, marginTop: 2 }}>{t("parent_hub.tiles_activity.gaming_reward.desc")}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
                  </LinearGradient>
                </Pressable>
                </LockedBlock>
                </View>

                {/* Rewards Shop entry */}
                <View style={{ marginTop: 8 }}>
                <LockedBlock
                  reason="hub_rewards_shop"
                  locked={hubUsage.isFeatureLocked("hub_rewards_shop")}
                  radius={14}
                >
                <Pressable
                  onPress={() => {
                    hubUsage.markFeatureUsed("hub_rewards_shop");
                    router.push("/rewards" as never);
                  }}
                  style={{ borderRadius: 14, overflow: "hidden" }}
                >
                  <LinearGradient
                    colors={[palette.amber500, brand.pink500]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 22 }}>🎁</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>{t("parent_hub.tiles_activity.rewards_shop.title")}</Text>
                        {tryFreeFor("hub_rewards_shop") ? <TryFreeBadge /> : null}
                      </View>
                      <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11.5, marginTop: 2 }}>{t("parent_hub.tiles_activity.rewards_shop.desc")}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
                  </LinearGradient>
                </Pressable>
                </LockedBlock>
                </View>

                {/* Audio Lessons entry */}
                <View style={{ marginTop: 8 }}>
                <LockedBlock
                  reason="hub_audio_lessons"
                  locked={hubUsage.isFeatureLocked("hub_audio_lessons")}
                  radius={14}
                >
                <Pressable
                  onPress={() => {
                    hubUsage.markFeatureUsed("hub_audio_lessons");
                    router.push("/audio-lessons" as never);
                  }}
                  style={{ borderRadius: 14, overflow: "hidden" }}
                >
                  <LinearGradient
                    colors={[palette.cyan700, palette.cyan600]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 22 }}>🎧</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>{t("parent_hub.tiles_activity.audio_lessons.title")}</Text>
                        {tryFreeFor("hub_audio_lessons") ? <TryFreeBadge /> : null}
                      </View>
                      <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11.5, marginTop: 2 }}>{t("parent_hub.tiles_activity.audio_lessons.desc")}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
                  </LinearGradient>
                </Pressable>
                </LockedBlock>
                </View>

              </Section>
              </LockedBlock>
            ),
          });
          allTiles.push({
            id: "story-hub",
            ageBands: HUB_CONTENT_AGE_BANDS["story-hub"],
            node: (
              <View style={tileW("story-hub")}>
              <LockedBlock
                reason="hub_locked"
                locked={hubUsage.isFeatureLocked("hub_story_hub")}
                radius={18}
              >
                <Pressable
                  onPress={() => {
                    hubUsage.markFeatureUsed("hub_story_hub");
                    router.push("/stories" as never);
                  }}
                  style={{ borderRadius: 18, overflow: "hidden" }}
                >
                  <LinearGradient
                    colors={[brand.pink500, brand.purple500]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ padding: 16, gap: 8 }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 22 }}>🎬</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{t("parent_hub.tiles.story-hub.title")}</Text>
                          {tryFreeFor("hub_story_hub") ? <TryFreeBadge /> : null}
                        </View>
                        <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 11.5, marginTop: 2 }}>{t("parent_hub.tiles.story-hub.sublabel")}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
                    </View>
                  </LinearGradient>
                </Pressable>
              </LockedBlock>
              </View>
            ),
          });
          allTiles.push({
            id: "art-craft",
            ageBands: HUB_CONTENT_AGE_BANDS["art-craft"],
            node: (
              <View style={tileW("art-craft")}>
              <LockedBlock
                reason="hub_art_craft"
                locked={hubUsage.isFeatureLocked("hub_art_craft")}
              >
              <Section
                id="art-craft"
                icon={<MaterialCommunityIcons name="palette" size={20} color="#fff" />}
                emoji="🖌️"
                accent={[brand.pink400, brand.purple500]}
                title={t("parent_hub.tiles.art-craft.title")}
                desc={t("parent_hub.tiles.art-craft.desc")}
                open={openSection === "art-craft"}
                onToggle={() => setOpenSection(s => s === "art-craft" ? null : "art-craft")}
                onOpen={() => hubUsage.markFeatureUsed("hub_art_craft")}
                tryFree={tryFreeFor("hub_art_craft")}
              >
                <ArtCraftReels />
              </Section>
              </LockedBlock>
              </View>
            ),
          });
          allTiles.push({
            id: "worksheets",
            ageBands: HUB_CONTENT_AGE_BANDS.worksheets,
            node: (
              <View style={tileW("worksheets")}>
              <LockedBlock
                reason="hub_worksheets"
                locked={hubUsage.isFeatureLocked("hub_worksheets")}
              >
              <Section
                id="worksheets"
                icon={<MaterialCommunityIcons name="file-document-outline" size={20} color="#fff" />}
                emoji="📄"
                accent={[palette.sky500, palette.indigo500]}
                title={t("parent_hub.tiles.worksheets.title")}
                desc={t("parent_hub.tiles.worksheets.desc")}
                open={openSection === "worksheets"}
                onToggle={() => setOpenSection(s => s === "worksheets" ? null : "worksheets")}
                onOpen={() => hubUsage.markFeatureUsed("hub_worksheets")}
                tryFree={tryFreeFor("hub_worksheets")}
              >
                <PrintableWorksheets />
              </Section>
              </LockedBlock>
              </View>
            ),
          });
          allTiles.push({
            id: "facts",
            ageBands: HUB_CONTENT_AGE_BANDS.facts,
            node: (
              <View style={tileW("facts")}>
              <LockedBlock
                reason="hub_facts"
                locked={hubUsage.isFeatureLocked("hub_facts")}
              >
              <Section
                id="facts"
                icon={<Ionicons name="sparkles" size={20} color="#fff" />}
                emoji="✨"
                accent={[palette.amber500, brand.rose400]}
                title={t("parent_hub.tiles.facts.title")}
                desc={t("parent_hub.tiles.facts.desc")}
                open={openSection === "facts"}
                onToggle={() => setOpenSection(s => s === "facts" ? null : "facts")}
                onOpen={() => hubUsage.markFeatureUsed("hub_facts")}
                tryFree={tryFreeFor("hub_facts")}
              >
                {effective ? (
                  <AmazingFacts ageMonths={effective.age * 12 + (effective.ageMonths ?? 0)} />
                ) : (
                  <Text style={styles.sectionLead}>{t("parent_hub.tiles.facts.empty")}</Text>
                )}
              </Section>
              </LockedBlock>
              </View>
            ),
          });
          if (effective && effective.age > 2 && effective.age <= 15) {
            allTiles.push({
              id: "life-skills",
              ageBands: HUB_CONTENT_AGE_BANDS["life-skills"],
              node: (
                <LockedBlock
                  reason="hub_locked"
                  locked={hubUsage.isFeatureLocked("hub_life_skills")}
                  style={tileW("life-skills")}
                >
                  <Section
                    id="life-skills"
                    icon={<Ionicons name="compass" size={20} color="#fff" />}
                    emoji="🧭"
                    accent={[palette.emerald500, palette.emerald400]}
                    title={t("parent_hub.tiles.life-skills.title")}
                    desc={t("parent_hub.tiles.life-skills.desc")}
                    open={openSection === "life-skills"}
                    onToggle={() => setOpenSection(s => s === "life-skills" ? null : "life-skills")}
                    onOpen={() => hubUsage.markFeatureUsed("hub_life_skills")}
                    tryFree={tryFreeFor("hub_life_skills")}
                  >
                    <LifeSkillsZone child={{ id: effective.id, name: effective.name, age: effective.age }} />
                  </Section>
                </LockedBlock>
              ),
            });
          }
          allTiles.push({
            id: "meal-suggestions",
            ageBands: HUB_CONTENT_AGE_BANDS["meal-suggestions"],
            node: (
              <View style={tileW("meal-suggestions")}>
              <LockedBlock
                reason="hub_locked"
                locked={hubUsage.isFeatureLocked("hub_ai_meal_generator")}
              >
              <Section
                id="meal-suggestions"
                icon={<MaterialCommunityIcons name="food" size={20} color="#fff" />}
                emoji="🍱"
                accent={[palette.emerald500, palette.lime500]}
                title={t("parent_hub.tiles.meal-suggestions.title")}
                desc={t("parent_hub.tiles.meal-suggestions.desc")}
                open={openSection === "meal-suggestions"}
                onToggle={() => setOpenSection(s => s === "meal-suggestions" ? null : "meal-suggestions")}
                onOpen={() => hubUsage.markFeatureUsed("hub_ai_meal_generator")}
                tryFree={tryFreeFor("hub_ai_meal_generator")}
              >
                <AiMealGenerator childAge={effective?.age} />
              </Section>
              </LockedBlock>
              </View>
            ),
          });
          allTiles.push({
            id: "smart-math-tricks",
            ageBands: HUB_CONTENT_AGE_BANDS["smart-math-tricks"],
            node: (
              <View style={tileW("smart-math-tricks")}>
              <LockedBlock
                reason="hub_locked"
                locked={hubUsage.isFeatureLocked("hub_smart_math_tricks")}
              >
              <Section
                id="smart-math-tricks"
                icon={<MaterialCommunityIcons name="calculator-variant" size={20} color="#fff" />}
                emoji="🧮"
                accent={[brand.violet600, palette.amber500]}
                title={t("parent_hub.tiles.smart-math-tricks.title")}
                desc={t("parent_hub.tiles.smart-math-tricks.desc")}
                open={openSection === "smart-math-tricks"}
                onToggle={() => setOpenSection(s => s === "smart-math-tricks" ? null : "smart-math-tricks")}
                onOpen={() => hubUsage.markFeatureUsed("hub_smart_math_tricks")}
                tryFree={tryFreeFor("hub_smart_math_tricks")}
              >
                {effective ? (
                  <SmartMathTricks childName={effective.name} childAgeYears={effective.age} />
                ) : (
                  <Text style={styles.sectionLead}>{t("parent_hub.tiles.smart-math-tricks.empty")}</Text>
                )}
              </Section>
              </LockedBlock>
              </View>
            ),
          });
          allTiles.push({
            id: "abacus",
            ageBands: HUB_CONTENT_AGE_BANDS["abacus"],
            node: (
              <View style={tileW("abacus")}>
              <LockedBlock
                reason="hub_locked"
                locked={hubUsage.isFeatureLocked("hub_abacus")}
              >
              <Section
                id="abacus"
                icon={<MaterialCommunityIcons name="abacus" size={20} color="#fff" />}
                emoji="🔢"
                accent={[palette.amber500, palette.rose500]}
                title={t("screens.tabs_hub.abacus_pro_zone")} // audit-ok: brand product name, intentional EN-only
                desc="Learn the soroban — beads, brain & speed math"
                open={openSection === "abacus"}
                onToggle={() => setOpenSection(s => s === "abacus" ? null : "abacus")}
                onOpen={() => hubUsage.markFeatureUsed("hub_abacus")}
                tryFree={tryFreeFor("hub_abacus")}
              >
                {effective ? (
                  <AbacusZone
                    childId={effective.id}
                    childName={effective.name}
                    ageYears={effective.age}
                  />
                ) : (
                  <Text style={styles.sectionLead}>Add a child to unlock the abacus zone.{/* audit-ok: empty-state copy, EN-only fallback */}</Text>
                )}
              </Section>
              </LockedBlock>
              </View>
            ),
          });
          allTiles.push({
            id: "coloring-books",
            ageBands: HUB_CONTENT_AGE_BANDS["coloring-books"],
            node: (
              <View style={tileW("coloring-books")}>
              <LockedBlock
                reason="hub_locked"
                locked={hubUsage.isFeatureLocked("hub_coloring_books")}
              >
              <Section
                id="coloring-books"
                icon={<MaterialCommunityIcons name="palette" size={20} color="#fff" />}
                emoji="🖍️"
                accent={[brand.pink500, palette.amber500]}
                title={t("parent_hub.tiles.coloring-books.title")}
                desc={t("parent_hub.tiles.coloring-books.desc")}
                open={openSection === "coloring-books"}
                onToggle={() => setOpenSection(s => s === "coloring-books" ? null : "coloring-books")}
                onOpen={() => hubUsage.markFeatureUsed("hub_coloring_books")}
                tryFree={tryFreeFor("hub_coloring_books")}
              >
                {effective ? (
                  <ColoringBooks childId={effective.id} childName={effective.name} />
                ) : (
                  <Text style={styles.sectionLead}>{t("parent_hub.tiles.coloring-books.empty")}</Text>
                )}
              </Section>
              </LockedBlock>
              </View>
            ),
          });
          allTiles.push({
            id: "fun-sheets",
            ageBands: HUB_CONTENT_AGE_BANDS["fun-sheets"],
            node: (
              <View style={tileW("fun-sheets")}>
              <LockedBlock
                reason="hub_locked"
                locked={hubUsage.isFeatureLocked("hub_fun_sheets")}
              >
              <Section
                id="fun-sheets"
                icon={<MaterialCommunityIcons name="file-document-edit" size={20} color="#fff" />}
                emoji="✏️"
                accent={[palette.teal600, palette.emerald500]}
                title={t("parent_hub.tiles.fun-sheets.title")}
                desc={t("parent_hub.tiles.fun-sheets.desc")}
                open={openSection === "fun-sheets"}
                onToggle={() => setOpenSection(s => s === "fun-sheets" ? null : "fun-sheets")}
                onOpen={() => hubUsage.markFeatureUsed("hub_fun_sheets")}
                tryFree={tryFreeFor("hub_fun_sheets")}
              >
                {effective ? (
                  <FunSheets childId={effective.id} childName={effective.name} />
                ) : (
                  <Text style={styles.sectionLead}>{t("parent_hub.tiles.fun-sheets.empty")}</Text>
                )}
              </Section>
              </LockedBlock>
              </View>
            ),
          });
          // ── Task #197 web-parity tiles ─────────────────────────────────
          // These three surfaces exist on web inside the kidschedule
          // dashboard (age-based-sections / daily-story-section /
          // daily-puzzle). On mobile we host them as Parent Hub tiles so
          // parents get the same content alongside their other modules.
          allTiles.push({
            id: "skills-focus",
            ageBands: HUB_CONTENT_AGE_BANDS["skills-focus"],
            node: (
              <View style={tileW("skills-focus")}>
                <LockedBlock
                  reason="hub_skills_focus"
                  locked={hubUsage.isFeatureLocked("hub_skills_focus")}
                >
                <Section
                  id="skills-focus"
                  icon={<Ionicons name="bulb" size={20} color="#fff" />}
                  emoji="🌟"
                  accent={[brand.purple500, brand.pink500]}
                  title={t("parent_hub.tiles.skills-focus.title")}
                  desc={t("parent_hub.tiles.skills-focus.desc")}
                  open={openSection === "skills-focus"}
                  onToggle={() => setOpenSection(s => s === "skills-focus" ? null : "skills-focus")}
                  onOpen={() => hubUsage.markFeatureUsed("hub_skills_focus")}
                  tryFree={tryFreeFor("hub_skills_focus")}
                >
                  <SkillsFocus
                    ageMonths={effective.age * 12 + (effective.ageMonths ?? 0)}
                  />
                </Section>
                </LockedBlock>
              </View>
            ),
          });
          allTiles.push({
            id: "daily-story",
            ageBands: HUB_CONTENT_AGE_BANDS["daily-story"],
            node: (
              <View style={tileW("daily-story")}>
                <LockedBlock
                  reason="hub_daily_story"
                  locked={hubUsage.isFeatureLocked("hub_daily_story")}
                >
                <Section
                  id="daily-story"
                  icon={<Ionicons name="book" size={20} color="#fff" />}
                  emoji="📖"
                  accent={[palette.amber500, brand.pink400]}
                  title={t("parent_hub.tiles.daily-story.title")}
                  desc={t("parent_hub.tiles.daily-story.desc")}
                  open={openSection === "daily-story"}
                  onToggle={() => setOpenSection(s => s === "daily-story" ? null : "daily-story")}
                  onOpen={() => hubUsage.markFeatureUsed("hub_daily_story")}
                  tryFree={tryFreeFor("hub_daily_story")}
                >
                  <DailyStory
                    ageMonths={effective.age * 12 + (effective.ageMonths ?? 0)}
                  />
                </Section>
                </LockedBlock>
              </View>
            ),
          });
          allTiles.push({
            id: "daily-puzzle",
            ageBands: HUB_CONTENT_AGE_BANDS["daily-puzzle"],
            node: (
              <View style={tileW("daily-puzzle")}>
                <LockedBlock
                  reason="hub_daily_puzzle"
                  locked={hubUsage.isFeatureLocked("hub_daily_puzzle")}
                >
                <Section
                  id="daily-puzzle"
                  icon={<Ionicons name="extension-puzzle" size={20} color="#fff" />}
                  emoji="🧩"
                  accent={[palette.indigo500, brand.purple500]}
                  title={t("parent_hub.tiles.daily-puzzle.title")}
                  desc={t("parent_hub.tiles.daily-puzzle.desc")}
                  open={openSection === "daily-puzzle"}
                  onToggle={() => setOpenSection(s => s === "daily-puzzle" ? null : "daily-puzzle")}
                  onOpen={() => hubUsage.markFeatureUsed("hub_daily_puzzle")}
                  tryFree={tryFreeFor("hub_daily_puzzle")}
                >
                  <DailyPuzzle
                    ageMonths={effective.age * 12 + (effective.ageMonths ?? 0)}
                    childName={effective.name}
                    childId={effective.id}
                  />
                </Section>
                </LockedBlock>
              </View>
            ),
          });

            // Enrich tiles with age-month bounds from the central HUB_TILE_AGE_MONTHS
            // map so the partition helper can apply the same per-tile gating that
            // the website does (e.g. phonics min=12mo / max=72mo). Tiles without
            // a bound entry stay unrestricted and rely solely on band membership.
            const enrichedTiles: Tile[] = allTiles.map(t => {
              const meta = HUB_TILE_AGE_MONTHS[t.id];
              return meta ? { ...t, ageMonthsMin: meta.min, ageMonthsMax: meta.max } : t;
            });
            const childAgeMonths = effective.age * 12 + (effective.ageMonths ?? 0);

            // Partition tiles into the two age-band sections via the pure
            // helper in ./hub-bands so the rule lives in one tested place.
            // A tile lives in Section 1 when its ageBands include the child's
            // current band. Section 2 is strictly forward-looking: a tile
            // only enters Section 2 when it has at least one *future* band
            // (> currentBand). Tiles whose bands are all in the past are
            // intentionally hidden — Explore is for "what's coming next",
            // not catch-up content.
            const {
              section1,
              section2,
              groupsByFutureBand: groupsMap,
              orderedFutureBands: orderedBands,
              nearestFutureBand,
              isLatestStage,
            } = partitionTilesByBand(enrichedTiles, currentBand, childAgeMonths);

            // Capture render snapshot for HubDebugOverlay (dev-only diff aid).
            debugSnapshot.section1Ids = [
              ...debugFeaturedIds,
              ...section1.map(t => t.id),
            ];
            debugSnapshot.section2Ids = section2.map(t => t.id);
            const showExploreNext =
              currentBand === 0 && showExplore && !isLatestStage;
            debugSnapshot.showsSection2 = showExploreNext;

            return (
              <ScrollView
                ref={mainScrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={[styles.pageContent, { paddingBottom: insets.bottom + 20 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Today's Plan — inline at the top of the single scroll */}
                <TodayPlanInline
                  childId={effective.id}
                  childName={childName}
                  ageMonths={childAgeMonths}
                  styles={styles}
                  showTodayPlanBadge={tryFreeFor("hub_today_plan")}
                  showParentTasksBadge={tryFreeFor("hub_parent_tasks")}
                  onGenerate={() => router.push("/routines/generate" as never)}
                  onContinue={onContinueFromTodayPlan}
                />

                {/* Featured tiles */}
                <View style={[styles.sectionsGrid, { marginTop: 8 }]}>
                  <View style={{ position: "relative" }}>
                    <HubTile featured testID="hub-tile-command-center">
                      <ParentCommandCenter child={{ id: effective.id, name: effective.name, age: effective.age }} />
                    </HubTile>
                    {tryFreeFor("hub_command_center") ? (
                      <View style={styles.tileBadgeOverlay} pointerEvents="none">
                        <TryFreeBadge />
                      </View>
                    ) : null}
                  </View>
                  {renderInfantHub() !== null && (
                    <View style={{ position: "relative" }}>
                      <HubTile featured testID="hub-tile-infant-hub">
                        {renderInfantHub()}
                      </HubTile>
                      {tryFreeFor("hub_infant_hub") ? (
                        <View style={styles.tileBadgeOverlay} pointerEvents="none">
                          <TryFreeBadge />
                        </View>
                      ) : null}
                    </View>
                  )}
                  <View style={{ position: "relative" }}>
                    <HubTile featured testID="hub-tile-tomorrow-forecast">
                      <FuturePredictor childId={effective.id} />
                    </HubTile>
                    {tryFreeFor("hub_tomorrow_forecast") ? (
                      <View style={styles.tileBadgeOverlay} pointerEvents="none">
                        <TryFreeBadge />
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Band tiles in web-matching order */}
                {section1.length > 0 && (
                  <View style={[styles.sectionsGrid, { marginTop: 8 }]}>
                    {section1.map((t) => (
                      <View
                        key={t.id}
                        style={styles.tileMeasureWrap}
                        onLayout={(e) => {
                          tileYRef.current[t.id] = e.nativeEvent.layout.y;
                        }}
                      >
                        <HubTile
                          testID={`hub-tile-${t.id}`}
                          highlighted={highlightedTileId === t.id}
                        >
                          {t.node}
                        </HubTile>
                      </View>
                    ))}
                  </View>
                )}

                {/* Explore Next Stage */}
                {showExploreNext && (
                  <ExploreNextStageBlock
                    childName={childName}
                    currentBand={currentBand}
                    previewBand={previewBand}
                    orderedBands={orderedBands}
                    groupsMap={groupsMap}
                    nearestFutureBand={nearestFutureBand}
                    onChipPress={handleBandChipPress}
                    groupRefs={groupRefs}
                    styles={styles}
                  />
                )}
              </ScrollView>
            );
          })()}

      {/* Dev-only floating debug overlay — shows mobile-vs-web tile diff
          for the active child. Mounted as ScrollView sibling so it floats
          over content. Reads debugSnapshot which the IIFE above populates
          synchronously during this same render pass. */}
      {(__DEV__ || debugMode) && effective && (
        <HubDebugOverlay
          mobileSection1Ids={debugSnapshot.section1Ids}
          mobileSection2Ids={debugSnapshot.section2Ids}
          mobileShowsSection2={debugSnapshot.showsSection2}
          currentBand={currentBand}
          ageMonths={effective.age * 12 + (effective.ageMonths ?? 0)}
          childName={childName}
          devMode={debugMode}
        />
      )}
    </LinearGradient>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hub helper components
// ─────────────────────────────────────────────────────────────────────────────

type HubStyles = ReturnType<typeof makeStyles>;

function TodayPlanInline({
  childId,
  childName,
  ageMonths,
  styles,
  onGenerate,
  onContinue,
  showTodayPlanBadge,
  showParentTasksBadge,
}: {
  showTodayPlanBadge?: boolean;
  showParentTasksBadge?: boolean;
  childId: number;
  childName: string;
  ageMonths: number;
  styles: HubStyles;
  onGenerate: () => void;
  onContinue?: (tileId: string) => void;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const { tasks, todaysRoutine, isLoading, onToggle, taskIdToItemIndex } =
    useTodayRoutine();

  const onPressCard = useCallback(
    (taskId: string) => {
      if (!todaysRoutine) return;
      const idx = taskIdToItemIndex(taskId);
      const params: Record<string, string> = {};
      if (idx != null) params.highlight = String(idx);
      router.push({
        pathname: "/routines/[id]",
        params: { id: String(todaysRoutine.id), ...params },
      });
    },
    [todaysRoutine, taskIdToItemIndex, router],
  );

  const onContinueTask = useCallback(
    (taskId: string) => {
      if (!onContinue) return;
      const task = tasks.find((task) => task.id === taskId);
      if (task?.relatedTileId) onContinue(task.relatedTileId);
    },
    [tasks, onContinue],
  );

  const heading = t("parent_hub.sections_meta.today.heading");
  const description = t("parent_hub.sections_meta.today.description");

  return (
    <View>
      <View style={styles.bandSectionHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text style={styles.bandSectionTitle}>{heading}</Text>
          {showTodayPlanBadge ? <TryFreeBadge /> : null}
        </View>
        <Text style={styles.bandSectionSub}>
          {childName ? `${childName} · ${description}` : description}
        </Text>
      </View>

      {isLoading ? (
        <View style={{ paddingVertical: 32, alignItems: "center" }}>
          <ActivityIndicator color={ACCENT_PINK} />
        </View>
      ) : tasks.length > 0 ? (
        <RoutineCarousel
          tasks={tasks}
          onToggle={onToggle}
          onPressCard={onPressCard}
          onContinue={onContinue ? onContinueTask : undefined}
        />
      ) : (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="calendar-outline" size={40} color={ACCENT_PINK} />
          <Text style={styles.emptyTitle}>{t("parent_hub.shell.today_empty.title")}</Text>
          <Text style={styles.emptyDesc}>{t("parent_hub.shell.today_empty.desc")}</Text>
          <Pressable onPress={onGenerate} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>{t("parent_hub.shell.today_empty.cta")}</Text>
          </Pressable>
        </View>
      )}

      {showParentTasksBadge ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
          <TryFreeBadge />
        </View>
      ) : null}
      <ParentTasks childId={childId} ageMonths={ageMonths} childName={childName} />

      {tasks.length > 0 && (
        <Pressable onPress={onGenerate} style={styles.bottomCta}>
          <Ionicons name="calendar" size={16} color={ACCENT_PINK} />
          <Text style={styles.bottomCtaText}>{t("parent_hub.shell.today_regen")}</Text>
        </Pressable>
      )}
    </View>
  );
}

function ExploreNextStageBlock({
  childName,
  currentBand,
  previewBand,
  orderedBands,
  groupsMap,
  nearestFutureBand,
  onChipPress,
  groupRefs,
  styles,
}: {
  childName: string;
  currentBand: number;
  previewBand: number | null;
  orderedBands: readonly number[];
  groupsMap: Map<number, { id: string; node: React.ReactNode }[]>;
  nearestFutureBand: number | null;
  onChipPress: (band: number) => void;
  groupRefs: React.MutableRefObject<Record<number, View | null>>;
  styles: HubStyles;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.exploreSection}>
      <View style={styles.bandSectionHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text style={styles.eyebrow}>{t("parent_hub.headers.section2_next")}</Text>
          {nearestFutureBand !== null && (
            <View style={styles.bandBadgePill}>
              <Text style={styles.bandBadgePillText}>{HUB_AGE_BANDS[nearestFutureBand].label}</Text>
            </View>
          )}
        </View>
        <Text style={styles.bandSectionTitle}>{t("parent_hub.headers.explore_next", { name: childName })}</Text>
        <Text style={styles.bandSectionSub}>
          {previewBand !== null
            ? t("parent_hub.headers.previewing_age", { label: HUB_AGE_BANDS[previewBand].label })
            : t("parent_hub.headers.explore_blurb", { name: childName })}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bandPillRow}
      >
        {[currentBand, ...orderedBands].map((band) => {
          const isCurrent = band === currentBand;
          const isPreviewing = previewBand === band;
          const isDefault = previewBand === null && isCurrent;
          return (
            <Pressable
              key={`band-pill-${band}`}
              onPress={() => onChipPress(band)}
              style={[
                styles.bandPill,
                isCurrent && styles.bandPillCurrent,
                isPreviewing && !isCurrent && styles.bandPillPreview,
                isDefault && styles.bandPillCurrentActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isCurrent
                  ? t("parent_hub.headers.aria_current_band", { label: HUB_AGE_BANDS[band].label })
                  : t("parent_hub.headers.aria_preview_band", { label: HUB_AGE_BANDS[band].label })
              }
              accessibilityState={{ selected: isPreviewing || isDefault }}
            >
              <Text
                style={[
                  styles.bandPillText,
                  isCurrent && styles.bandPillTextCurrent,
                  isPreviewing && !isCurrent && styles.bandPillTextPreview,
                ]}
              >
                {HUB_AGE_BANDS[band].label}
                {isCurrent ? t("parent_hub.headers.now_pill") : ""}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {orderedBands.map((band) => {
        const isPreviewed = previewBand === band;
        return (
          <View
            key={band}
            ref={(node) => {
              groupRefs.current[band] = node;
            }}
            style={styles.exploreGroup}
          >
            <View style={styles.exploreGroupHeader}>
              <Text style={styles.exploreGroupTitle}>
                {t("parent_hub.headers.for_age_band", { label: HUB_AGE_BANDS[band].label })}
              </Text>
              {isPreviewed && (
                <View style={styles.previewingPill}>
                  <Text style={styles.previewingText}>{t("parent_hub.headers.previewing")}</Text>
                </View>
              )}
              {!isPreviewed && band === nearestFutureBand && (
                <View style={styles.comingNextPill}>
                  <Text style={styles.comingNextText}>{t("parent_hub.headers.coming_next")}</Text>
                </View>
              )}
            </View>
            <View style={styles.exploreGroupBody}>
              <View style={[styles.sectionsGrid, !isPreviewed && styles.exploreDimmed]}>
                {(groupsMap.get(band) ?? []).map((t) => (
                  <React.Fragment key={t.id}>{t.node}</React.Fragment>
                ))}
              </View>
              {!isPreviewed && (
                <View pointerEvents="none" style={styles.exploreOverlay} />
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Section({
  id, icon, emoji, accent: _accent, title, desc, open, onToggle, onOpen, tryFree = false, children,
}: {
  id: string;
  icon: React.ReactNode;
  /** Optional emoji rendered inside the gradient icon box. When provided,
   *  it replaces the `icon` prop entirely. Used to make every tile
   *  visually distinct and avoid blank squares on platforms where the
   *  vector-icons font fails to load (e.g. some Android WebView builds). */
  emoji?: string;
  /** Accent gradient kept in the prop signature for caller compatibility.
   *  The icon box now uses a flat muted glass background (web-parity) so
   *  this value is intentionally unused in the render output. */
  accent: [string, string];
  title: string;
  desc: string;
  open: boolean;
  onToggle: () => void;
  onOpen?: () => void;
  /** Show "Try Free" badge in header (first-time-free features). */
  tryFree?: boolean;
  children: React.ReactNode;
}) {
  const c = useColors();
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(c, mode), [c, mode]);
  const handlePress = () => {
    LayoutAnimation.configureNext({
      duration: 240,
      create: { type: "easeInEaseOut", property: "opacity" },
      update: { type: "easeInEaseOut" },
      delete: { type: "easeInEaseOut", property: "opacity" },
    });
    if (!open) onOpen?.();
    onToggle();
  };
  return (
    <View style={[styles.section, open && styles.sectionOpen]}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.sectionHeader, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <View style={styles.sectionIcon}>
          {emoji ? <Text style={{ fontSize: 24 }}>{emoji}</Text> : icon}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {tryFree ? <TryFreeBadge /> : null}
          </View>
          <Text style={styles.sectionDesc}>{desc}</Text>
        </View>
        <View style={[styles.chevWrap, open && styles.chevWrapOpen]}>
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={14}
            color={open ? brand.primary : (mode === "light" ? c.textBody : "rgba(255,255,255,0.65)")}
          />
        </View>
      </Pressable>
      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>, mode: "light" | "dark") {
  const isLight = mode === "light";
  // Glass surfaces: semi-transparent on dark gradient, soft white on light gradient.
  const glassBg = isLight ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.05)";
  const glassBgOpen = isLight ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.07)";
  const glassBgSoft = isLight ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.04)";
  const glassBorder = isLight ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.10)";
  const innerDivider = isLight ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.08)";

  return StyleSheet.create({
    headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    sectionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "flex-start" },
    // Wrapper around each tile so we can capture its y-offset via onLayout
    // for the Today's Plan quick-jump scroll-into-view (Task #191). Width // audit-ok: task ref, not a hex color
    // mirrors the single-column 100% layout used by the bucket tiles.
    tileMeasureWrap: { width: "100%" },
    tileBadgeOverlay: { position: "absolute", top: 12, right: 12, zIndex: 10 },
    logo: { width: 40, height: 40, borderRadius: 10 },
    eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
    eyebrow: {
      fontSize: 10.5,
      fontWeight: "800",
      letterSpacing: 1.4,
      color: brand.purple500,
    },
    title: { color: c.foreground, fontSize: 24, fontWeight: "800", letterSpacing: -0.4 },
    subtitle: { color: c.textMuted, fontSize: 12, marginTop: 2 },
    askAmyBtn: { borderRadius: 999, overflow: "hidden" },
    askAmyGrad: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
    askAmyText: { color: "#fff", fontWeight: "700", fontSize: 12 },

    emptyCard: {
      padding: 24, borderRadius: 24, alignItems: "center", gap: 10,
      backgroundColor: glassBg, borderWidth: 1, borderColor: glassBorder,
    },
    emptyTitle: { color: c.foreground, fontWeight: "800", fontSize: 16 },
    emptyDesc: { color: c.textMuted, textAlign: "center", fontSize: 13 },
    primaryBtn: { backgroundColor: brand.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999, marginTop: 8 },
    primaryBtnText: { color: "#fff", fontWeight: "700" },

    // ── Child selector rich avatar cards (web ChildSelectorPanel parity) ──────
    childSelectorWrap: {
      borderRadius: 16, overflow: "hidden",
      backgroundColor: glassBg, borderWidth: 1, borderColor: glassBorder,
    },
    childSelectorHeader: {
      flexDirection: "row", alignItems: "center", gap: 6,
      paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4,
    },
    childSelectorLabel: {
      color: c.textMuted, fontSize: 10, fontWeight: "800",
      letterSpacing: 0.9, textTransform: "uppercase",
    },
    childSelectorRow: {
      flexDirection: "row", gap: 10,
      paddingHorizontal: 12, paddingBottom: 12, paddingTop: 2,
    },
    childCard: {
      minWidth: 84, alignItems: "center", gap: 5,
      paddingHorizontal: 10, paddingVertical: 10, borderRadius: 14,
      backgroundColor: isLight ? "rgba(255,255,255,0.50)" : "rgba(255,255,255,0.03)",
      borderWidth: 2, borderColor: glassBorder,
      position: "relative",
    },
    childCardSel: {
      backgroundColor: brandAlpha.purple500_10,
      borderColor: brand.primary,
      shadowColor: brand.purple500,
      shadowOpacity: isLight ? 0.22 : 0.38,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    childCardCheck: { position: "absolute", top: 5, right: 5 },
    childAvatar: {
      width: 48, height: 48, borderRadius: 24,
      alignItems: "center", justifyContent: "center",
    },
    childAvatarSel: {
      shadowColor: brand.primary,
      shadowOpacity: 0.40,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
    },
    childAvatarText: { color: "#fff", fontWeight: "800", fontSize: 16, letterSpacing: -0.3 },
    childCardInfo: { alignItems: "center", gap: 1 },
    childCardName: { color: c.foreground, fontWeight: "700", fontSize: 12, textAlign: "center" },
    childCardNameSel: { color: brand.primary },
    childCardAge: { color: c.textMuted, fontSize: 10, textAlign: "center" },
    viewingChip: {
      paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
      backgroundColor: brandAlpha.purple500_15,
    },
    viewingChipText: {
      color: brand.primary, fontSize: 8, fontWeight: "800",
      letterSpacing: 0.8, textTransform: "uppercase",
    },

    // ── Dev badge on logo (7-tap toggle) ────────────────────────────────────
    devBadge: {
      position: "absolute", bottom: -4, right: -4,
      backgroundColor: brand.rose400,
      paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6,
    },
    devBadgeText: { color: "#fff", fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },

    agePillRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    agePill: {
      backgroundColor: isLight ? "rgba(217,119,6,0.10)" : brandAlpha.amber400_12,
      borderWidth: 1,
      borderColor: isLight ? "rgba(217,119,6,0.30)" : brandAlpha.amber400_40,
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    },
    personalised: { color: c.textMuted, fontSize: 12 },

    section: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: glassBorder,
      backgroundColor: glassBg,
      overflow: "hidden",
      shadowColor: brand.primary,
      shadowOpacity: isLight ? 0.10 : 0.18,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    sectionOpen: {
      borderColor: isLight ? brandAlpha.purple500_60 : brandAlpha.purple500_40,
      backgroundColor: glassBgOpen,
      shadowColor: brand.purple500,
      shadowOpacity: isLight ? 0.25 : 0.45,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
    sectionIcon: {
      width: 44, height: 44, borderRadius: 14,
      alignItems: "center", justifyContent: "center",
      backgroundColor: isLight ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.08)",
      borderWidth: 1,
      borderColor: isLight ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.12)",
    },
    sectionTitle: { color: c.foreground, fontWeight: "800", fontSize: 15 },
    sectionDesc: { color: c.textMuted, fontSize: 11, marginTop: 2 },
    sectionBody: {
      padding: 14, paddingTop: 8,
      borderTopWidth: 1, borderTopColor: innerDivider,
      backgroundColor: glassBgSoft,
      gap: 10,
    },
    chevWrap: {
      width: 26, height: 26, borderRadius: 13,
      alignItems: "center", justifyContent: "center",
      borderWidth: 1, borderColor: glassBorder,
      backgroundColor: glassBgSoft,
    },
    chevWrapOpen: { borderColor: brandAlpha.purple500_60, backgroundColor: brandAlpha.purple500_15 },
    sectionLead: { color: c.textBody, fontSize: 13 },

    promptsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    promptChip: {
      flexDirection: "row", alignItems: "center", gap: 8,
      paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14,
      backgroundColor: glassBg, borderWidth: 1, borderColor: glassBorder,
      flexBasis: "48%", flexGrow: 1,
    },
    promptLabel: { color: c.foreground, fontWeight: "600", fontSize: 12 },
    askAmyFull: {
      marginTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      paddingVertical: 12, borderRadius: 14, backgroundColor: "rgba(123,63,242,0.25)",
      borderWidth: 1, borderColor: "rgba(255,78,205,0.4)",
    },
    askAmyFullText: { color: "#fff", fontWeight: "700", flex: 1, textAlign: "center" },

    articleList: { gap: 6 },
    articleItem: {
      flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12,
      backgroundColor: glassBgSoft, borderWidth: 1, borderColor: glassBorder,
    },
    articleTitle: { color: c.foreground, flex: 1, fontWeight: "600", fontSize: 13 },

    tipsList: { gap: 8 },
    tipCard: {
      flexDirection: "row", gap: 10, padding: 12, borderRadius: 12,
      backgroundColor: "rgba(167,139,250,0.10)",
      borderWidth: 1, borderColor: "rgba(167,139,250,0.25)",
    },
    tipNum: { color: ACCENT_PINK, fontWeight: "800", fontSize: 16 },
    tipText: { color: c.foreground, flex: 1, fontSize: 13, lineHeight: 18 },

    emotionalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    emoCard: {
      padding: 12, borderRadius: 14, gap: 4, flexBasis: "48%", flexGrow: 1,
      backgroundColor: "rgba(244,114,182,0.10)", borderWidth: 1, borderColor: "rgba(244,114,182,0.25)",
    },
    emoTitle: { color: c.foreground, fontWeight: "700", fontSize: 13 },

    activityRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    activityCard: {
      paddingHorizontal: 18, paddingVertical: 14, borderRadius: 12,
      backgroundColor: brandAlpha.rose400_18, borderWidth: 1, borderColor: brandAlpha.rose400_30,
    },

    bottomCta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 },
    bottomCtaText: { color: brand.primary, fontWeight: "700" },

    bandBadgePill: {
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1,
      borderColor: isLight ? "rgba(15,23,42,0.15)" : "rgba(255,255,255,0.20)",
      backgroundColor: isLight ? "rgba(15,23,42,0.05)" : "rgba(255,255,255,0.08)",
    },
    bandBadgePillText: { color: c.textMuted, fontSize: 10, fontWeight: "600" },

    // 2-section age-band layout: section/group headers and Explore styling.
    bandSectionHeader: { gap: 4, marginTop: 4, marginBottom: 8 },
    bandSectionTitle: { color: c.foreground, fontSize: 18, fontWeight: "800", letterSpacing: -0.2 },
    bandSectionSub: { color: c.textMuted, fontSize: 12 },

    exploreSection: { gap: 14, marginTop: 8 },
    exploreGroup: { gap: 8 },
    exploreGroupHeader: {
      flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap",
      paddingHorizontal: 4,
    },
    exploreGroupTitle: { color: c.foreground, fontSize: 14, fontWeight: "800" },
    comingNextPill: {
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
      backgroundColor: "rgba(255,78,205,0.18)",
      borderWidth: 1, borderColor: "rgba(255,78,205,0.5)",
    },
    comingNextText: {
      color: ACCENT_PINK, fontSize: 10, fontWeight: "800",
      letterSpacing: 0.5, textTransform: "uppercase",
    },
    previewingPill: {
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
      backgroundColor: isLight ? "rgba(217,119,6,0.12)" : brandAlpha.amber400_18,
      borderWidth: 1,
      borderColor: isLight ? "rgba(217,119,6,0.45)" : brandAlpha.amber400_55,
    },
    previewingText: {
      color: isLight ? palette.amber700 : brand.amber400,
      fontSize: 10, fontWeight: "800",
      letterSpacing: 0.5, textTransform: "uppercase",
    },

    // Band switcher pills above the Explore groups (Task 108)
    bandPillRow: { flexDirection: "row", gap: 8, paddingVertical: 4, paddingHorizontal: 2 },
    bandPill: {
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
      backgroundColor: glassBg,
      borderWidth: 1, borderColor: glassBorder,
    },
    bandPillCurrent: {
      backgroundColor: isLight ? "rgba(217,119,6,0.10)" : brandAlpha.amber400_14,
      borderColor: isLight ? "rgba(217,119,6,0.40)" : brandAlpha.amber400_55,
    },
    bandPillCurrentActive: {
      backgroundColor: isLight ? "rgba(217,119,6,0.18)" : brandAlpha.amber400_22,
      borderColor: isLight ? "rgba(217,119,6,0.65)" : brandAlpha.amber400_85,
    },
    bandPillPreview: {
      backgroundColor: "rgba(255,78,205,0.18)",
      borderColor: "rgba(255,78,205,0.65)",
    },
    bandPillText: { color: c.foreground, fontSize: 12, fontWeight: "700" },
    bandPillTextCurrent: { color: isLight ? palette.amber700 : brand.amber400 },
    bandPillTextPreview: { color: ACCENT_PINK },

    exploreGroupBody: { position: "relative" },
    exploreDimmed: { opacity: 0.6 },
    exploreOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isLight ? "rgba(15,23,42,0.04)" : "rgba(0,0,0,0.18)",
      borderRadius: 16,
    },

    pageContent: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 140,
      gap: 12,
      flexGrow: 1,
    },
  });
}
