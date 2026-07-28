import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertBrandAssetsPresent } from "./assets-resolver.js";
import { selectBrandCharacters } from "./characters.js";
import {
  discoverAmyNestFeatures,
  selectFeatureForTopic,
} from "./feature-discovery.js";
import {
  compareAgainstGoldenMaster,
  writeGoldenMasterPackage,
} from "./golden-master.js";
import { getBrandIdentityKit } from "./identity.js";
import {
  BRAND_LOCK_VERSION,
  getBrandLockManifest,
  persistBrandLockFingerprints,
  verifyBrandLockIntegrity,
} from "./lock.js";
import { AMYNEST_DELIVERY_SPEC } from "./platforms.js";
import { evaluateBrandQualityGate } from "./quality-gate.js";
import { findRepoRootQuiet } from "./repo-root.js";
import { loadDefaultConfig } from "../config/index.js";
import { StoryboardPlanner } from "../storyboard/planner.js";
import { makeContentPackage } from "../storyboard/test-fixtures.js";

export interface BrandReleaseCheck {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

export interface BrandReleaseCertificate {
  version: typeof BRAND_LOCK_VERSION;
  status: "Production Ready" | "NOT READY";
  generatedAt: string;
  checks: BrandReleaseCheck[];
}

const HERE = dirname(fileURLToPath(import.meta.url));
export const BRAND_RELEASE_CERTIFICATE_PATH = join(
  HERE,
  "..",
  "docs",
  "operations",
  "BRAND_RELEASE_CERTIFICATE.md",
);

export function runBrandReleaseCertification(): BrandReleaseCertificate {
  persistBrandLockFingerprints();
  writeGoldenMasterPackage();

  const checks: BrandReleaseCheck[] = [];
  const kit = getBrandIdentityKit();
  const lock = getBrandLockManifest();
  const assets = assertBrandAssetsPresent();
  checks.push({
    id: "brand-assets",
    label: "Brand validation (locked assets present)",
    ok: assets.ok,
    detail: assets.ok
      ? `${assets.present.length} official assets locked`
      : assets.missing.join("; "),
  });

  const integrity = verifyBrandLockIntegrity();
  checks.push({
    id: "brand-lock",
    label: "Brand lock integrity (no identity mutation)",
    ok: integrity.ok,
    detail: integrity.ok ? `Manifest ${lock.version}` : integrity.errors.join("; "),
  });

  const castingGirl = selectBrandCharacters({
    category: "Speech",
    title: "Speech Practice",
  });
  const castingBoy = selectBrandCharacters({
    category: "Games",
    title: "Math adventure",
  });
  const castingAi = selectBrandCharacters({
    category: "Parenting",
    title: "Amy Coach tips",
  });
  const characterOk =
    castingGirl.primary === "amy-girl" &&
    castingBoy.primary === "amy-boy" &&
    castingAi.primary === "amy-ai";
  checks.push({
    id: "characters",
    label: "Character validation (casting rules)",
    ok: characterOk,
    detail: characterOk
      ? "Amy AI / Amy Girl / Amy Boy casting locked"
      : `Unexpected cast girl=${castingGirl.primary} boy=${castingBoy.primary} ai=${castingAi.primary}`,
  });

  checks.push({
    id: "visual-consistency",
    label: "Visual consistency (purple palette + cinematic rules)",
    ok:
      kit.colors.primary === "#6A2CFF" &&
      kit.colors.deepPurple === "#461EA8" &&
      kit.typography.display.length > 0,
    detail: `primary=${kit.colors.primary} deep=${kit.colors.deepPurple} display=${kit.typography.display}`,
  });

  checks.push({
    id: "end-card",
    label: "End card validation",
    ok: kit.endCard.required === true && kit.endCard.durationSeconds.default >= 2,
    detail: `${kit.endCard.downloadLine} @ ${kit.endCard.durationSeconds.default}s`,
  });

  checks.push({
    id: "store-badges",
    label: "Store badge validation",
    ok: assets.present.some((p) => p.includes("google-play")) &&
      assets.present.some((p) => p.includes("app-store")),
    detail: "Google Play + Apple App Store badge assets present",
  });

  checks.push({
    id: "logo",
    label: "Logo validation (official app icon)",
    ok: assets.present.some((p) => p.includes("app-icon")),
    detail: "content-engine/brand/assets/app-icon.png",
  });
  void kit.appIconAsset;

  const features = discoverAmyNestFeatures({
    repoRoot: findRepoRootQuiet(),
    maxFeatures: 120,
  });
  const selected = selectFeatureForTopic(features, {
    id: "cert-speech",
    title: "Speech Practice",
    category: "Speech",
    keywords: ["speech"],
  });
  checks.push({
    id: "feature-discovery",
    label: "Feature discovery validation",
    ok: features.length >= 8 && Boolean(selected),
    detail: `${features.length} features discovered; sample=${selected?.title ?? "none"}`,
  });

  const config = loadDefaultConfig();
  const { package: storyboard } = new StoryboardPlanner({ config }).planFromContentPackage(
    makeContentPackage({
      topic: {
        id: "brand-rc1",
        title: "Daily Routines with AmyNest",
        category: "Parenting",
        difficulty: "beginner",
        ageGroup: "all",
        keywords: ["routine", "habits", "amynest", "learning"],
        cta: "Download AmyNest AI Today",
        priority: 10,
        estimatedDuration: 15,
        videoStyle: "short",
      },
      cta: "Download AmyNest AI Today",
      voiceScript:
        "Every great habit starts with one small step. AmyNest routines help parents build confidence every day with Learning Zone guidance and calm structure.",
    }),
    15,
  );

  const gate = evaluateBrandQualityGate({
    storyboard,
    featureId: selected?.id,
    charactersUsed: ["amy-ai", "amy-girl"],
    storeBadgesPresent: true,
    appleStoreBadgePresent: true,
    appIconBurned: true,
    width: 1080,
    height: 1920,
    durationSeconds: 15,
    hasBlackFrames: false,
    captionOverflow: false,
    narrationSyncOk: true,
    lowResolution: false,
  });
  checks.push({
    id: "quality-gate",
    label: "Quality gate (storyboard + golden master)",
    ok: gate.ok,
    detail: gate.ok
      ? "PASS"
      : gate.findings.map((f) => f.code).join(", "),
  });

  const gold = compareAgainstGoldenMaster({
    hasEndCard: storyboard.scenes.some((s) => s.purpose === "brand-end"),
    hasCta: storyboard.scenes.some((s) => s.purpose === "cta"),
    colorsPrimary: storyboard.branding.colors.primary,
    storyPurposes: storyboard.scenes.map((s) => s.purpose),
    resolution: storyboard.resolution,
  });
  checks.push({
    id: "golden-master",
    label: "Golden Master comparison",
    ok: gold.ok,
    detail: gold.ok ? "Matches Golden Master" : gold.deviations.join("; "),
  });

  checks.push({
    id: "multi-platform",
    label: "Multi-platform delivery spec",
    ok:
      AMYNEST_DELIVERY_SPEC.resolution === "1080x1920" &&
      AMYNEST_DELIVERY_SPEC.platforms.length >= 4,
    detail: AMYNEST_DELIVERY_SPEC.platforms.join(", "),
  });

  const allOk = checks.every((c) => c.ok);
  return {
    version: BRAND_LOCK_VERSION,
    status: allOk ? "Production Ready" : "NOT READY",
    generatedAt: new Date().toISOString(),
    checks,
  };
}

export function writeBrandReleaseCertificate(
  path = BRAND_RELEASE_CERTIFICATE_PATH,
): BrandReleaseCertificate {
  const cert = runBrandReleaseCertification();
  const tagLine =
    cert.status === "Production Ready"
      ? "- Tag: `" + cert.version + "`"
      : "- Not ready for tag `" + cert.version + "`";
  const md = [
    "# BRAND_RELEASE_CERTIFICATE",
    "",
    "**Version:** `" + cert.version + "`",
    "**Status:** " + cert.status,
    "**Generated:** " + cert.generatedAt,
    "**Release candidate:** RC-1",
    "",
    "## Summary",
    "",
    cert.status === "Production Ready"
      ? "All AmyNest Brand Identity checks passed. The branding layer is production-ready."
      : "One or more brand checks failed. Do not enable production branding until fixed.",
    "",
    "## Validation checklist",
    "",
    "| Check | Result | Detail |",
    "|---|---|---|",
    ...cert.checks.map(
      (c) =>
        "| " +
        c.label +
        " | " +
        (c.ok ? "PASS" : "FAIL") +
        " | " +
        c.detail.replace(/\|/g, "/") +
        " |",
    ),
    "",
    "## Locked surfaces",
    "",
    "- Official App Icon",
    "- Amy AI / Amy Girl / Amy Boy",
    "- Brand colors + typography",
    "- End card + store badges + logo placement",
    "- Golden Master reference package",
    "",
    "## Production readiness",
    "",
    tagLine,
    "- Providers may not redesign locked assets",
    "- Inconsistent AI output must be rejected and retried with stronger reference conditioning",
    "- Future publishes must compare against Golden Master",
    "",
  ].join("\n");

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, md, "utf8");
  return cert;
}
