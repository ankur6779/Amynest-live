export const CHAT_PLATFORM_HEALTH_EVENTS = [
  "chat_prompt_hidden_after_keyboard_open",
  "chat_prompt_recovery_triggered",
  "keyboard_visibility_failures",
  "android_keyboard_layout_conflicts",
] as const;

export type ChatPlatformHealthEvent = (typeof CHAT_PLATFORM_HEALTH_EVENTS)[number];

export type ChatPlatformHealthStatus = "healthy" | "degraded" | "failing";

export interface ChatPlatformHealthRecord {
  ts: number;
  event: ChatPlatformHealthEvent;
  surface?: string;
  route?: string;
  deviceManufacturer: string;
  androidVersion: string;
  osSkin: string;
  keyboardApp: string;
  appVersion: string;
  userId: string | null;
}

export interface ChatPlatformHealthGroupRow {
  groupKey: string;
  label: string;
  deviceManufacturer: string;
  androidVersion: string;
  osSkin: string;
  keyboardApp: string;
  appVersion: string;
  chat_prompt_hidden_after_keyboard_open: number;
  chat_prompt_recovery_triggered: number;
  keyboard_visibility_failures: number;
  android_keyboard_layout_conflicts: number;
  totalFailures: number;
}

export interface ChatPlatformHealthDashboard {
  windowMs: number;
  generatedAt: number;
  status: ChatPlatformHealthStatus;
  totals: Record<ChatPlatformHealthEvent, number>;
  failureGroups: ChatPlatformHealthGroupRow[];
  recentEvents: Array<{
    ts: number;
    event: ChatPlatformHealthEvent;
    label: string;
    surface?: string;
  }>;
  trends24h: Array<{
    hour: string;
    hidden: number;
    recovery: number;
    failures: number;
    conflicts: number;
  }>;
}

const WINDOW_MS = 24 * 60 * 60 * 1000;
const TREND_MS = 24 * 60 * 60 * 1000;
const MAX_RECORDS = 5000;

const records: ChatPlatformHealthRecord[] = [];

function normalizeSegment(value: unknown, fallback = "unknown"): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 64) : fallback;
}

function buildGroupLabel(row: Omit<ChatPlatformHealthGroupRow, "groupKey" | "label" | keyof Record<ChatPlatformHealthEvent, number> | "totalFailures">): string {
  if (row.deviceManufacturer === "non-android") {
    return `${row.deviceManufacturer} · ${row.appVersion}`;
  }
  const skin =
    row.osSkin && row.osSkin !== "Stock Android" && row.osSkin !== "n/a"
      ? ` ${row.osSkin}`
      : "";
  return `${row.deviceManufacturer} Android ${row.androidVersion}${skin} · ${row.keyboardApp} · v${row.appVersion}`;
}

export function ingestChatPlatformHealthEvent(input: {
  ts?: number;
  event: string;
  surface?: string;
  route?: string;
  meta?: Record<string, unknown>;
  userId?: string | null;
}): void {
  if (!CHAT_PLATFORM_HEALTH_EVENTS.includes(input.event as ChatPlatformHealthEvent)) return;

  const meta = input.meta ?? {};
  const deviceManufacturer = normalizeSegment(meta.deviceManufacturer);
  const androidVersion = normalizeSegment(meta.androidVersion, "n/a");
  const osSkin = normalizeSegment(meta.osSkin, "unknown");
  const keyboardApp = normalizeSegment(meta.keyboardApp);
  const appVersion = normalizeSegment(meta.appVersion);

  records.push({
    ts: input.ts ?? Date.now(),
    event: input.event as ChatPlatformHealthEvent,
    surface: input.surface,
    route: input.route,
    deviceManufacturer,
    androidVersion,
    osSkin,
    keyboardApp,
    appVersion,
    userId: input.userId ?? null,
  });

  if (records.length > MAX_RECORDS) {
    records.splice(0, records.length - MAX_RECORDS);
  }
}

export function getChatPlatformHealthDashboard(now = Date.now()): ChatPlatformHealthDashboard {
  const cutoff = now - WINDOW_MS;
  const windowRecords = records.filter((record) => record.ts >= cutoff);

  const totals = Object.fromEntries(
    CHAT_PLATFORM_HEALTH_EVENTS.map((event) => [event, 0]),
  ) as Record<ChatPlatformHealthEvent, number>;

  for (const record of windowRecords) {
    totals[record.event] += 1;
  }

  const groupMap = new Map<string, ChatPlatformHealthGroupRow>();

  for (const record of windowRecords) {
    const groupKey = [
      record.deviceManufacturer,
      record.androidVersion,
      record.keyboardApp,
      record.appVersion,
    ].join("|");

    const existing =
      groupMap.get(groupKey) ??
      ({
        groupKey,
        label: "",
        deviceManufacturer: record.deviceManufacturer,
        androidVersion: record.androidVersion,
        osSkin: record.osSkin,
        keyboardApp: record.keyboardApp,
        appVersion: record.appVersion,
        chat_prompt_hidden_after_keyboard_open: 0,
        chat_prompt_recovery_triggered: 0,
        keyboard_visibility_failures: 0,
        android_keyboard_layout_conflicts: 0,
        totalFailures: 0,
      } satisfies ChatPlatformHealthGroupRow);

    existing[record.event] += 1;
    if (
      record.event === "chat_prompt_hidden_after_keyboard_open" ||
      record.event === "keyboard_visibility_failures" ||
      record.event === "android_keyboard_layout_conflicts"
    ) {
      existing.totalFailures += 1;
    }
    existing.label = buildGroupLabel(existing);
    groupMap.set(groupKey, existing);
  }

  const failureGroups = [...groupMap.values()].sort(
    (a, b) => b.totalFailures - a.totalFailures || b.chat_prompt_recovery_triggered - a.chat_prompt_recovery_triggered,
  );

  let status: ChatPlatformHealthStatus = "healthy";
  if (totals.chat_prompt_hidden_after_keyboard_open > 0 || totals.android_keyboard_layout_conflicts > 0) {
    status = "failing";
  } else if (totals.keyboard_visibility_failures > 0 || totals.chat_prompt_recovery_triggered > 0) {
    status = "degraded";
  }

  const recentEvents = windowRecords
    .slice(-40)
    .reverse()
    .map((record) => ({
      ts: record.ts,
      event: record.event,
      label: buildGroupLabel(record),
      surface: record.surface,
    }));

  const trendCutoff = now - TREND_MS;
  const bucketMap = new Map<string, ChatPlatformHealthDashboard["trends24h"][number]>();
  for (const record of records) {
    if (record.ts < trendCutoff) continue;
    const hour = new Date(record.ts);
    hour.setMinutes(0, 0, 0);
    const key = hour.toISOString();
    const bucket =
      bucketMap.get(key) ??
      ({
        hour: key,
        hidden: 0,
        recovery: 0,
        failures: 0,
        conflicts: 0,
      } satisfies ChatPlatformHealthDashboard["trends24h"][number]);

    if (record.event === "chat_prompt_hidden_after_keyboard_open") bucket.hidden += 1;
    else if (record.event === "chat_prompt_recovery_triggered") bucket.recovery += 1;
    else if (record.event === "keyboard_visibility_failures") bucket.failures += 1;
    else if (record.event === "android_keyboard_layout_conflicts") bucket.conflicts += 1;

    bucketMap.set(key, bucket);
  }

  const trends24h = [...bucketMap.values()].sort((a, b) => a.hour.localeCompare(b.hour));

  return {
    windowMs: WINDOW_MS,
    generatedAt: now,
    status,
    totals,
    failureGroups,
    recentEvents,
    trends24h,
  };
}

/** Test helper */
export function resetChatPlatformHealthStoreForTests(): void {
  records.length = 0;
}
