import { V2_FEATURE_REGISTRY } from "./catalog";
import type { FeatureRegistryEntry } from "./types";

export type FeatureRegistryValidationIssue = {
  code: string;
  message: string;
  featureId?: string;
};

const REQUIRED_FIELDS: (keyof FeatureRegistryEntry)[] = [
  "id",
  "purpose",
  "category",
  "discoveryStage",
  "navOwner",
  "askAmyHandoff",
  "premiumRole",
  "analyticsOwner",
  "routeOwner",
  "wedgeEligible",
];

export function validateFeatureRegistry(
  entries: readonly FeatureRegistryEntry[] = V2_FEATURE_REGISTRY,
): FeatureRegistryValidationIssue[] {
  const issues: FeatureRegistryValidationIssue[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    for (const field of REQUIRED_FIELDS) {
      const value = entry[field];
      if (value === undefined || value === null || value === "") {
        issues.push({
          code: "missing_field",
          message: `Feature ${entry.id} missing ${String(field)}`,
          featureId: entry.id,
        });
      }
    }

    if (!entry.purpose || entry.purpose.trim().length < 8) {
      issues.push({
        code: "weak_purpose",
        message: `Feature ${entry.id} purpose must be a real one-sentence job`,
        featureId: entry.id,
      });
    }

    if (!entry.routeOwner?.length) {
      issues.push({
        code: "missing_routes",
        message: `Feature ${entry.id} needs routeOwner path(s)`,
        featureId: entry.id,
      });
    }

    if (seen.has(entry.id)) {
      issues.push({
        code: "duplicate_id",
        message: `Duplicate feature id: ${entry.id}`,
        featureId: entry.id,
      });
    }
    seen.add(entry.id);

    if (entry.discoveryStage === "hero" && entry.wedgeEligible) {
      // ok — hero wedge candidates
    } else if (entry.wedgeEligible && entry.discoveryStage === "archived") {
      issues.push({
        code: "invalid_wedge",
        message: `Archived feature cannot be wedgeEligible: ${entry.id}`,
        featureId: entry.id,
      });
    }
  }

  if (!seen.has("speech_coach")) {
    issues.push({
      code: "missing_speech",
      message: "speech_coach must be registered",
      featureId: "speech_coach",
    });
  }

  const speech = entries.find((e) => e.id === "speech_coach");
  if (speech && !speech.wedgeEligible) {
    issues.push({
      code: "speech_not_hero",
      message: "speech_coach must be wedgeEligible (heroEligible) for MVP freeze",
      featureId: "speech_coach",
    });
  }
  if (speech && speech.discoveryStage !== "hero") {
    issues.push({
      code: "speech_not_hero_stage",
      message: "speech_coach discoveryStage must be hero",
      featureId: "speech_coach",
    });
  }

  const games = entries.find((e) => e.id === "games");
  if (games && games.discoveryStage !== "discoverable") {
    issues.push({
      code: "games_stage",
      message: "games must be discoverable (treasury), not hero",
      featureId: "games",
    });
  }

  const nutrition = entries.find((e) => e.id === "nutrition");
  if (nutrition && nutrition.discoveryStage !== "discoverable") {
    issues.push({
      code: "nutrition_stage",
      message: "nutrition must be discoverable (treasury), not hero",
      featureId: "nutrition",
    });
  }

  const abacus = entries.find((e) => e.id === "abacus");
  if (abacus && abacus.discoveryStage !== "hidden") {
    issues.push({
      code: "abacus_stage",
      message: "abacus must remain hidden until speech PMF",
      featureId: "abacus",
    });
  }

  return issues;
}

export function assertFeatureRegistryValid(
  entries: readonly FeatureRegistryEntry[] = V2_FEATURE_REGISTRY,
): void {
  const issues = validateFeatureRegistry(entries);
  if (issues.length > 0) {
    const detail = issues.map((i) => `${i.code}: ${i.message}`).join("\n");
    throw new Error(`Feature Registry validation failed:\n${detail}`);
  }
}
