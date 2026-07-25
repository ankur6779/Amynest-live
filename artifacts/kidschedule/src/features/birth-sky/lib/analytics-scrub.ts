/**
 * Birth Sky analytics scrub (Pack 1 §9, Platform Spec privacy/analytics).
 * Rejects payloads that contain forbidden keys or sensitive shapes.
 */

const FORBIDDEN_KEYS = new Set([
  "birth_time",
  "birthTime",
  "birth_place",
  "birthPlace",
  "place",
  "latitude",
  "longitude",
  "lat",
  "lon",
  "coords",
  "coordinates",
  "chart",
  "sky_payload",
  "skyPayload",
  "snapshot_payload",
  "prompt",
  "prompt_text",
  "ai_response",
  "response_text",
  "journal",
  "journal_text",
  "reflection_text",
  "conversation_text",
]);

const FORBIDDEN_KEY_SUBSTRINGS = [
  "birthtime",
  "birthplace",
  "coordinate",
  "ephemeris",
];

export type ScrubResult =
  | { ok: true; props: Record<string, string | number | boolean | undefined> }
  | { ok: false; reason: string };

function keyLooksForbidden(key: string): boolean {
  if (FORBIDDEN_KEYS.has(key)) return true;
  const lower = key.toLowerCase();
  return FORBIDDEN_KEY_SUBSTRINGS.some((s) => lower.includes(s));
}

/** Returns scrubbed props or rejection — never throws. */
export function scrubBirthSkyAnalyticsProps(
  props: Record<string, unknown> | undefined,
): ScrubResult {
  if (!props) return { ok: true, props: {} };

  const out: Record<string, string | number | boolean | undefined> = {};

  for (const [key, value] of Object.entries(props)) {
    if (keyLooksForbidden(key)) {
      return { ok: false, reason: `forbidden_key:${key}` };
    }
    if (value === undefined) {
      out[key] = undefined;
      continue;
    }
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      out[key] = value;
      continue;
    }
    return { ok: false, reason: `non_scalar:${key}` };
  }

  return { ok: true, props: out };
}
