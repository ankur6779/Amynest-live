/**
 * Known Google Ads conversion-action catalog for AmyNest Android.
 * Import status is configuration (verified 24 Sep 2026). Volumes are never invented here.
 */
export type AdsImportStatus =
  | "IMPORTED_PRIMARY"
  | "IMPORTED_SECONDARY"
  | "IMPORTED_ALL_CONVERSIONS"
  | "NOT_IMPORTED";

export type AdsHealthEventKey =
  | "play_install"
  | "first_open"
  | "sign_up"
  | "signup_completed"
  | "onboarding_completed"
  | "routine_generated"
  | "first_plan_generated"
  | "speech_coach_started"
  | "trial_started"
  | "paywall_view"
  | "begin_checkout"
  | "purchase";

export type AdsConversionCatalogRow = {
  key: AdsHealthEventKey;
  label: string;
  firebaseEvent: string | null;
  analyticsEventSql: string;
  adsImport: AdsImportStatus;
  adsConversionActionId: string | null;
  adsPrimarySecondary: "Primary" | "Secondary" | "All conversions" | "Not imported";
  recommendedAdsStatus: "Primary candidate" | "Secondary" | "Not suitable" | "Insufficient data";
  businessQuality: "install" | "activation" | "intent" | "revenue" | "noisy";
  funnelPosition: number;
  firebaseCodePath: "AUTO" | "PASS" | "ADDED" | "NOT_EMITTED";
};

export const ADS_CONVERSION_CATALOG: AdsConversionCatalogRow[] = [
  {
    key: "play_install",
    label: "Play install",
    firebaseEvent: null,
    analyticsEventSql: `event_name IN ('device_registered', 'install_source')`,
    adsImport: "IMPORTED_ALL_CONVERSIONS",
    adsConversionActionId: "7649483003",
    adsPrimarySecondary: "All conversions",
    recommendedAdsStatus: "Secondary",
    businessQuality: "install",
    funnelPosition: 1,
    firebaseCodePath: "AUTO",
  },
  {
    key: "first_open",
    label: "First open",
    firebaseEvent: "first_open",
    analyticsEventSql: `event_name = 'first_open'`,
    adsImport: "IMPORTED_SECONDARY",
    adsConversionActionId: "7665026078",
    adsPrimarySecondary: "Secondary",
    recommendedAdsStatus: "Not suitable",
    businessQuality: "install",
    funnelPosition: 2,
    firebaseCodePath: "AUTO",
  },
  {
    key: "sign_up",
    label: "Firebase sign_up",
    firebaseEvent: "sign_up",
    analyticsEventSql: `event_name IN ('pre_signup_signup_completed', 'pre_signup_login_completed') OR (event_name = 'growth_funnel_event' AND props->>'step' = 'signup_completed')`,
    adsImport: "NOT_IMPORTED",
    adsConversionActionId: null,
    adsPrimarySecondary: "Not imported",
    recommendedAdsStatus: "Secondary",
    businessQuality: "activation",
    funnelPosition: 3,
    firebaseCodePath: "PASS",
  },
  {
    key: "signup_completed",
    label: "Signup completed",
    firebaseEvent: "sign_up",
    analyticsEventSql: `event_name IN ('pre_signup_signup_completed', 'pre_signup_login_completed') OR (event_name = 'growth_funnel_event' AND props->>'step' = 'signup_completed') OR (event_name = 'onboarding_milestone' AND props->>'milestone' = 'signup_completed')`,
    adsImport: "NOT_IMPORTED",
    adsConversionActionId: null,
    adsPrimarySecondary: "Not imported",
    recommendedAdsStatus: "Secondary",
    businessQuality: "activation",
    funnelPosition: 3,
    firebaseCodePath: "PASS",
  },
  {
    key: "onboarding_completed",
    label: "Onboarding completed",
    firebaseEvent: "onboarding_completed",
    analyticsEventSql: `event_name = 'onboarding_completed' OR (event_name = 'onboarding_funnel_event' AND props->>'step' IN ('onboarding_completed', 'finish_clicked')) OR (event_name = 'onboarding_milestone' AND props->>'milestone' = 'completed')`,
    adsImport: "NOT_IMPORTED",
    adsConversionActionId: null,
    adsPrimarySecondary: "Not imported",
    recommendedAdsStatus: "Secondary",
    businessQuality: "activation",
    funnelPosition: 4,
    firebaseCodePath: "ADDED",
  },
  {
    key: "routine_generated",
    label: "Routine generated",
    firebaseEvent: null,
    analyticsEventSql: `event_name = 'routine_generated'`,
    adsImport: "NOT_IMPORTED",
    adsConversionActionId: null,
    adsPrimarySecondary: "Not imported",
    recommendedAdsStatus: "Not suitable",
    businessQuality: "noisy",
    funnelPosition: 5,
    firebaseCodePath: "NOT_EMITTED",
  },
  {
    key: "first_plan_generated",
    label: "First plan generated",
    firebaseEvent: "first_plan_generated",
    analyticsEventSql: `event_name = 'first_plan_generated'`,
    adsImport: "NOT_IMPORTED",
    adsConversionActionId: null,
    adsPrimarySecondary: "Not imported",
    recommendedAdsStatus: "Insufficient data",
    businessQuality: "activation",
    funnelPosition: 5,
    firebaseCodePath: "ADDED",
  },
  {
    key: "speech_coach_started",
    label: "Speech Coach started",
    firebaseEvent: "speech_coach_started",
    analyticsEventSql: `event_name IN ('speech_coach_v2_session_start', 'speech_coach_entry')`,
    adsImport: "NOT_IMPORTED",
    adsConversionActionId: null,
    adsPrimarySecondary: "Not imported",
    recommendedAdsStatus: "Not suitable",
    businessQuality: "noisy",
    funnelPosition: 6,
    firebaseCodePath: "ADDED",
  },
  {
    key: "trial_started",
    label: "Trial started",
    firebaseEvent: "start_trial",
    analyticsEventSql: `(event_name = 'subscription_funnel_event' AND props->>'step' = 'trial_started') OR event_name = 'speech_coach_trial_started'`,
    adsImport: "NOT_IMPORTED",
    adsConversionActionId: null,
    adsPrimarySecondary: "Not imported",
    recommendedAdsStatus: "Insufficient data",
    businessQuality: "intent",
    funnelPosition: 7,
    firebaseCodePath: "ADDED",
  },
  {
    key: "paywall_view",
    label: "Paywall view",
    firebaseEvent: null,
    analyticsEventSql: `event_name IN ('paywall_view', 'premium_paywall_viewed') OR (event_name = 'subscription_funnel_event' AND props->>'step' IN ('paywall_opened', 'paywall_viewed', 'paywall_view'))`,
    adsImport: "NOT_IMPORTED",
    adsConversionActionId: null,
    adsPrimarySecondary: "Not imported",
    recommendedAdsStatus: "Not suitable",
    businessQuality: "noisy",
    funnelPosition: 8,
    firebaseCodePath: "NOT_EMITTED",
  },
  {
    key: "begin_checkout",
    label: "Begin checkout",
    firebaseEvent: "begin_checkout",
    analyticsEventSql: `event_name = 'checkout_started' OR (event_name = 'subscription_funnel_event' AND props->>'step' IN ('checkout_started', 'subscribe_clicked'))`,
    adsImport: "IMPORTED_SECONDARY",
    adsConversionActionId: "7665026090",
    adsPrimarySecondary: "Secondary",
    recommendedAdsStatus: "Secondary",
    businessQuality: "intent",
    funnelPosition: 9,
    firebaseCodePath: "PASS",
  },
  {
    key: "purchase",
    label: "Purchase",
    firebaseEvent: "purchase",
    analyticsEventSql: `event_name IN ('upgrade_completed', 'purchase_success') OR (event_name = 'subscription_funnel_event' AND props->>'step' = 'purchase_success')`,
    adsImport: "IMPORTED_PRIMARY",
    adsConversionActionId: "7665026069",
    adsPrimarySecondary: "Primary",
    recommendedAdsStatus: "Primary candidate",
    businessQuality: "revenue",
    funnelPosition: 10,
    firebaseCodePath: "PASS",
  },
];
