import { queueClientLog } from "@/lib/client-logs";

export type InfantHubEvent =
  | "baby_today_view"
  | "baby_today_cta"
  | "cry_insight_start"
  | "cry_insight_result"
  | "feed_log"
  | "diaper_log"
  | "growth_log"
  | "wellbeing_checkin"
  | "doctor_report_export"
  | "coparent_invite"
  | "coparent_accept"
  | "dashboard_shortcut_tap"
  | "weekly_report_view";

export function trackInfantHubEvent(
  event: InfantHubEvent,
  meta?: Record<string, unknown>,
): void {
  queueClientLog({
    type: "info",
    message: `infant_hub:${event}`,
    context: "infant_parenting",
    meta: { event, ...meta },
  });
}
