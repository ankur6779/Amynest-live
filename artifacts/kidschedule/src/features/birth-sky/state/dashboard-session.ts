/**
 * Dashboard session state (Pack 4 Addendum A §2).
 * Map selection: in-session only — cleared on module leave / new mount.
 */

import type { SkyBodyKey } from "../application/view-models/dashboard-vm";

export type DashboardSegmentId = "sky" | "astronomy" | "tradition" | "reflect";

export type DashboardSessionState = {
  selectedBody: SkyBodyKey | null;
  activeSegment: DashboardSegmentId;
  heroCollapsed: boolean;
  daySkyBannerViewed: boolean;
  /** Clears selection when snapshotVersion changes (regen). */
  boundSnapshotVersion: string | null;
};

export function createDashboardSession(
  activeSegment: DashboardSegmentId = "sky",
): DashboardSessionState {
  return {
    selectedBody: null,
    activeSegment,
    heroCollapsed: false,
    daySkyBannerViewed: false,
    boundSnapshotVersion: null,
  };
}

export function bindSnapshotVersion(
  session: DashboardSessionState,
  snapshotVersion: string,
): DashboardSessionState {
  if (session.boundSnapshotVersion === snapshotVersion) return session;
  return {
    ...session,
    boundSnapshotVersion: snapshotVersion,
    selectedBody: null,
  };
}

export function selectSkyBody(
  session: DashboardSessionState,
  key: SkyBodyKey | null,
): DashboardSessionState {
  return { ...session, selectedBody: key };
}

export function setDashboardSegment(
  session: DashboardSessionState,
  segment: DashboardSegmentId,
): DashboardSessionState {
  return { ...session, activeSegment: segment };
}

/** Session tab restore from `/app/*` path (Pack 4 order). */
export function parseAppSegment(path: string): DashboardSegmentId {
  if (path.includes("/app/astronomy")) return "astronomy";
  if (path.includes("/app/tradition")) return "tradition";
  if (path.includes("/app/reflect")) return "reflect";
  return "sky";
}
