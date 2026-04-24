import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors, { brand } from "@/constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const FEATURES = [
  { emoji: "🧠", label: "Amy AI Routines", desc: "Smart daily schedules for your child's age.", glow: brand.indigo500, grad: [brand.indigo500, "#4F46E5"] as [string, string] },
  { emoji: "📊", label: "Progress Tracking", desc: "Streaks, milestones & growth in one view.", glow: "#10B981", grad: ["#10B981", "#059669"] as [string, string] },
  { emoji: "🎯", label: "Daily Activities", desc: "Age-based activities to keep kids engaged.", glow: "#F59E0B", grad: ["#F59E0B", "#D97706"] as [string, string] },
  { emoji: "🏆", label: "Behavior Tracker", desc: "Reward positive habits and celebrate wins.", glow: brand.violet500, grad: [brand.violet500, brand.violet600] as [string, string] },
  { emoji: "❤️", label: "Parenting Tips", desc: "Expert tips, sleep guides, and insights.", glow: "#EC4899", grad: ["#EC4899", "#DB2777"] as [string, string] },
  { emoji: "🧩", label: "Life Skills Mode", desc: "Challenges that level up as your child grows.", glow: "#14B8A6", grad: ["#14B8A6", "#0D9488"] as [string, string] },
];

export function ProfileLockScreen({ sectionName }: { sectionName?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#0f0c29", "#1a1560", "#24243e"]}
      style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarGlow} />
            <Image
              source={require("../assets/images/icon.png")}
              style={styles.avatar}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.tag}>MEET AMY AI</Text>
          <Text style={styles.title}>Your Smart Parenting Partner ✨</Text>
          <Text style={styles.subtitle}>
            Set up your profile to unlock personalized routines, progress tracking, and much more.
          </Text>
        </View>

        {/* ── Feature glass cards ───────────────────────── */}
        <View style={styles.grid}>
          {FEATURES.map((f, i) => (
            <View
              key={f.label}
              style={[
                styles.card,
                {
                  shadowColor: f.glow,
                  shadowOpacity: 0.45,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 8,
                },
              ]}
            >
              <View style={[styles.glowBlob, { backgroundColor: f.glow }]} />
              <LinearGradient
                colors={f.grad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconBadge}
              >
                <Text style={styles.featureEmoji}>{f.emoji}</Text>
              </LinearGradient>
              <Text style={styles.cardTitle}>{f.label}</Text>
              <Text style={styles.cardDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>

        {/* ── Divider ──────────────────────────────────── */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Unlock everything in 2 steps</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* ── CTAs ─────────────────────────────────────── */}
        <View style={styles.ctaBlock}>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/children")}
            activeOpacity={0.85}
            style={styles.primaryBtnWrap}
          >
            <LinearGradient
              colors={[colors.light.primary, colors.light.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>👶  Add Child Profile — Step 1</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(tabs)/profile")}
            activeOpacity={0.85}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>👤  Add Parent Profile — Step 2</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footnote}>Works for ages 0–15 · Science-backed parenting plans</Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: "center",
  },

  /* Hero */
  hero: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarWrap: {
    position: "relative",
    width: 102,
    height: 102,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarGlow: {
    position: "absolute",
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: colors.light.primary,
    opacity: 0.35,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.2)",
  },
  tag: {
    color: brand.violet400,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 6,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 28,
  },
  subtitle: {
    color: "rgba(165,180,252,0.7)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 280,
  },

  /* Grid */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginBottom: 24,
    width: "100%",
  },
  card: {
    width: (SCREEN_WIDTH - 60) / 2,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
    position: "relative",
  },
  glowBlob: {
    position: "absolute",
    top: -16,
    right: -16,
    width: 52,
    height: 52,
    borderRadius: 26,
    opacity: 0.35,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  featureEmoji: {
    fontSize: 17,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 3,
    lineHeight: 15,
  },
  cardDesc: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    lineHeight: 14,
  },

  /* Divider */
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
    width: "100%",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: `${brand.violet500}40`,
  },
  dividerText: {
    color: "rgba(165,180,252,0.6)",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },

  /* CTAs */
  ctaBlock: {
    width: "100%",
    gap: 12,
    marginBottom: 20,
  },
  primaryBtnWrap: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: colors.light.primary,
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  primaryBtn: {
    paddingVertical: 15,
    alignItems: "center",
    borderRadius: 18,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryBtn: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.07)",
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "600",
  },

  footnote: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 10,
    textAlign: "center",
  },
});
