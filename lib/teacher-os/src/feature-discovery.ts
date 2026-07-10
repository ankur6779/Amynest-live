import type { FeatureDiscoveryTip } from "./pilot-types.js";
import { getProductEvents, getSessionCount, trackProductEvent } from "./product-analytics.js";

const DISMISSED_KEY = "teacher-os-tips-dismissed-v81";

export const FEATURE_TIPS: FeatureDiscoveryTip[] = [
  { id: "homework_pack", feature: "homework_pack", message: "Try Homework Pack — worksheet + parent guide in one tap", module: "teaching_pack", minSessions: 2 },
  { id: "flashcards", feature: "flashcards", message: "Generate Flashcards from any teaching pack", module: "teaching_pack", minSessions: 3 },
  { id: "prompt_enhancer", feature: "prompt_enhance", message: "Use AI Prompt Enhancer for better worksheets", module: "studio", minSessions: 2 },
  { id: "weekly_plan", feature: "weekly_planner", message: "Plan your whole week with the Weekly Planner", module: "weekly_planner", minSessions: 4 },
  { id: "reconstruct", feature: "reconstruct", message: "Photograph a notebook page — AI reconstructs it", module: "studio", minSessions: 5 },
];

function loadDismissed(): Set<string> {
  try {
    if (typeof localStorage === "undefined") return new Set();
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
    }
  } catch { /* */ }
}

function featureUsed(feature: string): boolean {
  const events = getProductEvents();
  const map: Record<string, string[]> = {
    homework_pack: ["homework_pack", "teaching_pack"],
    flashcards: ["teaching_pack"],
    prompt_enhance: ["prompt_enhance"],
    weekly_planner: ["module_open"],
    reconstruct: ["reference_upload"],
  };
  const types = map[feature] ?? [feature];
  return events.some((e) => types.includes(e.type) || e.props?.feature === feature);
}

export function getActiveFeatureTip(): FeatureDiscoveryTip | null {
  const sessions = getSessionCount();
  const dismissed = loadDismissed();
  for (const tip of FEATURE_TIPS) {
    if (sessions < tip.minSessions) continue;
    if (dismissed.has(tip.id)) continue;
    if (featureUsed(tip.feature)) continue;
    return tip;
  }
  return null;
}

export function dismissFeatureTip(tipId: string): void {
  const dismissed = loadDismissed();
  dismissed.add(tipId);
  saveDismissed(dismissed);
  trackProductEvent("feature_tip_shown", { tipId, dismissed: true });
}

export function recordFeatureTipClick(tipId: string): void {
  trackProductEvent("feature_tip_clicked", { tipId });
}
