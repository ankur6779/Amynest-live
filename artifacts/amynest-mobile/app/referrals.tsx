import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  Platform,
  Linking,
  TextInput,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useReferrals, type GiftToken } from "@/hooks/useReferrals";

const SHARE_BASE = "https://amynest.ai";

function buildLink(code: string): string {
  return `${SHARE_BASE}/?ref=${encodeURIComponent(code)}`;
}

function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

// ─── Gift Token Item ──────────────────────────────────────────────────────────

function GiftTokenItem({ token, onCopy, copiedCode }: { token: GiftToken; onCopy: (code: string) => void; copiedCode: string | null }) {
  const colors = useColors();
  const isAvailable = token.status === "available";
  const expDays = daysLeft(token.expiresAt);

  const shareGift = async () => {
    const message = `I'm gifting you ${token.bonusDays} days of Amy AI premium! Use code: ${token.giftCode}`;
    try {
      await Share.share({ message, title: "Amy AI Gift" });
    } catch { /* ignore */ }
  };

  const whatsappGift = async () => {
    const text = `I'm gifting you ${token.bonusDays} days of Amy AI premium! Use code: ${token.giftCode}`;
    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    try {
      const can = await Linking.canOpenURL(url);
      if (can) Linking.openURL(url);
      else shareGift();
    } catch { shareGift(); }
  };

  return (
    <View
      style={[
        styles.giftItem,
        {
          backgroundColor: isAvailable ? "rgba(124,58,237,0.08)" : colors.surfaceElevated,
          borderColor: isAvailable ? "rgba(124,58,237,0.35)" : colors.border,
          opacity: isAvailable ? 1 : 0.65,
        },
      ]}
    >
      <View style={styles.giftItemHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="ticket" size={15} color={isAvailable ? "#7C3AED" : colors.textMuted} />
          <Text style={[styles.giftItemTitle, { color: colors.text }]}>
            {token.bonusDays} days free premium
          </Text>
        </View>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: isAvailable
                ? "rgba(124,58,237,0.15)"
                : token.status === "redeemed"
                ? "rgba(16,185,129,0.15)"
                : colors.surfaceElevated,
              borderColor: isAvailable ? "rgba(124,58,237,0.4)" : token.status === "redeemed" ? "rgba(16,185,129,0.4)" : colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              {
                color: isAvailable ? "#7C3AED" : token.status === "redeemed" ? "#047857" : colors.textMuted,
              },
            ]}
          >
            {token.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.codeBox,
          { backgroundColor: "rgba(124,58,237,0.06)", borderColor: "rgba(124,58,237,0.3)" },
        ]}
      >
        <Text style={[styles.giftCode, { color: "#7C3AED" }]}>{token.giftCode}</Text>
        {isAvailable && (
          <TouchableOpacity
            onPress={() => onCopy(token.giftCode)}
            style={[styles.smallBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Ionicons
              name={copiedCode === token.giftCode ? "checkmark-circle" : "copy-outline"}
              size={14}
              color={copiedCode === token.giftCode ? "#22C55E" : colors.text}
            />
            <Text style={[styles.smallBtnText, { color: colors.text }]}>
              {copiedCode === token.giftCode ? "Copied" : "Copy"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {isAvailable && (
        <View style={styles.shareRow}>
          <TouchableOpacity
            onPress={shareGift}
            style={[styles.shareBtn, { backgroundColor: "rgba(124,58,237,0.1)", borderColor: "rgba(124,58,237,0.3)" }]}
          >
            <Ionicons name="share-social" size={15} color="#7C3AED" />
            <Text style={[styles.shareBtnText, { color: "#7C3AED" }]}>Share gift</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={whatsappGift}
            style={[styles.shareBtn, { backgroundColor: "rgba(34,197,94,0.1)", borderColor: "rgba(34,197,94,0.3)" }]}
          >
            <Ionicons name="logo-whatsapp" size={15} color="#16A34A" />
            <Text style={[styles.shareBtnText, { color: "#16A34A" }]}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      )}

      {isAvailable && expDays !== null && (
        <Text style={[styles.fineprint, { color: colors.textMuted, marginTop: 4 }]}>
          Expires in {expDays} day{expDays === 1 ? "" : "s"}
        </Text>
      )}
      {token.status === "redeemed" && token.redeemedAt && (
        <Text style={[styles.fineprint, { color: colors.textMuted, marginTop: 4 }]}>
          Redeemed on {new Date(token.redeemedAt).toLocaleDateString()}
        </Text>
      )}
    </View>
  );
}

// ─── Redeem Gift Section ──────────────────────────────────────────────────────

function RedeemGiftCard({ onRedeem }: { onRedeem: (code: string) => Promise<{ bonusDays: number }> }) {
  const colors = useColors();
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [bonusDays, setBonusDays] = useState(0);

  const handle = async () => {
    if (!code.trim()) return;
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setState("loading");
    setErrorMsg("");
    try {
      const result = await onRedeem(code.trim().toUpperCase());
      setBonusDays(result.bonusDays ?? 0);
      setState("success");
      setCode("");
    } catch (err: any) {
      const reason = err?.message ?? "unknown_error";
      const messages: Record<string, string> = {
        not_found: "Gift code not found. Check and try again.",
        already_redeemed: "This gift has already been claimed.",
        expired: "This gift code has expired.",
        self_redeem: "You can't redeem your own gift code!",
        server_error: "Something went wrong. Please try again.",
      };
      setErrorMsg(messages[reason] ?? "Invalid gift code.");
      setState("error");
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Ionicons name="gift" size={18} color="#F59E0B" />
        <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>Redeem a Gift Code</Text>
      </View>
      <Text style={[styles.fineprint, { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 12 }]}>
        Received a gift code from a friend? Enter it here to claim free premium days.
      </Text>

      {state === "success" ? (
        <View style={[styles.notice, { backgroundColor: "rgba(16,185,129,0.12)", borderColor: "rgba(16,185,129,0.4)" }]}>
          <Ionicons name="checkmark-circle" size={18} color="#047857" />
          <Text style={{ color: "#047857", fontSize: 13, flex: 1, fontWeight: "700" }}>
            🎉 Gift redeemed! {bonusDays > 0 ? `+${bonusDays} days of premium added.` : "Premium days added!"}
          </Text>
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TextInput
            value={code}
            onChangeText={(v) => {
              setCode(v.toUpperCase());
              if (state === "error") setState("idle");
            }}
            placeholder="GIFT-XXXXXXX"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.redeemInput,
              {
                color: colors.text,
                borderColor: state === "error" ? "#EF4444" : colors.border,
                backgroundColor: colors.surfaceElevated,
              },
            ]}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={state !== "loading"}
            onSubmitEditing={handle}
          />
          <TouchableOpacity
            onPress={handle}
            disabled={state === "loading" || !code.trim()}
            style={[
              styles.redeemBtn,
              { backgroundColor: colors.primary, opacity: state === "loading" || !code.trim() ? 0.5 : 1 },
            ]}
          >
            {state === "loading" ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="sparkles" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      )}
      {state === "error" && (
        <Text style={{ color: "#EF4444", fontSize: 12, marginTop: 6 }}>{errorMsg}</Text>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ReferralsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { payload, isLoading, redeemGift } = useReferrals();
  const [copiedKind, setCopiedKind] = useState<string | null>(null);

  const stats = payload?.stats;
  const referrals = payload?.referrals ?? [];
  const giftTokens = payload?.giftTokens ?? [];
  const availableGifts = giftTokens.filter((t) => t.status === "available");
  const link = useMemo(() => (stats ? buildLink(stats.code) : ""), [stats]);

  const onCopy = async (value: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    await Clipboard.setStringAsync(value);
    setCopiedKind(value);
    setTimeout(() => setCopiedKind(null), 1800);
  };

  const onShare = async () => {
    if (!stats) return;
    const message = `I'm using Amy AI for parenting — try it with my code ${stats.code} and we both get premium! ${link}`;
    try {
      await Share.share({ message, url: link, title: "Try Amy AI" });
    } catch { /* ignore */ }
  };

  const onWhatsApp = async () => {
    if (!stats) return;
    const text = `Try Amy AI with my code ${stats.code} — we both get premium! ${link}`;
    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    try {
      const can = await Linking.canOpenURL(url);
      if (can) Linking.openURL(url);
      else onShare();
    } catch { onShare(); }
  };

  const handleRedeem = async (code: string) => {
    return redeemGift.mutateAsync(code);
  };

  const isReady = !isLoading && stats;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: "Invite & Earn",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 16,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {!isReady ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: colors.textMuted, marginTop: 8 }}>
              Loading your referrals…
            </Text>
          </View>
        ) : (
          <>
            <HeroCard stats={stats!} availableGifts={availableGifts.length} />

            {/* Referral code card */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Your referral code</Text>
              <View
                style={[
                  styles.codeBox,
                  { backgroundColor: colors.primary + "15", borderColor: colors.primary + "55" },
                ]}
              >
                <Text style={[styles.codeText, { color: colors.primary }]}>{stats!.code}</Text>
                <TouchableOpacity
                  onPress={() => onCopy(stats!.code)}
                  style={[styles.smallBtn, { borderColor: colors.border }]}
                >
                  <Ionicons
                    name={copiedKind === stats!.code ? "checkmark-circle" : "copy-outline"}
                    size={16}
                    color={copiedKind === stats!.code ? "#22C55E" : colors.text}
                  />
                  <Text style={[styles.smallBtnText, { color: colors.text }]}>
                    {copiedKind === stats!.code ? "Copied" : "Copy"}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={onShare} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
                <Ionicons name="share-social" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Share invite</Text>
              </TouchableOpacity>

              <View style={styles.shareRow}>
                <TouchableOpacity
                  onPress={onWhatsApp}
                  style={[styles.shareBtn, { backgroundColor: "#22C55E15", borderColor: "#22C55E55" }]}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#16A34A" />
                  <Text style={[styles.shareBtnText, { color: "#16A34A" }]}>WhatsApp</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onCopy(link)}
                  style={[styles.shareBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                >
                  <Ionicons name="link" size={18} color={colors.text} />
                  <Text style={[styles.shareBtnText, { color: colors.text }]}>
                    {copiedKind === link ? "Copied!" : "Copy link"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Gift Tokens card — shown when user has any */}
            {giftTokens.length > 0 && (
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: "rgba(124,58,237,0.4)" },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="ticket" size={18} color="#7C3AED" />
                    <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>Your Gift Tokens</Text>
                  </View>
                  <View
                    style={[
                      styles.countPill,
                      { backgroundColor: "rgba(124,58,237,0.12)", borderColor: "rgba(124,58,237,0.3)" },
                    ]}
                  >
                    <Text style={[styles.countPillText, { color: "#7C3AED" }]}>
                      {availableGifts.length} available
                    </Text>
                  </View>
                </View>
                <Text style={[styles.fineprint, { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 12 }]}>
                  You're premium — so your referral rewards are gift tokens to share with friends!
                </Text>
                {giftTokens.map((t) => (
                  <View key={t.id} style={{ marginBottom: t.id !== giftTokens[giftTokens.length - 1].id ? 10 : 0 }}>
                    <GiftTokenItem token={t} onCopy={onCopy} copiedCode={copiedKind} />
                  </View>
                ))}
              </View>
            )}

            {/* Redeem a Gift card */}
            <RedeemGiftCard onRedeem={handleRedeem} />

            <ProgressCard stats={stats!} />

            {/* Referral rows */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Your referrals</Text>
              {referrals.length === 0 ? (
                <View style={[styles.empty, { borderColor: colors.border }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, marginTop: 6, textAlign: "center" }}>
                    No referrals yet. Share your code to get started!
                  </Text>
                </View>
              ) : (
                referrals.map((r) => (
                  <View
                    key={r.id}
                    style={[styles.referralRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                  >
                    <View style={styles.referralRowLeft}>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor:
                              r.status === "paid" ? "#22C55E" : r.status === "valid" ? "#A855F7" : "#F59E0B",
                          },
                        ]}
                      />
                      <Text style={[styles.referralName, { color: colors.text }]}>Friend #{r.id}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor:
                            r.status === "paid" ? "#22C55E" : r.status === "valid" ? "#A855F7" : colors.surface,
                          borderColor:
                            r.status === "paid" ? "#22C55E" : r.status === "valid" ? "#A855F7" : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          {
                            color:
                              r.status === "paid" || r.status === "valid" ? "#fff" : colors.textMuted,
                          },
                        ]}
                      >
                        {r.status === "paid" ? "PAID" : r.status === "valid" ? "ACTIVE" : "PENDING"}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={{ paddingHorizontal: 4, gap: 6 }}>
              <Text style={[styles.fineprint, { color: colors.textMuted }]}>
                <Text style={{ fontWeight: "700" }}>How it works:</Text>{" "}
                {stats!.isPremium
                  ? `As a premium member, earn a gift token (worth ${stats!.rewardDays} days of free premium for a friend) when ${stats!.validThreshold} friends sign up with your code AND at least ${stats!.paidThreshold} of them buys a paid plan.`
                  : `Earn ${stats!.rewardDays} days of free premium when ${stats!.validThreshold} friends sign up using your code AND at least ${stats!.paidThreshold} of them buys any paid plan.`}
              </Text>
              <Text style={[styles.fineprint, { color: colors.textMuted }]}>
                Rewards are capped at {stats!.rewardCap} milestones lifetime.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HeroCard({
  stats,
  availableGifts,
}: {
  stats: NonNullable<ReturnType<typeof useReferrals>["payload"]>["stats"];
  availableGifts: number;
}) {
  const validShort = Math.max(0, stats.validThreshold - stats.validReferrals);
  const paidShort = Math.max(0, stats.paidThreshold - stats.paidReferrals);
  const capReached = stats.rewardsGranted >= stats.rewardCap;
  const bonusDays = daysLeft(stats.bonusExpiresAt);

  const message = capReached
    ? "Maxed out — you've earned the lifetime referral cap. Thank you for spreading Amy! 🎉"
    : stats.rewardsAvailable > 0
    ? stats.isPremium
      ? `🎁 You have ${availableGifts} gift token${availableGifts === 1 ? "" : "s"} to share!`
      : `🎉 You unlocked ${stats.rewardsAvailable * stats.rewardDays} days of premium!`
    : validShort === 0 && paidShort === 0
    ? "Almost there — your reward is being processed."
    : `Invite ${validShort > 0 ? `${validShort} more friend${validShort > 1 ? "s" : ""}` : ""}${
        validShort > 0 && paidShort > 0 ? " + " : ""
      }${paidShort > 0 ? `${paidShort} paid user` : ""} to unlock ${stats.rewardDays} ${stats.isPremium ? "gift tokens" : "days free"}.`;

  return (
    <LinearGradient
      colors={["#7C3AED", "#C026D3", "#F59E0B"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.heroBadge}>
        <Ionicons name="gift" size={12} color="#fff" />
        <Text style={styles.heroBadgeText}>INVITE & EARN</Text>
      </View>
      <Text style={styles.heroTitle}>
        {stats.isPremium
          ? `Gift ${stats.rewardDays} days premium to friends 🎁`
          : `Get ${stats.rewardDays} days free for every ${stats.validThreshold} friends 🎁`}
      </Text>
      <Text style={styles.heroSubtitle}>{message}</Text>
      {!stats.isPremium && bonusDays !== null && bonusDays > 0 && (
        <View style={styles.bonusPill}>
          <Ionicons name="calendar" size={12} color="#fff" />
          <Text style={styles.bonusPillText}>
            {bonusDays} bonus day{bonusDays === 1 ? "" : "s"} active
          </Text>
        </View>
      )}
      {stats.isPremium && availableGifts > 0 && (
        <View style={styles.bonusPill}>
          <Ionicons name="ticket" size={12} color="#fff" />
          <Text style={styles.bonusPillText}>
            {availableGifts} gift{availableGifts === 1 ? "" : "s"} ready to share
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}

function ProgressCard({ stats }: { stats: NonNullable<ReturnType<typeof useReferrals>["payload"]>["stats"] }) {
  const colors = useColors();
  const validPct = Math.min(100, (stats.validReferrals / stats.validThreshold) * 100);
  const paidPct = Math.min(100, (stats.paidReferrals / stats.paidThreshold) * 100);
  const rewardsLeft = Math.max(0, stats.rewardCap - stats.rewardsGranted);
  const capReached = stats.rewardsGranted >= stats.rewardCap;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="trophy" size={18} color="#F59E0B" />
          <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>Progress</Text>
        </View>
        <View style={[styles.countPill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Text style={[styles.countPillText, { color: colors.text }]}>
            {stats.rewardsGranted} / {stats.rewardCap} rewards
          </Text>
        </View>
      </View>

      <ProgressBar
        label="Friends invited"
        sub="Friends who signed up & used Amy AI"
        value={`${stats.validReferrals} / ${stats.validThreshold}`}
        pct={validPct}
        color="#7C3AED"
      />
      <View style={{ height: 14 }} />
      <ProgressBar
        label="Paid sign-ups"
        sub="At least 1 must purchase a paid plan"
        value={`${stats.paidReferrals} / ${stats.paidThreshold}`}
        pct={paidPct}
        color="#22C55E"
      />
      <View style={{ height: 14 }} />
      {capReached ? (
        <View style={[styles.notice, { backgroundColor: "#F59E0B15", borderColor: "#F59E0B55" }]}>
          <Ionicons name="sparkles" size={16} color="#B45309" />
          <Text style={{ color: "#B45309", fontSize: 13, flex: 1 }}>
            You've earned the maximum {stats.rewardCap} referral rewards. Thank you!
          </Text>
        </View>
      ) : (
        <View style={[styles.notice, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontSize: 13 }}>
            <Text style={{ fontWeight: "700" }}>{rewardsLeft}</Text> more reward
            {rewardsLeft === 1 ? "" : "s"} available —{" "}
            {stats.isPremium
              ? `earn ${rewardsLeft} more gift token${rewardsLeft === 1 ? "" : "s"} to share.`
              : `up to ${rewardsLeft * stats.rewardDays} days of free premium.`}
          </Text>
        </View>
      )}
    </View>
  );
}

function ProgressBar({ label, sub, value, pct, color }: { label: string; sub: string; value: string; pct: number; color: string }) {
  const colors = useColors();
  return (
    <View>
      <View style={styles.progressLabelRow}>
        <Text style={[styles.progressLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.progressValue, { color: colors.textMuted }]}>{value}</Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.surfaceElevated }]}>
        <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.progressSub, { color: colors.textMuted }]}>{sub}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loading: { paddingVertical: 64, alignItems: "center" },
  hero: { borderRadius: 24, padding: 22, overflow: "hidden" },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  heroBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "800", lineHeight: 28, marginBottom: 6 },
  heroSubtitle: { color: "rgba(255,255,255,0.9)", fontSize: 14, lineHeight: 20 },
  bonusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 10,
  },
  bonusPillText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  card: { borderRadius: 20, borderWidth: 1, padding: 18 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", marginBottom: 12 },

  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    marginBottom: 12,
  },
  codeText: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 4,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
  },
  giftCode: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 2,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
  },

  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  smallBtnText: { fontSize: 13, fontWeight: "600" },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  shareRow: { flexDirection: "row", gap: 8 },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  shareBtnText: { fontSize: 13, fontWeight: "700" },

  giftItem: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  giftItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  giftItemTitle: { fontSize: 14, fontWeight: "700" },

  countPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  countPillText: { fontSize: 11, fontWeight: "800" },

  progressLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressLabel: { fontSize: 13, fontWeight: "700" },
  progressValue: { fontSize: 13, fontWeight: "600" },
  progressTrack: { height: 8, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },
  progressSub: { fontSize: 11, marginTop: 6 },

  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },

  empty: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
  },
  referralRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  referralRowLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 999 },
  referralName: { fontSize: 14, fontWeight: "600" },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  statusPillText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },

  redeemInput: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
  },
  redeemBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  fineprint: { fontSize: 11, lineHeight: 16 },
});
