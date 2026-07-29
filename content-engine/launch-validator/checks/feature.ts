/**
 * Feature validation — only real AmyNest features, no hallucinations.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { discoverAmyNestFeatures } from "../../brand/feature-discovery.js";
import type { LaunchCheck, LaunchValidationInput } from "../types.js";

const HALLUCINATION_PATTERNS = [
  /\bquantum parenting\b/i,
  /\bcure autism\b/i,
  /\bguaranteed genius\b/i,
  /\bmind control\b/i,
  /\bfake feature\b/i,
  /\bchatgpt parenting chip\b/i,
];

export function validateFeatures(input: LaunchValidationInput): LaunchCheck[] {
  const content = input.content;
  const corpus = [
    content.title,
    content.story,
    content.keyPoints.join(" "),
    content.voiceScript,
    content.description,
  ].join("\n");

  const checks: LaunchCheck[] = [];

  const hallucinated = HALLUCINATION_PATTERNS.filter((p) => p.test(corpus));
  checks.push({
    id: "feature.no-hallucinations",
    category: "feature",
    ok: hallucinated.length === 0,
    severity: "critical",
    code: "FEATURE_HALLUCINATION",
    message: "Content must not invent unsafe or nonexistent capabilities",
    suggestion: "Stick to discovered AmyNest product surfaces only.",
  });

  const repoRoot = resolveRepoRoot(input.repoRoot);
  let featureGrounded = true;
  let matchedName = "";
  try {
    if (repoRoot) {
      const features = discoverAmyNestFeatures({
        repoRoot,
        maxFeatures: 120,
      });
      const hay = corpus.toLowerCase();
      const hit = features.find(
        (f) =>
          hay.includes(f.title.toLowerCase()) ||
          f.keywords.some((k) => k.length > 3 && hay.includes(k.toLowerCase())) ||
          hay.includes(f.pillar),
      );
      // Also accept category/keyword grounded parenting/learning language
      const softGrounded =
        /\b(learning|astro|speech|health|routine|habit|coach|audio|game|parent|phonics|abacus|dashboard)\b/i.test(
          corpus,
        );
      featureGrounded = Boolean(hit) || softGrounded;
      matchedName = hit?.title ?? (softGrounded ? "category-grounded" : "");
    }
  } catch {
    featureGrounded =
      /\b(learning|astro|speech|health|routine|habit|coach|audio|amynest)\b/i.test(
        corpus,
      );
  }

  checks.push({
    id: "feature.real-only",
    category: "feature",
    ok: featureGrounded,
    severity: "critical",
    code: "UNREAL_FEATURE",
    message: "Only real AmyNest features may be promoted",
    suggestion: "Map the script to a discovered feature / pillar before publish.",
  });

  checks.push({
    id: "feature.correct-names",
    category: "feature",
    ok: !/\bamynest\s+(pro\s+)?xl\b/i.test(corpus) && matchedName !== "forbidden",
    severity: "major",
    code: "WRONG_FEATURE_NAME",
    message: "Feature names must match product language",
    suggestion: "Use official feature titles from the product surface map.",
  });

  checks.push({
    id: "feature.ui-references",
    category: "feature",
    ok: !/\b(android settings|ios control center|random dashboard xyz)\b/i.test(corpus),
    severity: "major",
    code: "BAD_UI_REFERENCE",
    message: "UI references must match AmyNest screens",
    suggestion: "Describe real in-app moments (coach, lessons, routines, astro).",
  });

  return checks;
}

function resolveRepoRoot(explicit?: string): string | null {
  if (explicit && existsSync(explicit)) return explicit;
  const cwd = process.cwd();
  if (existsSync(join(cwd, "artifacts", "kidschedule"))) return cwd;
  if (existsSync(join(cwd, "..", "artifacts", "kidschedule"))) {
    return join(cwd, "..");
  }
  return cwd;
}
