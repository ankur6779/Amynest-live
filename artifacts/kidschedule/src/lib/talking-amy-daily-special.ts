/**
 * Today's Special Amy — deterministic per calendar day, device-local.
 */

import { TALKING_AMY_MODES, type TalkingAmyMode, type TalkingAmyModeId } from "@/lib/talking-amy-modes";

function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Simple string hash → stable index for the day. */
function hashDayKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getDailySpecialAmyModeId(date = new Date()): TalkingAmyModeId {
  const ids = TALKING_AMY_MODES.map((m) => m.id);
  const idx = hashDayKey(localDateKey(date)) % ids.length;
  return ids[idx] ?? "chipmunk";
}

export function getDailySpecialAmyMode(date = new Date()): TalkingAmyMode {
  const id = getDailySpecialAmyModeId(date);
  return TALKING_AMY_MODES.find((m) => m.id === id) ?? TALKING_AMY_MODES[0]!;
}

export function getDailySpecialDateKey(date = new Date()): string {
  return localDateKey(date);
}
