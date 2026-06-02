import type { WorldId } from "./types.js";
import type { WorldManifestItem } from "./manifest-types.js";

export type PersonalizedRecommendation = {
  headline: string;
  detail: string;
  emoji: string;
  /** Suggested category id when applicable */
  categoryId?: string;
};

export function buildPersonalizedRecommendation(input: {
  worldId: WorldId;
  worldTitle: string;
  worldEmoji: string;
  items: WorldManifestItem[];
  playCounts: Record<string, number>;
}): PersonalizedRecommendation | null {
  const { worldTitle, worldEmoji, items, playCounts } = input;
  const entries = Object.entries(playCounts).filter(([, c]) => c > 0);
  if (entries.length === 0) {
    return {
      headline: `Welcome to ${worldTitle}`,
      detail: "Tap any card to start your first adventure.",
      emoji: worldEmoji,
    };
  }

  const categoryCounts = new Map<string, number>();
  for (const [itemId, count] of entries) {
    const item = items.find((i) => i.id === itemId);
    if (!item) continue;
    categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + count);
  }

  const topCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topCategory) {
    const cat = items.find((i) => i.category === topCategory[0]);
    const catLabel = cat?.category ?? topCategory[0];
    return {
      headline: "You seem to love this world",
      detail: `Try more ${catLabel} sounds today.`,
      emoji: cat?.emoji ?? worldEmoji,
      categoryId: topCategory[0],
    };
  }

  const topItem = entries.sort((a, b) => b[1] - a[1])[0];
  const favorite = items.find((i) => i.id === topItem?.[0]);
  if (favorite) {
    return {
      headline: `${favorite.emoji} is a favorite`,
      detail: `Play Hear & Find with ${favorite.name} today.`,
      emoji: favorite.emoji,
      categoryId: favorite.category,
    };
  }

  return null;
}
