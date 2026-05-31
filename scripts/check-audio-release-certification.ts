/**
 * Phase 12 — Release certification gate (CI).
 * Audits cache corpus, gesture priming, and manifest coverage.
 *
 *   pnpm run check:audio-release-certification
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { getCoachDialogueWarmupPhrases } from "@workspace/speech-coach";
import {
  getParentHubAudioTextsForStaticCatalog,
  ALL_HUB_FACTS,
} from "../lib/parent-hub-speak/src/index.ts";
import { ARTICLES, articleToSpeechSections } from "../lib/parenting-articles/src/index.ts";
import { normalizeStaticAudioKey } from "@workspace/static-audio";
import { loadStaticAudioMap, REPO_ROOT } from "./static-audio-paths.js";

const KIDSCHEDULE_SRC = join(REPO_ROOT, "artifacts/kidschedule/src");

type MissingAsset = {
  asset: string;
  classification:
    | "static_corpus_gap"
    | "manifest_gap"
    | "warmup_gap"
    | "cache_eviction"
    | "dynamic_only_content";
  module: string;
};

/** Files that must prime user gesture before audio (Android autoplay). */
const GESTURE_REQUIRED_FILES: Array<{ path: string; module: string; patterns: RegExp[] }> = [
  {
    path: "components/amazing-facts.tsx",
    module: "facts",
    patterns: [/primeSpeakGesture/, /onPointerDown/],
  },
  {
    path: "components/daily-story-section.tsx",
    module: "stories",
    patterns: [/primeSpeakGesture/, /onPointerDown|onPrimePlay/],
  },
  {
    path: "components/daily-puzzle.tsx",
    module: "puzzles",
    patterns: [/primeSpeakGesture/, /onPointerDown/],
  },
  {
    path: "components/daily-kids-activity.tsx",
    module: "activities",
    patterns: [/primeSpeakGesture/, /onPointerDown/],
  },
  {
    path: "components/parenting-articles.tsx",
    module: "articles",
    patterns: [/primeSpeakGesture/, /onPointerDown/],
  },
  {
    path: "components/audio-play-button.tsx",
    module: "phonics",
    patterns: [/onPointerDown/, /primeStaticAudioInUserGesture|unlockFromUserGesture/],
  },
  {
    path: "components/cvc-blend-panel.tsx",
    module: "blending",
    patterns: [/onPointerDown/, /recordTtsUserGesture|unlockFromUserGesture/],
  },
  {
    path: "pages/ai-coach.tsx",
    module: "speech_coach",
    patterns: [/primeSpeakGesture/, /onPointerDown/],
  },
];

function lookupInMap(text: string, map: ReturnType<typeof loadStaticAudioMap>): boolean {
  const key = normalizeStaticAudioKey(text);
  if (!key) return false;
  return Boolean(map.default[key] || map.phonics[key]);
}

function auditCacheMisses(map: ReturnType<typeof loadStaticAudioMap>): MissingAsset[] {
  const missing: MissingAsset[] = [];

  for (const text of getParentHubAudioTextsForStaticCatalog()) {
    if (!lookupInMap(text, map)) {
      missing.push({
        asset: text.slice(0, 120),
        classification: "static_corpus_gap",
        module: "parent_hub",
      });
    }
  }

  for (const phrase of getCoachDialogueWarmupPhrases()) {
    if (!lookupInMap(phrase, map)) {
      missing.push({
        asset: phrase.slice(0, 120),
        classification: "static_corpus_gap",
        module: "speech_coach",
      });
    }
  }

  for (const article of ARTICLES) {
    for (const section of articleToSpeechSections(article)) {
      const t = section.trim();
      if (!t) continue;
      if (!lookupInMap(t, map)) {
        missing.push({
          asset: `${article.id}:${t.slice(0, 80)}`,
          classification: "dynamic_only_content",
          module: "parent_hub",
        });
      }
    }
  }

  for (const fact of ALL_HUB_FACTS) {
    const hi = (fact.textHi ?? "").trim();
    if (hi && !lookupInMap(hi, map)) {
      missing.push({
        asset: `hindi_fact:${fact.id}`,
        classification: "dynamic_only_content",
        module: "parent_hub",
      });
    }
  }

  return missing;
}

function auditGestureCoverage(): Array<{ file: string; module: string; covered: boolean; missing: string[] }> {
  return GESTURE_REQUIRED_FILES.map(({ path, module, patterns }) => {
    const full = join(KIDSCHEDULE_SRC, path);
    let content = "";
    try {
      content = readFileSync(full, "utf8");
    } catch {
      return { file: path, module, covered: false, missing: ["file_not_found"] };
    }
    const missing = patterns.filter((p) => !p.test(content)).map(String);
    return { file: path, module, covered: missing.length === 0, missing };
  });
}

function walkJsonFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walkJsonFiles(path, out);
    } else if (name.endsWith(".json") && name.includes("audio")) {
      out.push(path);
    }
  }
  return out;
}

function auditPhonicsManifest(): { missing_manifest_assets: string[]; orphaned_assets: string[] } {
  const manifestPath = join(KIDSCHEDULE_SRC, "data/phonics-audio-map.json");
  try {
    const raw = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      assets?: Record<string, { url?: string }>;
    };
    const assets = raw.assets ?? {};
    const missing = Object.entries(assets)
      .filter(([, v]) => !(v.url ?? "").trim())
      .map(([k]) => k);
    return { missing_manifest_assets: missing, orphaned_assets: [] };
  } catch {
    return { missing_manifest_assets: ["phonics-audio-map.json unreadable"], orphaned_assets: [] };
  }
}

function main(): void {
  const map = loadStaticAudioMap();
  const topMissing = auditCacheMisses(map);
  const gesture = auditGestureCoverage();
  const manifest = auditPhonicsManifest();

  const gestureCoveragePct =
    gesture.length === 0
      ? 100
      : Math.round((gesture.filter((g) => g.covered).length / gesture.length) * 10_000) / 100;

  const dynamicOnly = topMissing.filter((m) => m.classification === "dynamic_only_content");
  const corpusGaps = topMissing.filter((m) => m.classification === "static_corpus_gap");

  const report = {
    top_missing_assets: topMissing.slice(0, 50),
    missing_by_classification: {
      static_corpus_gap: corpusGaps.length,
      dynamic_only_content: dynamicOnly.length,
      manifest_gap: manifest.missing_manifest_assets.length,
    },
    autoplay_gesture_coverage: {
      percent: gestureCoveragePct,
      entries: gesture,
    },
    missing_manifest_assets: manifest.missing_manifest_assets,
    orphaned_assets: manifest.orphaned_assets,
    pass_gate: {
      static_corpus_gaps: corpusGaps.length === 0,
      gesture_coverage_100: gestureCoveragePct === 100,
      manifest_missing_0: manifest.missing_manifest_assets.length === 0,
    },
    go_no_go:
      corpusGaps.length === 0 &&
      gestureCoveragePct === 100 &&
      manifest.missing_manifest_assets.length === 0
        ? "GO"
        : "NO-GO",
    note: "Runtime success rates (99.5%) and device matrix (500 actions × 5 devices) require window.__amynestAudioCertification.deviceMatrix() on real hardware.",
  };

  console.log(JSON.stringify(report, null, 2));

  const failures: string[] = [];
  if (corpusGaps.length > 0) {
    failures.push(`${corpusGaps.length} static corpus gap(s) — run pnpm run generate:static-audio`);
  }
  if (gestureCoveragePct < 100) {
    const uncovered = gesture.filter((g) => !g.covered).map((g) => g.file);
    failures.push(`Gesture priming incomplete: ${uncovered.join(", ")}`);
  }
  if (manifest.missing_manifest_assets.length > 0) {
    failures.push(`${manifest.missing_manifest_assets.length} phonics manifest asset(s) missing URL`);
  }

  if (failures.length > 0) {
    console.error("\nAudio release certification FAILED:\n");
    for (const f of failures) console.error(`  - ${f}`);
    if (dynamicOnly.length > 0) {
      console.error(
        `\n  Note: ${dynamicOnly.length} dynamic-only asset(s) (articles/Hindi) — expected until static corpus expanded; not CI-blocking.`,
      );
    }
    process.exit(1);
  }

  if (dynamicOnly.length > 0) {
    console.warn(
      `\nWarning: ${dynamicOnly.length} dynamic-only playback path(s) remain (articles full corpus, Hindi facts display). Track via latencyReport after device cert.`,
    );
  }

  console.log("\nAudio release certification PASSED (CI gates).");
}

main();
