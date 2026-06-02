import type { WorldManifest } from "./manifest-types.js";

export type ContentDiagnosticIssue = {
  severity: "error" | "warn";
  code: string;
  message: string;
  itemId?: string;
};

export function diagnoseWorldManifest(manifest: WorldManifest): ContentDiagnosticIssue[] {
  const issues: ContentDiagnosticIssue[] = [];

  if (!manifest.items.length) {
    issues.push({
      severity: "error",
      code: "empty_catalog",
      message: `World ${manifest.worldId} has no items`,
    });
  }

  if (!manifest.categories.length) {
    issues.push({
      severity: "warn",
      code: "empty_categories",
      message: `World ${manifest.worldId} has no categories`,
    });
  }

  const categoryIds = new Set(manifest.categories.map((c) => c.id));
  for (const cat of manifest.categories) {
    const count = manifest.items.filter((i) => i.category === cat.id).length;
    if (count === 0) {
      issues.push({
        severity: "warn",
        code: "empty_category",
        message: `Category "${cat.label}" (${cat.id}) has no items`,
      });
    }
  }

  for (const item of manifest.items) {
    if (!categoryIds.has(item.category)) {
      issues.push({
        severity: "warn",
        code: "orphan_category",
        message: `Item ${item.id} references unknown category ${item.category}`,
        itemId: item.id,
      });
    }
    if (!item.imageGcsPath?.trim()) {
      issues.push({
        severity: "error",
        code: "missing_image",
        message: `Item ${item.id} missing imageGcsPath`,
        itemId: item.id,
      });
    }
    if (!item.sounds.length) {
      issues.push({
        severity: "error",
        code: "missing_audio",
        message: `Item ${item.id} has no sounds`,
        itemId: item.id,
      });
    }
    for (const sound of item.sounds) {
      if (!sound.gcsPath?.trim()) {
        issues.push({
          severity: "error",
          code: "missing_sound_path",
          message: `Item ${item.id} sound ${sound.id} missing gcsPath`,
          itemId: item.id,
        });
      }
    }
    if (!item.narration?.introGcsPath?.trim()) {
      issues.push({
        severity: "warn",
        code: "missing_narration",
        message: `Item ${item.id} missing narration intro`,
        itemId: item.id,
      });
    }
  }

  return issues;
}

export function manifestDiagnosticsSummary(issues: ContentDiagnosticIssue[]): {
  ok: boolean;
  errors: number;
  warnings: number;
} {
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warn").length;
  return { ok: errors === 0, errors, warnings };
}
