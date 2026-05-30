/**
 * Dashboard visual tokens — flows from the vibrant hero into tinted glass cards below.
 */

import { cn } from "@/lib/utils";

export const DASHBOARD_PAGE_BG = "#0a1024";

/** Content area below hero — soft violet fade into page base (no flat bg-background cut). */
export const DASHBOARD_CONTENT_GRADIENT =
  "linear-gradient(180deg, rgba(55,38,105,0.72) 0%, rgba(22,28,56,0.94) 14%, rgba(10,16,36,1) 32%)";

export const DASHBOARD_CONTENT_AREA = cn(
  "rounded-t-3xl -mt-1 pt-5 pb-2 flex flex-col gap-4 relative overflow-hidden",
);

export const DASHBOARD_AMBIENT_TOP =
  "pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-violet-500/14 via-indigo-500/6 to-transparent";

export const DASHBOARD_TINTS = {
  journey: "139,92,246",
  timeline: "251,146,60",
  amy: "167,139,250",
  memory: "99,102,241",
  stats: "251,146,60",
  insights: "56,189,248",
  score: "251,191,36",
  weekly: "129,140,248",
  behavior: "251,113,133",
  routines: "251,146,60",
  rewards: "251,191,36",
  gaming: "52,211,153",
  childChip: "122,92,255",
} as const;

export type DashboardTintKey = keyof typeof DASHBOARD_TINTS;

export function dashboardGlassShellClasses(r: number, g: number, b: number): string {
  return cn(
    "relative overflow-hidden border backdrop-blur-[14px]",
    "border-white/[0.10]",
    `shadow-[0_0_0_1px_rgba(${r},${g},${b},0.14),0_6px_24px_rgba(${r},${g},${b},0.10),0_2px_12px_rgba(0,0,0,0.22)]`,
    `hover:shadow-[0_0_0_1px_rgba(${r},${g},${b},0.22),0_10px_32px_rgba(${r},${g},${b},0.14),0_4px_16px_rgba(0,0,0,0.28)]`,
    "transition-all duration-[220ms] ease-[ease]",
  );
}

export const DASHBOARD_SECTION_HEADER = cn(
  "flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.08] w-full",
);

export const DASHBOARD_SECTION_BODY = "p-3";

export const DASHBOARD_CHIP_SELECTED = cn(
  "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all",
  "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white",
  "shadow-[0_0_16px_rgba(139,92,246,0.35)]",
);

export const DASHBOARD_CHIP_IDLE = cn(
  "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all",
  "border border-white/12 text-white/85",
  "bg-white/[0.05] hover:border-violet-400/35 hover:bg-white/[0.08]",
);
