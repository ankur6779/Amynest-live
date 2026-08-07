/**
 * Parent Hub Rooms V1 — Pack 1 Room Shell.
 * Default ON. Set VITE_FF_PARENT_HUB_ROOMS_V1=0 to restore legacy eight-group mall.
 */

export function isParentHubRoomsV1Enabled(): boolean {
  const raw = import.meta.env.VITE_FF_PARENT_HUB_ROOMS_V1;
  if (raw === undefined || raw === "") return true;
  return raw === "true" || raw === "1";
}
