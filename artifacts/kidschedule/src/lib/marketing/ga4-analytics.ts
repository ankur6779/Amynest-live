/**
 * Google Analytics 4 — marketing funnel events for public pages.
 * Loads only when VITE_GA4_MEASUREMENT_ID is set at build time.
 */

export const GA4_MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID?.trim() ?? "";

export type MarketingFunnelEvent =
  | "get_app_page_view"
  | "landing_page_view"
  | "feature_page_view"
  | "guide_index_view"
  | "guide_page_view"
  | "store_button_click"
  | "install_intent"
  | "scroll_depth"
  | "guide_cta_click"
  | "screenshot_carousel_engagement"
  | "scroll_cta_shown"
  | "exit_intent_shown"
  | "demo_question_click"
  | "age_selected"
  | "hero_video_start"
  | "hero_video_complete"
  | "demo_started"
  | "demo_completed"
  | "feature_view"
  | "testimonial_view"
  | "timeline_view"
  | "trust_view"
  | "faq_opened"
  | "sticky_cta_click"
  | "hero_cta_click"
  | "footer_cta_click"
  | "qr_scan"
  | "store_redirect"
  | "install_click"
  | "section_view"
  | "spotlight_opened"
  | "dashboard_preview"
  | "stage_selected"
  | "hero_cta"
  | "mid_cta"
  | "footer_cta"
  | "install_source"
  | "review_prompt_shown"
  | "review_completed"
  | "referral_sent"
  | "referral_accepted"
  | "play_store_click"
  | "premium_conversion"
  | "signup_completed"
  | "first_routine_created"
  | "first_amy_chat"
  | "notification_scheduled"
  | "notification_delivered"
  | "notification_opened"
  | "notification_dismissed"
  | "signup_started"
  | "login_completed"
  | "signup_conversion_from_notification";

export type MarketingEventParams = Record<string, string | number | boolean | undefined>;

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: GtagFn;
  }
}

let ga4InitStarted = false;

export function isGa4Configured(): boolean {
  return GA4_MEASUREMENT_ID.length > 0 && GA4_MEASUREMENT_ID.startsWith("G-");
}

/** Inject gtag.js once — safe to call from React bootstrap. */
export function initGa4(): void {
  if (typeof window === "undefined" || !isGa4Configured() || ga4InitStarted) return;
  ga4InitStarted = true;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args as unknown as Record<string, unknown>);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA4_MEASUREMENT_ID, {
    send_page_view: false,
    cookie_flags: "SameSite=None;Secure",
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_MEASUREMENT_ID)}`;
  document.head.appendChild(script);
}

export function trackMarketingEvent(
  event: MarketingFunnelEvent,
  params: MarketingEventParams = {},
): void {
  if (typeof window === "undefined") return;
  const payload = { event, ...params };
  window.dispatchEvent(new CustomEvent("amynest_marketing_event", { detail: payload }));
  window.dataLayer?.push(payload);
  window.gtag?.("event", event, payload);
}

const GET_APP_EVENT_ALIASES: Record<string, MarketingFunnelEvent> = {
  landing_page_view: "get_app_page_view",
  page_view: "get_app_page_view",
  store_button_click: "store_button_click",
  install_intent: "install_intent",
  scroll_depth: "scroll_depth",
};

/** Map social-landing event names to GA4 conversion events. */
export function trackGetAppFunnelEvent(
  event: string,
  params: MarketingEventParams = {},
): void {
  const mapped = GET_APP_EVENT_ALIASES[event] ?? (event as MarketingFunnelEvent);
  trackMarketingEvent(mapped, { page: "get-app", ...params });
}
