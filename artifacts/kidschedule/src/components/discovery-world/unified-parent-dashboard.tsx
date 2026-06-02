import { useMemo } from "react";
import { PremiumCard } from "@/components/learning-progress/premium-polish";
import { Progress } from "@/components/ui/progress";
import { buildUnifiedParentInsights } from "@/lib/discovery-worlds-unified-insights";
import { PlatformParentCharts } from "./platform-parent-charts";
import type { PlatformParentInsights } from "@workspace/world-engine";
import { Printer } from "lucide-react";
import { DISCOVERY_WORLDS_REGISTRY } from "@workspace/discovery-worlds";
import { AppLink } from "@/components/app-link";

type UnifiedParentDashboardProps = {
  childId: number;
};

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export function UnifiedParentDashboard({ childId }: UnifiedParentDashboardProps) {
  const insights = useMemo(() => buildUnifiedParentInsights(childId), [childId]);

  const chartInsights: PlatformParentInsights = {
    mostPlayed: insights.mostPlayedSounds.map((s, i) => ({
      itemId: `sound-${i}`,
      count: s.count,
    })),
    mostRecognized: [],
    quizAccuracyPct: insights.quizAccuracyPct,
    hearFindAccuracyPct: insights.recognitionAccuracyPct,
    favoriteCategories: insights.favoriteWorlds.map((w) => ({
      category: w.title,
      count: w.playCount,
    })),
    weeklyProgress: [
      {
        weekKey: new Date().toISOString().slice(0, 10),
        minutes: insights.weeklyLearningMinutes,
      },
    ],
    monthlyProgress: [
      {
        monthKey: new Date().toISOString().slice(0, 7),
        itemsOpened: insights.mostPlayedSounds.length,
      },
    ],
    streakDays: insights.learningStreakDays,
    completedWorlds: [],
  };

  return (
    <section className="discovery-unified-parent space-y-5 print:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Parent insights
          </p>
          <h2 className="text-xl font-bold text-foreground">All Discovery Worlds</h2>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold"
        >
          <Printer className="h-3.5 w-3.5" />
          Print report
        </button>
      </div>

      <PremiumCard tier="glow" className="p-4 print:border print:border-border">
        <p className="text-sm font-semibold text-foreground">What to do next</p>
        <p className="mt-1 text-sm text-muted-foreground">{insights.nextStep}</p>
      </PremiumCard>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatBlock label="Weekly learning" value={`${insights.weeklyLearningMinutes} min`} />
        <StatBlock label="Quiz accuracy" value={`${insights.quizAccuracyPct}%`} />
        <StatBlock label="Recognition" value={`${insights.recognitionAccuracyPct}%`} />
        <StatBlock label="Streak" value={`${insights.learningStreakDays} days`} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatBlock
          label="Achievements earned"
          value={String(insights.totalAchievements)}
        />
        <StatBlock label="Stickers collected" value={String(insights.totalStickers)} />
        <StatBlock
          label="Worlds completed"
          value={`${insights.worldsCompleted} / ${insights.worldsTotal}`}
        />
      </div>

      <PlatformParentCharts insights={chartInsights} />

      <PremiumCard className="p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Favorite worlds
        </h3>
        <ul className="mt-3 space-y-2">
          {insights.favoriteWorlds.length === 0 && (
            <li className="text-sm text-muted-foreground">Play any world to see favorites.</li>
          )}
          {insights.favoriteWorlds.map((w) => (
            <li key={w.worldId} className="flex justify-between text-sm">
              <span>
                {w.emoji} {w.title}
              </span>
              <span className="text-muted-foreground">{w.playCount} plays</span>
            </li>
          ))}
        </ul>
      </PremiumCard>

      <PremiumCard className="p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Most played sounds
        </h3>
        <ul className="mt-3 space-y-2">
          {insights.mostPlayedSounds.length === 0 && (
            <li className="text-sm text-muted-foreground">Listening activity will appear here.</li>
          )}
          {insights.mostPlayedSounds.map((s) => (
            <li key={`${s.worldTitle}-${s.label}`} className="flex justify-between text-sm">
              <span>
                {s.emoji} {s.label}
                <span className="ml-1 text-muted-foreground">· {s.worldTitle}</span>
              </span>
              <span className="text-muted-foreground">{s.count}×</span>
            </li>
          ))}
        </ul>
      </PremiumCard>

      <PremiumCard className="p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Needs more practice
        </h3>
        <ul className="mt-3 space-y-2">
          {insights.needsMorePractice.length === 0 && (
            <li className="text-sm text-muted-foreground">
              Great job — no weak spots yet. Keep exploring!
            </li>
          )}
          {insights.needsMorePractice.map((s) => (
            <li key={`${s.worldTitle}-${s.label}`} className="flex justify-between text-sm">
              <span>
                {s.emoji} {s.label} · {s.worldTitle}
              </span>
              <span className="text-amber-200">{s.accuracy}%</span>
            </li>
          ))}
        </ul>
      </PremiumCard>

      <PremiumCard className="p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          By world
        </h3>
        <ul className="mt-3 space-y-3">
          {insights.worldRows.map((row) => (
            <li key={row.worldId} className="space-y-1">
              <div className="flex justify-between text-sm font-semibold">
                <span>
                  {row.emoji} {row.title}
                </span>
                <span className="text-muted-foreground">{row.masteryPct}%</span>
              </div>
              <Progress value={row.masteryPct} className="h-1.5" />
              <p className="text-[11px] text-muted-foreground">
                {row.stickers} stickers · {row.achievements} stars · {row.playCount} plays
                {row.mastered ? " · Mastered" : ""}
              </p>
            </li>
          ))}
        </ul>
      </PremiumCard>

      <div className="flex flex-wrap gap-2 print:hidden">
        {DISCOVERY_WORLDS_REGISTRY.map((world) => (
          <AppLink
            key={world.worldId}
            href={world.routePath}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold hover:bg-white/[0.08]"
          >
            {world.emoji} Open {world.title}
          </AppLink>
        ))}
      </div>
    </section>
  );
}
