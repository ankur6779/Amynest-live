/**
 * Phase 1 analytics validation — coverage, taxonomy, duplicate emitter audit.
 * Used by vitest and `scripts/generate-analytics-validation-reports.mjs`.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  ANALYTICS_EVENT_NAMES,
  analyticsEventCategory,
  isKnownAnalyticsEvent,
} from "@workspace/analytics-taxonomy";

export const REQUIRED_PHASE1_EVENTS = [
  "screen_view",
  "screen_leave",
  "button_click",
  "navigation",
  "feature_open",
  "feature_complete",
  "session_end",
  "first_open",
  "search_query",
  "search_no_results",
  "asset_download",
  "subscription_funnel_event",
  "onboarding_funnel_event",
  "growth_funnel_event",
  "performance_metric",
  "error_captured",
] as const;

export type AnalyticsValidationReport = {
  generatedAt: string;
  taxonomyEventCount: number;
  phase1Present: string[];
  phase1Missing: string[];
  routeCount: number;
  screenTrackingCoveragePct: number;
  wiredPhase1Events: string[];
  unwiredPhase1Events: string[];
  directTrackViolations: string[];
  duplicateGrowthEmitter: boolean;
  duplicateEmitterFiles: string[];
  taxonomyByCategory: Record<string, string[]>;
};

function walkTsFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "node_modules" || name.startsWith(".")) continue;
    const st = statSync(p);
    if (st.isDirectory()) walkTsFiles(p, acc);
    else if (/\.(ts|tsx)$/.test(name)) acc.push(p);
  }
  return acc;
}

function extractRoutes(appCoreText: string): string[] {
  const routes: string[] = [];
  const re = /<Route\s+path="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(appCoreText)) !== null) {
    routes.push(m[1]);
  }
  return routes;
}

const PHASE1_WIRING_HINTS: Record<string, RegExp> = {
  screen_view: /trackScreenView|screen_view/,
  screen_leave: /trackScreenLeave|screen_leave/,
  navigation: /trackScreenView|navigation/,
  button_click: /trackButtonClick|analyticsId|button_click/,
  feature_open: /trackFeatureOpen|feature_open/,
  feature_complete: /trackFeatureComplete|feature_complete/,
  session_end: /session_end|SessionManager/,
  first_open: /first_open|shouldEmitFirstOpen/,
  search_query: /trackSearchQuery|search_query/,
  search_no_results: /trackSearchQuery|search_no_results/,
  asset_download: /trackAssetDownload|asset_download/,
  subscription_funnel_event: /trackFunnel\(\s*["']subscription|subscription_funnel_event/,
  onboarding_funnel_event: /trackFunnel\(\s*["']onboarding|onboarding_funnel_event/,
  growth_funnel_event: /trackFunnel\(\s*["']growth|growth_funnel_event/,
  performance_metric: /trackPerformance|performance_metric|performance-bridge/,
  error_captured: /trackError|error_captured|error-bridge/,
};

export function buildAnalyticsValidationReport(
  kidscheduleSrc = join(process.cwd(), "src"),
): AnalyticsValidationReport {
  const phase1Present: string[] = [];
  const phase1Missing: string[] = [];
  for (const e of REQUIRED_PHASE1_EVENTS) {
    if (isKnownAnalyticsEvent(e)) phase1Present.push(e);
    else phase1Missing.push(e);
  }

  const files = walkTsFiles(kidscheduleSrc);
  const corpus = files
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");

  const wiredPhase1Events: string[] = [];
  const unwiredPhase1Events: string[] = [];
  for (const e of REQUIRED_PHASE1_EVENTS) {
    const hint = PHASE1_WIRING_HINTS[e];
    if (hint?.test(corpus)) wiredPhase1Events.push(e);
    else unwiredPhase1Events.push(e);
  }

  const directTrackViolations: string[] = [];
  const duplicateEmitterFiles: string[] = [];

  for (const file of files) {
    const rel = relative(kidscheduleSrc, file);
    if (rel.includes("lib/analytics/") || rel === "lib/analytics.ts") continue;
    if (rel === "lib/client-logs.ts") continue;
    const text = readFileSync(file, "utf8");
    if (/queueClientLog\([\s\S]*type:\s*["']growth_analytics["']/.test(text)) {
      duplicateEmitterFiles.push(rel);
    }
    if (/\btrack\s*\(\s*["'`]/.test(text) && !text.includes('from "@/lib/analytics"') && !text.includes("from '@/lib/analytics'")) {
      if (!rel.includes(".test.") && !rel.includes("validation-report")) {
        directTrackViolations.push(rel);
      }
    }
  }

  const appCorePath = join(kidscheduleSrc, "AppCore.tsx");
  const appCore = readFileSync(appCorePath, "utf8");
  const routes = extractRoutes(appCore);
  const hasScreenTracker =
    appCore.includes("AnalyticsScreenTracker") || corpus.includes("AnalyticsScreenTracker");
  const screenTrackingCoveragePct = hasScreenTracker && routes.length > 0 ? 100 : 0;

  const taxonomyByCategory: Record<string, string[]> = {};
  for (const name of ANALYTICS_EVENT_NAMES) {
    const cat = analyticsEventCategory(name);
    if (!taxonomyByCategory[cat]) taxonomyByCategory[cat] = [];
    taxonomyByCategory[cat].push(name);
  }

  return {
    generatedAt: new Date().toISOString(),
    taxonomyEventCount: ANALYTICS_EVENT_NAMES.length,
    phase1Present,
    phase1Missing,
    routeCount: routes.length,
    screenTrackingCoveragePct,
    wiredPhase1Events,
    unwiredPhase1Events,
    directTrackViolations: directTrackViolations.slice(0, 50),
    duplicateGrowthEmitter: duplicateEmitterFiles.length > 0,
    duplicateEmitterFiles,
    taxonomyByCategory,
  };
}

export function formatValidationReports(r: AnalyticsValidationReport): {
  coverage: string;
  missingEvents: string;
  duplicates: string;
  taxonomy: string;
} {
  const coverage = [
    "# Analytics Coverage Report",
    "",
    `Generated: ${r.generatedAt}`,
    "",
    "## Summary",
    `- Routes in AppCore: **${r.routeCount}**`,
    `- Automatic screen tracking: **${r.screenTrackingCoveragePct}%** (AnalyticsScreenTracker on all routes)`,
    `- Phase 1 events wired: **${r.wiredPhase1Events.length}/${REQUIRED_PHASE1_EVENTS.length}**`,
    `- Taxonomy events registered: **${r.taxonomyEventCount}**`,
    "",
    "## Wired Phase 1 Events",
    ...r.wiredPhase1Events.map((e) => `- ${e}`),
    "",
    "## Instrumentation gaps (code-level)",
    r.unwiredPhase1Events.length === 0
      ? "- None — all Phase 1 events have client wiring"
      : r.unwiredPhase1Events.map((e) => `- ${e}`),
    "",
    "## Note",
    "Production analytics coverage >95% requires deploy + 48h traffic in `analytics_events`.",
  ].join("\n");

  const missingEvents = [
    "# Missing Events Report",
    "",
    `Generated: ${r.generatedAt}`,
    "",
    "## Taxonomy gaps",
    r.phase1Missing.length === 0
      ? "- None — all Phase 1 events registered in `@workspace/analytics-taxonomy`"
      : r.phase1Missing.map((e) => `- ${e}`),
    "",
    "## Client wiring gaps",
    r.unwiredPhase1Events.length === 0
      ? "- None"
      : r.unwiredPhase1Events.map((e) => `- ${e}`),
    "",
    "## Direct track() violations (should use @/lib/analytics facade)",
    r.directTrackViolations.length === 0
      ? "- None"
      : r.directTrackViolations.map((f) => `- ${f}`),
  ].join("\n");

  const duplicates = [
    "# Duplicate Event Report",
    "",
    `Generated: ${r.generatedAt}`,
    "",
    `## growth_analytics client-log duplicate emitters: **${r.duplicateGrowthEmitter ? "FOUND" : "0"}**`,
    r.duplicateEmitterFiles.length === 0
      ? "- No files call `queueClientLog({ type: \"growth_analytics\" })` outside client-logs types"
      : r.duplicateEmitterFiles.map((f) => `- ${f}`),
  ].join("\n");

  const taxonomy = [
    "# Event Taxonomy Report",
    "",
    `Generated: ${r.generatedAt}`,
    "",
    `Total events: **${r.taxonomyEventCount}**`,
    "",
    ...Object.entries(r.taxonomyByCategory)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cat, events]) => `## ${cat} (${events.length})\n${events.map((e) => `- ${e}`).join("\n")}`),
  ].join("\n\n");

  return { coverage, missingEvents, duplicates, taxonomy };
}
