import { queueClientLog } from "@/lib/client-logs";

export type MarketingAssetId =
  | "appstore_cry_insight"
  | "appstore_baby_today"
  | "appstore_growth"
  | "appstore_vaccines"
  | "appstore_weekly_share"
  | "landing_infant_section"
  | "landing_infant_mockup";

export type ReferralPromptSource = "weekly_share" | "milestone_share" | "doctor_export";

export type ReferralPromptAction = "referrals_page" | "share_link" | "copy_link" | "dismiss";

function track(type: string, meta: Record<string, unknown>): void {
  queueClientLog({
    type: "infant_parenting",
    message: type,
    context: "infant_marketing",
    meta: { event: type, ...meta },
  });
  if (typeof window === "undefined") return;
  const payload = { event: type, ...meta };
  window.dispatchEvent(new CustomEvent("amynest_infant_marketing_event", { detail: payload }));
  const w = window as Window & {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (type: string, name: string, params?: Record<string, unknown>) => void;
  };
  w.dataLayer?.push(payload);
  w.gtag?.("event", type, payload);
}

export function trackMarketingAssetViewed(
  assetId: MarketingAssetId,
  props: Record<string, unknown> = {},
): void {
  track("marketing_asset_viewed", { assetId, ...props });
}

export function trackReferralPromptViewed(
  source: ReferralPromptSource,
  props: Record<string, unknown> = {},
): void {
  track("referral_prompt_viewed", { source, ...props });
}

export function trackReferralPromptClicked(
  source: ReferralPromptSource,
  action: ReferralPromptAction,
  props: Record<string, unknown> = {},
): void {
  track("referral_prompt_clicked", { source, action, ...props });
}
