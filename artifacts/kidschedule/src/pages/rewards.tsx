import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import {
  getTotalPoints, getRewards, getRedemptions, getLedger, getBadges,
  redeemReward, type Reward, type Redemption, type LedgerEntry, type Badge,
} from "@/lib/rewards";
import { Gift, Star, Trophy, Clock } from "lucide-react";

function PointsBurst({ points }: { points: number }) {
  const { t } = useTranslation();
  return (
    <div className="relative flex flex-col items-center justify-center py-8">
      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 flex flex-col items-center justify-center shadow-[0_0_45px_rgba(251,146,60,0.55)] ring-4 ring-amber-300/20">
        <span className="text-3xl font-extrabold text-white leading-none drop-shadow">{points}</span>
        <span className="text-xs font-bold text-white/90 uppercase tracking-wider mt-0.5">{t("screens.rewards.stars_label")}</span>
      </div>
    </div>
  );
}

export default function RewardsPage() {
  const { t } = useTranslation();
  const [points, setPoints] = useState(0);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [activeTab, setActiveTab] = useState<"rewards" | "badges" | "history">("rewards");
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    setPoints(getTotalPoints());
    setRewards(getRewards());
    setRedemptions(getRedemptions());
    setLedger(getLedger());
    setBadges(getBadges());
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleRedeem = (reward: Reward) => {
    if (redeemingId) return;
    if (points < reward.cost) {
      showToast(t("screens.rewards.need_more_stars", { count: reward.cost - points }));
      return;
    }
    setRedeemingId(reward.id);
    const ok = redeemReward(reward, "Child");
    if (ok) {
      load();
      showToast(t("screens.rewards.redeemed_toast", { label: reward.label }));
    } else {
      showToast(t("screens.rewards.not_enough_stars"));
    }
    setTimeout(() => setRedeemingId(null), 800);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Toast */}
        {toastMsg && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg animate-in fade-in slide-in-from-top-2">
            {toastMsg}
          </div>
        )}

        {/* Header */}
        <div>
          <h1 className="text-2xl font-quicksand font-extrabold text-foreground">{t("screens.rewards.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("screens.rewards.subtitle")}</p>
        </div>

        {/* Points burst */}
        <Card data-on-dark className="rounded-3xl overflow-hidden border border-amber-500/25 bg-gradient-to-br from-violet-600/20 via-fuchsia-600/15 to-amber-500/20">
          <CardContent className="p-0">
            <PointsBurst points={points} />
            <div className="text-center pb-5">
              <p className="text-foreground/80 text-sm font-semibold">{t("screens.rewards.earn_caption")}</p>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          {[
            { id: "rewards", label: t("screens.rewards.tab_rewards"), icon: Gift },
            { id: "badges",  label: t("screens.rewards.tab_badges", { count: badges.length }), icon: Trophy },
            { id: "history", label: t("screens.rewards.tab_history"), icon: Clock },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Rewards catalog */}
        {activeTab === "rewards" && (
          <div className="space-y-2">
            {rewards.map((reward) => {
              const canAfford = points >= reward.cost;
              return (
                <Card key={reward.id} className={`rounded-2xl transition-colors ${canAfford ? "border-amber-500/30 bg-gradient-to-r from-amber-500/[0.07] to-transparent" : ""}`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/30 to-orange-500/20 border border-amber-500/20 flex items-center justify-center text-2xl shrink-0">
                      {reward.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{reward.label}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-bold text-amber-300">{t("screens.rewards.cost_stars", { count: reward.cost })}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRedeem(reward)}
                      disabled={!canAfford || redeemingId === reward.id}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0 ${
                        canAfford
                          ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-[0_2px_12px_rgba(251,146,60,0.4)] hover:opacity-90 active:scale-95"
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                      }`}
                    >
                      {redeemingId === reward.id ? "✓" : canAfford ? t("screens.rewards.redeem") : t("screens.rewards.need_short", { count: reward.cost - points })}
                    </button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Badges */}
        {activeTab === "badges" && (
          <div className="space-y-3">
            {badges.length === 0 ? (
              <Card className="rounded-2xl">
                <CardContent className="p-8 flex flex-col items-center gap-3 text-center">
                  <div className="text-4xl">🏆</div>
                  <p className="font-bold text-foreground">{t("screens.rewards.empty_badges_title")}</p>
                  <p className="text-sm text-muted-foreground">{t("screens.rewards.empty_badges_body")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {badges.map((badge, i) => {
                  const tints = [
                    "from-violet-500/20 to-fuchsia-500/10 border-violet-500/30",
                    "from-sky-500/20 to-cyan-500/10 border-sky-500/30",
                    "from-emerald-500/20 to-green-500/10 border-emerald-500/30",
                    "from-amber-500/20 to-orange-500/10 border-amber-500/30",
                    "from-pink-500/20 to-rose-500/10 border-pink-500/30",
                  ];
                  return (
                  <Card key={badge.id} className={`rounded-2xl border bg-gradient-to-br ${tints[i % tints.length]}`}>
                    <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                      <div className="text-3xl drop-shadow">{badge.emoji}</div>
                      <p className="font-bold text-sm text-foreground">{badge.label}</p>
                      <p className="text-[11px] text-muted-foreground">{new Date(badge.earnedAt).toLocaleDateString()}</p>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* History */}
        {activeTab === "history" && (
          <div className="space-y-2">
            {/* Redemption history */}
            {redemptions.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">{t("screens.rewards.redeemed_heading")}</p>
                {redemptions.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 mb-1">
                    <span className="text-lg">🎁</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{r.rewardLabel}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs font-bold text-rose-300">-{r.cost} ⭐</span>
                  </div>
                ))}
              </div>
            )}
            {/* Earned ledger */}
            {ledger.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 mt-3">{t("screens.rewards.earned_heading")}</p>
                {ledger.map((entry, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-1">
                    <span className="text-lg">⭐</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{entry.activity}</p>
                      <p className="text-xs text-muted-foreground">{entry.childName} · {new Date(entry.date).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-300">+{entry.points}</span>
                  </div>
                ))}
              </div>
            )}
            {redemptions.length === 0 && ledger.length === 0 && (
              <Card className="rounded-2xl">
                <CardContent className="p-8 flex flex-col items-center gap-3 text-center">
                  <div className="text-4xl">📋</div>
                  <p className="font-bold text-foreground">{t("screens.rewards.empty_history_title")}</p>
                  <p className="text-sm text-muted-foreground">{t("screens.rewards.empty_history_body")}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
    </div>
  );
}
