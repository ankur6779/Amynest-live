import type { WorldManifestItem } from "./manifest-types.js";
import type { WorldProgressV2, WorldItemMastery } from "./progress-types.js";
import { defaultWorldItemMastery } from "./progress-types.js";

export type PlatformStickerDefinition = {
  id: string;
  itemId: string;
  title: string;
  emoji: string;
  unlockSoundsPlayed: number;
};

export function buildPlatformStickerCatalog(items: WorldManifestItem[]): PlatformStickerDefinition[] {
  return items.map((item) => ({
    id: `sticker:${item.id}`,
    itemId: item.id,
    title: `${item.name} Sticker`,
    emoji: item.emoji,
    unlockSoundsPlayed: 3,
  }));
}

function getMastery(progress: WorldProgressV2, itemId: string): WorldItemMastery {
  return progress.itemMastery[itemId] ?? defaultWorldItemMastery();
}

export function isPlatformStickerUnlocked(
  sticker: PlatformStickerDefinition,
  progress: WorldProgressV2,
): boolean {
  if (progress.stickersEarned.includes(sticker.id)) return true;
  return getMastery(progress, sticker.itemId).soundsPlayed >= sticker.unlockSoundsPlayed;
}

export function earnPlatformStickers(
  progress: WorldProgressV2,
  catalog: PlatformStickerDefinition[],
): { progress: WorldProgressV2; earned: PlatformStickerDefinition[] } {
  const earned: PlatformStickerDefinition[] = [];
  const next = [...progress.stickersEarned];
  for (const sticker of catalog) {
    if (next.includes(sticker.id)) continue;
    if (isPlatformStickerUnlocked(sticker, progress)) {
      next.push(sticker.id);
      earned.push(sticker);
    }
  }
  return { progress: { ...progress, stickersEarned: next }, earned };
}
