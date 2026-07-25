/**
 * Builds TraditionalData from an immutable SkySnapshot + content pack version.
 * Does not recompute ephemeris; mansion key is a cultural index only.
 */

import { TRADITIONAL_CONTENT_VERSION, LUNAR_MANSION_KEYS } from "../../constants/traditional-content";
import type { BirthProfile, SkySnapshot } from "../../domain/models/birth-profile";
import type { TraditionalData } from "../../domain/models/traditional-data";

function mansionKeyFromLongitude(lonDeg: number): string {
  const n = ((lonDeg % 360) + 360) % 360;
  const idx = Math.min(26, Math.floor(n / (360 / 27)));
  return LUNAR_MANSION_KEYS[idx]!;
}

export function buildTraditionalData(
  profile: BirthProfile,
  snapshot: SkySnapshot,
  contentVersion: string = TRADITIONAL_CONTENT_VERSION,
): TraditionalData {
  const moon = snapshot.astronomy.bodies.find((b) => b.id === "moon");
  const lon = moon?.eclipticLongitudeDeg ?? 0;
  return {
    lens: "tradition",
    profileId: profile.profileId,
    snapshotVersion: snapshot.snapshotVersion,
    traditionalContentVersion: contentVersion,
    mode: snapshot.mode,
    lunarMansionKey: mansionKeyFromLongitude(lon),
    sunSign: snapshot.astronomy.sunSign,
    moonSign: snapshot.astronomy.moonSign,
    moonPhaseLabel: snapshot.astronomy.moonPhaseLabel,
    risingSign: snapshot.astronomy.risingSign,
    timePrecision: profile.timePrecision,
  };
}
