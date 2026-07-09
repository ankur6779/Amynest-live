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
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(events.slice(-500)));
}

export function recordStudioAnalytics(type: string, props?: Record<string, string | number | boolean>): void {
  const events = loadEvents();
  events.push({ type, at: new Date().toISOString(), props });
  saveEvents(events);
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
