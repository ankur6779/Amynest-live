const ANALYTICS_KEY = "worksheet-studio-analytics-v1";

export interface AnalyticsEvent {
  type: string;
  at: string;
  props?: Record<string, string | number | boolean>;
}

export interface AnalyticsDashboard {
  worksheetsCreated: number;
  templatesUsed: number;
  topicsCovered: number;
  exports: number;
  prints: number;
  aiUsage: number;
  weeklyActivity: number[];
  topSubjects: Array<{ subject: string; count: number }>;
}

function loadEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY);
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

function saveEvents(events: AnalyticsEvent[]): void {
  try {
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(events.slice(-500)));
  } catch { /* quota / private mode */ }
}

export function recordStudioAnalytics(type: string, props?: Record<string, string | number | boolean>): void {
  try {
    const events = loadEvents();
    events.push({ type, at: new Date().toISOString(), props });
    saveEvents(events);
  } catch { /* non-blocking */ }
}

export function getAnalyticsDashboard(): AnalyticsDashboard {
  const events = loadEvents();
  const weekAgo = Date.now() - 7 * 86400000;
  const weekly = [0, 0, 0, 0, 0, 0, 0];

  for (const e of events) {
    const d = new Date(e.at).getTime();
    if (d >= weekAgo) {
      const dayIdx = Math.floor((Date.now() - d) / 86400000);
      if (dayIdx >= 0 && dayIdx < 7) weekly[6 - dayIdx] = (weekly[6 - dayIdx] ?? 0) + 1;
    }
  }

  const subjects = new Map<string, number>();
  for (const e of events) {
    if (e.props?.subject) subjects.set(String(e.props.subject), (subjects.get(String(e.props.subject)) ?? 0) + 1);
  }

  const topics = new Set(
    events.filter((e) => e.type === "worksheet_generate_done").map((e) => String(e.props?.topic ?? "")),
  );

  return {
    worksheetsCreated: events.filter((e) => e.type === "worksheet_generate_done").length,
    templatesUsed: events.filter((e) => e.type === "template_used").length,
    topicsCovered: topics.size,
    exports: events.filter((e) => e.type.startsWith("export_")).length,
    prints: events.filter((e) => e.type === "export_print").length,
    aiUsage: events.filter((e) => e.type === "worksheet_copilot" || e.props?.source === "ai").length,
    weeklyActivity: weekly,
    topSubjects: [...subjects.entries()].map(([subject, count]) => ({ subject, count })).sort((a, b) => b.count - a.count).slice(0, 5),
  };
}

import type { AiAnalyticsDashboard } from "./types.js";

export function getAiAnalyticsDashboard(): AiAnalyticsDashboard {
  const events = loadEvents();
  const enhance = events.filter((e) => e.type === "worksheet_prompt_enhance").length;
  const refs = events.filter((e) => e.type === "worksheet_reference_upload").length;
  const vision = events.filter((e) => e.type === "worksheet_vision_analyze").length;
  const copilot = events.filter((e) => e.type === "worksheet_copilot" || e.type === "worksheet_copilot_edit").length;

  const prompts = events.filter((e) => e.type === "worksheet_generate_start");
  const avgPromptLength = prompts.length
    ? Math.round(prompts.reduce((s, e) => s + Number(e.props?.promptLength ?? 0), 0) / prompts.length)
    : 0;

  const scores = events.filter((e) => e.type === "worksheet_generate_done" && e.props?.qualityScore);
  const avgWorksheetScore = scores.length
    ? Math.round(scores.reduce((s, e) => s + Number(e.props?.qualityScore ?? 0), 0) / scores.length)
    : 0;

  const subjects = new Map<string, number>();
  const classes = new Map<string, number>();
  for (const e of events) {
    if (e.props?.subject) subjects.set(String(e.props.subject), (subjects.get(String(e.props.subject)) ?? 0) + 1);
    if (e.props?.classLevel) classes.set(String(e.props.classLevel), (classes.get(String(e.props.classLevel)) ?? 0) + 1);
  }

  return {
    promptEnhancements: enhance,
    referenceUploads: refs,
    visionAnalyses: vision,
    avgPromptLength,
    copilotEdits: copilot,
    avgWorksheetScore,
    topSubjects: [...subjects.entries()].map(([subject, count]) => ({ subject, count })).sort((a, b) => b.count - a.count).slice(0, 5),
    topClasses: [...classes.entries()].map(([classLevel, count]) => ({ classLevel, count })).sort((a, b) => b.count - a.count).slice(0, 5),
  };
}

const SHARE_KEY = "worksheet-share-links";

export interface ShareLink {
  id: string;
  title: string;
  createdAt: string;
  expiresAt: string;
}

export function createShareLinkMeta(title: string): ShareLink {
  const link: ShareLink = {
    id: `share_${Date.now().toString(36)}`,
    title,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  };
  try {
    const raw = localStorage.getItem(SHARE_KEY);
    const links = raw ? (JSON.parse(raw) as ShareLink[]) : [];
    links.push(link);
    localStorage.setItem(SHARE_KEY, JSON.stringify(links.slice(-20)));
  } catch { /* */ }
  return link;
}

export function getShareUrl(linkId: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/worksheet?share=${linkId}`;
}
