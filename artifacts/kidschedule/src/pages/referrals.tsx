import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Gift, Copy, Check, Share2, Mail, MessageCircle, Trophy, Sparkles, Lock, Calendar, Ticket, Send, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useReferrals, type GiftToken } from "@/hooks/use-referrals";
import { AmyIcon } from "@/components/amy-icon";
function buildLink(code: string): string {
  if (typeof window === "undefined") return `?ref=${code}`;
  const url = new URL(window.location.origin);
  url.searchParams.set("ref", code);
  return url.toString();
}
function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

// ─── Gift Token Card ──────────────────────────────────────────────────────────

function GiftTokenCard({
  token,
  onCopy,
  copied
}: {
  token: GiftToken;
  onCopy: (code: string) => void;
  copied: string | null;
}) {
  const {
    t
  } = useTranslation();
  const expDays = daysLeft(token.expiresAt);
  const isAvailable = token.status === "available";
  const shareGift = async () => {
    const text = t("screens.referrals.gift_share_text", {
      days: token.bonusDays,
      code: token.giftCode,
      url: `${window.location.origin}/?gift=${token.giftCode}`
    });
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({
          title: t("screens.referrals.gift_share_title"),
          text
        });
        return;
      } catch {/* fall through */}
    }
    onCopy(token.giftCode);
  };
  return <div className={["rounded-2xl border p-4 space-y-3", isAvailable ? "border-border bg-muted dark:bg-primary" : "border-border bg-muted/30 opacity-60"].join(" ")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Ticket className={`h-4 w-4 ${isAvailable ? "text-primary dark:text-primary" : "text-muted-foreground"}`} />
          <span className="font-quicksand font-bold text-sm">
            {t("screens.referrals.gift_card_days", {
            count: token.bonusDays
          })}
          </span>
        </div>
        <Badge variant="secondary" className={`text-[10px] uppercase font-bold ${isAvailable ? "bg-muted dark:bg-primary text-primary dark:text-muted-foreground" : token.status === "redeemed" ? "bg-muted dark:bg-primary text-primary dark:text-muted-foreground" : "text-muted-foreground"}`}>
          {token.status === "available" ? t("screens.referrals.status_available") : token.status === "redeemed" ? t("screens.referrals.status_redeemed") : token.status === "expired" ? t("screens.referrals.status_expired") : t("screens.referrals.status_used")}
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-border bg-white/60 dark:bg-white/5 px-3 py-2">
        <code className="font-mono font-bold tracking-widest text-primary dark:text-muted-foreground text-sm">
          {token.giftCode}
        </code>
        {isAvailable && <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => onCopy(token.giftCode)}>
            {copied === token.giftCode ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            {copied === token.giftCode ? t("screens.referrals.copied") : t("screens.referrals.copy")}
          </Button>}
      </div>

      {isAvailable && <div className="flex gap-2">
          <Button size="sm" className="flex-1 gap-1.5 bg-primary hover:bg-primary text-white text-xs" onClick={shareGift}>
            <Send className="h-3.5 w-3.5" />
            {t("screens.referrals.share_gift")}
          </Button>
          <a href={`https://wa.me/?text=${encodeURIComponent(t("screens.referrals.whatsapp_gift_text", {
        days: token.bonusDays,
        code: token.giftCode
      }))}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-muted dark:bg-primary px-3 text-xs font-semibold text-primary dark:text-muted-foreground hover:bg-muted transition">
            <MessageCircle className="h-3.5 w-3.5" />
            {t("screens.referrals.whatsapp")}
          </a>
        </div>}

      {isAvailable && expDays !== null && <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {t("screens.referrals.expires", {
        count: expDays
      })}
        </p>}
      {token.status === "redeemed" && token.redeemedAt && <p className="text-[10px] text-muted-foreground">
          {t("screens.referrals.redeemed_on", {
        date: new Date(token.redeemedAt).toLocaleDateString()
      })}
        </p>}
    </div>;
}

// ─── Redeem Gift Input ────────────────────────────────────────────────────────

function RedeemGiftSection({
  onRedeem
}: {
  onRedeem: (code: string) => Promise<void>;
}) {
  const {
    t
  } = useTranslation();
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [bonusDays] = useState(0);
  const handle = async () => {
    if (!code.trim()) return;
    setState("loading");
    setErrorMsg("");
    try {
      await onRedeem(code.trim());
      setState("success");
      setCode("");
    } catch (err: any) {
      const reason = err?.message ?? "unknown_error";
      const messages: Record<string, string> = {
        not_found: t("screens.referrals.err_not_found"),
        already_redeemed: t("screens.referrals.err_already_redeemed"),
        expired: t("screens.referrals.err_expired"),
        self_redeem: t("screens.referrals.err_self_redeem"),
        server_error: t("screens.referrals.err_server")
      };
      setErrorMsg(messages[reason] ?? t("screens.referrals.err_invalid"));
      setState("error");
    }
  };
  return <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5 text-primary" />
        <h2 className="font-quicksand text-lg font-bold">{t("screens.referrals.redeem_heading")}</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("screens.referrals.redeem_subtitle")}
      </p>

      {state === "success" ? <div className="rounded-2xl border border-border bg-muted dark:bg-primary p-4 flex items-center gap-3">
          <Check className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="font-semibold text-primary dark:text-muted-foreground">
              {bonusDays > 0 ? t("screens.referrals.gift_redeemed_with_days", {
            days: bonusDays
          }) : t("screens.referrals.gift_redeemed_added")}
            </p>
          </div>
        </div> : <div className="flex gap-2">
          <Input placeholder={t("screens.referrals.code_input_placeholder")} value={code} onChange={e => {
        setCode(e.target.value.toUpperCase());
        if (state === "error") setState("idle");
      }} onKeyDown={e => e.key === "Enter" && handle()} className="font-mono tracking-wider uppercase" disabled={state === "loading"} />
          <Button onClick={handle} disabled={state === "loading" || !code.trim()} className="gap-1.5 shrink-0">
            {state === "loading" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {t("screens.referrals.redeem_button")}
          </Button>
        </div>}
      {state === "error" && <p className="text-sm text-primary dark:text-primary">{errorMsg}</p>}
    </div>;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReferralsPage() {
  const {
    t
  } = useTranslation();
  const {
    payload,
    isLoading,
    redeemGift
  } = useReferrals();
  const [copied, setCopied] = useState<string | null>(null);
  const stats = payload?.stats;
  const referrals = payload?.referrals ?? [];
  const giftTokens = payload?.giftTokens ?? [];
  const availableGifts = giftTokens.filter(t => t.status === "available");
  const redeemedGifts = giftTokens.filter(t => t.status !== "available");
  const link = useMemo(() => stats ? buildLink(stats.code) : "", [stats]);
  if (isLoading || !stats) {
    return <div className="flex items-center justify-center py-24">
        <div className="text-sm text-muted-foreground animate-pulse">{t("screens.referrals.loading")}</div>
      </div>;
  }
  const validProgress = Math.min(100, stats.validReferrals / stats.validThreshold * 100);
  const paidProgress = Math.min(100, stats.paidReferrals / stats.paidThreshold * 100);
  const rewardsLeft = Math.max(0, stats.rewardCap - stats.rewardsGranted);
  const bonusDays = daysLeft(stats.bonusExpiresAt);
  const capReached = stats.rewardsGranted >= stats.rewardCap;
  const validShort = Math.max(0, stats.validThreshold - stats.validReferrals);
  const paidShort = Math.max(0, stats.paidThreshold - stats.paidReferrals);
  const rewardKind = stats.isPremium ? t("screens.referrals.kind_gift_tokens") : t("screens.referrals.kind_days_free");
  const inviteParts = [validShort > 0 ? t("screens.referrals.friends_more", {
    count: validShort
  }) : "", validShort > 0 && paidShort > 0 ? " + " : "", paidShort > 0 ? t("screens.referrals.paid_users", {
    count: paidShort
  }) : ""].join("");
  const message = capReached ? t("screens.referrals.msg_maxed") : stats.rewardsAvailable > 0 ? stats.isPremium ? t("screens.referrals.msg_gifts", {
    count: availableGifts.length
  }) : t("screens.referrals.msg_unlocked", {
    days: stats.rewardsAvailable * stats.rewardDays
  }) : validShort === 0 && paidShort === 0 ? t("screens.referrals.msg_almost") : t("screens.referrals.msg_invite_combo", {
    parts: inviteParts,
    days: stats.rewardDays,
    kind: rewardKind
  });
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied(null), 1800);
    } catch {/* ignore */}
  };
  const share = async () => {
    const text = t("screens.referrals.share_text", {
      code: stats.code,
      link
    });
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({
          title: t("screens.referrals.share_title"),
          text,
          url: link
        });
        return;
      } catch {/* fall through */}
    }
    copy(link);
  };
  const handleRedeem = async (code: string) => {
    await redeemGift.mutateAsync(code);
  };
  return <div className="space-y-6 pb-12">
      {/* Hero card */}
      <div data-on-dark className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider">
            <Gift className="h-3.5 w-3.5" /> {t("screens.referrals.invite_earn")}
          </div>
          <h1 className="font-quicksand text-2xl sm:text-3xl font-extrabold leading-tight">
            {stats.isPremium ? t("screens.referrals.gift_title_premium", {
            days: stats.rewardDays
          }) : t("screens.referrals.gift_title_free", {
            days: stats.rewardDays,
            count: stats.validThreshold
          })}
          </h1>
          <p className="text-sm sm:text-base text-white/90 max-w-xl">{message}</p>
          {!stats.isPremium && bonusDays !== null && bonusDays > 0 && <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold">
              <Calendar className="h-3.5 w-3.5" />
              {t("screens.referrals.bonus_days", {
            count: bonusDays
          })}
            </div>}
          {stats.isPremium && availableGifts.length > 0 && <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold">
              <Ticket className="h-3.5 w-3.5" />
              {t("screens.referrals.gifts_ready", {
            count: availableGifts.length
          })}
            </div>}
        </div>
      </div>

      {/* Code + share card */}
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <AmyIcon size={22} bounce />
          <h2 className="font-quicksand text-lg font-bold">{t("screens.referrals.code_heading")}</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-3">
            <span className="font-mono text-2xl font-extrabold tracking-widest text-primary">
              {stats.code}
            </span>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => copy(stats.code)}>
              {copied === stats.code ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              {copied === stats.code ? t("screens.referrals.copied") : t("screens.referrals.copy")}
            </Button>
          </div>
          <Button onClick={share} className="gap-2 sm:w-auto">
            <Share2 className="h-4 w-4" />
            {t("screens.referrals.share_invite")}
          </Button>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-2.5">
          <code className="text-xs sm:text-sm text-muted-foreground truncate flex-1">{link}</code>
          <button type="button" onClick={() => copy(link)} className="text-xs font-semibold text-primary hover:underline shrink-0">
            {copied === link ? t("screens.referrals.copied_excl") : t("screens.referrals.copy_link")}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <a href={`https://wa.me/?text=${encodeURIComponent(t("screens.referrals.whatsapp_share_text", {
          code: stats.code,
          link
        }))}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-muted dark:bg-primary px-3 py-2 text-sm font-semibold text-primary dark:text-muted-foreground hover:bg-muted dark:hover:bg-primary transition">
            <MessageCircle className="h-4 w-4" /> {t("screens.referrals.whatsapp")}
          </a>
          <a href={`mailto:?subject=${encodeURIComponent(t("screens.referrals.email_subject"))}&body=${encodeURIComponent(t("screens.referrals.email_body", {
          code: stats.code,
          link
        }))}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-muted/50 transition">
            <Mail className="h-4 w-4" /> {t("screens.referrals.email")}
          </a>
        </div>
      </div>

      {/* Gift Tokens section — shown when user has any tokens */}
      {giftTokens.length > 0 && <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-quicksand text-lg font-bold flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" /> {t("screens.referrals.your_gift_tokens")}
            </h2>
            <Badge variant="secondary" className="font-bold bg-muted dark:bg-primary text-primary dark:text-muted-foreground">
              {t("screens.referrals.available_label", {
            count: availableGifts.length
          })}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("screens.referrals.premium_explain")}
          </p>
          <div className="space-y-3">
            {availableGifts.map(tok => <GiftTokenCard key={tok.id} token={tok} onCopy={copy} copied={copied} />)}
            {redeemedGifts.length > 0 && <>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide pt-1">
                  {t("screens.referrals.already_sent")}
                </p>
                {redeemedGifts.map(tok => <GiftTokenCard key={tok.id} token={tok} onCopy={copy} copied={copied} />)}
              </>}
          </div>
        </div>}

      {/* Redeem a Gift section — always visible */}
      <RedeemGiftSection onRedeem={handleRedeem} />

      {/* Progress card */}
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-quicksand text-lg font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" /> {t("screens.referrals.progress")}
          </h2>
          <Badge variant="secondary" className="font-bold">
            {t("screens.referrals.rewards_count", {
            granted: stats.rewardsGranted,
            cap: stats.rewardCap
          })}
          </Badge>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-semibold">{t("screens.referrals.friends_invited")}</span>
            <span className="text-muted-foreground tabular-nums">
              {stats.validReferrals} / {stats.validThreshold}
            </span>
          </div>
          <Progress value={validProgress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1.5">
            {t("screens.referrals.friends_helper")}
          </p>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-semibold">{t("screens.referrals.paid_signups")}</span>
            <span className="text-muted-foreground tabular-nums">
              {stats.paidReferrals} / {stats.paidThreshold}
            </span>
          </div>
          <Progress value={paidProgress} className="h-2 [&>div]:bg-primary" />
          <p className="text-xs text-muted-foreground mt-1.5">
            {t("screens.referrals.paid_helper")}
          </p>
        </div>

        {capReached ? <div className="rounded-2xl border border-border bg-muted dark:bg-primary p-3 text-sm text-primary dark:text-muted-foreground inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {t("screens.referrals.max_reached", {
          count: stats.rewardCap
        })}
          </div> : <div className="rounded-2xl border border-border bg-muted/30 p-3 text-sm">
            {stats.isPremium ? t("screens.referrals.more_rewards_premium", {
          count: rewardsLeft
        }) : t("screens.referrals.more_rewards_free", {
          count: rewardsLeft,
          days: rewardsLeft * stats.rewardDays
        })}
          </div>}
      </div>

      {/* Recent referrals */}
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <h2 className="font-quicksand text-lg font-bold mb-3">{t("screens.referrals.your_referrals")}</h2>
        {referrals.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            <Lock className="h-5 w-5 mx-auto mb-2 opacity-50" />
            {t("screens.referrals.no_referrals")}
          </div> : <div className="space-y-2">
            {referrals.map(r => {
          return <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${r.status === "paid" ? "bg-primary" : r.status === "valid" ? "bg-primary" : "bg-muted"}`} />
                  <span className="text-sm font-semibold truncate">{t("screens.referrals.friend_label", {
                  id: r.id
                })}</span>
                </div>
                <Badge variant={r.status === "paid" ? "default" : "secondary"} className={`text-[10px] uppercase font-bold ${r.status === "paid" ? "bg-primary hover:bg-primary" : r.status === "valid" ? "bg-primary hover:bg-primary text-white" : ""}`}>
                  {r.status === "paid" ? t("screens.referrals.status_paid") : r.status === "valid" ? t("screens.referrals.status_active") : t("screens.referrals.status_pending")}
                </Badge>
              </div>;
        })}
          </div>}
      </div>

      {/* Rules */}
      <div className="text-xs text-muted-foreground space-y-1.5 px-2">
        <p>
          <strong>{t("screens.referrals.rules_heading")}</strong>{" "}
          {stats.isPremium ? t("screens.referrals.rules_premium", {
          days: stats.rewardDays,
          valid: stats.validThreshold,
          paid: stats.paidThreshold
        }) : t("screens.referrals.rules_free", {
          days: stats.rewardDays,
          valid: stats.validThreshold,
          paid: stats.paidThreshold
        })}
        </p>
        <p>
          {t("screens.referrals.rules_cap", {
          cap: stats.rewardCap
        })}
        </p>
      </div>
    </div>;
}