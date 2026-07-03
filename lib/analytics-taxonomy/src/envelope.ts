/**
 * Analytics envelope — version metadata included on every event for
 * admin dashboards and forward-compatible schema evolution.
 */
export const ANALYTICS_SCHEMA_VERSION = "1.0.0" as const;
export const ANALYTICS_EVENT_VERSION = 1 as const;

/** Keys merged into every event props bag (admin-queryable in props JSONB). */
export const ENVELOPE_PROP_KEYS = [
  "event_version",
  "schema_version",
  "app_version",
  "build_number",
  "environment",
] as const;

export type AnalyticsEnvelopeFields = {
  event_version: number;
  schema_version: string;
  app_version: string;
  build_number: string;
  environment: string;
};
