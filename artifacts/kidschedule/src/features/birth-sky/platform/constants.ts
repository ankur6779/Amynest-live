/** Pack 10 — platform-owned Lens SDK version (peer for lens manifests). */
export const BIRTH_SKY_LENS_SDK_VERSION = "birth_sky_lens_sdk/1.0.0" as const;

/** Offline partition prefix (Pack 9 §6). */
export const LENS_OFFLINE_PARTITION_PREFIX = "offline.lens." as const;

export function lensOfflinePartitionKey(lensId: string): string {
  return `${LENS_OFFLINE_PARTITION_PREFIX}${lensId}`;
}

export function lensRouteNamespace(lensId: string): string {
  return `/birth-sky/lens/${lensId}`;
}

export function lensAnalyticsPrefix(lensId: string): string {
  return `birth_sky.lens.${lensId}.`;
}
