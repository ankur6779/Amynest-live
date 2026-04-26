import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator,
  Image, Platform, LayoutAnimation, UIManager, findNodeHandle,
} from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useTheme } from "@/contexts/ThemeContext";
import { LifeSkillsZone } from "@/components/LifeSkillsZone";
import InfantHub from "@/components/InfantHub";
import { ArtCraftReels } from "@/components/ArtCraftReels";
import { PrintableWorksheets } from "@/components/PrintableWorksheets";
import { AmazingFacts } from "@/components/AmazingFacts";
import FuturePredictor from "@/components/FuturePredictor";
import AiMealGenerator from "@/components/AiMealGenerator";
import ParentCommandCenter from "@/components/ParentCommandCenter";
import { isInfantHubAge } from "@workspace/infant-hub";
import { HUB_AGE_BANDS, getAgeBand, HUB_CONTENT_AGE_BANDS, partitionTilesByBand } from "./hub-bands";
export { HUB_AGE_BANDS, getAgeBand, HUB_CONTENT_AGE_BANDS, partitionTilesByBand };
import { useProfileComplete } from "@/hooks/useProfileComplete";
import { useFeatureUsage } from "@/hooks/useFeatureUsage";
import LockedBlock from "@/components/LockedBlock";
import TryFreeBadge from "@/components/TryFreeBadge";
import { ProfileLockScreen } from "@/components/ProfileLockScreen";
import colors, { brand } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";

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
  // Quick band switcher (Task #108): when set to a future band, that group is
  // shown in full opacity (un-dimmed) and we scroll to it. Tapping the current
  // band chip clears it and returns to the default 2-section view.
  const [previewBand, setPreviewBand] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const groupRefs = useRef<Record<number, View | null>>({});
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

  // Scroll the ScrollView so the preview band's group is near the top.
  const scrollToBand = (band: number) => {
    const groupView = groupRefs.current[band];
    const scrollNode = scrollRef.current;
    if (!groupView || !scrollNode) return;
    const handle = findNodeHandle(scrollNode);
    if (handle == null) return;
    groupView.measureLayout(
      handle,
      (_x, y) => {
        scrollRef.current?.scrollTo({ y: Math.max(y - 16, 0), animated: true });
      },
      () => {},
    );
  };

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
    // Defer scroll so layout has time to settle if anything just changed.
    setTimeout(() => scrollToBand(band), 50);
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

  return (
    <LinearGradient colors={theme.gradient} style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: 140,
          paddingHorizontal: 16,
          gap: 16,
        }}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Parenting Hub</Text>
            <Text style={styles.subtitle}>Articles, tips, activities & support</Text>
          </View>
          <Pressable
            onPress={() => router.push("/amy-ai")}
            style={styles.askAmyBtn}
          >
            <LinearGradient colors={["#FFD27A", "#FF4ECD", brand.primary]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.askAmyGrad}>
              <Ionicons name="chatbubbles" size={14} color="#fff" />
              <Text style={styles.askAmyText}>Ask Amy</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {isLoading && (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator color="#FF4ECD" />
          </View>
        )}

        {!isLoading && children.length === 0 && (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="baby-face-outline" size={48} color="#FF4ECD" />
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

        {/* 🧠 Parent Command Center — overview · insights · quick actions */}
        {effective && (
          <ParentCommandCenter child={{ id: effective.id, name: effective.name }} />
        )}

        {/* Infant & Toddler Hub — only when any child is ≤ 24 months */}
        {(() => {
          const selMonths = effective ? effective.age * 12 + (effective.ageMonths ?? 0) : -1;
          const target = isInfantHubAge(selMonths)
            ? effective
            : children
                .map(c => ({ child: c, months: c.age * 12 + (c.ageMonths ?? 0) }))
                .filter(x => isInfantHubAge(x.months))
                .sort((a, b) => a.months - b.months)[0]?.child;
          if (!target) return null;
          const m = target.age * 12 + (target.ageMonths ?? 0);
          return <InfantHub childName={target.name} ageMonths={m} />;
        })()}

        {effective && grp && (
          <View style={styles.agePillRow}>
            <View style={styles.agePill}>
              <Text style={{ color: "#FFD27A", fontWeight: "700" }}>{grp.emoji} {grp.label}</Text>
            </View>
            <Text style={styles.personalised}>Personalised for <Text style={{ color: "#fff", fontWeight: "700" }}>{effective.name}</Text></Text>
          </View>
        )}

        {/* 🔮 Future Predictor — top placement */}
        {effective && (
          <FuturePredictor childId={effective.id} />
        )}

        {/* === 2-section age-band content system ===================
            Only rendered when an active child is selected — the no-child
            case is already covered upstream by the add-child empty state. */}
          {effective && (() => {
            type Tile = { id: string; ageBands: readonly number[]; node: React.ReactNode };
            const allTiles: Tile[] = [];

            allTiles.push({
            id: "amy",
            ageBands: HUB_CONTENT_AGE_BANDS.amy,
            node: (
              <View style={tileW("amy")}>
              <Section
                id="amy"
                icon={<MaterialCommunityIcons name="brain" size={20} color="#fff" />}
                accent={[brand.primary, "#FF4ECD"]}
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
                accent={["#10B981", "#34D399"]}
                title="Parenting Articles"
                desc="Research-based, age-matched reading"
                open={openSection === "articles"}
                onToggle={() => setOpenSection(s => s === "articles" ? null : "articles")}
                onOpen={() => hubUsage.markFeatureUsed("hub_articles")}
                tryFree={tryFreeFor("hub_articles")}
              >
                <Text style={styles.sectionLead}>
                  {effective
                    ? `Curated for ${effective.name}'s age. Open the web app for the full library.`
                    : "Add a child to see matched articles."}
                </Text>
                <View style={styles.articleList}>
                  {[
                    { t: "Positive discipline 101", e: "🌱" },
                    { t: "Building emotional vocabulary", e: "💬" },
                    { t: "Why play matters", e: "🧩" },
                  ].map(a => (
                    <View key={a.t} style={styles.articleItem}>
                      <Text style={{ fontSize: 18 }}>{a.e}</Text>
                      <Text style={styles.articleTitle}>{a.t}</Text>
                      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.4)" />
                    </View>
                  ))}
                </View>
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
                accent={["#F472B6", "#FF4ECD"]}
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
                    colors={["#8B5CF6", "#EC4899"]}
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
                    colors={["#6366F1", "#A855F7"]}
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
                    colors={["#F97316", "#FBBF24"]}
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
                    colors={["#F59E0B", "#EF4444"]}
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
                    colors={["#7C3AED", "#EC4899", "#F59E0B"]}
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
                    colors={["#10B981", "#84CC16"]}
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
                    colors={["#7c3aed", "#4f46e5"]}
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
                    colors={["#EC4899", "#F97316"]}
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
                accent={["#FB7185", "#F59E0B"]}
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
                    colors={["#7b3ff2", "#a855f7"]}
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
                    colors={["#f59e0b", "#ec4899"]}
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
                    colors={["#0e7490", "#0891b2"]}
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
                    colors={["#EC4899", "#A855F7"]}
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
                accent={["#F472B6", "#A855F7"]}
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
                accent={["#0EA5E9", "#6366F1"]}
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
                accent={["#F59E0B", "#FB7185"]}
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
                    accent={["#10B981", "#34D399"]}
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
                accent={["#10B981", "#84CC16"]}
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
            } = partitionTilesByBand(allTiles, currentBand);

            return (
              <>
                {/* SECTION 1 — primary content for the child's current band */}
                <View style={styles.bandSectionHeader}>
                  <Text style={styles.bandSectionTitle}>For {childName}</Text>
                  <Text style={styles.bandSectionSub}>
                    Age {HUB_AGE_BANDS[currentBand].label} · matched to {childName}
                  </Text>
                </View>
                <View style={styles.sectionsGrid}>
                  {section1.map(t => (
                    <React.Fragment key={t.id}>{t.node}</React.Fragment>
                  ))}
                </View>

                {/* SECTION 2 — Explore Next Stage, lazy-mounted, dimmed.
                    Only future bands ever appear here; if the child is in the
                    last band we hide the section entirely (isLatestStage). */}
                {showExplore && !isLatestStage && (
                  <View style={styles.exploreSection}>
                    <View style={styles.bandSectionHeader}>
                      <Text style={styles.bandSectionTitle}>
                        Explore Next Stage for {childName}
                      </Text>
                      <Text style={styles.bandSectionSub}>
                        {previewBand !== null
                          ? `Previewing age ${HUB_AGE_BANDS[previewBand].label} · tap "Now" to reset`
                          : `Preview what's coming up as ${childName} grows`}
                      </Text>
                    </View>

                    {/* Quick band switcher (Task #108): chips for the current
                        band + each future band that has tiles. Tapping a future
                        chip un-dims that group and scrolls to it; tapping the
                        current "Now" chip clears the preview. */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.bandPillRow}
                    >
                      {[currentBand, ...orderedBands].map(band => {
                        const isCurrent = band === currentBand;
                        const isPreviewing = previewBand === band;
                        const isDefault = previewBand === null && isCurrent;
                        return (
                          <Pressable
                            key={`band-pill-${band}`}
                            onPress={() => handleBandChipPress(band)}
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

                    {orderedBands.map(band => {
                      const isPreviewed = previewBand === band;
                      return (
                        <View
                          key={band}
                          ref={(node) => { groupRefs.current[band] = node; }}
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
                              {(groupsMap.get(band) ?? []).map(t => (
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
                )}
              </>
            );
          })()}

        {/* Bottom CTA */}
        <Pressable onPress={() => router.push("/(tabs)/routines")} style={styles.bottomCta}>
          <Ionicons name="calendar" size={16} color="#FF4ECD" />
          <Text style={styles.bottomCtaText}>Generate today's routine</Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
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
            color={open ? "#FF4ECD" : (mode === "light" ? c.textBody : "rgba(255,255,255,0.65)")}
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
    title: { color: c.foreground, fontSize: 22, fontWeight: "800", fontFamily: Platform.select({ default: undefined }) },
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
    chipActive: { backgroundColor: "rgba(123,63,242,0.4)", borderColor: "#FF4ECD" },
    chipName: { color: c.foreground, fontWeight: "700", fontSize: 13 },
    chipAge: { color: c.textMuted, fontSize: 10 },

    agePillRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    agePill: {
      backgroundColor: isLight ? "rgba(217,119,6,0.10)" : "rgba(255,210,122,0.12)",
      borderWidth: 1,
      borderColor: isLight ? "rgba(217,119,6,0.30)" : "rgba(255,210,122,0.4)",
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
      shadowColor: "#FF4ECD",
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
    tipNum: { color: "#FF4ECD", fontWeight: "800", fontSize: 16 },
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
      backgroundColor: "rgba(251,113,133,0.18)", borderWidth: 1, borderColor: "rgba(251,113,133,0.3)",
    },

    bottomCta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 },
    bottomCtaText: { color: "#FF4ECD", fontWeight: "700" },

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
      color: "#FF4ECD", fontSize: 10, fontWeight: "800",
      letterSpacing: 0.5, textTransform: "uppercase",
    },
    previewingPill: {
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
      backgroundColor: isLight ? "rgba(217,119,6,0.12)" : "rgba(255,210,122,0.18)",
      borderWidth: 1,
      borderColor: isLight ? "rgba(217,119,6,0.45)" : "rgba(255,210,122,0.55)",
    },
    previewingText: {
      color: isLight ? "#B45309" : "#FFD27A",
      fontSize: 10, fontWeight: "800",
      letterSpacing: 0.5, textTransform: "uppercase",
    },

    // Band switcher pills above the Explore groups (Task #108)
    bandPillRow: { flexDirection: "row", gap: 8, paddingVertical: 4, paddingHorizontal: 2 },
    bandPill: {
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
      backgroundColor: glassBg,
      borderWidth: 1, borderColor: glassBorder,
    },
    bandPillCurrent: {
      backgroundColor: isLight ? "rgba(217,119,6,0.10)" : "rgba(255,210,122,0.14)",
      borderColor: isLight ? "rgba(217,119,6,0.40)" : "rgba(255,210,122,0.55)",
    },
    bandPillCurrentActive: {
      backgroundColor: isLight ? "rgba(217,119,6,0.18)" : "rgba(255,210,122,0.22)",
      borderColor: isLight ? "rgba(217,119,6,0.65)" : "rgba(255,210,122,0.85)",
    },
    bandPillPreview: {
      backgroundColor: "rgba(255,78,205,0.18)",
      borderColor: "rgba(255,78,205,0.65)",
    },
    bandPillText: { color: c.foreground, fontSize: 12, fontWeight: "700" },
    bandPillTextCurrent: { color: isLight ? "#B45309" : "#FFD27A" },
    bandPillTextPreview: { color: "#FF4ECD" },

    exploreGroupBody: { position: "relative" },
    exploreDimmed: { opacity: 0.6 },
    exploreOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isLight ? "rgba(15,23,42,0.04)" : "rgba(0,0,0,0.18)",
      borderRadius: 16,
    },
  });
}
