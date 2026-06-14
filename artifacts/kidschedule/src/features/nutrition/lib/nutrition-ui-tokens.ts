/**
 * Nutrition Hub — distinct visual identities per section.
 * Layout/motion tokens only — no business logic.
 */

import { cn } from "@/lib/utils";
import { HUB_GLASS_SURFACE } from "@/lib/parent-hub-premium";

const CARD_BASE = cn(
  HUB_GLASS_SURFACE,
  "relative overflow-hidden",
  "transition-all duration-[220ms] ease-[ease]",
);

/** Today's Nourishment — glowing progress card */
export const NUTRITION_SCORE_CARD = cn(
  CARD_BASE,
  "border-[1.5px] border-[rgba(255,184,0,0.45)]",
  "shadow-[0_0_0_1px_rgba(255,184,0,0.18),0_8px_32px_rgba(255,184,0,0.12),0_12px_40px_rgba(0,0,0,0.28)]",
  "hover:shadow-[0_0_0_1px_rgba(255,184,0,0.28),0_12px_40px_rgba(255,184,0,0.18),0_16px_48px_rgba(0,0,0,0.32)]",
);

/** Weekly Story — success / encouragement card */
export const NUTRITION_WEEKLY_STORY_CARD = cn(
  CARD_BASE,
  "border-[1.5px] border-[rgba(52,211,153,0.40)]",
  "shadow-[0_0_0_1px_rgba(52,211,153,0.15),0_8px_28px_rgba(52,211,153,0.10),inset_0_1px_rgba(255,255,255,0.04)]",
  "bg-gradient-to-br from-emerald-500/[0.06] via-transparent to-amber-500/[0.04]",
);

/** Tonight's Meal — hero recommendation card */
export const NUTRITION_MEAL_HERO_CARD = cn(
  CARD_BASE,
  "border-[1.5px] border-[rgba(251,146,60,0.50)]",
  "shadow-[0_0_0_1px_rgba(251,146,60,0.20),0_12px_40px_rgba(251,146,60,0.14),0_20px_50px_rgba(0,0,0,0.30)]",
);

/** Focus Nutrient — educational insight card */
export const NUTRITION_FOCUS_CARD = cn(
  CARD_BASE,
  "border-[1.5px] border-[rgba(129,140,248,0.40)]",
  "shadow-[0_0_0_1px_rgba(129,140,248,0.15),0_8px_28px_rgba(129,140,248,0.10)]",
  "bg-gradient-to-br from-indigo-500/[0.05] via-transparent to-violet-500/[0.04]",
);

/** Household Board — family overview container */
export const NUTRITION_HOUSEHOLD_CARD = cn(
  CARD_BASE,
  "border-[1.5px] border-[rgba(45,212,191,0.38)]",
  "shadow-[0_0_0_1px_rgba(45,212,191,0.12),0_8px_28px_rgba(45,212,191,0.08)]",
);

/** Week progress strip — subtle timeline container */
export const NUTRITION_WEEK_STRIP = cn(
  "rounded-xl border border-white/[0.08]",
  "bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-white/[0.04]",
  "backdrop-blur-md",
);

/** Nutrient benefit chips */
export const NUTRITION_NUTRIENT_CHIP = cn(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-1",
  "text-[11px] font-medium text-emerald-100/90",
  "border border-emerald-400/25 bg-emerald-500/[0.10]",
  "shadow-[0_0_12px_rgba(52,211,153,0.12)]",
);

/** Child profile mini-card */
export const NUTRITION_CHILD_PROFILE_CARD = cn(
  "rounded-xl border border-white/[0.10]",
  "bg-gradient-to-br from-white/[0.06] to-white/[0.02]",
  "backdrop-blur-sm p-3",
  "shadow-[0_4px_16px_rgba(0,0,0,0.15)]",
  "transition-all duration-200 hover:border-white/[0.16]",
);

/** Avatar circle colors by child id */
const AVATAR_PALETTES = [
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-violet-400 to-indigo-500",
  "from-rose-400 to-pink-500",
  "from-cyan-400 to-sky-500",
  "from-lime-400 to-green-500",
] as const;

export function childAvatarGradient(childId: number): string {
  return AVATAR_PALETTES[Math.abs(childId) % AVATAR_PALETTES.length]!;
}
