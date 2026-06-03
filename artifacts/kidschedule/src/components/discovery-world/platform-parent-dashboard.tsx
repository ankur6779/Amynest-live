import { buildPlatformParentInsights, unlockedStreakBadges } from "@workspace/world-engine";
import { loadDiscoveryWorldProgress } from "@/lib/discovery-worlds-progress";
import { loadDiscoveryWorldStats } from "@/lib/discovery-worlds-stats";
import type { DiscoveryWorldRuntimeConfig } from "@/lib/discovery-world-config";
import { PlatformParentCharts } from "./platform-parent-charts";
import { Printer } from "lucide-react";
import { DISCOVERY_COPY } from "./discovery-world-polish";

type PlatformParentDashboardProps = {
  config: DiscoveryWorldRuntimeConfig;
  childId: number;
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export function PlatformParentDashboard({ config, childId }: PlatformParentDashboardProps) {
  const stats = loadDiscoveryWorldStats(config.worldId, childId);
  const progress = loadDiscoveryWorldProgress(config.worldId, childId);
  const insights = buildPlatformParentInsights({
    progress,
    items: config.manifest.items,
    playCounts: stats.playCounts,
  });
  const streakBadges = unlockedStreakBadges(progress.streakDays);

  const nameById = new Map(config.manifest.items.map((i) => [i.id, i]));

  return (
    <section
      className="parent-insights-print mx-auto max-w-2xl space-y-4 px-4 py-4"
      aria-labelledby="platform-parent-insights-heading"
    >
      <div className="flex items-center justify-between gap-2 print:hidden">
        <h2 id="platform-parent-insights-heading" className="text-lg font-bold text-foreground">
          Parent insights
        </h2>
        <button
          type="button"
          onClick={() => window.print()}
          aria-label="Print learning report"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold"
        >
          <Printer className="h-3.5 w-3.5" />
          Print report
        </button>
      </div>

      <div className="hidden print:block">
        <h1 className="text-xl font-bold">
          {config.emoji} {config.title} — Learning report
        </h1>
        <p className="text-sm text-muted-foreground">AmyNest Discovery Worlds</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Learning streak" value={`${insights.streakDays} days`} />
        <StatCard
          label="Session time"
          value={`${Math.round(progress.totalSessionMs / 60000)} min`}
        />
        <StatCard label="Achievements" value={String(progress.achievementsUnlocked.length)} />
      </div>

      {streakBadges.length > 0 && (
        <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Streaks
          </h3>
          <ul className="flex flex-wrap gap-2">
            {streakBadges.map((b) => (
              <li
                key={b.id}
                className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-100"
              >
                {b.emoji} {b.title}
              </li>
            ))}
          </ul>
        </section>
      )}

      <PlatformParentCharts insights={insights} />

      <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Most recognized sounds
        </h3>
        <ul className="space-y-2">
          {insights.mostRecognized.length === 0 && (
            <li className="text-sm leading-relaxed text-muted-foreground">
              {DISCOVERY_COPY.emptyParentActivity.message}
            </li>
          )}
          {insights.mostRecognized.map(({ itemId, accuracy }) => {
            const item = nameById.get(itemId);
            if (!item) return null;
            return (
              <li key={itemId} className="flex justify-between text-sm">
                <span>
                  {item.emoji} {item.name}
                </span>
                <span className="text-muted-foreground">{accuracy}%</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Favorite categories
        </h3>
        <ul className="space-y-2">
          {insights.favoriteCategories.length === 0 && (
            <li className="text-sm leading-relaxed text-muted-foreground">
              {DISCOVERY_COPY.emptyParentFavorites.message}
            </li>
          )}
          {insights.favoriteCategories.map(({ category, count }) => {
            const cat = config.manifest.categories.find((c) => c.id === category);
            return (
              <li key={category} className="flex justify-between text-sm">
                <span>
                  {cat?.emoji ?? "•"} {cat?.label ?? category}
                </span>
                <span className="text-muted-foreground">{count} plays</span>
              </li>
            );
          })}
        </ul>
      </section>
    </section>
  );
}
