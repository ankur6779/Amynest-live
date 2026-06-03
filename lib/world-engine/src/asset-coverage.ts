import type { WorldManifest, WorldManifestItem } from "./manifest-types.js";
import { itemAssetFolder } from "./visual-asset-paths.js";

export type VisualAssetKind = "hero" | "card" | "thumbnail";

export type ExpectedVisualAsset = {
  kind: VisualAssetKind;
  gcsPath: string;
  itemId: string;
  itemName: string;
};

export function expectedVisualAssetsForItem(item: WorldManifestItem): ExpectedVisualAsset[] {
  const folder = itemAssetFolder(item.imageGcsPath);
  const hero = item.heroRealGcsPath ?? item.imageGcsPath;
  const card = item.heroCartoonGcsPath ?? `${folder}/card.webp`;
  const thumbnail = `${folder}/thumbnail.webp`;
  return [
    { kind: "hero", gcsPath: hero, itemId: item.id, itemName: item.name },
    { kind: "card", gcsPath: card, itemId: item.id, itemName: item.name },
    { kind: "thumbnail", gcsPath: thumbnail, itemId: item.id, itemName: item.name },
  ];
}

export function expectedVisualAssetsForManifest(manifest: WorldManifest): ExpectedVisualAsset[] {
  return manifest.items.flatMap((item) => expectedVisualAssetsForItem(item));
}

export type WorldAssetCoverageRow = {
  worldId: string;
  label: string;
  itemCount: number;
  totalAssets: number;
  presentAssets: number;
  missingAssets: number;
  coveragePct: number;
  missingPaths: string[];
};

export type AssetCoverageReport = {
  generatedAt: string;
  totalAssets: number;
  presentAssets: number;
  missingAssets: number;
  coveragePct: number;
  worlds: WorldAssetCoverageRow[];
  blockers: string[];
};

export function buildAssetCoverageReport(input: {
  worlds: Array<{ worldId: string; label: string; manifest: WorldManifest }>;
  exists: (gcsPath: string) => boolean;
}): AssetCoverageReport {
  const worlds: WorldAssetCoverageRow[] = [];
  const blockers: string[] = [];

  for (const { worldId, label, manifest } of input.worlds) {
    const expected = expectedVisualAssetsForManifest(manifest);
    const missingPaths: string[] = [];
    let present = 0;
    for (const asset of expected) {
      if (input.exists(asset.gcsPath)) present += 1;
      else missingPaths.push(asset.gcsPath);
    }
    const total = expected.length;
    const missing = total - present;
    const coveragePct = total > 0 ? Math.round((present / total) * 100) : 0;
    worlds.push({
      worldId,
      label,
      itemCount: manifest.items.length,
      totalAssets: total,
      presentAssets: present,
      missingAssets: missing,
      coveragePct,
      missingPaths: missingPaths.slice(0, 12),
    });
    if (coveragePct < 100 && missing > 0) {
      blockers.push(`${label}: ${missing} missing images (${coveragePct}% coverage)`);
    }
  }

  const totalAssets = worlds.reduce((s, w) => s + w.totalAssets, 0);
  const presentAssets = worlds.reduce((s, w) => s + w.presentAssets, 0);
  const missingAssets = totalAssets - presentAssets;

  return {
    generatedAt: new Date().toISOString(),
    totalAssets,
    presentAssets,
    missingAssets,
    coveragePct: totalAssets > 0 ? Math.round((presentAssets / totalAssets) * 100) : 0,
    worlds,
    blockers,
  };
}
