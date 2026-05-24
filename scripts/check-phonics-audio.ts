/**
 * Production sanity checklist for curated phonics audio.
 *
 *   pnpm run check:phonics-audio
 *
 * Set PHONICS_AUDIO_SKIP_CHECK=1 to skip (e.g. CI without generated assets).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertElevenLabsSpeakTextComplete,
  getAllPhonicsAudioKeys,
  getElevenLabsPhonemeSpeakText,
  PHONICS_CVC_SMOKE_KEYS,
  PHONICS_MASTERING_FILTER_CHAIN,
  PHONICS_OUTPUT_CHANNELS,
  PHONICS_OUTPUT_SAMPLE_RATE,
  PHONICS_STOP_SOUND_KEYS,
  PHONICS_STOP_SOUND_MAX_DURATION_MS,
  resolvePhonicsSequenceKeys,
  shouldSkipStaticClipForLearning,
  type PhonicsAudioManifestFile,
  type PhonicsAudioMeta,
  validatePhonicsMp3Buffer,
} from "@workspace/phonics-sounds";

const REPO_ROOT = join(import.meta.dirname, "..");
const OUT_DIR = join(REPO_ROOT, "artifacts/kidschedule/public/phonics-audio");
const MANIFEST_PATH = join(OUT_DIR, "manifest.json");

type CheckStatus = "pass" | "fail" | "skip" | "manual";

type CheckResult = {
  id: string;
  label: string;
  status: CheckStatus;
  detail?: string;
};

const results: CheckResult[] = [];

function record(id: string, label: string, status: CheckStatus, detail?: string): void {
  results.push({ id, label, status, detail });
}

function ffprobeAvailable(): boolean {
  try {
    execFileSync("ffprobe", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function probeAudioFormat(filePath: string): { sampleRate?: number; channels?: number } | null {
  try {
    const out = execFileSync(
      "ffprobe",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-show_entries",
        "stream=sample_rate,channels",
        "-of",
        "default=noprint_wrappers=1",
        filePath,
      ],
      { encoding: "utf8" },
    );
    const sampleRate = Number(out.match(/sample_rate=(\d+)/)?.[1]);
    const channels = Number(out.match(/channels=(\d+)/)?.[1]);
    return {
      sampleRate: Number.isFinite(sampleRate) ? sampleRate : undefined,
      channels: Number.isFinite(channels) ? channels : undefined,
    };
  } catch {
    return null;
  }
}

function loadManifest(): PhonicsAudioManifestFile | null {
  if (!existsSync(MANIFEST_PATH)) return null;
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as PhonicsAudioManifestFile;
  } catch {
    return null;
  }
}

function checkSpeakTextHints(): void {
  try {
    assertElevenLabsSpeakTextComplete();
    const stopHints = PHONICS_STOP_SOUND_KEYS.map((k) => `${k}→"${getElevenLabsPhonemeSpeakText(k)}"`);
    record("3-speak-text", "Generation hints avoid letter names (b., k., sss, mmm)", "pass", stopHints.join(", "));
  } catch (err) {
    record(
      "3-speak-text",
      "Generation hints avoid letter names",
      "fail",
      err instanceof Error ? err.message : String(err),
    );
  }
}

function checkCvcKeyMapping(): void {
  const cases: Array<[string, string[]]> = [
    ["cat", ["c", "a", "t"]],
    ["bat", ["b", "a", "t"]],
    ["sit", ["s", "i", "t"]],
  ];
  const bad = cases.filter(([word, expected]) => {
    const got = resolvePhonicsSequenceKeys(word);
    return got.join(",") !== expected.join(",");
  });

  if (bad.length > 0) {
    record("4-cvc-keys", "CVC sequences map to phoneme keys (not letter names)", "fail", bad.map(([w]) => w).join(", "));
    return;
  }

  record(
    "4-cvc-keys",
    "CVC sequences map to phoneme keys (cat→c+a+t, bat→b+a+t, sit→s+i+t)",
    "pass",
  );
}

function checkFallbackRouting(): void {
  const toneMeta: PhonicsAudioMeta = {
    key: "b",
    durationMs: 320,
    size: 900,
    source: "fallback_tone",
    quality: "needs_review",
    version: 1,
  };
  const approvedMeta: PhonicsAudioMeta = {
    key: "a",
    durationMs: 400,
    size: 1200,
    source: "elevenlabs",
    quality: "approved",
    version: 2,
  };

  const skipsTone = shouldSkipStaticClipForLearning(toneMeta);
  const playsApproved = !shouldSkipStaticClipForLearning(approvedMeta);

  if (skipsTone && playsApproved) {
    record(
      "7-fallback-routing",
      "fallback_tone clips skip static MP3 → speech synthesis at runtime",
      "pass",
    );
  } else {
    record("7-fallback-routing", "Learning-safe fallback routing", "fail", `skipTone=${skipsTone} playApproved=${playsApproved}`);
  }
}

function checkMasteringConfig(): void {
  const hasChain =
    PHONICS_MASTERING_FILTER_CHAIN.includes("silenceremove") &&
    PHONICS_MASTERING_FILTER_CHAIN.includes("loudnorm=I=-16") &&
    PHONICS_MASTERING_FILTER_CHAIN.includes("alimiter") &&
    PHONICS_MASTERING_FILTER_CHAIN.includes("afade=t=in:st=0:d=0.02");

  if (hasChain && PHONICS_OUTPUT_SAMPLE_RATE === 44100 && PHONICS_OUTPUT_CHANNELS === 1) {
    record(
      "5-6-mastering-config",
      "Mastering chain: trim → loudnorm → limiter → micro-fades; 44.1kHz mono",
      "pass",
    );
  } else {
    record("5-6-mastering-config", "Mastering chain configured", "fail");
  }
}

function checkFileIntegrity(keys: string[]): { ok: number; missing: string[]; invalid: string[] } {
  const missing: string[] = [];
  const invalid: string[] = [];
  let ok = 0;

  for (const key of keys) {
    const path = join(OUT_DIR, `${key}.mp3`);
    if (!existsSync(path)) {
      missing.push(key);
      continue;
    }
    const buf = readFileSync(path);
    const validation = validatePhonicsMp3Buffer(buf, key);
    if (!validation.ok) {
      invalid.push(`${key} (${validation.reason})`);
      continue;
    }
    ok += 1;
  }

  if (missing.length === 0 && invalid.length === 0) {
    record("1-file-integrity", `All ${keys.length} clips exist, ≥500 bytes, 250–900ms`, "pass");
  } else {
    record(
      "1-file-integrity",
      "Every catalog key has a valid MP3",
      "fail",
      `missing=${missing.length} invalid=${invalid.length}`,
    );
  }

  return { ok, missing, invalid };
}

function checkStopSounds(keys: string[]): void {
  const issues: string[] = [];
  for (const key of PHONICS_STOP_SOUND_KEYS) {
    if (!keys.includes(key)) continue;
    const path = join(OUT_DIR, `${key}.mp3`);
    if (!existsSync(path)) {
      issues.push(`${key}: missing`);
      continue;
    }
    const buf = readFileSync(path);
    const v = validatePhonicsMp3Buffer(buf, key);
    if (!v.ok || v.estimatedDurationMs > PHONICS_STOP_SOUND_MAX_DURATION_MS) {
      issues.push(`${key}: ~${v.estimatedDurationMs}ms`);
    }
  }

  if (issues.length === 0 && PHONICS_STOP_SOUND_KEYS.every((k) => existsSync(join(OUT_DIR, `${k}.mp3`)))) {
    record("2-stop-sounds", `Stop sounds (b,c,d,p,t,k) ≤ ${PHONICS_STOP_SOUND_MAX_DURATION_MS}ms`, "pass");
  } else if (issues.some((i) => i.includes("missing"))) {
    record("2-stop-sounds", "Stop sound duration validation", "fail", "missing stop sound files");
  } else if (issues.length > 0) {
    record("2-stop-sounds", "Stop sound duration validation", "fail", issues.join("; "));
  } else {
    record("2-stop-sounds", "Stop sound duration validation", "skip", "no stop sound files yet");
  }
}

function checkManifest(manifest: PhonicsAudioManifestFile | null, keys: string[]): void {
  if (!manifest) {
    record("10-manifest", "manifest.json present", "fail", "missing");
    return;
  }

  if (!manifest.keys?.length) {
    record("10-manifest-keys", "Manifest lists catalog keys", "fail", "keys array empty");
  } else if (manifest.keys.length >= keys.length) {
    record("10-manifest-keys", "Manifest lists catalog keys", "pass", `${manifest.keys.length} keys`);
  } else {
    record("10-manifest-keys", "Manifest lists catalog keys", "fail", `${manifest.keys.length}/${keys.length}`);
  }

  const clips = manifest.clips ?? {};
  const clipCount = Object.keys(clips).length;

  if (clipCount === 0) {
    record(
      "10-manifest-clips",
      "Per-clip quality metadata (v5 clips map)",
      "fail",
      "manifest v1 — re-run generate:phonics-audio for v5 metadata",
    );
    return;
  }

  const badMeta = Object.values(clips).filter((c) => c.quality === undefined || c.version < 1);
  if (badMeta.length > 0) {
    record("10-manifest-meta", "Each clip has quality + version", "fail", `${badMeta.length} incomplete`);
  } else {
    record("10-manifest-meta", "Each clip has quality + version", "pass", `${clipCount} clips`);
  }

  const fallbackClips = Object.values(clips).filter((c) => c.source === "fallback_tone");
  const fallbackNotReview = fallbackClips.filter((c) => c.quality !== "needs_review");
  if (fallbackClips.length > 0 && fallbackNotReview.length > 0) {
    record(
      "10-fallback-quality",
      "fallback_tone clips marked needs_review",
      "fail",
      fallbackNotReview.map((c) => c.key).join(", "),
    );
  } else if (fallbackClips.length > 0) {
    record(
      "10-fallback-quality",
      "fallback_tone clips marked needs_review",
      "pass",
      `${fallbackClips.length} fallback clip(s)`,
    );
  } else {
    record("10-fallback-quality", "No fallback_tone clips in catalog", "pass");
  }

  const mastering = manifest.mastering;
  if (mastering?.pipeline?.includes("afade_in_20ms") && mastering.output?.sampleRate === 44100) {
    record("10-mastering-applied", "Manifest records mastering pipeline", "pass");
  } else {
    record(
      "10-mastering-applied",
      "Manifest records mastering pipeline",
      "fail",
      "run normalize:phonics-audio after generation",
    );
  }
}

function checkOutputFormat(keys: string[]): void {
  if (!ffprobeAvailable()) {
    record("5-format-probe", "Output format 44.1kHz mono (ffprobe)", "skip", "ffprobe not installed");
    return;
  }

  const sampleKey = PHONICS_CVC_SMOKE_KEYS.find((k) => existsSync(join(OUT_DIR, `${k}.mp3`)));
  if (!sampleKey) {
    record("5-format-probe", "Output format 44.1kHz mono (ffprobe)", "skip", "no sample MP3");
    return;
  }

  const probe = probeAudioFormat(join(OUT_DIR, `${sampleKey}.mp3`));
  if (
    probe?.sampleRate === PHONICS_OUTPUT_SAMPLE_RATE &&
    probe?.channels === PHONICS_OUTPUT_CHANNELS
  ) {
    record(
      "5-format-probe",
      `Output format verified on '${sampleKey}.mp3'`,
      "pass",
      `${probe.sampleRate}Hz ${probe.channels}ch`,
    );
  } else {
    record(
      "5-format-probe",
      "Output format 44.1kHz mono",
      "fail",
      probe ? `${probe.sampleRate}Hz ${probe.channels}ch` : "probe failed",
    );
  }
}

function printReport(): void {
  const icon: Record<CheckStatus, string> = {
    pass: "✔",
    fail: "✗",
    skip: "○",
    manual: "◎",
  };

  console.log("\n[check:phonics-audio] PHONICS SANITY CHECKLIST\n");

  for (const r of results) {
    const line = `  ${icon[r.status]} [${r.id}] ${r.label}`;
    console.log(r.detail ? `${line}\n      ${r.detail}` : line);
  }

  record("3-listen", "Manual listen: b≠bee, c=k, t≠tuh, s=sss, m=mmm", "manual");
  record("4-cvc-listen", "Manual CVC blend: cat/bat/sit sound natural (not kuh-ah-tuh)", "manual");
  record("5-volume-listen", "Manual volume: a→b→c→d→e — no loud/soft jumps", "manual");
  record("6-fade-listen", "Manual fade: no click at start, no abrupt cut at end", "manual");
  record("7-fallback-device", "Manual: force static fail → speech fallback (not tone) during learning", "manual");
  record("8-cache", "Manual: first play slight delay, second play instant (IndexedDB cache)", "manual");
  record("9-device", "Manual device test: Android Chrome + iOS Safari/Capacitor — no cut-off/autoplay block", "manual");
  record("11-no-silent", "Manual: break static + cache → audio still plays via speech fallback", "manual");

  console.log("\n  Manual checks (require human/device):\n");
  for (const r of results.filter((x) => x.status === "manual")) {
    console.log(`  ◎ [${r.id}] ${r.label}`);
  }

  const failed = results.filter((r) => r.status === "fail").length;
  const passed = results.filter((r) => r.status === "pass").length;
  const manual = results.filter((r) => r.status === "manual").length;

  console.log(`\n  Automated: ${passed} pass, ${failed} fail, ${manual} manual\n`);

  if (failed > 0) {
    console.error("[check:phonics-audio] NOT production-ready — fix failures above.\n");
    console.error("  Generate: ELEVENLABS_API_KEY=... pnpm run generate:phonics-audio");
    console.error("  Master:   pnpm run normalize:phonics-audio");
    console.error("  Approve:  pnpm run approve:phonics-audio -- b c a t\n");
    process.exit(1);
  }

  console.log("[check:phonics-audio] Automated checks passed.");
  console.log("Complete manual/device checklist before shipping to production.\n");
}

function main(): void {
  if (process.env.PHONICS_AUDIO_SKIP_CHECK === "1") {
    console.log("[check:phonics-audio] skipped (PHONICS_AUDIO_SKIP_CHECK=1)");
    return;
  }

  const keys = getAllPhonicsAudioKeys();
  const manifest = loadManifest();

  checkSpeakTextHints();
  checkCvcKeyMapping();
  checkFallbackRouting();
  checkMasteringConfig();
  checkFileIntegrity(keys);
  checkStopSounds(keys);
  checkManifest(manifest, keys);
  checkOutputFormat(keys);

  const cvcReady = PHONICS_CVC_SMOKE_KEYS.every((k) => existsSync(join(OUT_DIR, `${k}.mp3`)));
  record(
    "4-cvc-files",
    `CVC smoke files (${PHONICS_CVC_SMOKE_KEYS.join("+")}) present`,
    cvcReady ? "pass" : "fail",
  );

  printReport();
}

main();
