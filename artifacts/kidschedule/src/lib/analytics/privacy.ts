import {
  ANALYTICS_EVENT_VERSION,
  ANALYTICS_SCHEMA_VERSION,
} from "@workspace/analytics-taxonomy";

const PII_KEY_PATTERN =
  /^(email|phone|mobile|child_?name|name|message|prompt|token|jwt|password|authorization|firebase_?token)$/i;

const PII_VALUE_EMAIL = /@/;
const MAX_STRING_LEN = 512;

/**
 * Strip PII from analytics props. Never log email, phone, child names,
 * messages, AI prompts, or auth tokens.
 */
export function scrubAnalyticsProps(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === "_envelope") {
      out[key] = value;
      continue;
    }
    if (PII_KEY_PATTERN.test(key)) continue;
    if (typeof value === "string") {
      if (PII_VALUE_EMAIL.test(value) && value.length > 6) continue;
      out[key] = value.slice(0, MAX_STRING_LEN);
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      out[key] = scrubAnalyticsProps(value as Record<string, unknown>);
    } else if (
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      out[key] = value;
    } else if (Array.isArray(value)) {
      out[key] = value.slice(0, 32);
    }
  }
  return out;
}

export function buildEnvelopeFields(input: {
  appVersion: string;
  buildNumber: string;
  environment: string;
}): Record<string, string | number> {
  return {
    event_version: ANALYTICS_EVENT_VERSION,
    schema_version: ANALYTICS_SCHEMA_VERSION,
    app_version: input.appVersion,
    build_number: input.buildNumber,
    environment: input.environment,
  };
}
