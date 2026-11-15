/**
 * Privacy-safe child reference for analytics payloads.
 *
 * Sequential numeric child primary keys are not analytics identifiers.
 * The same child always maps to the same 24-hex ref so guest and
 * authenticated events can still be grouped. The ref is not a secret:
 * small integers can be enumerated if the pepper is known. A managed
 * pepper rotation is a later human-approved step.
 */
const CHILD_REF_PEPPER = "amynest-analytics-child-ref-v1";

export const CHILD_REF_PATTERN = /^[a-f0-9]{24}$/;

const SENSITIVE_ANALYTICS_KEYS = new Set([
  "childid",
  "child_id",
  "childname",
  "child_name",
  "childfirstname",
  "child_first_name",
  "diagnosis",
  "symptom",
  "symptoms",
  "allergy",
  "allergies",
  "medication",
  "medications",
  "medical_notes",
  "health_notes",
  "condition",
  "conditions",
  "weight_kg",
  "height_cm",
  "bmi",
]);

export function childAnalyticsRef(childId: number): string {
  const input = `${CHILD_REF_PEPPER}:${childId}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x85ebca6b);
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  return `${hex(h1)}${hex(h2)}${hex(h1 ^ h2)}`;
}

function numericChildId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^[1-9]\d{0,9}$/.test(value)) return Number(value);
  return null;
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_ANALYTICS_KEYS.has(key.toLowerCase());
}

/**
 * Drop raw child ids, names, and health details. Preserve device_id,
 * user ids, and an already-valid child_ref so identity stitching stays intact.
 */
export function redactAnalyticsIdentifiers(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const numeric = numericChildId(props.childId ?? props.child_id);
  const incomingRef = props.child_ref;
  const childRef =
    numeric != null
      ? childAnalyticsRef(numeric)
      : typeof incomingRef === "string" && CHILD_REF_PATTERN.test(incomingRef)
        ? incomingRef
        : undefined;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (isSensitiveKey(key) || key === "child_ref") continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = redactAnalyticsIdentifiers(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  if (childRef) out.child_ref = childRef;
  return out;
}
