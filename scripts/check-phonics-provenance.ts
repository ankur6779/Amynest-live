/**
 * Phase B/C certification gate — phonics audio provenance.
 *
 * FAILS (exit 1) if any phonics asset source is not the single certified
 * ElevenLabs voice/model, or if provenance metadata is missing/mismatched.
 *
 *   pnpm run check:phonics-provenance
 *
 * NOTE: this gate is EXPECTED to fail until Phase G regeneration writes the
 * canonical provenance into both manifests — that failure IS the certification
 * signal that regeneration has not yet run.
 */
import { existsSync, readFileSync } from "node:fs";
import {
  PHONICS_AUDIO_PROVIDER,
  PHONICS_CANONICAL_MODEL_ID,
  PHONICS_CANONICAL_VOICE_ID,
  validatePhonicsProvenance,
  type AudioProvenance,
  type PhonicsAudioLibraryManifest,
} from "@workspace/phonics-sounds";
import { PHONICS_LIBRARY_MANIFEST_PATHS } from "./phonics-library-io.js";
import { STATIC_AUDIO_MAP_PATHS } from "./static-audio-paths.js";

type StaticMapRaw = {
  phonics?: Record<string, string>;
  meta?: Record<string, Partial<AudioProvenance> | undefined>;
};

const failures: string[] = [];
const warnings: string[] = [];

function checkLibraryManifest(path: string): void {
  if (!existsSync(path)) {
    failures.push(`library manifest missing: ${path}`);
    return;
  }
  const manifest = JSON.parse(readFileSync(path, "utf8")) as PhonicsAudioLibraryManifest;

  const provenance: Partial<AudioProvenance> = {
    provider: manifest.provider,
    voiceId: manifest.voiceId,
    model: manifest.modelId,
    generatedAt: manifest.generatedAt,
    curriculumVersion: manifest.curriculumVersion,
    phonemeVersion: manifest.phonemeVersion,
    normalizationVersion: manifest.normalizationVersion,
  };
  for (const issue of validatePhonicsProvenance(provenance)) {
    failures.push(
      `library manifest provenance.${String(issue.field)}: expected "${issue.expected}", got "${String(issue.actual)}" (${path})`,
    );
  }

  let fallbackCount = 0;
  for (const [key, asset] of Object.entries(manifest.assets ?? {})) {
    if (asset.source && asset.source !== "elevenlabs") {
      fallbackCount += 1;
      failures.push(`asset "${key}" source is "${asset.source}" (must be elevenlabs)`);
    }
  }
  if (fallbackCount > 0) {
    warnings.push(`${fallbackCount} asset(s) are fallback_tone — regenerate before release.`);
  }
}

function checkStaticPhonicsBucket(path: string): void {
  if (!existsSync(path)) return;
  const raw = JSON.parse(readFileSync(path, "utf8")) as StaticMapRaw;
  const phonicsBucket = raw.phonics ?? {};
  const phonicsCount = Object.keys(phonicsBucket).length;
  if (phonicsCount === 0) return;

  const meta = raw.meta?.phonics;
  if (!meta) {
    failures.push(
      `static phonics bucket (${phonicsCount} entries) has NO provenance meta in ${path} — assumed OpenAI, uncertified.`,
    );
    return;
  }
  for (const issue of validatePhonicsProvenance(meta)) {
    failures.push(
      `static phonics provenance.${String(issue.field)}: expected "${issue.expected}", got "${String(issue.actual)}" (${path})`,
    );
  }
}

for (const p of PHONICS_LIBRARY_MANIFEST_PATHS) checkLibraryManifest(p);
for (const p of STATIC_AUDIO_MAP_PATHS) checkStaticPhonicsBucket(p);

console.log("── Phonics audio provenance certification ──");
console.log(`Canonical provider : ${PHONICS_AUDIO_PROVIDER}`);
console.log(`Canonical voiceId  : ${PHONICS_CANONICAL_VOICE_ID}`);
console.log(`Canonical model    : ${PHONICS_CANONICAL_MODEL_ID}`);
for (const w of warnings) console.warn(`⚠ ${w}`);

if (failures.length > 0) {
  console.error(`\n✖ FAIL — ${failures.length} provenance issue(s):`);
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}

console.log("\n✔ PASS — all phonics assets certify to the single ElevenLabs voice.");
