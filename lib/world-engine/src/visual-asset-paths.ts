/** Shared GCS path helpers for discovery world item visuals. */
export function itemAssetFolder(imageGcsPath: string): string {
  return imageGcsPath.replace(/\/?hero\.webp$/i, "");
}
