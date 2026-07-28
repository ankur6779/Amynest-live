import type {
  GeneratedScriptPayload,
  ModerationResult,
  ModerationViolation,
} from "../types/content-package.js";
import { MODERATION_RULES } from "./rules.js";

export function moderateText(text: string): ModerationViolation[] {
  const violations: ModerationViolation[] = [];
  for (const rule of MODERATION_RULES) {
    if (rule.pattern.test(text)) {
      violations.push({
        code: rule.code,
        message: rule.message,
        severity: rule.severity,
      });
    }
  }
  return violations;
}

export function moderatePayload(payload: GeneratedScriptPayload): ModerationResult {
  const corpus = [
    payload.hook,
    payload.openingQuestion,
    payload.story,
    payload.keyPoints.join(" "),
    payload.cta,
    payload.voiceScript,
    payload.sceneScript,
    payload.titles.primary,
    payload.titles.alternates.join(" "),
    payload.titles.highCtr,
    payload.description.seo,
    payload.description.appPromotion,
  ].join("\n");

  const violations = moderateText(corpus);
  const rejects = violations.filter((v) => v.severity === "reject");
  return {
    ok: rejects.length === 0,
    violations,
  };
}

export function buildModerationRewriteHint(result: ModerationResult): string {
  const codes = [...new Set(result.violations.map((v) => v.code))];
  return `Remove unsafe content (${codes.join(", ")}). Keep warm parenting guidance only. No medical cures, politics, religion targeting, adult or violent content.`;
}
