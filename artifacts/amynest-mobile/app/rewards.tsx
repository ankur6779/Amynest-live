import React, {  useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl,
  ActivityIndicator, Platform, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { brand, palette } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getTotalPoints, getRewards, getRedemptions, getLedger, getBadges,
  redeemReward, type Reward, type Redemption, type LedgerEntry, type Badge,
} from "@/utils/rewardsStorage";

export default function RewardsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [points, setPoints] = useState(0);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);

  const load = useCallback(async () => {
    const [p, rw, rd, ld, bd] = await Promise.all([
      getTotalPoints(), getRewards(), getRedemptions(), getLedger(), getBadges(),
    ]);
    setPoints(p);
    setRewards(rw);
    setRedemptions(rd);
    setLedger(ld);
    setBadges(bd);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await load();
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const redeemingRef = useRef<Set<string>>(new Set());
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const handleRedeem = useCallback((reward: Reward) => {
    if (redeemingRef.current.has(reward.id)) return; // ignore double-tap
    if (points < reward.cost) {
      Alert.alert(
        "Not enough points",
        `${reward.label} costs ${reward.cost} pts. You have ${points} pts. Earn more by completing routines and games!`,
      );
      return;
    }
    Alert.alert(
      `Redeem ${reward.label}?`,
      `This will spend ${reward.cost} pts from your balance.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Redeem",
          style: "default",
          onPress: async () => {
            if (redeemingRef.current.has(reward.id)) return;
            redeemingRef.current.add(reward.id);
            setRedeemingId(reward.id);
            try {
              const childName = ledger[0]?.childName ?? "Family";
              const result = await redeemReward(reward, childName);
              if (result.ok) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                setPoints(result.pointsAfter);
                setRedemptions((cur) => [
                  {
                    rewardId: reward.id,
                    rewardLabel: reward.label,
                    childName,
                    date: new Date().toISOString(),
                    cost: reward.cost,
                  },
                  ...cur,
                ]);
              } else {
                // Balance changed underneath us — re-sync from storage.
                setPoints(result.pointsAfter);
                Alert.alert(t("alerts.rewards.not_enough_title"), t("alerts.rewards.balance_changed_msg"));
              }
            } finally {
              redeemingRef.current.delete(reward.id);
              setRedeemingId(null);
            }
          },
        },
      ],
    );
  }, [points, ledger]);

  const topPad = insets.top + (Platform.OS === "web" ? 12 : 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <LinearGradient colors={theme.gradient} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
        <ActivityIndicator size="large" color={brand.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={theme.gradient} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={c.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.foreground }]}>Rewards</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: 18 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.primary} />}
      >
        {/* Points balance hero */}
        <LinearGradient
          colors={[brand.primary, brand.violet500, brand.purple500] as readonly [string, string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroLabel}>YOUR POINTS</Text>
          <Text style={styles.heroPoints}>{points.toLocaleString()}</Text>
          <Text style={styles.heroSub}>Earned across routines, games & behaviour 🎉</Text>
        </LinearGradient>

        {/* Badges */}
        {badges.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>🏆 Badges Earned</Text>
            <View style={styles.badgeRow}>
              {badges.map((b) => (
                <View key={b.id} style={[styles.badgeChip, { backgroundColor: c.muted, borderColor: c.border }]}>
                  <Text style={styles.badgeEmoji}>{b.emoji}</Text>
                  <Text style={[styles.badgeLabel, { color: c.foreground }]} numberOfLines={2}>{b.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Rewards shop */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>🎁 Rewards Shop</Text>
          <Text style={[styles.sectionSub, { color: c.mutedForeground }]}>Spend points on real-world treats</Text>
          <View style={{ gap: 10, marginTop: 10 }}>
            {rewards.map((r) => {
              const affordable = points >= r.cost;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => handleRedeem(r)}
                  style={[
                    styles.rewardCard,
                    { backgroundColor: c.card, borderColor: c.border, opacity: affordable ? 1 : 0.65 },
                  ]}
                >
                  <Text style={styles.rewardEmoji}>{r.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rewardLabel, { color: c.foreground }]} numberOfLines={1}>{r.label}</Text>
                    <Text style={[styles.rewardCost, { color: c.mutedForeground }]}>
                      {r.cost} pts {affordable ? "" : `· need ${r.cost - points} more`}
                    </Text>
                  </View>
                  <View style={[styles.redeemBtn, { backgroundColor: affordable ? brand.violet500 : c.muted }]}>
                    {redeemingId === r.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[styles.redeemBtnText, { color: affordable ? "#fff" : c.mutedForeground }]}>
                        Redeem
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Recent redemptions */}
        {redemptions.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>📜 Recent Redemptions</Text>
            <View style={[styles.listCard, { backgroundColor: c.card, borderColor: c.border }]}>
              {redemptions.slice(0, 8).map((r, i) => (
                <View
                  key={`${r.date}-${i}`}
                  style={[styles.listRow, i < Math.min(redemptions.length, 8) - 1 && { borderBottomWidth: 1, borderBottomColor: c.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listTitle, { color: c.foreground }]} numberOfLines={1}>{r.rewardLabel}</Text>
                    <Text style={[styles.listSub, { color: c.mutedForeground }]}>
                      {r.childName} · {new Date(r.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={[styles.listCost, { color: brand.violet500 }]}>−{r.cost}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent earnings */}
        {ledger.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>✨ Recent Earnings</Text>
            <View style={[styles.listCard, { backgroundColor: c.card, borderColor: c.border }]}>
              {ledger.slice(0, 8).map((e, i) => (
                <View
                  key={`${e.date}-${i}`}
                  style={[styles.listRow, i < Math.min(ledger.length, 8) - 1 && { borderBottomWidth: 1, borderBottomColor: c.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listTitle, { color: c.foreground }]} numberOfLines={1}>{e.activity}</Text>
                    <Text style={[styles.listSub, { color: c.mutedForeground }]}>
                      {e.childName} · {new Date(e.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={[styles.listCost, { color: palette.emerald500 }]}>+{e.points}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {redemptions.length === 0 && ledger.length === 0 && (
          <Text style={[styles.emptyHint, { color: c.mutedForeground }]}>
            Complete routines and games to start earning points!
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 8 },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "800" },
  heroCard: { borderRadius: 24, padding: 22, alignItems: "center", marginTop: 8, marginBottom: 4 },
  heroLabel: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  heroPoints: { color: "#fff", fontSize: 56, fontWeight: "900", marginTop: 4 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 6, textAlign: "center" },
  section: { marginTop: 22 },
  sectionTitle: { fontSize: 15, fontWeight: "800" },
  sectionSub: { fontSize: 12, marginTop: 2 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  badgeChip: { width: 100, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 16, borderWidth: 1, alignItems: "center" },
  badgeEmoji: { fontSize: 26 },
  badgeLabel: { fontSize: 11, fontWeight: "700", textAlign: "center", marginTop: 4 },
  rewardCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, borderWidth: 1 },
  rewardEmoji: { fontSize: 28 },
  rewardLabel: { fontSize: 14, fontWeight: "700" },
  rewardCost: { fontSize: 11, marginTop: 2 },
  redeemBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  redeemBtnText: { fontSize: 12, fontWeight: "800" },
  listCard: { borderRadius: 16, borderWidth: 1, marginTop: 10 },
  listRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14, gap: 8 },
  listTitle: { fontSize: 13, fontWeight: "700" },
  listSub: { fontSize: 11, marginTop: 2 },
  listCost: { fontSize: 14, fontWeight: "800" },
  emptyHint: { textAlign: "center", marginTop: 30, fontSize: 13 },
});
