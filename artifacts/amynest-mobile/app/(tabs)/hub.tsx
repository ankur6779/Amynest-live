import React, {  useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator,
  Image, Platform, LayoutAnimation, UIManager, FlatList, useWindowDimensions,
  Animated,
  type NativeSyntheticEvent, type NativeScrollEvent,
} from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// `findNodeHandle` was used by the previous (single ScrollView) layout to
// scroll the Explore Next Stage group into view; the swipe-pager layout
// gives each section its own ScrollView so the helper is no longer
// needed. The import is intentionally dropped along with `scrollToBand`.
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { SmartMathTricks } from "@/components/SmartMathTricks";
import { ColoringBooks } from "@/components/ColoringBooks";
import { FunSheets } from "@/components/FunSheets";
import { HubDebugOverlay } from "@/components/HubDebugOverlay";
import { HubTile } from "@/components/HubTile";
import RoutineCarousel from "@/components/RoutineCarousel";
import { useTodayRoutine } from "@/hooks/useTodayRoutine";
import { isInfantHubAge } from "@workspace/infant-hub";
import { HUB_AGE_BANDS, getAgeBand, HUB_CONTENT_AGE_BANDS, HUB_TILE_AGE_MONTHS, partitionTilesByBand } from "./hub-bands";
export { HUB_AGE_BANDS, getAgeBand, HUB_CONTENT_AGE_BANDS, HUB_TILE_AGE_MONTHS, partitionTilesByBand };
import {
  SECTION_KEYS,
  SECTION_META,
  bucketTilesBySection,
  isFeaturedTile,
  type SectionKey,
} from "./hub-sections";
import { useProfileComplete } from "@/hooks/useProfileComplete";
import { useFeatureUsage } from "@/hooks/useFeatureUsage";
import LockedBlock from "@/components/LockedBlock";
import TryFreeBadge from "@/components/TryFreeBadge";
import { ProfileLockScreen } from "@/components/ProfileLockScreen";
import colors, { brand, brandAlpha, ACCENT_PINK, palette } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";

const SECTION_STORAGE_PREFIX = "hub.lastSection.v1";

const LOGO = require("../../assets/images/amynest-logo.png");

type Child = { id: number; name: string; age: number; ageMonths?: number };

const AMY_PROMPTS = [
  { emoji: "😴", label: "Sleep problems", prompt: "My child is having trouble sleeping. What should I do?" },
  { emoji: "😤", label: "Tantrums",       prompt: "My child is having frequent tantrums. How should I handle this?" },
  { emoji: "🥦", label: "Picky eating",   prompt: "My child is a picky eater. What strategies can help?" },
  { emoji: "📚", label: "School anxiety", prompt: "My child is anxious about going to school. How can I help?" },
  { emoji: "📱", label: "Screen time",    prompt: "How much screen time is appropriate?" },
  { emoji: "💬", label: "Language",       prompt: "How can I support my child's language development?" },
];

const EMOTIONAL = [
  { emoji: "🫂", title: "I'm feeling overwhelmed",    prompt: "I'm feeling completely overwhelmed as a parent. What can I do?" },
  { emoji: "😰", title: "My child seems anxious",     prompt: "My child seems anxious and worried a lot. How can I help?" },
  { emoji: "😔", title: "We're struggling to connect", prompt: "I feel like my child and I aren't connecting. How can we build a stronger bond?" },
  { emoji: "😮‍💨", title: "I need a parenting break", prompt: "I'm a parent who needs time for myself. How do I take care of my wellbeing?" },
];

function ageGroup(age: number, months = 0): { label: string; emoji: string } {
  const total = age * 12 + months;
  if (total < 12) return { label: "Infant", emoji: "👶" };
  if (total < 36) return { label: "Toddler", emoji: "🧒" };
  if (total < 60) return { label: "Preschool", emoji: "🎨" };
  if (total < 144) return { label: "School age", emoji: "📚" };
  return { label: "Teen", emoji: "🎒" };
}

// 2-section Parent Hub age band system: HUB_AGE_BANDS / getAgeBand /
// HUB_CONTENT_AGE_BANDS are defined in ./hub-bands so they can be unit-tested
// without loading this whole component file. Re-exported above for callers.

// Animated FlatList lets us pipe `onScroll` straight into an Animated.Value
// using `useNativeDriver` so the tab indicator and per-page fade follow the
// finger in real time without bouncing through the JS thread on each frame.
const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList as React.ComponentType<React.ComponentProps<typeof FlatList<SectionKey>>>,
);

export default function HubScreen() {
  const { profileComplete, isLoading: profileLoading } = useProfileComplete();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const { theme, mode } = useTheme();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c, mode), [c, mode]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [openSection, setOpenSection] = useState<string | null>("amy");
  // Lazy-load Section 2 ("Explore") so the primary band content paints first.
  // Reset on child switch so the deferred render happens fresh per child.
  const [showExplore, setShowExplore] = useState(false);
  // Quick band switcher (Task #108): when set to a future band, that group is // audit-ok: task ref not hex
  // shown in full opacity (un-dimmed) and we scroll to it. Tapping the current
  // band chip clears it and returns to the default 2-section view.
  const [previewBand, setPreviewBand] = useState<number | null>(null);
  const groupRefs = useRef<Record<number, View | null>>({});

  // Horizontal section pager (Today / Zones / Modules / Activities) ----------
  const { width: windowWidth } = useWindowDimensions();
  // FlatList page width — defaults to window width minus the surrounding
  // gradient padding (16px each side). We never read this until the FlatList
  // mounts, so the default is fine for the first frame.
  const pageWidth = Math.max(0, windowWidth);
  const pagerRef = useRef<FlatList<SectionKey>>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>("today");
  // Live horizontal scroll offset (Animated.Value) — drives both the
  // tab-bar indicator translateX and the per-page opacity fade so the
  // tab UI tracks the swipe in real time, not just on momentum end.
  const scrollX = useRef(new Animated.Value(0)).current;

  // Mount only the sections within 1 page of the active page, so heavy
  // modules (LocationModule, ColoringBooks, etc.) unmount when swiped
  // far away. Today's Plan is special-cased to always stay mounted so
  // the routine cache is warm whenever we swipe back.
  const mountedSections = useMemo<Set<SectionKey>>(() => {
    const idx = SECTION_KEYS.indexOf(activeSection);
    const set = new Set<SectionKey>(["today"]);
    set.add(activeSection);
    if (idx > 0) set.add(SECTION_KEYS[idx - 1]);
    if (idx < SECTION_KEYS.length - 1) set.add(SECTION_KEYS[idx + 1]);
    return set;
  }, [activeSection]);

  const goToSection = useCallback(
    (key: SectionKey, animated = true) => {
      const idx = SECTION_KEYS.indexOf(key);
      if (idx < 0) return;
      setActiveSection(key);
      pagerRef.current?.scrollToOffset({
        offset: idx * pageWidth,
        animated,
      });
    },
    [pageWidth],
  );

  const onPagerScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (pageWidth === 0) return;
      const idx = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
      const next = SECTION_KEYS[Math.max(0, Math.min(SECTION_KEYS.length - 1, idx))];
      if (next && next !== activeSection) setActiveSection(next);
    },
    [pageWidth, activeSection],
  );

  // Animated.event needs a stable handler — wrap once and reuse.
  const onPagerScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: true },
      ),
    [scrollX],
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

  const grp = effective ? ageGroup(effective.age, effective.ageMonths ?? 0) : null;
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

  // Hydrate the active section from AsyncStorage when the active child
  // changes. Each child gets its own remembered tab so switching kids
  // doesn't clobber the parent's place in another child's hub.
  useEffect(() => {
    if (!effective) return;
    const key = `${SECTION_STORAGE_PREFIX}.${effective.id}`;
    let cancelled = false;
    AsyncStorage.getItem(key)
      .then((stored) => {
        if (cancelled || !stored) return;
        if (!(SECTION_KEYS as readonly string[]).includes(stored)) return;
        const sk = stored as SectionKey;
        setActiveSection(sk);
        const idx = SECTION_KEYS.indexOf(sk);
        requestAnimationFrame(() => {
          pagerRef.current?.scrollToOffset({
            offset: idx * pageWidth,
            animated: false,
          });
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effective?.id]);

  // Persist the active section per-child so a user returning to the hub
  // lands on the same page. Fire-and-forget; we don't block render.
  useEffect(() => {
    if (!effective) return;
    AsyncStorage.setItem(
      `${SECTION_STORAGE_PREFIX}.${effective.id}`,
      activeSection,
    ).catch(() => {});
  }, [activeSection, effective?.id]);

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
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <View style={styles.eyebrowRow}>
              <Ionicons name="sparkles" size={11} color={brand.purple500} />
              <Text style={styles.eyebrow}>EXPERT-CURATED</Text>
            </View>
            <Text style={styles.title}>Parenting Hub</Text>
            <Text style={styles.subtitle}>Swipe between sections</Text>
          </View>
          <Pressable
            onPress={() => router.push("/amy-ai")}
            style={styles.askAmyBtn}
          >
            <LinearGradient colors={[brand.amber400, ACCENT_PINK, brand.primary]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.askAmyGrad}>
              <Ionicons name="chatbubbles" size={14} color="#fff" />
              <Text style={styles.askAmyText}>Ask Amy</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {isLoading && (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator color={ACCENT_PINK} />
          </View>
        )}

        {!isLoading && children.length === 0 && (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="baby-face-outline" size={48} color={ACCENT_PINK} />
            <Text style={styles.emptyTitle}>Add a child to get started</Text>
            <Text style={styles.emptyDesc}>Personalized tips, articles, and activities unlock once Amy knows your child.</Text>
            <Pressable onPress={() => router.push("/children/new")} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Add Child</Text>
            </Pressable>
          </View>
        )}

        {/* Child selector */}
        {children.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {children.map(c => {
              const g = ageGroup(c.age, c.ageMonths ?? 0);
              const isSel = effective?.id === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setSelectedId(c.id)}
                  style={[styles.chip, isSel && styles.chipActive]}
                >
                  <Text style={{ fontSize: 18 }}>{g.emoji}</Text>
                  <View>
                    <Text style={[styles.chipName, isSel && { color: "#fff" }]}>{c.name}</Text>
                    <Text style={[styles.chipAge, isSel && { color: "rgba(255,255,255,0.85)" }]}>{g.label}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {effective && grp && (
          <View style={styles.agePillRow}>
            <View style={styles.agePill}>
              <Text style={{ color: brand.amber400, fontWeight: "700" }}>{grp.emoji} {grp.label}</Text>
            </View>
            <Text style={styles.personalised}>Personalised for <Text style={{ color: "#fff", fontWeight: "700" }}>{effective.name}</Text></Text>
          </View>
        )}

        {/* Section tab bar — taps and swipe stay in sync */}
        {effective && (
          <SectionTabBar
            sections={SECTION_KEYS}
            active={activeSection}
            onSelect={(key) => goToSection(key, true)}
            styles={styles}
            scrollX={scrollX}
            pageWidth={pageWidth}
          />
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
                accent={[brand.primary, ACCENT_PINK]}
                title="Ask Amy AI"
                desc="Warm, practical parenting advice — instantly"
                open={openSection === "amy"}
                onToggle={() => setOpenSection(s => s === "amy" ? null : "amy")}
              >
                <Text style={styles.sectionLead}>Tap a topic and Amy will reply.</Text>
                <View style={styles.promptsGrid}>
                  {AMY_PROMPTS.map(p => (
                    <Pressable key={p.label} onPress={() => askAmy(p.prompt)} style={styles.promptChip}>
                      <Text style={{ fontSize: 18 }}>{p.emoji}</Text>
                      <Text style={styles.promptLabel}>{p.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable onPress={() => router.push("/amy-ai")} style={styles.askAmyFull}>
                  <Ionicons name="chatbubbles" size={16} color="#fff" />
                  <Text style={styles.askAmyFullText}>Ask Amy anything</Text>
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
                label="Unlock to continue"
                cta="Unlock Premium"
              >
              <Section
                id="articles"
                icon={<Ionicons name="book" size={20} color="#fff" />}
                accent={[palette.emerald500, palette.emerald400]}
                title="Parenting Articles"
                desc="Research-based, age-matched reading"
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
                label="Unlock to continue"
                cta="Unlock Premium"
              >
              <Section
                id="tips"
                icon={<Ionicons name="sparkles" size={20} color="#fff" />}
                accent={[brand.violet400, colors.light.primary]}
                title="Daily Tips"
                desc="Amy AI picks today's best tips"
                open={openSection === "tips"}
                onToggle={() => setOpenSection(s => s === "tips" ? null : "tips")}
                onOpen={() => hubUsage.markFeatureUsed("hub_tips")}
                tryFree={tryFreeFor("hub_tips")}
              >
                {effective ? (
                  <View style={styles.tipsList}>
                    {[
                      "Catch them being good — name the behavior aloud.",
                      "Offer two acceptable choices to defuse power struggles.",
                      "Read together for 10 min before bed to anchor the routine.",
                    ].map((t, i) => (
                      <View key={i} style={styles.tipCard}>
                        <Text style={styles.tipNum}>{i + 1}</Text>
                        <Text style={styles.tipText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.sectionLead}>Add a child to unlock daily tips.</Text>
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
                label="Unlock to continue"
                cta="Unlock Premium"
              >
              <Section
                id="emotional"
                icon={<Ionicons name="heart" size={20} color="#fff" />}
                accent={[brand.pink400, ACCENT_PINK]}
                title="Emotional Support"
                desc="For the tough parenting days"
                open={openSection === "emotional"}
                onToggle={() => setOpenSection(s => s === "emotional" ? null : "emotional")}
                onOpen={() => hubUsage.markFeatureUsed("hub_emotional")}
                tryFree={tryFreeFor("hub_emotional")}
              >
                <Text style={styles.sectionLead}>Parenting is hard. Amy will listen — no judgment.</Text>
                <View style={styles.emotionalGrid}>
                  {EMOTIONAL.map(e => (
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
                label="Unlock to continue"
                cta="Unlock Premium"
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
                        <Ionicons name="clipboard" size={20} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>🧾 PTM Prep Assistant</Text>
                          {tryFreeFor("hub_ptm_prep") ? <TryFreeBadge /> : null}
                        </View>
                        <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 11.5, marginTop: 2 }}>Prepare · Attend · Act — for parent-teacher meetings</Text>
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
                label="Unlock to continue"
                cta="Unlock Premium"
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
                        <Ionicons name="school" size={20} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>📚 Smart Study Zone</Text>
                          {tryFreeFor("hub_smart_study") ? <TryFreeBadge /> : null}
                        </View>
                        <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 11.5, marginTop: 2 }}>Nursery → Class 10 · audio + practice</Text>
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
                label="Unlock to continue"
                cta="Unlock Premium"
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
                        <Ionicons name="sunny" size={20} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>🌅 School Morning Flow</Text>
                          {tryFreeFor("hub_morning_flow") ? <TryFreeBadge /> : null}
                        </View>
                        <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 11.5, marginTop: 2 }}>Night prep · steps · smart delay</Text>
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
                label="Unlock to continue"
                cta="Unlock Premium"
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
                        <Ionicons name="trophy" size={20} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>🏆 Olympiad Zone</Text>
                          {tryFreeFor("hub_olympiad") ? <TryFreeBadge /> : null}
                        </View>
                        <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 11.5, marginTop: 2 }}>Daily 5 · practice · math, science, reasoning, GK</Text>
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
            id: "phonics",
            ageBands: HUB_CONTENT_AGE_BANDS.phonics,
            node: (
              <View style={tileW("phonics")}>
                <PhonicsTestCard childId={effective?.id} />
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
                          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Kids Control Center</Text>
                          <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.25)" }}>
                            <Text style={{ color: "#fff", fontSize: 9.5, fontWeight: "800" }}>SOON 🚀</Text>
                          </View>
                        </View>
                        <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 11.5, marginTop: 2 }}>Smart control · Safe child experience</Text>
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
                label="Unlock to continue"
                cta="Unlock Premium"
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
                        <MaterialCommunityIcons name="food-apple" size={22} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>🍱 Tiffin & Meals</Text>
                          {tryFreeFor("hub_meals_tile") ? <TryFreeBadge /> : null}
                        </View>
                        <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 11.5, marginTop: 2 }}>Smart suggestions tuned to your child's taste</Text>
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
                <Pressable
                  onPress={() => router.push("/nutrition" as never)}
                  style={{ borderRadius: 18, overflow: "hidden" }}
                >
                  <LinearGradient
                    colors={[brand.violet600, palette.indigo600]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ padding: 16, gap: 8 }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                        <MaterialCommunityIcons name="food-apple-outline" size={22} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>🥗 Nutrition Hub</Text>
                        <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 11.5, marginTop: 2 }}>न्यूट्रिशन हब · Age-wise nutrition science</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
                    </View>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {["WHO", "ICMR", "Indian meals", "Family mode"].map(tag => (
                        <View key={tag} style={{ backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
                          <Text style={{ color: "#fff", fontSize: 9, fontWeight: "600" }}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </LinearGradient>
                </Pressable>
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
                label="Unlock to continue"
                cta="Unlock Premium"
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
                        <MaterialCommunityIcons name="party-popper" size={22} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>🎉 Event Prep</Text>
                          {tryFreeFor("hub_event_prep") ? <TryFreeBadge /> : null}
                        </View>
                        <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 11.5, marginTop: 2 }}>Fancy dress · DIY guide · speeches</Text>
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
                label="Unlock to continue"
                cta="Unlock Premium"
                style={tileW("activities")}
              >
              <Section
                id="activities"
                icon={<Ionicons name="color-palette" size={20} color="#fff" />}
                accent={[brand.rose400, palette.amber500]}
                title="Activities & Learning"
                desc="Games, audio lessons & more"
                open={openSection === "activities"}
                onToggle={() => setOpenSection(s => s === "activities" ? null : "activities")}
                onOpen={() => hubUsage.markFeatureUsed("hub_activities")}
                tryFree={tryFreeFor("hub_activities")}
              >
                <Text style={styles.sectionLead}>Educational activities curated by Amy for your child's age group.</Text>

                {/* Gaming Reward entry */}
                <Pressable
                  onPress={() => router.push("/games" as never)}
                  style={{ borderRadius: 14, overflow: "hidden", marginTop: 4 }}
                >
                  <LinearGradient
                    colors={[brand.violet600, brand.purple500]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="game-controller" size={20} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>Gaming Reward</Text>
                      <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11.5, marginTop: 2 }}>10 educational mini-games · earn points</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
                  </LinearGradient>
                </Pressable>

                {/* Rewards Shop entry */}
                <Pressable
                  onPress={() => router.push("/rewards" as never)}
                  style={{ borderRadius: 14, overflow: "hidden", marginTop: 8 }}
                >
                  <LinearGradient
                    colors={[palette.amber500, brand.pink500]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="gift" size={20} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>Rewards Shop</Text>
                      <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11.5, marginTop: 2 }}>Spend points on real-world treats</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
                  </LinearGradient>
                </Pressable>

                {/* Audio Lessons entry */}
                <Pressable
                  onPress={() => router.push("/audio-lessons" as never)}
                  style={{ borderRadius: 14, overflow: "hidden", marginTop: 8 }}
                >
                  <LinearGradient
                    colors={[palette.cyan700, palette.cyan600]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="headset" size={20} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>Amy Audio Lessons</Text>
                      <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11.5, marginTop: 2 }}>3–5 min parenting lessons · hands-free</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
                  </LinearGradient>
                </Pressable>

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
                label="Unlock to continue"
                cta="Unlock Premium"
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
                        <Ionicons name="film" size={22} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>🎬 Kids Story Hub</Text>
                          {tryFreeFor("hub_story_hub") ? <TryFreeBadge /> : null}
                        </View>
                        <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 11.5, marginTop: 2 }}>Bedtime, moral & fun stories — Netflix-style</Text>
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
              <Section
                id="art-craft"
                icon={<MaterialCommunityIcons name="palette" size={20} color="#fff" />}
                accent={[brand.pink400, brand.purple500]}
                title="🎨 Art & Craft Videos"
                desc="Short creative videos to inspire your child"
                open={openSection === "art-craft"}
                onToggle={() => setOpenSection(s => s === "art-craft" ? null : "art-craft")}
              >
                <ArtCraftReels />
              </Section>
              </View>
            ),
          });
          allTiles.push({
            id: "worksheets",
            ageBands: HUB_CONTENT_AGE_BANDS.worksheets,
            node: (
              <View style={tileW("worksheets")}>
              <Section
                id="worksheets"
                icon={<MaterialCommunityIcons name="file-document-outline" size={20} color="#fff" />}
                accent={[palette.sky500, palette.indigo500]}
                title="📄 Printable Worksheets"
                desc="Coloring, math, tracing & more · 5 free / day"
                open={openSection === "worksheets"}
                onToggle={() => setOpenSection(s => s === "worksheets" ? null : "worksheets")}
              >
                <PrintableWorksheets />
              </Section>
              </View>
            ),
          });
          allTiles.push({
            id: "facts",
            ageBands: HUB_CONTENT_AGE_BANDS.facts,
            node: (
              <View style={tileW("facts")}>
              <Section
                id="facts"
                icon={<Ionicons name="sparkles" size={20} color="#fff" />}
                accent={[palette.amber500, brand.rose400]}
                title="✨ Amazing Facts"
                desc="Mind-blowing facts for curious kids"
                open={openSection === "facts"}
                onToggle={() => setOpenSection(s => s === "facts" ? null : "facts")}
              >
                {effective ? (
                  <AmazingFacts ageMonths={effective.age * 12 + (effective.ageMonths ?? 0)} />
                ) : (
                  <Text style={styles.sectionLead}>Add a child to unlock age-matched facts.</Text>
                )}
              </Section>
              </View>
            ),
          });
          if (effective && effective.age >= 2 && effective.age <= 15) {
            allTiles.push({
              id: "life-skills",
              ageBands: HUB_CONTENT_AGE_BANDS["life-skills"],
              node: (
                <LockedBlock
                  reason="hub_locked"
                  locked={hubUsage.isFeatureLocked("hub_life_skills")}
                  label="Unlock to continue"
                  cta="Unlock Premium"
                  style={tileW("life-skills")}
                >
                  <Section
                    id="life-skills"
                    icon={<Ionicons name="compass" size={20} color="#fff" />}
                    accent={[palette.emerald500, palette.emerald400]}
                    title="🧭 Life Skills Mode"
                    desc="Daily real-life skills, ages 2–15"
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
                label="Unlock to continue"
                cta="Unlock Premium"
              >
              <Section
                id="meal-suggestions"
                icon={<MaterialCommunityIcons name="food" size={20} color="#fff" />}
                accent={[palette.emerald500, palette.lime500]}
                title="🍱 Amy AI Meal Suggestions"
                desc="AI-generated tiffin & meal ideas for your child"
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
                label="Unlock to continue"
                cta="Unlock Premium"
              >
              <Section
                id="smart-math-tricks"
                icon={<MaterialCommunityIcons name="calculator-variant" size={20} color="#fff" />}
                accent={[brand.violet600, palette.amber500]}
                title="🧮 Smart Math Tricks"
                desc="Mental math shortcuts kids actually love"
                open={openSection === "smart-math-tricks"}
                onToggle={() => setOpenSection(s => s === "smart-math-tricks" ? null : "smart-math-tricks")}
                onOpen={() => hubUsage.markFeatureUsed("hub_smart_math_tricks")}
                tryFree={tryFreeFor("hub_smart_math_tricks")}
              >
                {effective ? (
                  <SmartMathTricks childName={effective.name} childAgeYears={effective.age} />
                ) : (
                  <Text style={styles.sectionLead}>Add a child to unlock smart math tricks.</Text>
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
                label="Unlock to continue"
                cta="Unlock Premium"
              >
              <Section
                id="coloring-books"
                icon={<MaterialCommunityIcons name="palette" size={20} color="#fff" />}
                accent={[brand.pink500, palette.amber500]}
                title="🎨 Coloring Books"
                desc="Print-ready coloring pages, refreshed daily"
                open={openSection === "coloring-books"}
                onToggle={() => setOpenSection(s => s === "coloring-books" ? null : "coloring-books")}
                onOpen={() => hubUsage.markFeatureUsed("hub_coloring_books")}
                tryFree={tryFreeFor("hub_coloring_books")}
              >
                {effective ? (
                  <ColoringBooks childId={effective.id} childName={effective.name} />
                ) : (
                  <Text style={styles.sectionLead}>Add a child to unlock coloring books.</Text>
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
                label="Unlock to continue"
                cta="Unlock Premium"
              >
              <Section
                id="fun-sheets"
                icon={<MaterialCommunityIcons name="file-document-edit" size={20} color="#fff" />}
                accent={[palette.teal600, palette.emerald500]}
                title="📄 Fun Sheets"
                desc="Activity sheets, mazes & puzzles"
                open={openSection === "fun-sheets"}
                onToggle={() => setOpenSection(s => s === "fun-sheets" ? null : "fun-sheets")}
                onOpen={() => hubUsage.markFeatureUsed("hub_fun_sheets")}
                tryFree={tryFreeFor("hub_fun_sheets")}
              >
                {effective ? (
                  <FunSheets childId={effective.id} childName={effective.name} />
                ) : (
                  <Text style={styles.sectionLead}>Add a child to unlock fun sheets.</Text>
                )}
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
            // Same render pass — read by the overlay sibling further down.
            // Featured tile ids (rendered above this IIFE) are prepended so
            // the diff matches what's actually visible on screen, not just
            // what allTiles contains.
            debugSnapshot.section1Ids = [
              ...debugFeaturedIds,
              ...section1.map(t => t.id),
            ];
            debugSnapshot.section2Ids = section2.map(t => t.id);
            debugSnapshot.showsSection2 =
              currentBand === 0 && showExplore && !isLatestStage;

            // Bucket the current-band tiles by section. The new layout
            // moves each tile into one of three grid sections; the 4th
            // section (Today's Plan) is built from the routine cache and
            // doesn't draw from this list.
            const buckets = bucketTilesBySection(section1);

            // The "Explore Next Stage" group (Section 2) lives at the
            // bottom of the Activities page, since "what's coming next" is
            // structurally a future-content preview that fits with the
            // hands-on Activities pillar.
            const showExploreNext =
              currentBand === 0 && showExplore && !isLatestStage;

            // Capture the FULL set of section-1 tile ids (zones + modules
            // + activities buckets) for the debug overlay so the diff
            // matches what's reachable on screen, not what's in the active
            // pager page.
            debugSnapshot.section1Ids = [
              ...debugFeaturedIds,
              ...buckets.zones.map(t => t.id),
              ...buckets.modules.map(t => t.id),
              ...buckets.activities.map(t => t.id),
            ];
            debugSnapshot.section2Ids = section2.map(t => t.id);
            debugSnapshot.showsSection2 = showExploreNext;

            const renderSectionPage = (sectionKey: SectionKey): React.ReactNode => {
              if (sectionKey === "today") {
                return (
                  <TodayPlanPage
                    childName={childName}
                    styles={styles}
                    // Empty-state CTA must open the routine generator
                    // directly — same target the dashboard's
                    // `goToGenerate` callback uses, so the hub and
                    // dashboard "Generate today's routine" buttons go
                    // to the same screen.
                    onGenerate={() => router.push("/routines/generate" as never)}
                  />
                );
              }
              if (sectionKey === "zones") {
                return (
                  <SectionPage
                    sectionKey="zones"
                    childName={childName}
                    bandLabel={HUB_AGE_BANDS[currentBand].label}
                    styles={styles}
                    leadingNodes={
                      <>
                        {/* Featured tiles share the same HubTile chrome
                            with the `featured` variant for a slightly
                            larger press target + corner radius. */}
                        <HubTile featured testID="hub-tile-command-center">
                          <ParentCommandCenter child={{ id: effective.id, name: effective.name }} />
                        </HubTile>
                        <HubTile featured testID="hub-tile-infant-hub">
                          {renderInfantHub()}
                        </HubTile>
                        <HubTile featured testID="hub-tile-tomorrow-forecast">
                          <FuturePredictor childId={effective.id} />
                        </HubTile>
                      </>
                    }
                    tiles={buckets.zones}
                  />
                );
              }
              if (sectionKey === "modules") {
                return (
                  <SectionPage
                    sectionKey="modules"
                    childName={childName}
                    bandLabel={HUB_AGE_BANDS[currentBand].label}
                    styles={styles}
                    tiles={buckets.modules}
                  />
                );
              }
              // activities — also hosts the Explore Next Stage block.
              return (
                <SectionPage
                  sectionKey="activities"
                  childName={childName}
                  bandLabel={HUB_AGE_BANDS[currentBand].label}
                  styles={styles}
                  tiles={buckets.activities}
                  trailingNodes={
                    showExploreNext ? (
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
                    ) : null
                  }
                />
              );
            };

            return (
              <AnimatedFlatList
                ref={pagerRef}
                data={SECTION_KEYS as readonly SectionKey[]}
                keyExtractor={(k: SectionKey) => k}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={{ flex: 1 }}
                onScroll={onPagerScroll}
                scrollEventThrottle={16}
                onMomentumScrollEnd={onPagerScrollEnd}
                getItemLayout={(_d: unknown, index: number) => ({
                  length: pageWidth,
                  offset: pageWidth * index,
                  index,
                })}
                initialNumToRender={2}
                windowSize={3}
                renderItem={({ item: sectionKey }: { item: SectionKey }) => {
                  const idx = SECTION_KEYS.indexOf(sectionKey);
                  // Cross-fade each page based on its distance from the
                  // current scroll offset. Active page sits at 1.0; the
                  // page being swiped away dips toward 0.6 so the user
                  // perceives a soft transition into the next page.
                  const opacity = scrollX.interpolate({
                    inputRange: [
                      pageWidth * (idx - 1),
                      pageWidth * idx,
                      pageWidth * (idx + 1),
                    ],
                    outputRange: [0.6, 1, 0.6],
                    extrapolate: "clamp",
                  });
                  return (
                    <Animated.View
                      style={{ width: pageWidth, flex: 1, opacity }}
                    >
                      {mountedSections.has(sectionKey) ? (
                        renderSectionPage(sectionKey)
                      ) : (
                        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                          <ActivityIndicator color={ACCENT_PINK} />
                        </View>
                      )}
                    </Animated.View>
                  );
                }}
              />
            );
          })()}

      {/* Dev-only floating debug overlay — shows mobile-vs-web tile diff
          for the active child. Mounted as ScrollView sibling so it floats
          over content. Reads debugSnapshot which the IIFE above populates
          synchronously during this same render pass. */}
      {__DEV__ && effective && (
        <HubDebugOverlay
          mobileSection1Ids={debugSnapshot.section1Ids}
          mobileSection2Ids={debugSnapshot.section2Ids}
          mobileShowsSection2={debugSnapshot.showsSection2}
          currentBand={currentBand}
          ageMonths={effective.age * 12 + (effective.ageMonths ?? 0)}
          childName={childName}
        />
      )}
    </LinearGradient>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pager helper components
// ─────────────────────────────────────────────────────────────────────────────

type HubStyles = ReturnType<typeof makeStyles>;

function SectionTabBar({
  sections,
  active,
  onSelect,
  styles,
  scrollX,
  pageWidth,
}: {
  sections: readonly SectionKey[];
  active: SectionKey;
  onSelect: (key: SectionKey) => void;
  styles: HubStyles;
  scrollX: Animated.Value;
  pageWidth: number;
}) {
  // Width allocated to each tab pill (used to position the underline).
  // Layout is measured at runtime so the indicator follows whatever the
  // ScrollView contentSize ends up being.
  const [tabLayouts, setTabLayouts] = useState<Record<SectionKey, { x: number; width: number }>>(
    () => ({} as Record<SectionKey, { x: number; width: number }>),
  );
  const allMeasured = sections.every((k) => tabLayouts[k]);

  // Map scrollX (0..pageWidth*(N-1)) onto the measured tab x positions so
  // the underline glides under the active tab in real time during a swipe,
  // not just on momentum end. The interpolations are typed as
  // `Animated.AnimatedInterpolation<number>` so they slot into transform
  // / width style props without any `as any` escapes.
  const indicatorTransform = useMemo<{
    translateX: Animated.AnimatedInterpolation<number> | number;
    width: Animated.AnimatedInterpolation<number> | number;
  }>(() => {
    if (!allMeasured || pageWidth === 0) {
      return { translateX: 0, width: 0 };
    }
    const inputRange = sections.map((_, i) => i * pageWidth);
    const xRange = sections.map((k) => tabLayouts[k].x);
    const wRange = sections.map((k) => tabLayouts[k].width);
    return {
      translateX: scrollX.interpolate({
        inputRange,
        outputRange: xRange,
        extrapolate: "clamp",
      }),
      width: scrollX.interpolate({
        inputRange,
        outputRange: wRange,
        extrapolate: "clamp",
      }),
    };
  }, [sections, tabLayouts, pageWidth, scrollX, allMeasured]);

  return (
    <View style={styles.tabBarRow}>
      {sections.map((key) => {
        const meta = SECTION_META[key];
        const isActive = key === active;
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(key)}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              setTabLayouts((prev) =>
                prev[key]?.x === x && prev[key]?.width === width
                  ? prev
                  : { ...prev, [key]: { x, width } },
              );
            }}
            style={[styles.tabPill, isActive && styles.tabPillActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${meta.heading} tab`}
            testID={`hub-tab-${key}`}
          >
            <Ionicons
              name={meta.icon}
              size={14}
              color={isActive ? "#fff" : "rgba(255,255,255,0.75)"}
            />
            <Text style={[styles.tabPillText, isActive && styles.tabPillTextActive]}>
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
      {allMeasured && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tabIndicator,
            {
              transform: [{ translateX: indicatorTransform.translateX }],
              width: indicatorTransform.width,
            },
          ]}
          testID="hub-tab-indicator"
        />
      )}
    </View>
  );
}

function TodayPlanPage({
  childName,
  styles,
  onGenerate,
}: {
  childName: string;
  styles: HubStyles;
  onGenerate: () => void;
}) {
  const router = useRouter();
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

  const meta = SECTION_META.today;
  return (
    <ScrollView
      contentContainerStyle={styles.pageContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.bandSectionHeader}>
        <Text style={styles.bandSectionTitle}>{meta.heading}</Text>
        <Text style={styles.bandSectionSub}>
          {childName ? `${childName} · ${meta.description}` : meta.description}
        </Text>
      </View>

      {isLoading ? (
        <View style={{ paddingVertical: 32, alignItems: "center" }}>
          <ActivityIndicator color={ACCENT_PINK} />
        </View>
      ) : tasks.length > 0 ? (
        <RoutineCarousel tasks={tasks} onToggle={onToggle} onPressCard={onPressCard} />
      ) : (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="calendar-outline" size={40} color={ACCENT_PINK} />
          <Text style={styles.emptyTitle}>No routine for today</Text>
          <Text style={styles.emptyDesc}>
            Generate a personalised plan and Amy will keep this list in sync.
          </Text>
          <Pressable onPress={onGenerate} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Generate today's routine</Text>
          </Pressable>
        </View>
      )}

      {tasks.length > 0 && (
        <Pressable onPress={onGenerate} style={styles.bottomCta}>
          <Ionicons name="calendar" size={16} color={ACCENT_PINK} />
          <Text style={styles.bottomCtaText}>Generate a new routine</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function SectionPage<T extends { id: string; node: React.ReactNode }>({
  sectionKey,
  childName,
  bandLabel,
  tiles,
  leadingNodes,
  trailingNodes,
  styles,
}: {
  sectionKey: Exclude<SectionKey, "today">;
  childName: string;
  bandLabel: string;
  tiles: readonly T[];
  leadingNodes?: React.ReactNode;
  trailingNodes?: React.ReactNode;
  styles: HubStyles;
}) {
  const meta = SECTION_META[sectionKey];
  return (
    <ScrollView
      contentContainerStyle={styles.pageContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.bandSectionHeader}>
        <Text style={styles.bandSectionTitle}>{meta.heading}</Text>
        <Text style={styles.bandSectionSub}>
          {childName ? `For ${childName} · age ${bandLabel}` : meta.description}
        </Text>
      </View>

      {leadingNodes}

      {tiles.length === 0 && !leadingNodes && !trailingNodes ? (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="creation" size={32} color={ACCENT_PINK} />
          <Text style={styles.emptyDesc}>
            Nothing in this section for {childName} just yet — keep checking back!
          </Text>
        </View>
      ) : (
        <View style={styles.sectionsGrid}>
          {tiles.map((t) => (
            // Every tile flows through the shared `HubTile` chrome so the
            // press-to-scale feedback, drop shadow, and featured variant
            // are defined in one place. Tiles render their own internal
            // Pressable / accordion (Section) inside, so HubTile itself
            // is non-pressable here — it just provides the shared chrome.
            <HubTile
              key={t.id}
              featured={isFeaturedTile(t.id)}
              testID={`hub-tile-${t.id}`}
            >
              {t.node}
            </HubTile>
          ))}
        </View>
      )}

      {trailingNodes}
    </ScrollView>
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
  return (
    <View style={styles.exploreSection}>
      <View style={styles.bandSectionHeader}>
        <Text style={styles.bandSectionTitle}>Explore Next Stage for {childName}</Text>
        <Text style={styles.bandSectionSub}>
          {previewBand !== null
            ? `Previewing age ${HUB_AGE_BANDS[previewBand].label} · tap "Now" to reset`
            : `Preview what's coming up as ${childName} grows`}
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
                  ? `Current age band ${HUB_AGE_BANDS[band].label}, tap to reset preview`
                  : `Preview age ${HUB_AGE_BANDS[band].label} content`
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
                {isCurrent ? " · Now" : ""}
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
                For Age {HUB_AGE_BANDS[band].label}
              </Text>
              {isPreviewed && (
                <View style={styles.previewingPill}>
                  <Text style={styles.previewingText}>Previewing</Text>
                </View>
              )}
              {!isPreviewed && band === nearestFutureBand && (
                <View style={styles.comingNextPill}>
                  <Text style={styles.comingNextText}>Coming Up Next</Text>
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
  id, icon, accent, title, desc, open, onToggle, onOpen, tryFree = false, children,
}: {
  id: string;
  icon: React.ReactNode;
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
        <LinearGradient
          colors={accent}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.sectionIcon}
        >
          {icon}
        </LinearGradient>
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
            color={open ? ACCENT_PINK : (mode === "light" ? c.textBody : "rgba(255,255,255,0.65)")}
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

    chip: {
      flexDirection: "row", alignItems: "center", gap: 8,
      paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18,
      backgroundColor: glassBg, borderWidth: 1, borderColor: glassBorder,
    },
    chipActive: { backgroundColor: "rgba(123,63,242,0.4)", borderColor: ACCENT_PINK },
    chipName: { color: c.foreground, fontWeight: "700", fontSize: 13 },
    chipAge: { color: c.textMuted, fontSize: 10 },

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
      borderColor: "rgba(255,78,205,0.55)",
      backgroundColor: glassBgOpen,
      shadowColor: ACCENT_PINK,
      shadowOpacity: isLight ? 0.25 : 0.45,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
    sectionIcon: {
      width: 44, height: 44, borderRadius: 14,
      alignItems: "center", justifyContent: "center",
      borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
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
    chevWrapOpen: { borderColor: "rgba(255,78,205,0.6)", backgroundColor: "rgba(255,78,205,0.12)" },
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
    bottomCtaText: { color: ACCENT_PINK, fontWeight: "700" },

    // 2-section age-band layout: section/group headers and Explore styling.
    bandSectionHeader: { gap: 2, marginTop: 4, marginBottom: 4 },
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

    // 4-section horizontal pager — tab bar + per-page padding.
    tabBarRow: {
      flexDirection: "row",
      gap: 8,
      paddingVertical: 4,
      paddingHorizontal: 2,
      position: "relative",
    },
    tabIndicator: {
      position: "absolute",
      bottom: 0,
      left: 0,
      height: 3,
      borderRadius: 2,
      backgroundColor: ACCENT_PINK,
      shadowColor: ACCENT_PINK,
      shadowOpacity: 0.4,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
    tabPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: glassBg,
      borderWidth: 1,
      borderColor: glassBorder,
    },
    tabPillActive: {
      backgroundColor: ACCENT_PINK,
      borderColor: ACCENT_PINK,
      shadowColor: ACCENT_PINK,
      shadowOpacity: 0.4,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    tabPillText: {
      color: c.foreground,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.2,
    },
    tabPillTextActive: { color: "#fff" },

    pageContent: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 140,
      gap: 12,
    },
  });
}
