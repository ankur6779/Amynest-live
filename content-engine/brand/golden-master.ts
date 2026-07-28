import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AMYNEST_CINEMATIC_RULES, buildCinematicPromptBlock } from "./cinematic.js";
import { getBrandIdentityKit, AMYNEST_CTA_LINES } from "./identity.js";
import { BRAND_LOCK_VERSION, getBrandLockManifest } from "./lock.js";
import { AMYNEST_DELIVERY_SPEC } from "./platforms.js";
import { AMYNEST_VIDEO_STRUCTURE } from "./identity.js";
import { buildBrandSystemPromptBlock, buildBrandVisualPromptBlock } from "./prompts.js";

export interface GoldenMasterPackage {
  version: typeof BRAND_LOCK_VERSION;
  title: string;
  createdFor: "AmyNest Content Automation Engine RC-1";
  storyFormat: readonly string[];
  cinematic: typeof AMYNEST_CINEMATIC_RULES;
  delivery: typeof AMYNEST_DELIVERY_SPEC;
  brandLock: ReturnType<typeof getBrandLockManifest>;
  canonical: {
    systemPrompt: string;
    visualPrompt: string;
    cinematicPrompt: string;
    lighting: string;
    camera: string;
    transitions: readonly string[];
    typography: { display: string; body: string };
    ctaLines: readonly string[];
    endCard: {
      durationSeconds: number;
      downloadLine: string;
      websiteUrl: string;
      background: string;
      motion: string;
      requiredAssets: readonly string[];
    };
    videoStructure: typeof AMYNEST_VIDEO_STRUCTURE;
  };
  compareRules: readonly string[];
}

const HERE = dirname(fileURLToPath(import.meta.url));
export const GOLDEN_MASTER_PATH = join(HERE, "golden-master", "GOLDEN_MASTER.json");

export function buildGoldenMasterPackage(): GoldenMasterPackage {
  const kit = getBrandIdentityKit();
  return {
    version: BRAND_LOCK_VERSION,
    title: "AmyNest Golden Master Reference Package",
    createdFor: "AmyNest Content Automation Engine RC-1",
    storyFormat: [
      "Hook",
      "Problem",
      "AmyNest Solution",
      "Benefit",
      "Download CTA",
    ] as const,
    cinematic: AMYNEST_CINEMATIC_RULES,
    delivery: AMYNEST_DELIVERY_SPEC,
    brandLock: getBrandLockManifest(),
    canonical: {
      systemPrompt: buildBrandSystemPromptBlock({
        category: "Parenting",
        title: "AmyNest Golden Master",
        keywords: ["amynest", "habits", "routine"],
      }),
      visualPrompt: buildBrandVisualPromptBlock({
        category: "Parenting",
        title: "AmyNest Golden Master",
        keywords: ["amynest"],
      }),
      cinematicPrompt: buildCinematicPromptBlock(),
      lighting: AMYNEST_CINEMATIC_RULES.lighting,
      camera: AMYNEST_CINEMATIC_RULES.camera.default,
      transitions: AMYNEST_CINEMATIC_RULES.transitions,
      typography: kit.typography,
      ctaLines: AMYNEST_CTA_LINES,
      endCard: {
        durationSeconds: kit.endCard.durationSeconds.default,
        downloadLine: kit.endCard.downloadLine,
        websiteUrl: kit.websiteUrl,
        background: kit.colors.background,
        motion: "Animated purple glow + soft logo reveal",
        requiredAssets: [
          "official-app-icon",
          "google-play-badge",
          "apple-app-store-badge",
          "official-website",
        ],
      },
      videoStructure: AMYNEST_VIDEO_STRUCTURE,
    },
    compareRules: [
      "Future videos must preserve locked character identity vs Golden Master references",
      "Palette must remain AmyNest purple system",
      "Story format Hook→Problem→Solution→Benefit→CTA is mandatory",
      "End card assets and duration must match Golden Master",
      "Delivery must remain 1080x1920 9:16 multi-platform safe",
      "No generic AI look; reject identity drift before publish",
    ],
  };
}

export function writeGoldenMasterPackage(
  path = GOLDEN_MASTER_PATH,
): GoldenMasterPackage {
  const pkg = buildGoldenMasterPackage();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  return pkg;
}

export function loadGoldenMasterPackage(
  path = GOLDEN_MASTER_PATH,
): GoldenMasterPackage {
  if (!existsSync(path)) {
    return writeGoldenMasterPackage(path);
  }
  return JSON.parse(readFileSync(path, "utf8")) as GoldenMasterPackage;
}

/** Lightweight pre-publish comparison against Golden Master. */
export function compareAgainstGoldenMaster(input: {
  hasEndCard: boolean;
  hasCta: boolean;
  colorsPrimary?: string;
  storyPurposes?: string[];
  resolution?: string;
}): { ok: boolean; deviations: string[] } {
  const master = loadGoldenMasterPackage();
  const deviations: string[] = [];
  if (!input.hasEndCard) deviations.push("Missing mandatory end card vs Golden Master");
  if (!input.hasCta) deviations.push("Missing CTA vs Golden Master");
  if (
    input.colorsPrimary &&
    input.colorsPrimary.toLowerCase() !== master.brandLock.colors.primary.toLowerCase()
  ) {
    deviations.push(
      `Primary color ${input.colorsPrimary} drifts from Golden Master ${master.brandLock.colors.primary}`,
    );
  }
  if (input.resolution && input.resolution !== master.delivery.resolution) {
    deviations.push(
      `Resolution ${input.resolution} drifts from Golden Master ${master.delivery.resolution}`,
    );
  }
  const required = ["hook", "opening-question", "story", "key-point", "cta", "brand-end"];
  for (const purpose of required) {
    if (input.storyPurposes && !input.storyPurposes.includes(purpose)) {
      deviations.push(`Missing story beat '${purpose}' vs Golden Master format`);
    }
  }
  return { ok: deviations.length === 0, deviations };
}
