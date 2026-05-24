import { Flame, LayoutDashboard, Play, Users, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  ABACUS_BADGES,
  evaluateAbacusBadges,
  getLevel,
  LEVELS,
  type LevelId,
} from "@workspace/abacus";
import { abacusLevelLabelDefault, isAbacusLevelSlug } from "@workspace/abacus/i18n";
import type { useAbacusTranslation } from "@/hooks/use-abacus-translation";

type Mode = "learn" | "practice" | "challenge" | "mental" | "tutor";
type ViewMode = "child" | "parent";

interface ProgressShape {
  currentLevel: LevelId;
  lastMode: Mode;
  completedLevels: LevelId[];
  bestScores: Record<string, { points: number; accuracyPct: number; completedAt: string }>;
  totalCorrect: number;
  totalAttempts: number;
  totalPoints: number;
}

interface LeaderboardShape {
  me: { rank: number; points: number; total: number };
}

const MODE_EMOJI: Record<Mode, string> = {
  learn: "📚",
  practice: "✏️",
  challenge: "⏱️",
  mental: "🧠",
  tutor: "💜",
};

export function AbacusViewToggle({
  viewMode,
  onChange,
  t,
}: {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
  t: ReturnType<typeof useAbacusTranslation>["t"];
}) {
  return (
    <div
      className="flex rounded-xl border border-border bg-muted/50 p-0.5 gap-0.5"
      data-testid="abacus-view-toggle"
    >
      {(["child", "parent"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={cn(
            "flex-1 inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition-all",
            viewMode === mode
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          data-testid={`abacus-view-${mode}`}
        >
          {mode === "child" ? <Play className="h-3 w-3" /> : <Users className="h-3 w-3" />}
          {mode === "child" ? t("abacus.view_child") : t("abacus.view_parent")}
        </button>
      ))}
    </div>
  );
}

function BadgeStrip({
  earnedIds,
  t,
}: {
  earnedIds: Set<string>;
  t: ReturnType<typeof useAbacusTranslation>["t"];
}) {
  return (
    <div className="flex flex-wrap gap-1.5" data-testid="abacus-badges">
      {ABACUS_BADGES.map((badge) => {
        const earned = earnedIds.has(badge.id);
        return (
          <span
            key={badge.id}
            title={t(badge.labelKey, badge.defaultLabel)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold border",
              earned
                ? "bg-amber-500/15 border-amber-400/40 text-foreground"
                : "bg-muted/50 border-border text-muted-foreground opacity-50 grayscale",
            )}
            data-testid={`abacus-badge-${badge.id}`}
          >
            <span>{badge.emoji}</span>
            <span className="hidden sm:inline">{t(badge.labelKey, badge.defaultLabel)}</span>
          </span>
        );
      })}
    </div>
  );
}

export function AbacusHomeDashboard({
  childName,
  progress,
  level,
  mode,
  streakDays,
  dailyCorrect,
  dailyGoal,
  leaderboard,
  onContinue,
  onQuickStart,
  t,
}: {
  childName: string;
  progress: ProgressShape;
  level: LevelId;
  mode: Mode;
  streakDays: number;
  dailyCorrect: number;
  dailyGoal: number;
  leaderboard: LeaderboardShape | null;
  onContinue: () => void;
  onQuickStart: (mode: Mode) => void;
  t: ReturnType<typeof useAbacusTranslation>["t"];
}) {
  const completed = progress.completedLevels ?? [];
  const nextLevel = Math.min(LEVELS.length, level + 1) as LevelId;
  const nextDef = getLevel(nextLevel);
  const unlockedNext = completed.includes(level);
  const earned = new Set(
    evaluateAbacusBadges({
      totalCorrect: progress.totalCorrect,
      completedLevels: completed,
      bestScores: progress.bestScores,
      streakDays,
      dailyCorrect,
      dailyGoal,
    }),
  );

  const accuracy =
    progress.totalAttempts > 0
      ? Math.round((progress.totalCorrect / progress.totalAttempts) * 100)
      : 0;

  return (
    <div className="space-y-3" data-testid="abacus-dashboard">
      <div className="flex items-center gap-2">
        <LayoutDashboard className="h-4 w-4 text-teal-600" />
        <h3 className="font-bold text-sm">{t("abacus.dashboard_title", { name: childName })}</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-xl border border-orange-400/30 bg-orange-500/10 p-2.5 text-center">
          <Flame className="h-4 w-4 mx-auto text-orange-500" />
          <p className="text-lg font-black mt-1">{streakDays}</p>
          <p className="text-[10px] font-semibold text-muted-foreground">{t("abacus.streak_days")}</p>
        </div>
        <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 p-2.5 text-center">
          <p className="text-lg font-black">{dailyCorrect}/{dailyGoal}</p>
          <p className="text-[10px] font-semibold text-muted-foreground">{t("abacus.today_goal")}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-2.5 text-center">
          <p className="text-lg font-black">{accuracy}%</p>
          <p className="text-[10px] font-semibold text-muted-foreground">{t("abacus.accuracy")}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-2.5 text-center">
          <p className="text-lg font-black">
            {leaderboard ? `#${leaderboard.me.rank}` : "—"}
          </p>
          <p className="text-[10px] font-semibold text-muted-foreground">{t("abacus.weekly_rank_short")}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold py-3 px-4 text-left flex items-center gap-3 shadow-md active:scale-[0.99] transition-transform"
        data-testid="abacus-dashboard-continue"
      >
        <span className="text-2xl">{MODE_EMOJI[mode]}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-[10px] uppercase tracking-wide opacity-90">{t("abacus.continue")}</span>
          <span className="block text-sm truncate">
            L{level} · {t(`abacus.mode_${mode}` as "abacus.mode_learn")}
          </span>
        </span>
        <Play className="h-5 w-5 shrink-0" />
      </button>

      <div className="grid grid-cols-3 gap-2">
        {(["learn", "practice", "challenge"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onQuickStart(m)}
            className="rounded-xl border border-border bg-card py-2.5 px-2 text-center hover:bg-muted transition-colors"
            data-testid={`abacus-quick-${m}`}
          >
            <span className="text-xl block">{MODE_EMOJI[m]}</span>
            <span className="text-[10px] font-bold">{t(`abacus.mode_${m}` as "abacus.mode_learn")}</span>
          </button>
        ))}
      </div>

      {!unlockedNext && level < LEVELS.length && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs">
          🔓 {t("abacus.next_unlock_hint", { pct: nextDef.unlockAccuracyPct, level: nextLevel })}
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {t("abacus.badges_title")}
        </p>
        <BadgeStrip earnedIds={earned} t={t} />
      </div>
    </div>
  );
}

export function AbacusParentPanel({
  progress,
  streakDays,
  dailyCorrect,
  dailyGoal,
  t,
}: {
  progress: ProgressShape;
  streakDays: number;
  dailyCorrect: number;
  dailyGoal: number;
  t: ReturnType<typeof useAbacusTranslation>["t"];
}) {
  const completed = progress.completedLevels ?? [];
  const accuracy =
    progress.totalAttempts > 0
      ? Math.round((progress.totalCorrect / progress.totalAttempts) * 100)
      : 0;
  const earned = new Set(
    evaluateAbacusBadges({
      totalCorrect: progress.totalCorrect,
      completedLevels: completed,
      bestScores: progress.bestScores,
      streakDays,
      dailyCorrect,
      dailyGoal,
    }),
  );

  return (
    <div className="space-y-3" data-testid="abacus-parent-panel">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-teal-600" />
        <h3 className="font-bold text-sm">{t("abacus.parent_dashboard")}</h3>
      </div>
      <p className="text-xs text-muted-foreground">{t("abacus.parent_hint")}</p>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl border bg-card p-3">
          <p className="text-2xl font-black">{accuracy}%</p>
          <p className="text-[10px] text-muted-foreground font-semibold">{t("abacus.accuracy")}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-2xl font-black">{progress.totalPoints}</p>
          <p className="text-[10px] text-muted-foreground font-semibold">{t("abacus.points")}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-2xl font-black">{streakDays}</p>
          <p className="text-[10px] text-muted-foreground font-semibold">{t("abacus.streak_days")}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-2xl font-black">{completed.length}/{LEVELS.length}</p>
          <p className="text-[10px] text-muted-foreground font-semibold">{t("abacus.levels_cleared")}</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {t("abacus.level_scores")}
        </p>
        {LEVELS.map((l) => {
          const best = progress.bestScores[String(l.id)];
          const cleared = completed.includes(l.id);
          const label = isAbacusLevelSlug(l.slug)
            ? t(`abacus.level_${l.slug}`, abacusLevelLabelDefault(l.slug))
            : l.slug;
          return (
            <div key={l.id} className="rounded-lg border bg-card px-3 py-2 flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold truncate">
                {cleared ? "✅" : "○"} L{l.id} · {label}
              </span>
              <span className="text-muted-foreground shrink-0">
                {best ? `${best.accuracyPct}% · ${best.points} ${t("abacus.pts")}` : "—"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {t("abacus.badges_title")}
        </p>
        <BadgeStrip earnedIds={earned} t={t} />
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
          <span>{t("abacus.today_goal")}</span>
          <span>{dailyCorrect}/{dailyGoal}</span>
        </div>
        <Progress value={Math.min(100, Math.round((dailyCorrect / dailyGoal) * 100))} className="h-2" />
      </div>
    </div>
  );
}
