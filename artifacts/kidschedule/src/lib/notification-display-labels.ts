/** User-facing labels for notification settings and diagnostics — no internal platform IDs. */

export function friendlyPlatformLabel(platform: string | null | undefined): string {
  switch ((platform ?? "").toLowerCase()) {
    case "ios":
    case "ios-capacitor":
      return "iPhone app";
    case "android":
      return "Android app";
    case "web":
      return "Web browser";
    default:
      return "AmyNest app";
  }
}

export function friendlyDeviceLabel(
  deviceName: string | null | undefined,
  platform: string | null | undefined,
): string {
  const raw = (deviceName ?? "").trim();
  if (raw) {
    if (/^kidschedule android$/i.test(raw)) return "AmyNest on Android";
    if (/^amynest ios$/i.test(raw)) return "AmyNest on iPhone";
    if (/^amynest on (android|iphone)$/i.test(raw)) return raw;
    return raw;
  }
  return friendlyPlatformLabel(platform);
}

export function friendlyDeliveryStatus(status: string): string {
  switch (status) {
    case "sent":
      return "Delivered";
    case "failed":
      return "Could not deliver";
    case "skipped":
      return "Skipped";
    case "no_tokens":
      return "No device registered";
    case "quiet_hours":
      return "Quiet hours";
    case "daily_cap":
      return "Daily limit reached";
    case "disabled":
      return "Turned off in settings";
    default:
      return "Not delivered";
  }
}

export function friendlyDeliveryIssue(
  status: string,
  errorMessage: string | null | undefined,
): string | null {
  const msg = (errorMessage ?? "").toLowerCase();
  if (status === "sent") return null;
  if (msg.includes("unregistered") || msg.includes("not registered")) {
    return "This device may need to open AmyNest again and allow notifications.";
  }
  if (msg.includes("invalid") && msg.includes("token")) {
    return "Please reopen the app and try sending a test notification.";
  }
  if (status === "failed" || status === "skipped") {
    return "Try sending a test from notification settings on this device.";
  }
  return null;
}

export function notificationCategoryLabel(cat: string): string {
  switch (cat) {
    case "routine":
      return "Routine reminders";
    case "routine_item":
      return "Per-task reminder";
    case "nutrition":
      return "Nutrition";
    case "insights":
      return "Amy AI insights";
    case "weekly":
      return "Weekly report";
    case "engagement":
      return "Friendly nudge";
    case "good_night":
      return "Good night";
    case "parenting_tips":
      return "Parenting tips";
    case "story_time":
      return "Story time";
    case "phonics":
      return "Phonics practice";
    case "learning_activity":
      return "Learning activities";
    case "milestone":
      return "Milestone alerts";
    default:
      return "Notification";
  }
}

export function permissionLabel(permission: string): string {
  switch (permission) {
    case "granted":
      return "Allowed";
    case "denied":
      return "Blocked";
    case "default":
      return "Not asked yet";
    default:
      return "Unknown";
  }
}
