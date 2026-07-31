import { buildPersonalizedRecommendation } from "@workspace/world-engine";
import { PremiumCard } from "@/components/learning-progress/premium-polish";
import type { DiscoveryWorldRuntimeConfig } from "@/lib/discovery-world-config";
import { loadDiscoveryWorldStats } from "@/lib/discovery-worlds-stats";

type PersonalizationBannerProps = {
  config: DiscoveryWorldRuntimeConfig;
  childId: number;
  onCategoryHint?: (categoryId: string) => void;
  offerExploration?: boolean;
  offerBonus?: boolean;
};

export function PersonalizationBanner({
  config,
  childId,
  onCategoryHint,
  offerExploration,
  offerBonus,
}: PersonalizationBannerProps) {
  const stats = loadDiscoveryWorldStats(config.worldId, childId);
  const rec = buildPersonalizedRecommendation({
    worldId: config.worldId,
    worldTitle: config.title,
    worldEmoji: config.emoji,
    items: config.manifest.items,
    playCounts: stats.playCounts,
  });

  if (!rec) return null;

  const detail =
    offerBonus
      ? "Bonus path: try Hear & Find for a deeper listening challenge."
      : offerExploration
        ? "You're ready to explore a new category — pick one that looks fun."
        : rec.detail;

  return (
    <PremiumCard tier="glow" interactive className="p-4">
      <button
        type="button"
        className="w-full text-left"
        onClick={() => rec.categoryId && onCategoryHint?.(rec.categoryId)}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          {rec.emoji} For you
        </p>
        <p className="mt-1 font-semibold text-foreground">{rec.headline}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </button>
    </PremiumCard>
  );
}
