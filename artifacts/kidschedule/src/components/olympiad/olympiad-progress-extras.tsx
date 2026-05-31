import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Trophy, Share2, Users, Bell, TrendingUp } from "lucide-react";
import {
  SUBJECT_LABELS,
  SUBJECT_EMOJI,
  nextRankProgress,
  subjectMasteryRingPct,
  subjectMasteryRemaining,
  type OlympiadSubject,
} from "@workspace/olympiad";
import type { ChildOlympiadStats, DailyHistoryEntry } from "@/lib/olympiad-local-stats";
import { buildWeeklyDigest, todayISO } from "@/lib/olympiad-local-stats";
import { cn } from "@/lib/utils";

function MasteryRing({ pct, emoji }: { pct: number; emoji: string }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="text-primary transition-all duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm">{emoji}</span>
    </div>
  );
}

export function OlympiadMasteryRings({ stats }: { stats: ChildOlympiadStats }) {
  const { t } = useTranslation();
  const subjects: OlympiadSubject[] = ["math", "science", "reasoning", "gk"];

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <p className="font-quicksand font-bold text-sm">{t("components.olympiad_zone.mastery_rings")}</p>
        <div className="grid grid-cols-2 gap-3">
          {subjects.map((s) => {
            const correct = stats.bySubject[s].correct;
            const pct = subjectMasteryRingPct(correct);
            const remaining = subjectMasteryRemaining(correct);
            return (
              <div key={s} className="flex items-center gap-3 rounded-xl border p-2">
                <MasteryRing pct={pct} emoji={SUBJECT_EMOJI[s]} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{SUBJECT_LABELS[s]}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {remaining > 0
                      ? t("components.olympiad_zone.mastery_remaining", { count: remaining })
                      : t("components.olympiad_zone.mastery_done")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function OlympiadRankCard({ totalPoints }: { totalPoints: number }) {
  const { t } = useTranslation();
  const rank = nextRankProgress(totalPoints);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">{t("components.olympiad_zone.your_rank_tier")}</p>
            <p className="font-quicksand font-bold text-lg">
              {rank.current.emoji} {rank.current.label}
            </p>
          </div>
          {rank.next && (
            <p className="text-xs text-muted-foreground text-right">
              {t("components.olympiad_zone.points_to_next", {
                count: rank.pointsToNext,
                tier: rank.next.label,
              })}
            </p>
          )}
        </div>
        <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${rank.progressPct}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}

function AccuracyChart({ history }: { history: DailyHistoryEntry[] }) {
  const { t } = useTranslation();
  const points = useMemo(() => history.slice(-14), [history]);
  if (points.length === 0) return null;
  const max = 100;

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <p className="font-quicksand font-bold text-sm">{t("components.olympiad_zone.accuracy_trend")}</p>
        </div>
        <div className="flex items-end gap-1 h-20">
          {points.map((p) => (
            <div key={p.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-primary/80 min-h-[4px] transition-all"
                style={{ height: `${Math.max(4, (p.accuracyPct / max) * 72)}px` }}
                title={`${p.date}: ${p.accuracyPct}%`}
              />
              <span className="text-[8px] text-muted-foreground">{p.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function OlympiadProgressCharts({ stats }: { stats: ChildOlympiadStats }) {
  return <AccuracyChart history={stats.dailyHistory} />;
}

export function OlympiadWeeklyDigest({ stats, childName }: { stats: ChildOlympiadStats; childName: string }) {
  const { t } = useTranslation();
  const digest = buildWeeklyDigest(stats, childName);

  return (
    <Card className="bg-muted/30 border-border">
      <CardContent className="p-4">
        <p className="font-quicksand font-bold text-sm">{t("components.olympiad_zone.weekly_digest")}</p>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{digest}</p>
      </CardContent>
    </Card>
  );
}

export function OlympiadReminderSettings({
  stats,
  onChange,
}: {
  stats: ChildOlympiadStats;
  onChange: (patch: Partial<ChildOlympiadStats>) => void;
}) {
  const { t } = useTranslation();

  const requestNotify = async () => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <p className="font-quicksand font-bold text-sm">{t("components.olympiad_zone.daily_reminder")}</p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{t("components.olympiad_zone.reminder_toggle")}</span>
          <Switch
            checked={stats.reminderEnabled}
            onCheckedChange={(v) => {
              void requestNotify();
              onChange({ reminderEnabled: v });
            }}
          />
        </div>
        {stats.reminderEnabled && (
          <div className="flex items-center gap-2">
            <label htmlFor="olympiad-reminder-hour" className="text-xs text-muted-foreground">
              {t("components.olympiad_zone.reminder_hour")}
            </label>
            <select
              id="olympiad-reminder-hour"
              className="text-xs rounded-lg border bg-background px-2 py-1"
              value={stats.reminderHour}
              onChange={(e) => onChange({ reminderHour: Number(e.target.value) })}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OlympiadSiblingChallenge({
  childId,
  childName,
  stats,
}: {
  childId: number;
  childName: string;
  stats: ChildOlympiadStats;
}) {
  const { t } = useTranslation();
  const { data: childProfiles = [] } = useListChildren({
    query: { queryKey: getListChildrenQueryKey(), refetchOnWindowFocus: false },
  });
  const siblings = (childProfiles ?? []).filter((c) => c.id !== childId);
  const today = todayISO();
  const myRun = stats.daily[today];

  if (siblings.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <p className="font-quicksand font-bold text-sm">{t("components.olympiad_zone.sibling_challenge")}</p>
        </div>
        <p className="text-xs text-muted-foreground">{t("components.olympiad_zone.sibling_challenge_hint")}</p>
        <ul className="space-y-1">
          {siblings.map((s) => {
            const sStats = typeof window !== "undefined" ? localStorage.getItem(`olympiad:v2:${s.id}`) : null;
            let theirScore: number | null = null;
            try {
              if (sStats) {
                const parsed = JSON.parse(sStats) as ChildOlympiadStats;
                theirScore = parsed.daily[today]?.score ?? null;
              }
            } catch {
              /* ignore */
            }
            const myScore = myRun?.submitted ? myRun.score : null;
            const winning =
              myScore !== null && theirScore !== null ? myScore > theirScore : myScore !== null && theirScore === null;

            return (
              <li
                key={s.id}
                className={cn(
                  "flex items-center justify-between text-xs px-2 py-1.5 rounded-lg",
                  winning ? "bg-emerald-500/10" : "bg-muted",
                )}
              >
                <span className="font-medium">{s.name}</span>
                <span className="text-muted-foreground">
                  {theirScore !== null ? `${theirScore}/5` : t("components.olympiad_zone.not_played_yet")}
                  {myScore !== null && theirScore !== null && myScore === theirScore && " · tie"}
                </span>
              </li>
            );
          })}
        </ul>
        {!myRun?.submitted && (
          <p className="text-[10px] text-muted-foreground">
            {t("components.olympiad_zone.complete_daily_to_challenge", { name: childName })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function OlympiadCertificateButton({
  childName,
  stats,
  weeklyScore,
  weeklyTotal,
}: {
  childName: string;
  stats: ChildOlympiadStats;
  weeklyScore?: number;
  weeklyTotal?: number;
}) {
  const { t } = useTranslation();

  const share = async () => {
    const lines = [
      `🏆 ${childName} — Smart Olympiad Zone`,
      `${stats.totalPoints} points · ${stats.streak}-day streak`,
    ];
    if (weeklyScore !== undefined && weeklyTotal !== undefined) {
      lines.push(`Weekly test: ${weeklyScore}/${weeklyTotal}`);
    }
    lines.push("AmyNest AI — Where Smart Parenting Meets AI");

    const text = lines.join("\n");
    if (navigator.share) {
      try {
        await navigator.share({ title: "Olympiad Certificate", text });
        return;
      } catch {
        /* fall through */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      alert(t("components.olympiad_zone.certificate_copied"));
    } catch {
      alert(text);
    }
  };

  return (
    <Button variant="outline" size="sm" className="w-full" onClick={() => void share()}>
      <Share2 className="h-4 w-4 mr-1" />
      {t("components.olympiad_zone.share_certificate")}
    </Button>
  );
}

export function OlympiadOfflineBanner({ offline }: { offline: boolean }) {
  const { t } = useTranslation();
  if (!offline) return null;
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
      {t("components.olympiad_zone.offline_mode")}
    </div>
  );
}

export function OlympiadStreakFreezeBadge({ stats }: { stats: ChildOlympiadStats }) {
  const { t } = useTranslation();
  const used = stats.streakFreezesUsedThisWeek >= 1;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
        used ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary",
      )}
      title={t("components.olympiad_zone.streak_freeze_hint")}
    >
      🛡️ {used ? t("components.olympiad_zone.freeze_used") : t("components.olympiad_zone.freeze_available")}
    </span>
  );
}
