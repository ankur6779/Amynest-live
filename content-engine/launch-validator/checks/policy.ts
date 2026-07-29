/**
 * Content policy — child-safe, family-safe, no misleading claims.
 */

import { moderateText } from "../../moderation/engine.js";
import type { LaunchCheck, LaunchValidationInput } from "../types.js";

const MISLEADING = [
  /\bguaranteed\b/i,
  /\b100%\s*success\b/i,
  /\bcure\b/i,
  /\bdoctor[- ]approved miracle\b/i,
  /\breplace your pediatrician\b/i,
];

export function validatePolicy(input: LaunchValidationInput): LaunchCheck[] {
  const corpus = [
    input.content.title,
    input.content.hook,
    input.content.story,
    input.content.cta,
    input.content.voiceScript,
    input.content.description,
    input.metadata.title,
    input.metadata.description,
  ].join("\n");

  const moderation = moderateText(corpus);
  const rejects = moderation.filter((v) => v.severity === "reject");

  const checks: LaunchCheck[] = [
    {
      id: "policy.moderation",
      category: "policy",
      ok: rejects.length === 0,
      severity: "critical",
      code: "POLICY_VIOLATION",
      message:
        rejects.length === 0
          ? "Content passes AmyNest safety moderation"
          : rejects.map((v) => v.message).join("; "),
      suggestion: "Rewrite to warm, family-safe parenting guidance only.",
    },
    {
      id: "policy.child-safe",
      category: "policy",
      ok: !/\b(nsfw|violence|self-harm|hate)\b/i.test(corpus),
      severity: "critical",
      code: "NOT_CHILD_SAFE",
      message: "Content must remain child-safe",
      suggestion: "Remove any unsafe themes immediately.",
    },
    {
      id: "policy.family-safe",
      category: "policy",
      // Family-safe content ≠ YouTube COPPA "Made for Kids".
      // AmyNest Shorts target parents/caregivers; madeForKids stays false by default.
      ok: !/\b(nsfw|violence|self-harm|hate|fear[- ]mongering)\b/i.test(corpus),
      status: !/\b(nsfw|violence|self-harm|hate|fear[- ]mongering)\b/i.test(corpus)
        ? "PASS"
        : "FAIL",
      severity: "major",
      code: "FAMILY_SAFE",
      message: "Package must remain family-safe for parent-audience distribution",
      suggestion: "Keep tone warm and parent-helpful; avoid fear marketing.",
    },
    {
      id: "policy.no-misleading",
      category: "policy",
      ok: !MISLEADING.some((p) => p.test(corpus)),
      severity: "critical",
      code: "MISLEADING_PROMISE",
      message: "No misleading medical/outcome promises",
      suggestion: "Use hopeful, honest language — never guarantees or cures.",
    },
    {
      id: "policy.copyright",
      category: "policy",
      ok: !/\b(disney|marvel|pokemon|copyrighted song|track by)\b/i.test(corpus),
      severity: "major",
      code: "COPYRIGHT_RISK",
      message: "Avoid copyrighted IP references in promo copy",
      suggestion: "Use original AmyNest creative + licensed/bed music only.",
    },
  ];

  return checks;
}
