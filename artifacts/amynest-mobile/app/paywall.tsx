import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { getLocales } from "expo-localization";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import type { Plan } from "@/services/subscriptionApi";
import { brand, ACCENT_PINK, palette } from "@/constants/colors";
import { BRAND } from "@/constants/brand";
import { presentRCPaywall } from "@/lib/revenuecat";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const REASON_COPY: Record<
  string,
  { title: string; subtitle: string; icon: IconName }
> = {
  ai_quota: {
    title: `Unlock unlimited ${BRAND.aiName} AI`,
    subtitle: "You've used today's free queries. Go premium for unlimited support.",
    icon: "chatbubbles",
  },
  personalized_coaching: {
    title: "Unlock Personalized Coaching",
    subtitle: `${BRAND.aiName} adapts to your child and gives you smart, tailored next steps.`,
    icon: "school",
  },
  premium_insight: {
    title: "Unlock Premium Insights",
    subtitle: "Behavior analysis and trend insights — only on premium.",
    icon: "analytics",
  },
  child_limit: {
    title: "Add unlimited children",
    subtitle: "Free includes 1 child profile. Upgrade for unlimited.",
    icon: "people",
  },
  audio_lessons: {
    title: "Unlock Audio Lessons",
    subtitle: "Calming bedtime stories, focus tracks & guided meditations — anytime, ad-free.",
    icon: "headset",
  },
  routines_limit: {
    title: "Generate unlimited routines",
    subtitle: "Free plan includes 1 routine. Upgrade to plan every day, every child, your way.",
    icon: "calendar",
  },
  behavior_locked: {
    title: "Unlock unlimited Behavior Logs",
    subtitle: `Free plan includes 1 log. Upgrade to track every win, tantrum & pattern ${BRAND.aiName} spots.`,
    icon: "bar-chart",
  },
  child_locked: {
    title: "Upgrade to track all your children",
    subtitle: "Free plan covers your first child only. Upgrade to log and view behavior data for every child.",
    icon: "people",
  },
  coach_locked: {
    title: `Unlock ${BRAND.aiName} Coach`,
    subtitle: "Get personalized 10–12 step plans for tantrums, screen time, focus & more.",
    icon: "school",
  },
  hub_locked: {
    title: "Unlock the full Parenting Hub",
    subtitle: "All activities, Olympiad prep & life skills — unlocked on premium.",
    icon: "grid",
  },
  hub_phonics_learning: {
    title: "Unlock Phonics Learning",
    subtitle: "Daily phonics lessons that build reading fluency, step by step.",
    icon: "book",
  },
  hub_phonics_test: {
    title: "Unlock Phonics Tests",
    subtitle: "Adaptive phonics quizzes that track your child's reading progress.",
    icon: "checkmark-circle",
  },
  hub_kids_control_center: {
    title: "Unlock Kids Control Center",
    subtitle: "Manage screen time, app limits & device controls for every child.",
    icon: "shield-checkmark",
  },
  hub_nutrition: {
    title: "Unlock Nutrition Coach",
    subtitle: "Smart meal ideas, allergy-aware recipes & growth-stage nutrition tips.",
    icon: "nutrition",
  },
  hub_art_craft: {
    title: "Unlock Art & Craft",
    subtitle: "Hands-on art ideas and craft reels for creative play every day.",
    icon: "color-palette",
  },
  hub_worksheets: {
    title: "Unlock Printable Worksheets",
    subtitle: "Hundreds of printable worksheets across phonics, math & life skills.",
    icon: "document-text",
  },
  hub_facts: {
    title: "Unlock Amazing Facts",
    subtitle: "Age-perfect daily facts that spark curiosity and conversation.",
    icon: "sparkles",
  },
  hub_skills_focus: {
    title: "Unlock This Week's Skills Focus",
    subtitle: "Weekly skill themes with curated activities tailored to your child's age.",
    icon: "bulb",
  },
  hub_daily_story: {
    title: "Unlock the Daily Story",
    subtitle: "A new age-appropriate story every day — perfect for bedtime.",
    icon: "book",
  },
  hub_daily_puzzle: {
    title: "Unlock the Daily Puzzle",
    subtitle: "A fresh brain-teaser every day to build logic and focus.",
    icon: "extension-puzzle",
  },
  hub_gaming_rewards: {
    title: "Unlock Gaming Rewards",
    subtitle: "Turn screen time into earned playtime with reward-based mini games.",
    icon: "game-controller",
  },
  hub_rewards_shop: {
    title: "Unlock the Rewards Shop",
    subtitle: "Let kids redeem stars for rewards you choose — chores made fun.",
    icon: "gift",
  },
  hub_audio_lessons: {
    title: "Unlock Audio Lessons",
    subtitle: "Calming bedtime stories, focus tracks & guided meditations — anytime, ad-free.",
    icon: "headset",
  },
  hub_amy: {
    title: "Unlock Ask " + BRAND.aiName,
    subtitle: "Unlimited parenting answers, smart prompts & personalized guidance.",
    icon: "chatbubbles",
  },
  hub_command_center: {
    title: "Unlock the Parent Command Center",
    subtitle: "One place to see today's plan, alerts & quick parent actions.",
    icon: "speedometer",
  },
  hub_infant_hub: {
    title: "Unlock the Infant Hub",
    subtitle: "Feeding, sleep & milestone tracking tuned for the early years.",
    icon: "happy",
  },
  hub_tomorrow_forecast: {
    title: "Unlock Tomorrow's Forecast",
    subtitle: "A heads-up on tomorrow's mood, energy & focus windows.",
    icon: "sunny",
  },
  hub_today_plan: {
    title: "Unlock Today's Plan",
    subtitle: "Your child's full daily routine — generated, smart, and editable.",
    icon: "calendar",
  },
  hub_parent_tasks: {
    title: "Unlock Parent Tasks for Today",
    subtitle: "Bite-size 'things you can do today' suggestions tailored to your child's age.",
    icon: "checkbox",
  },
  feature: {
    title: "Unlock Full Parenting Power",
    subtitle: "Get unlimited AI, smart coaching, and premium insights.",
    icon: "sparkles",
  },
  section_locked: {
    title: "Unlock Full Parenting Power",
    subtitle:
      "You've explored 1 feature. Unlock unlimited routines, full AI personalization, all activities & smart insights.",
    icon: "sparkles",
  },
};

// Canonical feature list shown on all plans when API features aren't loading
const FALLBACK_FEATURES = [
  "Unlimited Amy AI coaching",
  "Personalized daily routines",
  "Full Parenting Hub access",
  "Behavior insights & trends",
  "Priority support",
];

export default function PaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const reasonKey = reason ?? "feature";
  const baseCopy = REASON_COPY[reasonKey] ?? REASON_COPY.feature;
  const copy = {
    icon: baseCopy.icon,
    title: t(`screens.paywall.reasons.${reasonKey}.title`, { defaultValue: baseCopy.title }),
    subtitle: t(`screens.paywall.reasons.${reasonKey}.subtitle`, { defaultValue: baseCopy.subtitle }),
  };

  const plans = useSubscriptionStore((s) => s.plans);
  const ent = useSubscriptionStore((s) => s.entitlements);
  const loading = useSubscriptionStore((s) => s.loading);
  const load = useSubscriptionStore((s) => s.load);
  const refresh = useSubscriptionStore((s) => s.refresh);
  const upgrade = useSubscriptionStore((s) => s.upgrade);
  const upgradeRazorpay = useSubscriptionStore((s) => s.upgradeRazorpay);
  const beginTrial = useSubscriptionStore((s) => s.beginTrial);

  const [selected, setSelected] = useState<Exclude<Plan, "free">>("six_month");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Razorpay (Google Play UCB alternative billing) is an India-only gateway.
  // Per Google Play UCB policy: Google Play Billing MUST be the primary option.
  // Razorpay appears below as the clearly-labelled alternative. iOS never reaches this.
  const deviceRegion = getLocales()[0]?.regionCode ?? null;
  const showRazorpay = Platform.OS === "android" && deviceRegion === "IN";

  const canStartTrial =
    !!ent &&
    ent.plan === "free" &&
    !ent.isTrialing &&
    !ent.trialEndsAt &&
    (ent.limits?.trialDays ?? 0) > 0;
  const trialDays = ent?.limits?.trialDays ?? 7;

  useEffect(() => {
    if (plans.length === 0 && !loading) void load();
  }, [plans.length, loading, load]);

  const selectedPlan = plans.find((p) => p.id === selected);
  const displayFeatures =
    selectedPlan && selectedPlan.features.length > 0
      ? selectedPlan.features
      : FALLBACK_FEATURES;

  const onUpgrade = async () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);
    setNotice(null);

    // iOS: RevenueCat's native Paywall Editor (Apple IAP — handles plan selection internally).
    // Android: custom flow so we can present Google Play Billing as primary + Razorpay UCB.
    if (Platform.OS === "ios") {
      const res = await presentRCPaywall();
      setSubmitting(false);
      if (res.purchased || res.restored) {
        void refresh();
        router.back();
      }
      return;
    }

    const res = await upgrade(selected);
    setSubmitting(false);
    if (res.ok) {
      router.back();
    } else if (res.userCancelled) {
      // user dismissed — no error message
    } else {
      setNotice(
        res.reason ?? "Checkout is not yet available. Try again soon or contact support.",
      );
    }
  };

  const onUpgradeRazorpay = async () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);
    setNotice(null);
    const res = await upgradeRazorpay(selected);
    setSubmitting(false);
    if (res.ok) {
      router.back();
    } else if (!res.userCancelled) {
      setNotice(res.reason ?? "UPI / card checkout failed.");
    }
  };

  const onTrial = async () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSubmitting(true);
    await beginTrial();
    setSubmitting(false);
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Deep dark gradient — matches brand dark theme */}
      <LinearGradient
        colors={["#0A0614", "#160B2E", "#0D0820", "#0A0614"]} // audit-ok: intentional dark bg / custom color
        locations={[0, 0.35, 0.7, 1]}
        style={styles.bg}
      >
        {/* Decorative ambient glows */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={styles.glowTopLeft} />
          <View style={styles.glowTopRight} />
          <View style={styles.glowBottom} />
        </View>

        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t("screens.paywall.back")}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={18} color="rgba(255,255,255,0.85)" />
            <Text style={styles.backText}>{t("screens.paywall.back")}</Text>
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t("screens.paywall.close")}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand header ─────────────────────────────────────────── */}
          <View style={styles.brandHeader}>
            <Image
              source={require("@/assets/images/amynest-logo-face.png")}
              style={styles.brandLogo}
              resizeMode="contain"
              accessibilityLabel="AmyNest AI logo" // i18n-ok: brand name in a11y label
            />
            <View style={styles.brandTextRow}>
              <LinearGradient
                colors={[brand.primary, ACCENT_PINK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.brandGradientBox}
              >
                <Text style={styles.brandName}>{BRAND.appName}</Text>
              </LinearGradient>
              <Text style={styles.premiumLabel}> PREMIUM</Text>{/* i18n-ok: brand label */}
            </View>

            {/* Patent Pending badge */}
            <View style={styles.patentBadge}>
              <Ionicons name="shield-checkmark" size={11} color={brand.violet300} />
              <Text style={styles.patentText}>Patent Pending Technology</Text>{/* i18n-ok: patent legal brand phrase */}
            </View>
          </View>

          {/* ── Reason hero ──────────────────────────────────────────── */}
          <View style={styles.hero}>
            <LinearGradient
              colors={[brand.primary, ACCENT_PINK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroIcon}
            >
              <Ionicons name={copy.icon} size={24} color="#fff" />
            </LinearGradient>
            <Text style={styles.heroTitle}>{copy.title}</Text>
            <Text style={styles.heroSub}>{copy.subtitle}</Text>
          </View>

          {/* ── Plan selector tabs ───────────────────────────────────── */}
          {loading && plans.length === 0 ? (
            <ActivityIndicator color={brand.violet400} style={{ marginVertical: 32 }} />
          ) : (
            <>
              <View style={styles.planTabs}>
                {(plans.length > 0
                  ? plans
                  : [
                      { id: "monthly" as Exclude<Plan, "free">, title: "Monthly", price: 0, currency: "INR", period: "month", badge: null, features: [] },
                      { id: "six_month" as Exclude<Plan, "free">, title: "6 Months", price: 0, currency: "INR", period: "6 months", badge: "Most Popular", features: [] },
                      { id: "yearly" as Exclude<Plan, "free">, title: "Yearly", price: 0, currency: "INR", period: "year", badge: "Best Value", features: [] },
                    ]
                ).map((p) => {
                  const isSelected = p.id === selected;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => {
                        if (Platform.OS !== "web") void Haptics.selectionAsync();
                        setSelected(p.id);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${p.title} plan`}
                      style={[styles.planTab, isSelected && styles.planTabSelected]}
                    >
                      {p.badge && (
                        <View style={styles.tabBadge}>
                          <Text style={styles.tabBadgeText}>{p.badge}</Text>
                        </View>
                      )}
                      <Text style={[styles.planTabText, isSelected && styles.planTabTextSelected]}>
                        {p.title}
                      </Text>
                      {p.price > 0 && (
                        <Text style={[styles.planTabPrice, isSelected && styles.planTabPriceSelected]}>
                          ₹{p.price}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* ── Selected plan detail card ─────────────────────────── */}
              <View style={styles.planCard}>
                {/* Card glow border */}
                <LinearGradient
                  colors={[brand.primary, ACCENT_PINK, brand.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.planCardBorder}
                >
                  <View style={styles.planCardInner}>
                    {/* Price row */}
                    {selectedPlan && selectedPlan.price > 0 && (
                      <View style={styles.priceBlock}>
                        <View style={styles.priceRow}>
                          <Text style={styles.priceCurrency}>₹</Text>
                          <Text style={styles.priceAmount}>{selectedPlan.price}</Text>
                          <Text style={styles.pricePeriod}>/ {selectedPlan.period}</Text>
                        </View>
                        {typeof selectedPlan.savingsPercent === "number" &&
                          selectedPlan.savingsPercent > 0 && (
                            <View style={styles.savingsPill}>
                              <Text style={styles.savingsText}>
                                Save {selectedPlan.savingsPercent}%
                              </Text>
                            </View>
                          )}
                      </View>
                    )}

                    {/* Divider */}
                    <View style={styles.cardDivider} />

                    {/* Features */}
                    <Text style={styles.featuresLabel}>WHAT YOU GET</Text>{/* i18n-ok: paywall section header */}
                    <View style={styles.featureList}>
                      {displayFeatures.map((f, i) => (
                        <View key={i} style={styles.featureRow}>
                          <LinearGradient
                            colors={[brand.primary, ACCENT_PINK]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.featureCheckBg}
                          >
                            <Ionicons name="checkmark" size={11} color="#fff" />
                          </LinearGradient>
                          <Text style={styles.featureText}>{f}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Patent Pending powered-by line */}
                    <View style={styles.poweredBy}>
                      <Ionicons name="sparkles" size={11} color={brand.violet400} />
                      <Text style={styles.poweredByText}>
                        Powered by Patent-Pending Adaptive AI
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </>
          )}

          {/* ── Error notice ─────────────────────────────────────────── */}
          {notice && (
            <View style={styles.noticeBox}>
              <Ionicons name="information-circle" size={16} color={palette.amber300} />
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          )}

          {/* ── Primary CTA — Google Play Billing (Android) / RevenueCat (iOS) ── */}
          <Pressable
            disabled={submitting || plans.length === 0}
            onPress={onUpgrade}
            style={({ pressed }) => [
              styles.primaryWrap,
              pressed && { opacity: 0.88 },
              (submitting || plans.length === 0) && { opacity: 0.55 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              Platform.OS === "android" ? "Pay with Google Play" : "Upgrade Now"
            }
          >
            <LinearGradient
              colors={[brand.primary, ACCENT_PINK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtn}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  {Platform.OS === "android" ? (
                    <Ionicons name="logo-google-playstore" size={18} color="#fff" />
                  ) : (
                    <Ionicons name="rocket" size={18} color="#fff" />
                  )}
                  <Text style={styles.primaryBtnText}>
                    {Platform.OS === "android" ? "Pay with Google Play" : "Upgrade Now"}
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          {/* ── Trial CTA ────────────────────────────────────────────── */}
          {canStartTrial && (
            <Pressable
              onPress={onTrial}
              disabled={submitting}
              hitSlop={8}
              style={({ pressed }) => [
                styles.trialBtn,
                pressed && { opacity: 0.75 },
                submitting && { opacity: 0.5 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Start ${trialDays}-day free trial`}
            >
              <Ionicons name="gift-outline" size={16} color={brand.violet300} />
              <Text style={styles.trialText}>
                Start {trialDays}-day Free Trial
              </Text>
            </Pressable>
          )}

          {/* ── UCB: Razorpay alternative billing (India Android only) ─
               Per Google Play UCB policy, this MUST appear AFTER the primary
               Google Play Billing option and be clearly labelled as alternative.
          ─────────────────────────────────────────────────────────────────── */}
          {showRazorpay && (
            <View style={styles.ucbSection}>
              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>{t("screens.paywall.or_choose_an_alternative")}</Text>
                <View style={styles.orLine} />
              </View>
              <Pressable
                disabled={submitting || plans.length === 0}
                onPress={onUpgradeRazorpay}
                style={({ pressed }) => [
                  styles.razorpayBtn,
                  pressed && { opacity: 0.85 },
                  (submitting || plans.length === 0) && { opacity: 0.5 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t("screens.paywall.alternative_billing_pay_with_upi_or_card")}
              >
                <Ionicons name="flash" size={16} color={brand.violet300} />
                <Text style={styles.razorpayBtnText}>
                  {t("screens.paywall.pay_via_upi_card_alternative")}
                </Text>
              </Pressable>
              <Text style={styles.ucbNote}>
                Alternative billing option under Google Play User Choice Billing
              </Text>
            </View>
          )}

          {/* ── Trust row ────────────────────────────────────────────── */}
          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <Ionicons name="people" size={13} color={brand.violet400} />
              <Text style={styles.trustText}>{t("screens.paywall.10_000_parents")}</Text>
            </View>
            <View style={styles.trustDot} />
            <View style={styles.trustItem}>
              <Ionicons name="lock-closed" size={13} color={brand.violet400} />
              <Text style={styles.trustText}>{t("screens.paywall.cancel_anytime")}</Text>
            </View>
            <View style={styles.trustDot} />
            <View style={styles.trustItem}>
              <Ionicons name="shield-checkmark" size={13} color={brand.violet400} />
              <Text style={styles.trustText}>{t("screens.paywall.secure_payment")}</Text>
            </View>
          </View>

          {/* ── Maybe later ──────────────────────────────────────────── */}
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.maybeBtn}
            accessibilityRole="button"
            accessibilityLabel={t("screens.paywall.maybe_later")}
          >
            <Text style={styles.maybeText}>{t("screens.paywall.maybe_later")}</Text>
          </Pressable>

          {/* ── Legal footer ─────────────────────────────────────────── */}
          <Text style={styles.footer}>
            Subscription renews automatically. Cancel anytime in Google Play or App Store settings.
            {"\n"}Patent Pending — Indian Provisional Patent Filed.
          </Text>
        </ScrollView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },

  // Ambient glows
  glowTopLeft: {
    position: "absolute",
    top: -80,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: `${brand.primary}22`, // audit-ok: custom ambient glow / dark bg
  },
  glowTopRight: {
    position: "absolute",
    top: 60,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: `${ACCENT_PINK}18`, // audit-ok: custom ambient glow / dark bg
  },
  glowBottom: {
    position: "absolute",
    bottom: -60,
    left: 40,
    width: 300,
    height: 200,
    borderRadius: 150,
    backgroundColor: `${brand.primary}14`, // audit-ok: custom ambient glow / dark bg
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  backText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "600",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  // Brand header
  brandHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  brandLogo: {
    width: 72,
    height: 72,
    marginBottom: 10,
  },
  brandTextRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  brandGradientBox: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  brandName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  premiumLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },
  patentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: `${brand.primary}22`, // audit-ok: intentional dark bg / custom color
    borderWidth: 1,
    borderColor: `${brand.primary}40`, // audit-ok: intentional dark bg / custom color
  },
  patentText: {
    color: brand.violet300,
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Hero
  hero: {
    alignItems: "center",
    marginBottom: 22,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: ACCENT_PINK,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 7,
    letterSpacing: -0.3,
  },
  heroSub: {
    color: "rgba(196,181,253,0.75)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },

  // Plan tabs
  planTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  planTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
    position: "relative",
  },
  planTabSelected: {
    backgroundColor: `${brand.primary}28`, // audit-ok: intentional dark bg / custom color
    borderColor: brand.primary,
    shadowColor: brand.primary,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  tabBadge: {
    position: "absolute",
    top: -9,
    backgroundColor: ACCENT_PINK,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  tabBadgeText: {
    color: "#fff",
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  planTabText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  planTabTextSelected: {
    color: "#fff",
  },
  planTabPrice: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  planTabPriceSelected: {
    color: brand.violet300,
  },

  // Plan detail card with glowing border
  planCard: {
    marginBottom: 20,
    borderRadius: 22,
    shadowColor: brand.primary,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  planCardBorder: {
    borderRadius: 22,
    padding: 1.5,
  },
  planCardInner: {
    borderRadius: 21,
    backgroundColor: "#12082A", // audit-ok: intentional dark bg / custom color
    padding: 20,
  },
  priceBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  priceCurrency: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 18,
    fontWeight: "700",
  },
  priceAmount: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -1,
  },
  pricePeriod: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    fontWeight: "500",
    marginLeft: 2,
  },
  savingsPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: `${ACCENT_PINK}22`, // audit-ok: intentional dark bg / custom color
    borderWidth: 1,
    borderColor: `${ACCENT_PINK}44`, // audit-ok: intentional dark bg / custom color
  },
  savingsText: {
    color: ACCENT_PINK,
    fontSize: 12,
    fontWeight: "800",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginBottom: 14,
  },
  featuresLabel: {
    color: "rgba(196,181,253,0.5)",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  featureList: { gap: 10 },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureCheckBg: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureText: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
    lineHeight: 20,
  },
  poweredBy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  poweredByText: {
    color: brand.violet400,
    fontSize: 10.5,
    fontWeight: "600",
    letterSpacing: 0.2,
  },

  // Notices
  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(245,158,11,0.12)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
    marginBottom: 14,
  },
  noticeText: {
    color: palette.amber300,
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },

  // Primary CTA
  primaryWrap: {
    borderRadius: 18,
    marginBottom: 12,
    shadowColor: ACCENT_PINK,
    shadowOpacity: 0.55,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
    borderRadius: 18,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  // Trial CTA
  trialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: `${brand.primary}60`, // audit-ok: intentional dark bg / custom color
    backgroundColor: `${brand.primary}12`, // audit-ok: intentional dark bg / custom color
    marginBottom: 12,
  },
  trialText: {
    color: brand.violet300,
    fontSize: 15,
    fontWeight: "700",
  },

  // UCB / Razorpay alternative billing section
  ucbSection: {
    marginBottom: 12,
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  orText: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  razorpayBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 6,
  },
  razorpayBtnText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    fontWeight: "600",
  },
  ucbNote: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 10,
    textAlign: "center",
    letterSpacing: 0.2,
  },

  // Trust row
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 18,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  trustDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  trustText: {
    color: "rgba(196,181,253,0.6)",
    fontSize: 11.5,
    fontWeight: "600",
  },

  // Maybe later
  maybeBtn: {
    alignItems: "center",
    paddingVertical: 14,
  },
  maybeText: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 13,
    fontWeight: "500",
  },

  // Legal footer
  footer: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 10,
    textAlign: "center",
    lineHeight: 15,
    paddingHorizontal: 12,
  },
});
