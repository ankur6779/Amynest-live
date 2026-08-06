import {
  AMY_CONTEXT_RESOLVER_VERSION,
  type AmyContext,
  type AmyContextValidationIssue,
  type AmyContextValidationResult,
} from "./types";

function issue(path: string, message: string): AmyContextValidationIssue {
  return { path, message };
}

/** Structural validation — no business rules, no UI rules. */
export function validateAmyContext(ctx: unknown): AmyContextValidationResult {
  const issues: AmyContextValidationIssue[] = [];
  if (!ctx || typeof ctx !== "object") {
    return { ok: false, issues: [issue("", "AmyContext must be an object")] };
  }
  const c = ctx as Partial<AmyContext>;

  if (!c.meta) issues.push(issue("meta", "missing"));
  else {
    if (c.meta.resolverVersion !== AMY_CONTEXT_RESOLVER_VERSION) {
      issues.push(
        issue(
          "meta.resolverVersion",
          `expected ${AMY_CONTEXT_RESOLVER_VERSION}`,
        ),
      );
    }
    if (typeof c.meta.contextVersion !== "string") {
      issues.push(issue("meta.contextVersion", "must be string"));
    }
    if (typeof c.meta.generatedAt !== "string") {
      issues.push(issue("meta.generatedAt", "must be string"));
    }
    if (typeof c.meta.memoryVersion !== "number") {
      issues.push(issue("meta.memoryVersion", "must be number"));
    }
    if (!Array.isArray(c.meta.policyCompatibility)) {
      issues.push(issue("meta.policyCompatibility", "must be array"));
    }
  }

  for (const key of [
    "identity",
    "child",
    "challenge",
    "mission",
    "coach",
    "speech",
    "activity",
    "preferences",
    "journey",
    "capabilities",
    "memory",
  ] as const) {
    if (!c[key] || typeof c[key] !== "object") {
      issues.push(issue(key, "missing section"));
    }
  }

  if (c.capabilities) {
    for (const flag of [
      "isGuest",
      "isSignedIn",
      "hasCoachJourney",
      "hasSpeechConcern",
      "hasCompletedMissionToday",
      "hasPreparedPlan",
      "premiumEligible",
      "premiumUnlocked",
    ] as const) {
      if (typeof c.capabilities[flag] !== "boolean") {
        issues.push(issue(`capabilities.${flag}`, "must be boolean"));
      }
    }
    if (
      typeof c.capabilities.isGuest === "boolean" &&
      typeof c.capabilities.isSignedIn === "boolean" &&
      c.capabilities.isGuest === c.capabilities.isSignedIn
    ) {
      issues.push(
        issue("capabilities", "isGuest and isSignedIn must be opposites"),
      );
    }
  }

  // Forbidden leakage — Context must not carry shell/UI names as sections.
  const forbidden = ["today", "askAmy", "forChild", "hero", "visibility"];
  for (const key of forbidden) {
    if (key in (c as object)) {
      issues.push(issue(key, "forbidden UI/shell field on AmyContext"));
    }
  }

  return Object.freeze({
    ok: issues.length === 0,
    issues: Object.freeze(issues),
  });
}
