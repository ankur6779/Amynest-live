/**
 * TraditionalData (Phase 3 §5.1 / Pack 5) — cultural layer keyed to a snapshot.
 * Never mutates SkySnapshot. Always lens: tradition.
 */

import type { BirthSkyMode } from "./birth-profile";

export type TraditionalData = {
  lens: "tradition";
  profileId: string;
  snapshotVersion: string;
  traditionalContentVersion: string;
  mode: BirthSkyMode;
  /** Equal-sector mansion key from moon longitude — cultural index only. */
  lunarMansionKey: string;
  sunSign: string;
  moonSign: string;
  moonPhaseLabel: string;
  risingSign: string | null;
  timePrecision: "exact" | "approximate" | "unknown";
};
