/**
 * Mark phonics clips as human-approved in manifest.json.
 *
 *   pnpm run approve:phonics-audio -- b c a t
 */
import { join } from "node:path";
import { approvePhonemeMeta } from "@workspace/phonics-sounds";
import {
  loadPhonicsManifestFile,
  writePhonicsManifestFile,
} from "./phonics-manifest-io.js";

const REPO_ROOT = join(import.meta.dirname, "..");
const MANIFEST_PATH = join(
  REPO_ROOT,
  "artifacts/kidschedule/public/phonics-audio/manifest.json",
);

function main(): void {
  const keys = process.argv
    .slice(2)
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k && !k.startsWith("--"));

  if (keys.length === 0) {
    console.error("Usage: pnpm run approve:phonics-audio -- b c a t");
    process.exit(1);
  }

  const manifest = loadPhonicsManifestFile(MANIFEST_PATH);
  manifest.clips ??= {};

  for (const key of keys) {
    const existing = manifest.clips[key];
    if (!existing) {
      console.warn(`[approve:phonics-audio] no manifest entry for "${key}" — skipping`);
      continue;
    }
    manifest.clips[key] = approvePhonemeMeta(existing);
    console.log(`[approve:phonics-audio] approved ${key}`);
  }

  writePhonicsManifestFile(MANIFEST_PATH, manifest);
  console.log(`[approve:phonics-audio] updated ${MANIFEST_PATH}`);
}

main();
