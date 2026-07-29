import { existsSync } from "node:fs";
import { assertBrandAssetsPresent } from "./assets-resolver.js";
import { compareAgainstGoldenMaster } from "./golden-master.js";
import { getBrandIdentityKit } from "./identity.js";
import { verifyBrandLockIntegrity } from "./lock.js";
import { isMultiPlatformSafe } from "./platforms.js";
import type { BrandCharacterId, BrandQualityFinding, BrandQualityReport } from "./types.js";
import type { ContentPackage } from "../types/content-package.js";
import type { StoryboardPackage } from "../types/storyboard.js";

export interface BrandQualityGateInput {
  content?: ContentPackage;
  storyboard?: StoryboardPackage;
  charactersUsed?: BrandCharacterId[];
  featureId?: string;
  finalVideoHasEndCard?: boolean;
  appIconBurned?: boolean;
  storeBadgesPresent?: boolean;
  appleStoreBadgePresent?: boolean;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  hasBlackFrames?: boolean;
  captionOverflow?: boolean;
  narrationSyncOk?: boolean;
  lowResolution?: boolean;
  /**
   * When true, missing media evidence fields are FAIL (never assumed present).
   * Use for launch/final-MP4 certification. Storyboard-only planning may omit.
   */
  requireMediaEvidence?: boolean;
}

/**
 * Reject any AmyNest video that fails identity / CTA / feature storytelling rules.
 */
export function evaluateBrandQualityGate(
  input: BrandQualityGateInput,
): BrandQualityReport {
  const kit = getBrandIdentityKit();
  const findings: BrandQualityFinding[] = [];
  const assets = assertBrandAssetsPresent();
  if (!assets.ok) {
    for (const missing of assets.missing) {
      findings.push({
        code: "MISSING_BRAND_ASSET",
        severity: "error",
        message: `Official brand asset missing: ${missing}`,
      });
    }
  }

  if (!existsSync(kit.appIconAsset)) {
    findings.push({
      code: "MISSING_APP_ICON",
      severity: "error",
      message: "Official AmyNest app icon missing from brand kit",
    });
  }

  const content = input.content;
  if (content) {
    const corpus = [
      content.cta,
      content.voiceScript,
      content.story,
      content.description,
      content.title,
    ].join(" ");
    if (!/amynest/i.test(corpus)) {
      findings.push({
        code: "BRAND_NAME_MISSING",
        severity: "error",
        message: "Script/package does not mention AmyNest",
      });
    }
    if (!content.cta?.trim()) {
      findings.push({
        code: "CTA_MISSING",
        severity: "error",
        message: "CTA missing from content package",
      });
    }
    const featureClues =
      /\b(learning|astro|health|speech|game|coach|audio|routine|habit|premium|dashboard|phonics|abacus)\b/i;
    if (!featureClues.test(corpus) && !input.featureId) {
      findings.push({
        code: "FEATURE_EXPLANATION_MISSING",
        severity: "error",
        message: "Feature explanation missing — content must map to a real AmyNest capability",
      });
    }
    if (content.voiceScript.trim().split(/\s+/).length < 12) {
      findings.push({
        code: "POOR_NARRATION",
        severity: "error",
        message: "Narration too short / poor narration quality",
      });
    }
  }

  const storyboard = input.storyboard;
  let endCardPresent = Boolean(input.finalVideoHasEndCard);
  if (storyboard) {
    const purposes = new Set(storyboard.scenes.map((s) => s.purpose));
    if (!purposes.has("cta") && !purposes.has("brand-end")) {
      findings.push({
        code: "CTA_SCENE_MISSING",
        severity: "error",
        message: "Storyboard missing official CTA / brand-end scene",
      });
    } else {
      endCardPresent = true;
    }
    if (!purposes.has("brand-end")) {
      findings.push({
        code: "END_CARD_MISSING",
        severity: "error",
        message: "Mandatory branded end card (brand-end) missing",
      });
      endCardPresent = false;
    }
    const colors = storyboard.branding.colors;
    const purpleOk =
      /6A2CFF|461EA8|8A2CFF|2B1E5E|1B4D6E/i.test(colors.primary) ||
      /6A2CFF|461EA8|8A2CFF/i.test(colors.accent);
    if (!purpleOk) {
      findings.push({
        code: "WRONG_COLORS",
        severity: "error",
        message: `Branding colors inconsistent with AmyNest purple system (${colors.primary})`,
      });
    }
    if (!storyboard.branding.logoAssetId) {
      findings.push({
        code: "LOGO_MISSING",
        severity: "error",
        message: "Official logo asset id missing from branding plan",
      });
    }
    if (!storyboard.branding.playStorePlaceholder) {
      findings.push({
        code: "STORE_BADGE_MISSING",
        severity: "error",
        message: "Play Store badge placeholder missing",
      });
    }
  }

  const requireMedia = input.requireMediaEvidence === true;
  if (input.storeBadgesPresent === false || (requireMedia && input.storeBadgesPresent !== true)) {
    findings.push({
      code: "STORE_BADGES_ABSENT",
      severity: "error",
      message:
        input.storeBadgesPresent === false
          ? "Google Play badge missing from final package"
          : "Google Play badge presence UNKNOWN — provide probed evidence (never assume)",
    });
  }
  if (
    input.appleStoreBadgePresent === false ||
    (requireMedia && input.appleStoreBadgePresent !== true)
  ) {
    findings.push({
      code: "APP_STORE_BADGE_ABSENT",
      severity: "error",
      message:
        input.appleStoreBadgePresent === false
          ? "Apple App Store badge missing from final package"
          : "App Store badge presence UNKNOWN — provide probed evidence (never assume)",
    });
  }
  if (input.appIconBurned === false || (requireMedia && input.appIconBurned !== true)) {
    findings.push({
      code: "APP_ICON_NOT_BURNED",
      severity: "error",
      message:
        input.appIconBurned === false
          ? "Official app icon missing from end card"
          : "App icon burn-in UNKNOWN — provide probed evidence (never assume)",
    });
  }
  if (
    input.finalVideoHasEndCard === false ||
    (requireMedia && input.finalVideoHasEndCard !== true)
  ) {
    findings.push({
      code: "END_CARD_EVIDENCE_MISSING",
      severity: "error",
      message:
        input.finalVideoHasEndCard === false
          ? "Official end card missing from final video"
          : "End card presence UNKNOWN — provide probed evidence (never assume)",
    });
  }
  if (input.hasBlackFrames) {
    findings.push({
      code: "BLACK_FRAMES",
      severity: "error",
      message: "Black frames detected in output",
    });
  }
  if (input.captionOverflow) {
    findings.push({
      code: "CAPTION_OVERFLOW",
      severity: "error",
      message: "Caption overflow outside safe margins",
    });
  }
  if (input.narrationSyncOk === false || (requireMedia && input.narrationSyncOk !== true)) {
    findings.push({
      code: "POOR_NARRATION_SYNC",
      severity: "error",
      message:
        input.narrationSyncOk === false
          ? "Narration sync failed quality check"
          : "Narration sync UNKNOWN — provide probed audio evidence (never assume)",
    });
  }
  if (input.lowResolution) {
    findings.push({
      code: "LOW_RESOLUTION",
      severity: "error",
      message: "Output below required 1080x1920",
    });
  }

  const platform = isMultiPlatformSafe({
    width: input.width,
    height: input.height,
    durationSeconds: input.durationSeconds,
  });
  if ((input.width != null || input.height != null) && !platform.ok) {
    for (const message of platform.errors) {
      findings.push({
        code: "PLATFORM_UNSAFE",
        severity: "error",
        message,
      });
    }
  }

  const lock = verifyBrandLockIntegrity();
  if (!lock.ok) {
    for (const message of lock.errors) {
      findings.push({
        code: "BRAND_LOCK_DRIFT",
        severity: "error",
        message,
      });
    }
  }

  if (storyboard) {
    const gold = compareAgainstGoldenMaster({
      hasEndCard: endCardPresent,
      hasCta: storyboard.scenes.some((s) => s.purpose === "cta"),
      colorsPrimary: storyboard.branding.colors.primary,
      storyPurposes: storyboard.scenes.map((s) => s.purpose),
      resolution: storyboard.resolution,
    });
    for (const deviation of gold.deviations) {
      findings.push({
        code: "GOLDEN_MASTER_DEVIATION",
        severity: "error",
        message: deviation,
      });
    }
  }

  const charactersUsed = input.charactersUsed ?? [];
  for (const id of charactersUsed) {
    if (!kit.characters[id]) {
      findings.push({
        code: "UNKNOWN_CHARACTER",
        severity: "error",
        message: `Unknown / non-official character referenced: ${id}`,
      });
    }
  }
  if (
    charactersUsed.length > 0 &&
    !charactersUsed.includes("amy-ai") &&
    !charactersUsed.includes("amy-girl") &&
    !charactersUsed.includes("amy-boy")
  ) {
    findings.push({
      code: "CHARACTER_INCONSISTENT",
      severity: "error",
      message: "AmyNest official characters not used",
    });
  }

  const errors = findings.filter((f) => f.severity === "error");
  return {
    ok: errors.length === 0,
    findings,
    charactersUsed,
    featureId: input.featureId,
    endCardPresent,
  };
}

export function formatBrandQualityReport(report: BrandQualityReport): string {
  if (report.ok) return "Brand quality gate: PASS";
  return [
    "Brand quality gate: FAIL",
    ...report.findings.map((f) => `- [${f.severity}] ${f.code}: ${f.message}`),
  ].join("\n");
}
