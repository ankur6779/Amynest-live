/**
 * Today's Special Amy — deterministic featured mode with bonus reactions.
 */

import {
  TALKING_AMY_REGULAR_MODES,
  getTalkingAmyMode,
  type TalkingAmyMode,
  type TalkingAmyModeId,
  type TalkingAmyRegularModeId,
} from "@/lib/talking-amy-modes";
import {
  DAILY_FEATURED_BONUS_REACTIONS,
  pickWeightedTalkingAmyReaction,
} from "@/lib/talking-amy-reaction-pools";

function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function hashDayKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getDailySpecialAmyModeId(date = new Date()): TalkingAmyRegularModeId {
  const ids = TALKING_AMY_REGULAR_MODES.map((m) => m.id);
  const idx = hashDayKey(localDateKey(date)) % ids.length;
  return (ids[idx] ?? "chipmunk") as TalkingAmyRegularModeId;
}

export function getDailySpecialAmyMode(date = new Date()): TalkingAmyMode {
  return getTalkingAmyMode(getDailySpecialAmyModeId(date));
}

export function getDailySpecialDateKey(date = new Date()): string {
  return localDateKey(date);
}

export function isDailyFeaturedMode(modeId: TalkingAmyModeId, date = new Date()): boolean {
  return getDailySpecialAmyModeId(date) === modeId;
}

export function pickDailyFeaturedReaction(modeId: TalkingAmyModeId, date = new Date()): string | null {
  if (!isDailyFeaturedMode(modeId, date)) return null;
  return pickWeightedTalkingAmyReaction(modeId, {
    extraPool: DAILY_FEATURED_BONUS_REACTIONS,
    avoidRepeat: true,
  });
}

/** Featured mode grants +1 toward mode-use achievements per echo. */
export function dailyFeaturedAchievementBonus(modeId: TalkingAmyModeId, date = new Date()): boolean {
  return isDailyFeaturedMode(modeId, date);
}
