import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import {
  getTotalPoints, getRewards, getRedemptions, getLedger, getBadges,
  redeemReward, type Reward, type Redemption, type LedgerEntry, type Badge,
} from "@/lib/rewards";
import { Gift, Star, Trophy, Clock } from "lucide-react";

function PointsBurst({ points }: { points: number }) {
  return (
    <div className="relative flex flex-col items-center justify-center py-8">
      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.4)]">
        <span className="text-3xl font-extrabold text-white leading-none">{points}</span>
        <span className="text-xs font-bold text-white/80 uppercase tracking-wider mt-0.5">Stars</span>
      </div>
    </div>
  );
}

export default function RewardsPage() {
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
      showToast(`Need ${reward.cost - points} more stars!`);
      return;
    }
    setRedeemingId(reward.id);
    const ok = redeemReward(reward, "Child");
    if (ok) {
      load();
      showToast(`🎉 Redeemed: ${reward.label}!`);
    } else {
      showToast("Not enough stars.");
    }
    setTimeout(() => setRedeemingId(null), 800);
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Toast */}
        {toastMsg && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg animate-in fade-in slide-in-from-top-2">
            {toastMsg}
          </div>
        )}

        {/* Header */}
        <div>
          <h1 className="text-2xl font-quicksand font-extrabold text-foreground">Rewards</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Earn stars, collect badges, redeem rewards</p>
        </div>

        {/* Points burst */}
        <Card className="rounded-3xl overflow-hidden bg-gradient-to-br from-violet-600 to-pink-600 border-0">
          <CardContent className="p-0">
            <PointsBurst points={points} />
            <div className="text-center pb-5">
              <p className="text-white/80 text-sm font-semibold">Complete routines & log behaviors to earn stars</p>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          {[
            { id: "rewards", label: "Rewards", icon: Gift },
            { id: "badges",  label: `Badges (${badges.length})`, icon: Trophy },
            { id: "history", label: "History", icon: Clock },
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
                <Card key={reward.id} className="rounded-2xl">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center text-2xl shrink-0">
                      {reward.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{reward.label}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{reward.cost} stars</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRedeem(reward)}
                      disabled={!canAfford || redeemingId === reward.id}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0 ${
                        canAfford
                          ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:opacity-90 active:scale-95"
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                      }`}
                    >
                      {redeemingId === reward.id ? "✓" : canAfford ? "Redeem" : `Need ${reward.cost - points}`}
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
                  <p className="font-bold text-foreground">No badges yet</p>
                  <p className="text-sm text-muted-foreground">Complete routines consistently to earn your first badge!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {badges.map((badge) => (
                  <Card key={badge.id} className="rounded-2xl">
                    <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                      <div className="text-3xl">{badge.emoji}</div>
                      <p className="font-bold text-sm text-foreground">{badge.label}</p>
                      <p className="text-[11px] text-muted-foreground">{new Date(badge.earnedAt).toLocaleDateString()}</p>
                    </CardContent>
                  </Card>
                ))}
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
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Redeemed</p>
                {redemptions.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border mb-1">
                    <span className="text-lg">🎁</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{r.rewardLabel}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs font-bold text-rose-500">-{r.cost} ⭐</span>
                  </div>
                ))}
              </div>
            )}
            {/* Earned ledger */}
            {ledger.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 mt-3">Earned</p>
                {ledger.map((entry, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border mb-1">
                    <span className="text-lg">⭐</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{entry.activity}</p>
                      <p className="text-xs text-muted-foreground">{entry.childName} · {new Date(entry.date).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-500">+{entry.points}</span>
                  </div>
                ))}
              </div>
            )}
            {redemptions.length === 0 && ledger.length === 0 && (
              <Card className="rounded-2xl">
                <CardContent className="p-8 flex flex-col items-center gap-3 text-center">
                  <div className="text-4xl">📋</div>
                  <p className="font-bold text-foreground">No history yet</p>
                  <p className="text-sm text-muted-foreground">Complete routines to start earning stars.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
