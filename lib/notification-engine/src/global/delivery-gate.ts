import type { NotificationCategory } from "@workspace/db";
import type { LocalDateTimeParts } from "./timezone.js";
import type { CategorySlot } from "./schedule-slots.js";
import { matchesCategorySlot } from "./schedule-slots.js";
import { inLocalQuietHours } from "./timezone.js";
import { canDeliverPush, type NotificationConsentState } from "./compliance.js";

export interface UserScheduleContext {
  userId: string;
  timezone: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  preferredEngagementHour: number | null;
  smartDeliveryEnabled: boolean;
  consent: NotificationConsentState;
  categoryEnabled: (category: NotificationCategory) => boolean;
}

export function shouldDeliverScheduledJob(
  job: { category: NotificationCategory; slot: CategorySlot },
  local: LocalDateTimeParts,
  ctx: UserScheduleContext,
  now = new Date(),
): { deliver: boolean; reason?: string } {
  if (!ctx.categoryEnabled(job.category)) {
    return { deliver: false, reason: "category_disabled" };
  }

  const consent = canDeliverPush(ctx.consent);
  if (!consent.allowed) {
    return { deliver: false, reason: consent.reason };
  }

  if (inLocalQuietHours(ctx.timezone, ctx.quietHoursStart, ctx.quietHoursEnd, now)) {
    return { deliver: false, reason: "quiet_hours" };
  }

  if (
    !matchesCategorySlot(
      local,
      job.slot,
      ctx.preferredEngagementHour,
      ctx.smartDeliveryEnabled,
    )
  ) {
    return { deliver: false, reason: "not_scheduled_slot" };
  }

  return { deliver: true };
}
