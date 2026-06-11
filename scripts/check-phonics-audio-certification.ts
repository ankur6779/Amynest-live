/**
 * Phase 14 — Automated phonics audio certification.
 * PASS/FAIL report; production gate fails on phoneme mismatch or missing required clips.
 *
 *   pnpm run check:phonics-audio-certification
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getCvcWordEntry,
  getElevenLabsPhonemeSpeakText,
  getPhonicsCatalogKey,
  PHONICS_CVC_SMOKE_KEYS,
  resolvePhonicsSequenceKeys,
  type PhonicsAudioLibraryManifest,
} from "@workspace/phonics-sounds";
import { PHONICS_LIBRARY_MANIFEST_PATHS } from "./phonics-library-io.js";
import { loadFullPhonicsCatalog } from "./phonics-audio-coverage.js";

const REPO_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

type CertStatus = "pass" | "fail" | "warn";

type CertCheck = {
  id: string;
  label: string;
  status: CertStatus;
  detail?: string;
};

const checks: CertCheck[] = [];

function record(id: string, label: string, status: CertStatus, detail?: string): void {
  checks.push({ id, label, status, detail });
}

function loadManifest(): PhonicsAudioLibraryManifest | null {
  const path = PHONICS_LIBRARY_MANIFEST_PATHS[0];
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as PhonicsAudioLibraryManifest;
  } catch {
    return null;
  }
}

async function runCertification(): Promise<"PASS" | "FAIL"> {
  const manifest = loadManifest();
  const catalog = await loadFullPhonicsCatalog();

  if (!manifest?.assets) {
    record("manifest", "Library manifest present", "fail", "phonics-audio-map.json missing");
    return printReport();
  }

  const missing: string[] = [];
  const brokenUrl: string[] = [];
  for (const entry of catalog) {
    const key = getPhonicsCatalogKey(entry.type, entry.id);
    const asset = manifest.assets[key];
    if (!asset?.url?.trim()) missing.push(key);
    else if (!asset.url.startsWith("https://") && !asset.url.startsWith("/api/phonics-library/")) {
      brokenUrl.push(key);
    }
  }

  record(
    "missing-clips",
    "No missing required curriculum clips",
    missing.length === 0 ? "pass" : "fail",
    missing.length ? `${missing.length} missing: ${missing.slice(0, 6).join(", ")}` : `${catalog.length} OK`,
  );

  const phonemeMismatch: string[] = [];
  for (const smoke of PHONICS_CVC_SMOKE_KEYS) {
    const entry = getCvcWordEntry(smoke);
    if (!entry) continue;
    const keys = resolvePhonicsSequenceKeys(smoke);
    for (const k of keys) {
      const hint = getElevenLabsPhonemeSpeakText(k);
      if (!hint || hint.includes(".") && k.length === 1) {
        phonemeMismatch.push(`${smoke}:${k}`);
      }
    }
  }

  record(
    "phoneme-mapping",
    "CVC smoke phoneme mapping valid (no letter-name contamination)",
    phonemeMismatch.length === 0 ? "pass" : "fail",
    phonemeMismatch.length ? phonemeMismatch.join(", ") : "smoke keys OK",
  );

  const amyFallbackRisk: string[] = [];
  for (const entry of catalog.filter((e) => e.type === "cvc")) {
    const id = entry.id.toLowerCase();
    const asset = manifest.assets[getPhonicsCatalogKey(entry.type, entry.id)];
    const url = asset?.url ?? "";
    if (url.includes("lesson") || url.includes("amy-narration")) {
      amyFallbackRisk.push(id);
    }
  }
  record(
    "amy-contamination",
    "No lesson/Amy narration URLs in CVC assets",
    amyFallbackRisk.length === 0 ? "pass" : "fail",
    amyFallbackRisk.length ? amyFallbackRisk.join(", ") : "clean",
  );

  const dupLessonMap = new Map<string, string[]>();
  for (const [key, asset] of Object.entries(manifest.assets)) {
    if (!asset.url) continue;
    const list = dupLessonMap.get(asset.url) ?? [];
    list.push(key);
    dupLessonMap.set(asset.url, list);
  }
  const crossContamination = [...dupLessonMap.entries()].filter(
    ([, keys]) => keys.some((k) => k.startsWith("cvc:")) && keys.some((k) => k.startsWith("letter:")),
  );
  record(
    "lesson-contamination",
    "CVC and phoneme clips not sharing wrong URLs",
    crossContamination.length === 0 ? "pass" : "warn",
    crossContamination.length
      ? `${crossContamination.length} shared URLs (review)`
      : "isolated",
  );

  if (brokenUrl.length > 0) {
    record("broken-url", "Playback URLs well-formed", "fail", brokenUrl.slice(0, 5).join(", "));
  } else {
    record("broken-url", "Playback URLs well-formed", "pass");
  }

  return printReport();
}

function printReport(): "PASS" | "FAIL" {
  console.log("\n[phonics-audio-certification] REPORT\n");
  for (const c of checks) {
    const icon = c.status === "pass" ? "✔" : c.status === "warn" ? "⚠" : "✗";
    console.log(`  ${icon} [${c.id}] ${c.label}${c.detail ? `\n      ${c.detail}` : ""}`);
  }
  const fails = checks.filter((c) => c.status === "fail").length;
  const verdict = fails === 0 ? "PASS" : "FAIL";
  console.log(`\n  VERDICT: ${verdict} (${checks.length - fails}/${checks.length} checks passed)\n`);
  if (fails > 0) process.exit(1);
  return verdict;
}

runCertification().catch((err) => {
  console.error(err);
  process.exit(1);
});
