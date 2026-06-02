import type { WorldManifestItem } from "@workspace/world-engine";

/** GCS path convention: hero.webp, thumbnail.webp, card.webp per item folder. */
export function itemAssetFolder(imageGcsPath: string): string {
  return imageGcsPath.replace(/\/?hero\.webp$/i, "");
}

export function worldItemVisualPaths(
  item: WorldManifestItem,
  resolve: (gcsPath: string) => string,
): { hero: string; thumbnail: string; card: string; folder: string } {
  const folder = itemAssetFolder(item.imageGcsPath);
  return {
    folder,
    hero: resolve(item.heroRealGcsPath ?? item.imageGcsPath),
    thumbnail: resolve(`${folder}/thumbnail.webp`),
    card: resolve(item.heroCartoonGcsPath ?? `${folder}/card.webp`),
  };
}

/** Fixed dimensions prevent CLS on grid cards (matches 4:5 aspect). */
export const WORLD_CARD_IMAGE_SIZE = { width: 320, height: 400 } as const;
