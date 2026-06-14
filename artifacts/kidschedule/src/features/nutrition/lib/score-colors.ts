export type ScoreTier = "warning" | "progress" | "success";

export function scoreTier(score: number): ScoreTier {
  if (score >= 80) return "success";
  if (score >= 41) return "progress";
  return "warning";
}

export function scoreColor(score: number): string {
  switch (scoreTier(score)) {
    case "success":
      return "text-emerald-400";
    case "progress":
      return "text-amber-400";
    case "warning":
      return "text-orange-400";
  }
}

export function scoreBarColor(score: number): string {
  switch (scoreTier(score)) {
    case "success":
      return "bg-emerald-500";
    case "progress":
      return "bg-amber-500";
    case "warning":
      return "bg-orange-500";
  }
}

export function scoreRingStroke(score: number): string {
  switch (scoreTier(score)) {
    case "success":
      return "stroke-emerald-400";
    case "progress":
      return "stroke-amber-400";
    case "warning":
      return "stroke-orange-400";
  }
}

export function scoreRingGlow(score: number): string {
  switch (scoreTier(score)) {
    case "success":
      return "drop-shadow-[0_0_8px_rgba(52,211,153,0.45)]";
    case "progress":
      return "drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]";
    case "warning":
      return "drop-shadow-[0_0_8px_rgba(251,146,60,0.4)]";
  }
}

/** SVG fill hex for charts (no external libs). */
export function scoreChartFill(score: number): string {
  switch (scoreTier(score)) {
    case "success":
      return "#34d399";
    case "progress":
      return "#fbbf24";
    case "warning":
      return "#fb923c";
  }
}
