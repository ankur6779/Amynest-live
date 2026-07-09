/** Pre-signup re-engagement campaign — shared types. */

export const PRE_SIGNUP_SEGMENT = "PRE_SIGNUP_USER" as const;
export const CAMPAIGN_STORAGE_KEY = "amynest:pre_signup_campaign:v2";
export const FIRST_OPEN_KEY = "amynest:pre_signup_first_open:v1";
export const AB_VARIANT_KEY = "amynest:pre_signup_ab_variant:v1";
export const ATTRIBUTION_KEY = "amynest:pre_signup_attribution:v1";
export const SIGNUP_FLOW_KEY = "amynest_pre_signup_signup_flow:v1";
export const CAMPAIGN_CHECKSUM_KEY = "amynest:pre_signup_checksum:v1";

/** @deprecated use ATTRIBUTION_KEY */
export const ATTRIBUTION_NOTIF_KEY = ATTRIBUTION_KEY;

export const ATTRIBUTION_WINDOW_MS = 48 * 60 * 60 * 1000;

export type PreSignupSegment = typeof PRE_SIGNUP_SEGMENT | "EXITED";

export type AbVariant = "A" | "B" | "C";

export type CampaignMilestone =
  | "day0_2h"
  | "day1"
  | "day2"
  | "day4"
  | "day7";

export type ScheduledNotifStatus = "pending" | "delivered" | "cancelled";

export type ScheduledNotif = {
  id: number;
  milestone: CampaignMilestone;
  fireAtMs: number;
  title: string;
  body: string;
  deepLink: string;
  variant: AbVariant;
  messageIndex: number;
  status: ScheduledNotifStatus;
};

export type PreSignupAttribution = {
  notificationId: string;
  milestone?: string;
  variant?: AbVariant;
  tappedAt: number;
  expiresAt: number;
};

export type PreSignupCampaignState = {
  version: 2;
  segment: PreSignupSegment;
  variant: AbVariant;
  installAtMs: number;
  firstOpenAtMs: number;
  campaignStartedAtMs: number;
  scheduled: ScheduledNotif[];
  completedAtMs?: number;
  exitReason?: "signup" | "login" | "permission_denied" | "day7_complete" | "feature_flag_off";
  checksum?: string;
};

export type PreSignupAudienceInput = {
  appInstalled: boolean;
  isAuthenticated: boolean;
  signupCompleted: boolean;
  notificationsEnabled: boolean;
  /** True only when OS notification permission is granted. */
  notificationsGranted: boolean;
};

export type PreSignupAnalyticsEvent =
  | "notification_scheduled"
  | "notification_delivered"
  | "notification_opened"
  | "notification_dismissed"
  | "signup_started"
  | "signup_completed"
  | "login_completed"
  | "signup_conversion_from_notification";

export type NativeDeliveryEvent = {
  notificationId: string;
  milestone?: string;
  variant?: string;
  deliveredAtMs?: number;
};

export type NativeDismissEvent = {
  notificationId: string;
  milestone?: string;
  variant?: string;
  dismissedAtMs?: number;
};
