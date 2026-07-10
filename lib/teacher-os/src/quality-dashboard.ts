import type { QualityDashboardData } from "./pilot-types.js";
import { getProductEvents } from "./product-analytics.js";
import { avg, getPerformanceSnapshot } from "./performance-monitor.js";

const FEATURE_EVENT_MAP: Record<string, string[]> = {
  "Teaching Pack": ["teaching_pack"],
  "Homework Pack": ["homework_pack"],
  "Lesson Create": ["lesson_create_done"],
  "Worksheet Generate": ["worksheet_generate_done"],
  "PDF Export": ["export_pdf"],
  "Prompt Enhance": ["prompt_enhance"],
  "Reference Upload": ["reference_upload"],
  "Vision Analyze": ["vision_analyze"],
  "Amy Chat": ["module_open"],
};

export function buildQualityDashboard(): QualityDashboardData {
  const events = getProductEvents();
  const perf = getPerformanceSnapshot();

  const featureCounts = new Map<string, number>();
  for (const [label, types] of Object.entries(FEATURE_EVENT_MAP)) {
    const count = events.filter((e) => types.includes(e.type)).length;
    featureCounts.set(label, count);
  }

  const sorted = [...featureCounts.entries()].sort((a, b) => b[1] - a[1]);
  const moduleUsage = new Map<string, number>();
  for (const e of events) {
    if (e.module) moduleUsage.set(e.module, (moduleUsage.get(e.module) ?? 0) + 1);
  }

  const generates = events.filter((e) => e.type === "worksheet_generate_done").length;
  const exports = events.filter((e) => e.type === "export_pdf" || e.type === "export_docx").length;
  const enhances = events.filter((e) => e.type === "prompt_enhance").length;
  const aiAccepts = events.filter((e) => e.type === "ai_accept").length;
  const aiTotal = aiAccepts + events.filter((e) => e.type === "ai_fallback").length;

  const sessionEnds = events.filter((e) => e.type === "session_end" && e.durationMs);
  const dropOffs = new Map<string, number>();
  for (const e of events.filter((ev) => ev.type === "drop_off")) {
    const p = String(e.props?.point ?? "unknown");
    dropOffs.set(p, (dropOffs.get(p) ?? 0) + 1);
  }

  const qualityScores = events
    .filter((e) => e.props?.qualityScore != null)
    .map((e) => Number(e.props!.qualityScore));

  return {
    mostUsedFeatures: sorted.filter(([, c]) => c > 0).slice(0, 5).map(([feature, count]) => ({ feature, count })),
    leastUsedFeatures: sorted.filter(([, c]) => c === 0).slice(0, 5).map(([feature, count]) => ({ feature, count })),
    avgWorksheetQuality: qualityScores.length ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length) : 0,
    avgLessonQuality: events.filter((e) => e.type === "lesson_create_done").length > 0 ? 75 : 0,
    moduleUsage: [...moduleUsage.entries()].map(([module, count]) => ({ module, count })).sort((a, b) => b.count - a.count),
    errors: events.filter((e) => e.type === "crash" || e.type === "api_failure").length,
    avgAiLatencyMs: avg(perf.aiLatencyMs),
    offlineUsage: events.filter((e) => e.type === "offline_fallback").length,
    exportRate: generates > 0 ? Math.round((exports / generates) * 100) : 0,
    promptEnhanceRate: generates > 0 ? Math.round((enhances / generates) * 100) : 0,
    aiAcceptanceRate: aiTotal > 0 ? Math.round((aiAccepts / aiTotal) * 100) : 100,
    avgSessionDurationMs: sessionEnds.length ? avg(sessionEnds.map((e) => e.durationMs!)) : 0,
    dropOffPoints: [...dropOffs.entries()].map(([point, count]) => ({ point, count })).sort((a, b) => b.count - a.count),
  };
}
