import { resolveAmynestEnv } from "./loadEnv.js";

/**
 * Single Active Scheduler — only one data plane runs in-process crons during migration.
 *
 *   SCHEDULER_ACTIVE_PLANE=render   → Render API runs all crons (pre-cutover default)
 *   SCHEDULER_ACTIVE_PLANE=coolify  → Coolify API runs all crons (post-cutover)
 *
 * Standby instances must set:
 *   BACKGROUND_TASKS_ENABLED=false
 *   NOTIFICATIONS_ENABLED=false
 *
 * When SCHEDULER_ACTIVE_PLANE is unset, legacy env flags apply unchanged.
 */

export type DataPlane = "render" | "coolify" | "unknown";
export type SchedulerPlane = "render" | "coolify";

export type SchedulerJobSpec = {
  id: string;
  category: "notifications" | "billing" | "recap" | "cleanup" | "content" | "infra";
  trigger: "node-cron" | "http-cron" | "bullmq";
  module: string;
};

/** Every in-process or HTTP-triggered scheduled job in the API server. */
export const SCHEDULER_JOB_CATALOG: readonly SchedulerJobSpec[] = [
  { id: "global_notification_tick", category: "notifications", trigger: "node-cron", module: "notificationCron" },
  { id: "routine_item_sweep", category: "notifications", trigger: "node-cron", module: "notificationCron" },
  { id: "infant_notification_tick", category: "notifications", trigger: "node-cron", module: "notificationCron" },
  { id: "feature_notification_tick", category: "notifications", trigger: "node-cron", module: "notificationCron" },
  { id: "stale_pending_sweep", category: "notifications", trigger: "node-cron", module: "notificationCron" },
  { id: "token_sweep", category: "notifications", trigger: "node-cron", module: "notificationCron" },
  { id: "notification_cron_ping", category: "notifications", trigger: "http-cron", module: "notification-prefs" },
  { id: "infant_notification_tick_http", category: "notifications", trigger: "http-cron", module: "infant-notifications" },
  { id: "phonics_curriculum_daily", category: "content", trigger: "node-cron", module: "phonicsCurriculumCron" },
  { id: "phonics_content_drip", category: "content", trigger: "node-cron", module: "phonicsContentDripCron" },
  { id: "story_gcs_mirror", category: "content", trigger: "node-cron", module: "storyGcsCron" },
  { id: "story_gcs_mirror_ping", category: "content", trigger: "http-cron", module: "stories" },
  { id: "tts_orphan_cleanup", category: "cleanup", trigger: "node-cron", module: "ttsOrphanCleanupCron" },
  { id: "learning_content_seed", category: "content", trigger: "node-cron", module: "learningContentSeedCron" },
  { id: "learning_seed_weekly_ping", category: "content", trigger: "http-cron", module: "learning-load-more" },
  { id: "weekly_recap_push", category: "recap", trigger: "node-cron", module: "weeklyRecapCron" },
  { id: "retention_weekly_summary", category: "recap", trigger: "node-cron", module: "retentionWeeklyCron" },
  { id: "billing_reconciliation", category: "billing", trigger: "node-cron", module: "billingReconciliationCron" },
  { id: "trial_expiry_sweep", category: "billing", trigger: "node-cron", module: "trialExpiryCron" },
  { id: "razorpay_webhook_cleanup", category: "cleanup", trigger: "node-cron", module: "razorpayWebhookCleanup" },
  { id: "admin_health_digest", category: "infra", trigger: "node-cron", module: "adminHealthDigestCron" },
  { id: "render_keep_warm", category: "infra", trigger: "node-cron", module: "render-keep-warm" },
  { id: "bullmq_ai_jobs", category: "infra", trigger: "bullmq", module: "queue/bootstrap" },
] as const;

function envTruthy(name: string): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "on" || raw === "yes";
}

function envFalsy(name: string): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  return raw === "false" || raw === "0" || raw === "off" || raw === "no";
}

export function resolveActiveSchedulerPlane(): SchedulerPlane | null {
  const raw = process.env.SCHEDULER_ACTIVE_PLANE?.trim().toLowerCase();
  if (raw === "render" || raw === "coolify") return raw;
  return null;
}

export function isSingleActiveSchedulerMode(): boolean {
  return resolveActiveSchedulerPlane() !== null;
}

/** Identify which infrastructure hosts this API process. */
export function resolveLocalDataPlane(): DataPlane {
  if (process.env.RENDER === "true" || process.env.RENDER_SERVICE_NAME?.trim()) {
    return "render";
  }
  if (process.env.COOLIFY === "true" || process.env.COOLIFY_APP_ID?.trim()) {
    return "coolify";
  }
  const hints = [
    process.env.API_PUBLIC_URL ?? "",
    process.env.HOSTNAME ?? "",
    process.env.RENDER_EXTERNAL_URL ?? "",
  ].join(" ");
  if (/onrender\.com|render\.com/i.test(hints)) return "render";
  if (/sslip\.io|188\.245\.208\.126|coolify/i.test(hints)) return "coolify";
  return "unknown";
}

export function isThisInstanceSchedulerOwner(): boolean {
  const active = resolveActiveSchedulerPlane();
  if (!active) return true;
  const local = resolveLocalDataPlane();
  if (local === "unknown") return false;
  return local === active;
}

function legacyNotificationsEnabled(): boolean {
  if (process.env.DISABLE_NOTIFICATION_CRON === "1") return false;
  return process.env.NOTIFICATIONS_ENABLED?.trim().toLowerCase() !== "false";
}

function legacyBackgroundTasksEnabled(): boolean {
  const raw = process.env.BACKGROUND_TASKS_ENABLED?.trim().toLowerCase();
  if (raw === "true" || raw === "1" || raw === "on" || raw === "yes") return true;
  if (raw === "false" || raw === "0" || raw === "off" || raw === "no") return false;
  if (resolveAmynestEnv() === "production") {
    return legacyNotificationsEnabled();
  }
  return true;
}

/** Notification + content crons (first block in index.ts). */
export function shouldRunNotificationCrons(): boolean {
  if (isSingleActiveSchedulerMode()) {
    return isThisInstanceSchedulerOwner();
  }
  return legacyNotificationsEnabled();
}

/** Billing, recap, cleanup, keep-warm crons (second block in index.ts). */
export function shouldRunBackgroundCrons(): boolean {
  if (isSingleActiveSchedulerMode()) {
    return isThisInstanceSchedulerOwner();
  }
  return legacyBackgroundTasksEnabled();
}

/** HTTP cron endpoints and external scheduler pings. */
export function shouldAcceptHttpCronTrigger(): boolean {
  return shouldRunNotificationCrons() && shouldRunBackgroundCrons();
}

export type SchedulerSnapshot = {
  mode: "single_active" | "legacy";
  active_plane: SchedulerPlane | null;
  local_plane: DataPlane;
  owner: boolean;
  background_tasks_enabled: boolean;
  notifications_enabled: boolean;
  expected_env: {
    BACKGROUND_TASKS_ENABLED: string;
    NOTIFICATIONS_ENABLED: string;
    SCHEDULER_ACTIVE_PLANE: string;
  };
  job_catalog_count: number;
};

export function getSchedulerSnapshot(): SchedulerSnapshot {
  const active = resolveActiveSchedulerPlane();
  const local = resolveLocalDataPlane();
  const owner = isThisInstanceSchedulerOwner();
  const mode = active ? "single_active" : "legacy";

  let bg = "true";
  let notif = "true";
  let activePlane = active ?? "render";

  if (mode === "single_active") {
    if (owner) {
      bg = "true";
      notif = "true";
      activePlane = active!;
    } else {
      bg = "false";
      notif = "false";
      activePlane = active!;
    }
  } else if (local === "coolify") {
    bg = "false";
    notif = "false";
  }

  return {
    mode,
    active_plane: active,
    local_plane: local,
    owner,
    background_tasks_enabled: envTruthy("BACKGROUND_TASKS_ENABLED") || (!envFalsy("BACKGROUND_TASKS_ENABLED") && legacyBackgroundTasksEnabled()),
    notifications_enabled: legacyNotificationsEnabled(),
    expected_env: {
      BACKGROUND_TASKS_ENABLED: bg,
      NOTIFICATIONS_ENABLED: notif,
      SCHEDULER_ACTIVE_PLANE: activePlane,
    },
    job_catalog_count: SCHEDULER_JOB_CATALOG.length,
  };
}

/** Express helper — 503 when standby instance receives an HTTP cron ping. */
export function schedulerStandbyResponse(): { status: number; body: Record<string, unknown> } {
  const snap = getSchedulerSnapshot();
  return {
    status: 503,
    body: {
      error: "scheduler_standby",
      active_plane: snap.active_plane,
      local_plane: snap.local_plane,
      message: "This instance is not the active scheduler owner",
    },
  };
}
