import React, {   useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import colors, { brand, brandAlpha, ACCENT_PINK, palette, brandExtended } from "@/constants/colors";
import { BRAND } from "@/constants/brand";

const LOGO = require("../assets/images/amynest-logo.png");

const COACH_HIGHLIGHT_KEYS = [
  "landing.highlight_1",
  "landing.highlight_2",
  "landing.highlight_3",
  "landing.highlight_4",
];

const PROBLEMS: { icon: keyof typeof Ionicons.glyphMap; labelKey: string; color: string }[] = [
  { icon: "flame", labelKey: "landing.problem_tantrums", color: palette.red500 },
  { icon: "phone-portrait", labelKey: "landing.problem_screen", color: palette.cyan500 },
  { icon: "moon", labelKey: "landing.problem_sleep", color: brand.indigo500 },
  { icon: "ear-outline", labelKey: "landing.problem_listening", color: palette.orange500 },
  { icon: "restaurant", labelKey: "landing.problem_eating", color: brand.pink500 },
  { icon: "locate", labelKey: "landing.problem_focus", color: brand.purple500 },
];

const SECONDARY_FEATURES: { icon: keyof typeof Ionicons.glyphMap; titleKey: string; descKey: string; gradient: readonly [string, string] }[] = [
  {
    icon: "calendar",
    titleKey: "landing.feature_routine_title",
    descKey: "landing.feature_routine_desc",
    gradient: [palette.cyan500, palette.blue500] as const,
  },
  {
    icon: "grid",
    titleKey: "landing.feature_hub_title",
    descKey: "landing.feature_hub_desc",
    gradient: [brand.pink500, palette.orange500] as const,
  },
  {
    icon: "flash",
    titleKey: "landing.feature_ai_title",
    descKey: "landing.feature_ai_desc",
    gradient: [brandExtended.gold, palette.orange500] as const,
  },
];

const STEPS: { icon: keyof typeof Ionicons.glyphMap; titleKey: string; descKey: string }[] = [
  { icon: "locate", titleKey: "landing.step1_title", descKey: "landing.step1_desc" },
  { icon: "help-circle", titleKey: "landing.step2_title", descKey: "landing.step2_desc" },
  { icon: "list", titleKey: "landing.step3_title", descKey: "landing.step3_desc" },
];

const TRUST_PILLARS: { icon: keyof typeof Ionicons.glyphMap; titleKey: string; descKey: string }[] = [
  { icon: "book", titleKey: "landing.trust1_title", descKey: "landing.trust1_desc" },
  { icon: "flask", titleKey: "landing.trust2_title", descKey: "landing.trust2_desc" },
  { icon: "shield-checkmark", titleKey: "landing.trust3_title", descKey: "landing.trust3_desc" },
];

const SCIENCE_CITATIONS = [
  "📚 Habit Loop — Charles Duhigg (2012)",
  "🧠 Growth Mindset — Dr. Carol Dweck, Stanford",
  "👶 AAP Screen Time Guidelines (2023)",
  "💤 CDC Infant Sleep Standards",
  "🎯 Positive Reinforcement — B.F. Skinner",
  "🌱 Montessori Life Skills Framework",
  "📊 Executive Function — Harvard Center on the Developing Child",
  "❤️ Secure Attachment — Dr. Daniel Siegel",
  "⚡ CPS Model — Dr. Ross Greene",
  "🍎 SEL Framework — CASEL",
];

const KIDS_CC_BULLETS = [
  "Screen Time Limits (AAP-aligned)",
  "Child-Safe Focus Mode",
  "Routine Sync with Parent App",
  "PIN-Protected Parent Lock",
];

const NEW_HUB_FEATURES: {
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: string;
  descKey: string;
  gradient: readonly [string, string];
  glow: string;
}[] = [
  { icon: "heart-circle", titleKey: "landing.new_infant_title", descKey: "landing.new_infant_desc", gradient: [palette.blue400, palette.indigo500] as const, glow: "rgba(99,102,241,0.45)" },
  { icon: "calculator", titleKey: "landing.new_abacus_title", descKey: "landing.new_abacus_desc", gradient: [palette.amber500, palette.red500] as const, glow: "rgba(245,158,11,0.45)" },
  { icon: "document-text", titleKey: "landing.new_funsheets_title", descKey: "landing.new_funsheets_desc", gradient: [palette.cyan500, palette.emerald500] as const, glow: "rgba(16,185,129,0.45)" },
  { icon: "color-palette", titleKey: "landing.new_coloring_title", descKey: "landing.new_coloring_desc", gradient: [brand.pink500, palette.orange500] as const, glow: "rgba(236,72,153,0.45)" },
];

const ALL_FEATURES: {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title?: string;
  desc?: string;
  titleKey?: string;
  descKey?: string;
  gradient: readonly [string, string];
  badge: string | null;
}[] = [
  { id: "kcc", icon: "shield-checkmark", title: "Kids Control Center", desc: "Child-safe UI with screen time limits, focus mode & parent lock — built on AAP's 2023 digital wellness guidelines. Coming soon.", gradient: [brand.violet600, ACCENT_PINK], badge: "Coming Soon" },
  { id: "bt", icon: "stats-chart", title: "Behavior Tracking", desc: "Log daily behaviors, spot patterns, and track improvement over time. Grounded in ABC behavioral analysis.", gradient: [palette.emerald500, palette.cyan500], badge: "Popular" },
  { id: "grz", icon: "game-controller", title: "Gaming Reward Zone", desc: "Gamified milestones based on positive reinforcement — kids earn real rewards tied to real-world achievements.", gradient: [brandExtended.gold, palette.red500], badge: "New" },
  { id: "iph", icon: "heart-circle", titleKey: "landing.new_infant_title", descKey: "landing.new_infant_desc", gradient: [palette.blue400, palette.indigo500], badge: "New" },
  { id: "az", icon: "calculator", titleKey: "landing.new_abacus_title", descKey: "landing.new_abacus_desc", gradient: [palette.amber500, palette.red500], badge: "New" },
  { id: "pr", icon: "play-circle", title: "Parenting Reels", desc: "Short, expert-curated video reels on positive parenting techniques from leading child psychologists.", gradient: [brand.pink500, brand.purple500], badge: null },
  { id: "dpt", icon: "bulb", title: "Daily Parenting Tips", desc: "Science-backed tip delivered every day — personalized to your child's age per Piaget's framework.", gradient: [brandExtended.gold, palette.orange500], badge: null },
  { id: "lsz", icon: "accessibility", title: "Life Skills Zone", desc: "Teach independence — from dressing to cooking — with Montessori-aligned milestone tracking.", gradient: [brand.purple500, palette.indigo500], badge: null },
  { id: "oz", icon: "medal", title: "Olympiad Zone", desc: "Cognitive skill-building puzzles aligned with school Olympiad levels for kids aged 4–14.", gradient: [palette.amber500, palette.red500], badge: null },
  { id: "cs", icon: "color-palette", titleKey: "landing.new_coloring_title", descKey: "landing.new_coloring_desc", gradient: [brand.pink500, palette.orange500], badge: "New" },
  { id: "fs", icon: "document-text", titleKey: "landing.new_funsheets_title", descKey: "landing.new_funsheets_desc", gradient: [palette.cyan500, palette.emerald500], badge: "New" },
  { id: "dbp", icon: "grid", title: "Daily Brain Puzzles", desc: "Brain-boosting puzzles tailored to your child's cognitive stage — builds logic, creativity and working memory.", gradient: [palette.orange500, brand.purple500], badge: null },
  { id: "pa", icon: "book", title: "Parenting Articles", desc: "Deep-dive articles by child development experts on every stage of childhood.", gradient: [palette.blue500, palette.cyan500], badge: null },
  { id: "bp", icon: "people", title: "Babysitter Profiles", desc: "Create and share child care profiles securely. Routines, allergies, and notes — all in one safe place.", gradient: [palette.emerald500, brand.purple500], badge: null },
  { id: "pss", icon: "trophy", title: "Parent Score & Streaks", desc: "Gamified motivation — earn points, build streaks, and celebrate every parenting win.", gradient: [brandExtended.gold, palette.red500], badge: null },
];

const TESTIMONIALS = [
  { name: "Priya M.", location: "Mumbai, India", text: `${BRAND.aiName} built us a 12-step plan for tantrums. In 3 weeks, meltdowns went from daily to maybe twice a week. It felt like talking to an actual child psychologist.`, avatar: "P", color: brand.purple500, result: "Tantrums reduced 80% in 3 weeks" },
  { name: "Rahul & Kavya", location: "Bangalore, India", text: "The behavior tracker revealed our daughter gets difficult after 9 PM. We shifted her dinner by 30 mins and it completely changed our evenings.", avatar: "R", color: palette.cyan500, result: "Identified pattern in 5 days" },
  { name: "Sarah K.", location: "Dubai, UAE", text: `Twin toddlers + infant sleep tracker + ${BRAND.aiName}'s CDC-aligned tips = sanity saved. Got our 6-month-old sleeping through the night in 11 days.`, avatar: "S", color: brand.pink500, result: "Sleeping through night in 11 days" },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const floatY = useRef(new Animated.Value(0)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(24)).current;
  const marqueeX = useRef(new Animated.Value(0)).current;
  const [marqueeTotalW, setMarqueeTotalW] = useState(0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -10, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
    Animated.loop(
      Animated.timing(colorAnim, { toValue: 4, duration: 4000, easing: Easing.linear, useNativeDriver: false }),
    ).start();
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (marqueeTotalW <= 0) return;
    Animated.loop(
      Animated.timing(marqueeX, {
        toValue: -marqueeTotalW / 2,
        duration: 28000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [marqueeTotalW]);

  const titleColor = colorAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: [brand.primary, ACCENT_PINK, palette.sky300, brandExtended.gold, brand.primary],
  });

  const tap = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleStart = () => {
    tap();
    router.push("/sign-up");
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={["#0f0c29", "#302b63", "#24243e"]} // audit-ok: intentional dark bg / custom color
        locations={[0, 0.55, 1]}
        style={styles.container}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
      >
        {/* Glow blobs */}
        <View pointerEvents="none" style={styles.blobsContainer}>
          <View style={[styles.blob, styles.blob1]} />
          <View style={[styles.blob, styles.blob2]} />
          <View style={[styles.blob, styles.blob3]} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* NAV — minimal (matches web) */}
          <View style={styles.nav}>
            <View style={styles.navBrand}>
              <Text style={styles.navBrandText}>
                <Text style={styles.navBrandAmy}>{t("screens.welcome.amy")}</Text>
                <Text style={styles.navBrandNest}>{t("screens.welcome.nest")}</Text>
                <Text style={styles.navBrandAi}> AI</Text>
              </Text>
              <Text style={styles.navBrandTag}>{t("screens.welcome.where_smart_parenting_starts")}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Link href="/sign-in" asChild>
                <TouchableOpacity testID="link-sign-in" activeOpacity={0.7}>
                  <Text style={styles.navSignIn}>{t("landing.nav_sign_in")}</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>

          {/* HERO */}
          <Animated.View style={[styles.hero, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
            {/* Glass badge */}
            <View style={styles.badge}>
              <Ionicons name="sparkles" size={12} color={brand.violet300} />
              <Text style={styles.badgeText}>{t("landing.badge")}</Text>
            </View>

            {/* Floating logo — centered */}
            <Animated.View style={[styles.bigLogoWrap, { transform: [{ translateY: floatY }] }]}>
              <View style={styles.bigLogoGlow} />
              <Image source={LOGO} style={styles.bigLogoImg} resizeMode="contain" />
            </Animated.View>

            {/* Headline — color cycling */}
            <Animated.Text style={[styles.title, { color: titleColor }]}>
              {t("landing.hero_headline")}
            </Animated.Text>

            {/* Subtext */}
            <Text style={styles.subtitle}>
              {t("landing.hero_sub")}
            </Text>

            {/* Primary CTA */}
            <TouchableOpacity onPress={handleStart} activeOpacity={0.9} testID="button-hero-cta" style={styles.ctaWrap}>
              <LinearGradient
                colors={[brand.purple500, brand.pink500]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cta}
              >
                <Text style={styles.ctaText}>{t("landing.hero_cta")}</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.smallNote}>{t("landing.hero_free")}</Text>

            {/* Patent Pending trust line */}
            <View style={styles.patentTrustRow}>
              <Ionicons name="shield-checkmark" size={11} color="rgba(167,139,250,0.70)" />
              <Text style={styles.patentTrustText}>{t("patent_pending.trust_line")}</Text>
            </View>

            {/* Sign-in line */}
            <Link href="/sign-in" asChild>
              <TouchableOpacity activeOpacity={0.7} style={{ marginTop: 14 }} testID="link-sign-in-hero">
                <Text style={styles.signInLine}>
                  Already a Smart Parent?{" "}
                  <Text style={styles.signInLineEmphasis}>{t("screens.welcome.kindly_sign_in")}</Text>
                </Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>

          {/* SCIENCE CITATIONS MARQUEE */}
          <View style={styles.marqueeWrap}>
            <View style={styles.marqueeBorder} />
            <View style={styles.marqueeClip}>
              <Animated.View
                style={[styles.marqueeTrack, { transform: [{ translateX: marqueeX }] }]}
                onLayout={(e) => setMarqueeTotalW(e.nativeEvent.layout.width)}
              >
                {[...SCIENCE_CITATIONS, ...SCIENCE_CITATIONS].map((cite, i) => (
                  <View key={i} style={styles.marqueeItem}>
                    <Text style={styles.marqueeText}>{cite}</Text>
                  </View>
                ))}
              </Animated.View>
            </View>
            <View style={styles.marqueeBorder} />
          </View>

          {/* PROBLEM HOOK */}
          <View style={styles.sectionWrap}>
            <View style={styles.eyebrow}>
              <Ionicons name="sparkles" size={11} color={brand.pink400} />
              <Text style={styles.eyebrowText}>{t("landing.problems_eyebrow")}</Text>
            </View>
            <Text style={styles.sectionTitle}>{t("landing.problems_heading")}</Text>
            <Text style={styles.sectionSub}>{t("landing.problems_sub")}</Text>

            <View style={styles.problemsGrid}>
              {PROBLEMS.map((p) => (
                <View key={p.labelKey} style={styles.problemCard}>
                  <View
                    style={[
                      styles.problemIcon,
                      { backgroundColor: `${p.color}25`, borderColor: `${p.color}55` },
                    ]}
                  >
                    <Ionicons name={p.icon} size={18} color={p.color} />
                  </View>
                  <Text style={styles.problemLabel} numberOfLines={2}>
                    {t(p.labelKey)}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={styles.problemFooter}>{t("landing.not_alone")}</Text>
          </View>

          {/* AMY COACH — CORE FEATURE */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>{t("landing.features_heading")}</Text>
            <Text style={styles.sectionSub}>{t("landing.features_sub")}</Text>

            <View style={styles.coachCard}>
              <View style={styles.coachHeaderRow}>
                <LinearGradient
                  colors={[brand.purple500, brand.indigo500] as const}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.coachIcon}
                >
                  <Ionicons name="bulb" size={26} color="#fff" />
                </LinearGradient>
                <View style={styles.coachHeaderText}>
                  <View style={styles.coachTitleRow}>
                    <Text style={styles.coachTitle}>{t("screens.welcome.amy_coach")}</Text>
                    <LinearGradient
                      colors={[brand.purple500, brand.pink500] as const}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.corePill}
                    >
                      <Text style={styles.corePillText}>{t("landing.core_feature")}</Text>
                    </LinearGradient>
                  </View>
                </View>
              </View>
              <Text style={styles.coachSub}>{t("landing.coach_desc")}</Text>
              <View style={styles.coachBullets}>
                {COACH_HIGHLIGHT_KEYS.map((key) => (
                  <View key={key} style={styles.coachBullet}>
                    <Ionicons name="checkmark-circle" size={18} color={brand.violet300} />
                    <Text style={styles.coachBulletText}>{t(key)}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Kids Control Center featured card */}
            <View style={styles.kidsCCCard}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
                <LinearGradient
                  colors={[brand.violet600, ACCENT_PINK]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.kidsCCIcon}
                >
                  <Ionicons name="shield-checkmark" size={24} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <Text style={styles.kidsCCTitle}>{t("screens.welcome.kids_control_center")}</Text>
                    <LinearGradient
                      colors={[brand.violet600, ACCENT_PINK]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.comingSoonPill}
                    >
                      <Text style={styles.comingSoonText}>{t("screens.welcome.coming_soon")}</Text>
                    </LinearGradient>
                  </View>
                  <Text style={styles.kidsCCDesc}>
                    A dedicated child-safe experience built on AAP's 2023 digital wellness guidelines — screen time limits, focus mode, parent lock, and synced routines.
                  </Text>
                </View>
              </View>
              <View style={styles.kidsCCBullets}>
                {KIDS_CC_BULLETS.map((feat) => (
                  <View key={feat} style={styles.kidsCCBullet}>
                    <Ionicons name="checkmark-circle" size={16} color={palette.pink300} />
                    <Text style={styles.kidsCCBulletText}>{feat}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Secondary features grid (2-col) */}
            <View style={styles.secondaryGrid}>
              {SECONDARY_FEATURES.map((f) => (
                <View key={f.titleKey} style={styles.secondaryCard}>
                  <LinearGradient
                    colors={f.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.secondaryIcon}
                  >
                    <Ionicons name={f.icon} size={20} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.secondaryTitle}>{t(f.titleKey)}</Text>
                  <Text style={styles.secondaryDesc}>{t(f.descKey)}</Text>
                </View>
              ))}
            </View>

            {/* Mid CTA */}
            <Text style={styles.midCtaText}>{t("landing.mid_cta")}</Text>
            <TouchableOpacity onPress={handleStart} activeOpacity={0.9} testID="button-features-cta" style={[styles.ctaWrap, { marginTop: 14 }]}>
              <LinearGradient
                colors={[brand.purple500, brand.pink500] as const}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.cta, { minWidth: 220, paddingVertical: 14 }]}
              >
                <Text style={[styles.ctaText, { fontSize: 15 }]}>{t("landing.mid_cta_btn")}</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* WHAT'S NEW IN PARENT HUB */}
          <View style={styles.sectionWrap}>
            <View style={styles.eyebrow}>
              <Ionicons name="star" size={11} color={palette.amber400} />
              <Text style={styles.eyebrowText}>{t("landing.whats_new_eyebrow")}</Text>
            </View>
            <Text style={styles.sectionTitle}>{t("landing.whats_new_heading")}</Text>
            <Text style={styles.sectionSub}>{t("landing.whats_new_sub")}</Text>

            <View style={{ gap: 12, marginTop: 16 }}>
              {NEW_HUB_FEATURES.map((nf) => (
                <View
                  key={nf.titleKey}
                  style={{
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.04)",
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 14,
                    shadowColor: nf.glow,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.5,
                    shadowRadius: 12,
                    elevation: 4,
                  }}
                >
                  <LinearGradient
                    colors={nf.gradient}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.featureIcon}
                  >
                    <Ionicons name={nf.icon} size={18} color="#fff" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <Text style={[styles.featureTitle, { marginBottom: 0 }]}>{t(nf.titleKey)}</Text>
                      <View style={[styles.featureBadge, { backgroundColor: palette.cyan700, marginTop: 0 }]}>
                        <Text style={styles.featureBadgeText}>{t("landing.new_badge")}</Text>
                      </View>
                    </View>
                    <Text style={styles.featureDesc}>{t(nf.descKey)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* ALL FEATURES MEGA GRID */}
          <View style={styles.sectionWrap}>
            <View style={styles.eyebrow}>
              <Ionicons name="sparkles" size={11} color={palette.cyan400} />
              <Text style={styles.eyebrowText}>{t("screens.welcome.everything_in_one_app")}</Text>
            </View>
            <Text style={styles.sectionTitle}>{t("screens.welcome.14_science_backed_tools")}</Text>
            <Text style={styles.sectionSub}>{t("screens.welcome.from_newborns_to_teens_every_feature_gro")}</Text>

            <View style={styles.featuresGrid}>
              {ALL_FEATURES.map((f) => (
                <View key={f.id} style={styles.featureCard}>
                  {f.badge && (
                    <View style={[
                      styles.featureBadge,
                      { backgroundColor: f.badge === "New" ? palette.cyan700 : f.badge === "Popular" ? brand.violet600 : palette.orange800 },
                    ]}>
                      <Text style={styles.featureBadgeText}>{f.badge === "New" ? t("landing.new_badge") : f.badge}</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                    <LinearGradient
                      colors={f.gradient}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={styles.featureIcon}
                    >
                      <Ionicons name={f.icon} size={18} color="#fff" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.featureTitle}>{f.titleKey ? t(f.titleKey) : f.title}</Text>
                      <Text style={styles.featureDesc}>{f.descKey ? t(f.descKey) : f.desc}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity onPress={handleStart} activeOpacity={0.9} style={[styles.ctaWrap, { marginTop: 20 }]}>
              <LinearGradient
                colors={[brand.purple500, brand.pink500]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[styles.cta, { minWidth: 240, paddingVertical: 14 }]}
              >
                <Text style={[styles.ctaText, { fontSize: 15 }]}>{t("screens.welcome.unlock_all_features_free")}</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.smallNote}>{t("screens.welcome.free_plan_included_upgrade_anytime")}</Text>
          </View>

          {/* HOW IT WORKS */}
          <View style={styles.sectionWrap}>
            <View style={styles.eyebrow}>
              <Ionicons name="flash" size={11} color={brandExtended.gold} />
              <Text style={styles.eyebrowText}>{t("landing.how_eyebrow")}</Text>
            </View>
            <Text style={styles.sectionTitle}>{t("landing.how_heading")}</Text>
            <Text style={styles.sectionSub}>{t("landing.how_sub")}</Text>

            {STEPS.map((s, idx) => (
              <View key={s.titleKey} style={styles.stepCard}>
                <LinearGradient
                  colors={[brand.purple500, brand.pink500] as const}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.stepNumber}
                >
                  <Text style={styles.stepNumberText}>{idx + 1}</Text>
                </LinearGradient>
                <LinearGradient
                  colors={[brand.purple500, brand.indigo500] as const}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.stepIcon}
                >
                  <Ionicons name={s.icon} size={22} color="#fff" />
                </LinearGradient>
                <Text style={styles.stepTitle}>{t(s.titleKey)}</Text>
                <Text style={styles.stepDesc}>{t(s.descKey)}</Text>
              </View>
            ))}
          </View>

          {/* TESTIMONIALS */}
          <View style={styles.sectionWrap}>
            <View style={styles.eyebrow}>
              <Ionicons name="heart" size={11} color={brand.pink400} />
              <Text style={styles.eyebrowText}>{t("screens.welcome.parent_stories")}</Text>
            </View>
            <Text style={styles.sectionTitle}>{t("screens.welcome.real_parents_real_results")}</Text>
            <Text style={styles.sectionSub}>{t("screens.welcome.thousands_of_families_use_amynest_every")}</Text>

            {TESTIMONIALS.map((t) => (
              <View key={t.name} style={styles.testimonialCard}>
                {/* Stars */}
                <View style={{ flexDirection: "row", gap: 2, marginBottom: 10 }}>
                  {[1,2,3,4,5].map((s) => (
                    <Ionicons key={s} name="star" size={14} color={palette.amber400} />
                  ))}
                </View>
                {/* Outcome badge */}
                <View style={[styles.outcomeBadge, { backgroundColor: `${t.color}33`, borderColor: `${t.color}55` }]}>
                  <Ionicons name="bar-chart" size={11} color={t.color} />
                  <Text style={[styles.outcomeBadgeText, { color: t.color }]}>{t.result}</Text>
                </View>
                {/* Quote */}
                <Text style={styles.testimonialQuote}>"{t.text}"</Text>
                {/* Author */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 }}>
                  <View style={[styles.testimonialAvatar, { backgroundColor: t.color }]}>
                    <Text style={styles.testimonialAvatarText}>{t.avatar}</Text>
                  </View>
                  <View>
                    <Text style={styles.testimonialName}>{t.name}</Text>
                    <Text style={styles.testimonialLocation}>{t.location}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* TRUST / SCIENCE */}
          <View style={styles.trustWrap}>
            <View style={styles.trustHeaderIcon}>
              <Ionicons name="shield-checkmark" size={26} color="#fff" />
            </View>
            <Text style={styles.trustTitle}>{t("landing.trust_heading")}</Text>
            <Text style={styles.trustSub}>{t("landing.trust_sub")}</Text>
            {TRUST_PILLARS.map((pillar) => (
              <View key={pillar.titleKey} style={styles.trustCard}>
                <View style={styles.trustCardIcon}>
                  <Ionicons name={pillar.icon} size={18} color={brand.violet300} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trustCardTitle}>{t(pillar.titleKey)}</Text>
                  <Text style={styles.trustCardDesc}>{t(pillar.descKey)}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* FINAL CTA */}
          <View style={styles.finalCtaCard}>
            <LinearGradient
              colors={[brand.purple500, brand.pink500]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.finalCtaIcon}
            >
              <Ionicons name="chatbubble-ellipses" size={28} color="#fff" />
            </LinearGradient>
            <Text style={styles.finalCtaTitle}>{t("landing.final_cta_heading")}</Text>
            <Text style={styles.finalCtaSub}>{t("landing.final_cta_sub")}</Text>
            <TouchableOpacity onPress={handleStart} activeOpacity={0.9} testID="button-final-cta" style={styles.ctaWrap}>
              <LinearGradient
                colors={[brand.purple500, brand.pink500]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cta}
              >
                <Text style={styles.ctaText}>{t("landing.final_cta_btn")}</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <View style={styles.footerBrand}>
              <Text style={styles.footerBrandText}>
                <Text style={styles.navBrandAmy}>{t("screens.welcome.amy")}</Text>
                <Text style={styles.navBrandNest}>{t("screens.welcome.nest")}</Text>
                <Text style={styles.navBrandAi}> AI</Text>
              </Text>
            </View>
            <Text style={styles.footerTag}>{t("screens.welcome.where_smart_parenting_starts")}</Text>
            {/* Patent Pending badge */}
            <View style={styles.patentBadge}>
              <Ionicons name="ribbon" size={10} color="rgba(167,139,250,0.65)" />
              <Text style={styles.patentBadgeText}>{t("patent_pending.footer_label")}</Text>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Glow blobs */
  blobsContainer: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  blob: { position: "absolute", borderRadius: 9999 },
  blob1: { width: 420, height: 420, top: -120, left: -120, backgroundColor: brandAlpha.purple500_30 },
  blob2: { width: 480, height: 480, top: 280, right: -160, backgroundColor: "rgba(59,130,246,0.25)" },
  blob3: { width: 360, height: 360, bottom: -60, left: 40, backgroundColor: "rgba(236,72,153,0.20)" },

  scroll: { paddingHorizontal: 20 },

  /* NAV (matches web) */
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  navBrand: { flexDirection: "column", gap: 1 },
  navBrandText: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  navBrandAmy: {
    color: brand.purple500,
    fontFamily: "Inter_700Bold",
  },
  navBrandNest: {
    color: brand.pink500,
    fontFamily: "Inter_700Bold",
  },
  navBrandAi: {
    color: palette.cyan500,
    fontFamily: "Inter_700Bold",
  },
  navBrandTag: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 0.5,
  },
  navSignIn: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  langPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  langPillText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontFamily: "Inter_600SemiBold",
  },
  langOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  langSheet: {
    backgroundColor: "#14142B", // audit-ok: intentional dark bg / custom color
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 8,
    width: 260,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  langSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: 16,
  },
  langSheetTitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  langOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  langOptionActive: {
    backgroundColor: brandAlpha.purple500_15,
  },
  langOptionText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Inter_500Medium",
  },
  langOptionTextActive: {
    color: brand.violet300,
    fontFamily: "Inter_600SemiBold",
  },

  /* HERO */
  hero: { alignItems: "center", paddingTop: 32, paddingBottom: 40 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 28,
  },
  badgeText: {
    color: "rgba(255,255,255,0.80)",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },

  /* Logo */
  bigLogoWrap: {
    width: 144,
    height: 144,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  bigLogoGlow: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 999,
    backgroundColor: brandAlpha.purple500_45,
    opacity: 0.7,
  },
  bigLogoImg: { width: 144, height: 144, borderRadius: 999 },

  /* Headline */
  title: {
    fontSize: 40,
    lineHeight: 44,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: -1,
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  subtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 12,
    marginBottom: 28,
  },

  /* CTA */
  ctaWrap: { width: "100%", alignItems: "center" },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 18,
    minWidth: 280,
    shadowColor: brand.purple500,
    shadowOpacity: 0.5,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  ctaText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  smallNote: {
    color: "rgba(255,255,255,0.50)",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 18,
    textAlign: "center",
  },
  signInLine: {
    color: "rgba(255,255,255,0.60)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  signInLineEmphasis: {
    color: brand.violet300,
    fontFamily: "Inter_700Bold",
    textDecorationLine: "underline",
  },

  /* SECTIONS — shared */
  sectionWrap: { paddingTop: 16, paddingBottom: 32 },
  eyebrow: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 12,
  },
  eyebrowText: {
    color: "rgba(255,255,255,0.80)",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 26,
    lineHeight: 32,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  sectionSub: {
    color: "rgba(255,255,255,0.60)",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    marginBottom: 22,
    paddingHorizontal: 10,
  },

  /* PROBLEMS */
  problemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  problemCard: {
    width: "48%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  problemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  problemLabel: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  problemFooter: {
    color: "rgba(255,255,255,0.70)",
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_500Medium",
    fontStyle: "italic",
    textAlign: "center",
    paddingHorizontal: 10,
  },

  /* COACH CARD */
  coachCard: {
    backgroundColor: brandAlpha.purple500_10,
    borderWidth: 1,
    borderColor: brandAlpha.purple500_35,
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
    overflow: "hidden",
  },
  coachHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 14,
  },
  coachIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: brand.purple500,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  coachHeaderText: { flex: 1, paddingTop: 4 },
  coachTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  coachTitle: {
    color: "#fff",
    fontSize: 19,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  corePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  corePillText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  coachSub: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
  },
  coachBullets: { gap: 8 },
  coachBullet: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  coachBulletText: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },

  /* SECONDARY FEATURES (2-col grid) */
  secondaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  secondaryCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  secondaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryTitle: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  secondaryDesc: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Inter_400Regular",
  },
  midCtaText: {
    color: "rgba(255,255,255,0.80)",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginTop: 22,
  },

  /* HOW IT WORKS */
  stepCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 22,
    padding: 20,
    paddingTop: 24,
    marginBottom: 12,
    position: "relative",
  },
  stepNumber: {
    position: "absolute",
    top: -12,
    left: -10,
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: brand.pink500,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  stepNumberText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  stepTitle: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  stepDesc: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
  },

  /* TRUST */
  trustWrap: {
    backgroundColor: brandAlpha.indigo500_10,
    borderWidth: 1,
    borderColor: brandAlpha.purple500_25,
    borderRadius: 26,
    padding: 22,
    marginBottom: 18,
    alignItems: "center",
  },
  trustHeaderIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: brand.indigo500,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: brand.indigo500,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  trustTitle: {
    color: "#fff",
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  trustSub: {
    color: "rgba(255,255,255,0.70)",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  trustCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    width: "100%",
  },
  trustCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: brandAlpha.purple500_20,
    borderWidth: 1,
    borderColor: brandAlpha.purple500_35,
    alignItems: "center",
    justifyContent: "center",
  },
  trustCardTitle: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  trustCardDesc: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_400Regular",
  },

  /* FINAL CTA */
  finalCtaCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 32,
  },
  finalCtaIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    shadowColor: brand.pink500,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  finalCtaTitle: {
    color: "#fff",
    fontSize: 24,
    lineHeight: 30,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  finalCtaSub: {
    color: "rgba(255,255,255,0.70)",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    marginBottom: 22,
  },

  /* SCIENCE CITATIONS MARQUEE */
  marqueeWrap: {
    marginHorizontal: -20,
    marginBottom: 20,
    marginTop: 4,
  },
  marqueeBorder: {
    height: 1,
    backgroundColor: "rgba(168,85,247,0.15)",
  },
  marqueeClip: {
    overflow: "hidden",
    paddingVertical: 10,
    backgroundColor: "rgba(168,85,247,0.04)",
  },
  marqueeTrack: {
    flexDirection: "row",
    gap: 10,
  },
  marqueeItem: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    flexShrink: 0,
  },
  marqueeText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_500Medium",
  },

  /* KIDS CONTROL CENTER CARD */
  kidsCCCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    backgroundColor: "rgba(123,63,242,0.08)",
    borderWidth: 1,
    borderColor: "rgba(123,63,242,0.30)",
    overflow: "hidden",
  },
  kidsCCIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ACCENT_PINK,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  kidsCCTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    lineHeight: 22,
  },
  comingSoonPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  comingSoonText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  kidsCCDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  kidsCCBullets: {
    gap: 8,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  kidsCCBullet: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    flexBasis: "47%",
    flexGrow: 1,
  },
  kidsCCBulletText: {
    fontSize: 11.5,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.85)",
    flex: 1,
  },

  /* ALL FEATURES GRID */
  featuresGrid: {
    gap: 10,
    marginTop: 14,
  },
  featureCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    position: "relative",
    overflow: "hidden",
  },
  featureBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  featureBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginBottom: 4,
    lineHeight: 18,
  },
  featureDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.60)",
    lineHeight: 17,
  },

  /* TESTIMONIALS */
  testimonialCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  outcomeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 12,
  },
  outcomeBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  testimonialQuote: {
    fontSize: 13.5,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.80)",
    lineHeight: 20,
  },
  testimonialAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  testimonialAvatarText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  testimonialName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  testimonialLocation: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.50)",
    marginTop: 1,
  },

  /* FOOTER */
  footer: {
    paddingTop: 22,
    paddingBottom: 8,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
    gap: 6,
  },
  footerBrand: { flexDirection: "row", alignItems: "center", gap: 8 },
  footerLogo: { width: 24, height: 24, borderRadius: 6 },
  footerBrandText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.80)",
  },
  footerTag: {
    fontSize: 11,
    color: "rgba(255,255,255,0.40)",
    fontFamily: "Inter_500Medium",
  },

  /* Patent Pending — hero trust line */
  patentTrustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.20)",
    backgroundColor: "rgba(167,139,250,0.07)",
  },
  patentTrustText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "rgba(167,139,250,0.70)",
    letterSpacing: 0.3,
  },

  /* Patent Pending — footer badge */
  patentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.18)",
    backgroundColor: "rgba(167,139,250,0.06)",
  },
  patentBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(167,139,250,0.60)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
});
