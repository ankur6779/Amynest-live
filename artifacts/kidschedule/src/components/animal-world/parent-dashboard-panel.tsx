import {
  buildParentInsights,
  getAllAnimals,
  getAnimalById,
  CATEGORY_LABELS,
} from "@workspace/animal-world";
import {
  getMostPlayedAnimalIds,
  loadAnimalWorldStats,
} from "@/lib/animal-world-storage";
import { loadAnimalWorldProgress } from "@/lib/animal-world-progress";
import { ParentInsightsCharts } from "./parent-insights-charts";

type ParentDashboardPanelProps = {
  childId: number;
};

export function ParentDashboardPanel({ childId }: ParentDashboardPanelProps) {
  const stats = loadAnimalWorldStats(childId);
  const progress = loadAnimalWorldProgress(childId);
  const insights = buildParentInsights({
    stats,
    progress,
    animals: getAllAnimals(),
  });
  const mostPlayed = getMostPlayedAnimalIds(childId, 8);
  const favorites = stats.favorites
    .map((id) => getAnimalById(id))
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Learning streak" value={`${insights.streakDays} days`} />
        <StatCard label="Animals explored" value={String(Object.keys(stats.playCounts).length)} />
        <StatCard
          label="Session time"
          value={`${Math.round(stats.totalSessionMs / 60000)} min`}
        />
      </div>

      <ParentInsightsCharts insights={insights} />

      <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Most played
        </h3>
        <ul className="space-y-2">
          {mostPlayed.length === 0 && (
            <li className="text-sm text-muted-foreground">No plays yet — tap some animals!</li>
          )}
          {mostPlayed.map(({ animalId, count }) => {
            const animal = getAnimalById(animalId);
            if (!animal) return null;
            return (
              <li key={animalId} className="flex items-center justify-between text-sm">
                <span>
                  {animal.emoji} {animal.name}
                </span>
                <span className="text-muted-foreground">{count}×</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Most recognized (Hear & Find + Quiz)
        </h3>
        <ul className="space-y-2">
          {insights.mostRecognized.length === 0 && (
            <li className="text-sm text-muted-foreground">Play Hear & Find or Quiz to see recognition scores.</li>
          )}
          {insights.mostRecognized.map(({ animalId, accuracy }) => {
            const animal = getAnimalById(animalId);
            if (!animal) return null;
            return (
              <li key={animalId} className="flex items-center justify-between text-sm">
                <span>
                  {animal.emoji} {animal.name}
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
        <div className="flex flex-wrap gap-2">
          {insights.favoriteCategories.length === 0 && (
            <p className="text-sm text-muted-foreground">Explore categories to see favorites here.</p>
          )}
          {insights.favoriteCategories.map(({ category, count }) => (
            <span
              key={category}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm"
            >
              {CATEGORY_LABELS[category]} · {count}×
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Favorites
        </h3>
        <div className="flex flex-wrap gap-2">
          {favorites.length === 0 && (
            <p className="text-sm text-muted-foreground">Tap the heart on any animal to save it here.</p>
          )}
          {favorites.map((animal) => (
            <span
              key={animal!.id}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm"
            >
              {animal!.emoji} {animal!.name}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Library
        </h3>
        <p className="text-sm text-muted-foreground">
          {getAllAnimals().length} animals across{" "}
          {Object.keys(CATEGORY_LABELS).length} habitats · {progress.xp} XP ·{" "}
          {progress.stickersEarned.length} stickers
        </p>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[rgba(18,28,60,0.72)] px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
