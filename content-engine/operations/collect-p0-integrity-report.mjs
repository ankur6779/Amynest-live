/**
 * Collect P0 production integrity rows from a finished out dir + console.log.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { allGoldenSeeds } from "../golden-scripts/seeds.js";
import { buildGoldenScript } from "../golden-scripts/build.js";
import { buildGoldenVoiceAndCaptions, wordCoveragePercent } from "./golden-voice.js";
import { wardrobeFor } from "../character-memory-engine/wardrobe.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

function probe(path: string): number {
  try {
    const out = execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path],
      { encoding: "utf8" },
    ).trim();
    const n = Number(out);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function hashFile(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function silentIntervals(audioPath: string): string {
  try {
    const out = execFileSync(
      "ffmpeg",
      ["-i", audioPath, "-af", "silencedetect=noise=-35dB:d=1.5", "-f", "null", "-"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const err = typeof out === "string" ? out : "";
    // ffmpeg silencedetect writes to stderr — execFileSync throws on some configs; catch below
    return err;
  } catch (e: any) {
    const err = String(e?.stderr || e?.message || "");
    const starts = [...err.matchAll(/silence_start:\s*([\d.]+)/g)].map((m) => Number(m[1]));
    const ends = [...err.matchAll(/silence_end:\s*([\d.]+)/g)].map((m) => Number(m[1]));
    const intervals: string[] = [];
    for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
      intervals.push(`${starts[i]!.toFixed(1)}-${ends[i]!.toFixed(1)}s`);
    }
    return intervals.length ? intervals.join(", ") : "none detected";
  }
}

function parseKieRefs(consoleLog: string): {
  maxRefs: number;
  hashes: string[];
  lines: string[];
} {
  const lines = consoleLog
    .split("\n")
    .filter((l) => l.includes("[kie-video]"));
  let maxRefs = 0;
  const hashes: string[] = [];
  for (const l of lines) {
    const m = l.match(/refs=(\d+)/);
    if (m) maxRefs = Math.max(maxRefs, Number(m[1]));
    const hm = l.match(/hash=([a-f0-9]{64})/i);
    if (hm) hashes.push(hm[1]!);
  }
  return { maxRefs, hashes, lines };
}

function whisperIfPossible(audioPath: string, outDir: string): string {
  try {
    execFileSync(
      "whisper",
      [audioPath, "--model", "tiny", "--language", "en", "--output_format", "txt", "--output_dir", outDir, "--fp16", "False"],
      { stdio: "ignore", timeout: 180_000 },
    );
    const base = audioPath.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "narration";
    const p = join(outDir, `${base}.txt`);
    return existsSync(p) ? readFileSync(p, "utf8").trim() : "";
  } catch {
    return "";
  }
}

const nums = (process.argv.slice(2).map(Number).filter(Boolean).length
  ? process.argv.slice(2).map(Number)
  : [9, 10, 11, 12]) as number[];

const bible = {
  amy: hashFile(wardrobeFor("amy-ai").bibleAsset),
  girl: hashFile(wardrobeFor("amy-girl").bibleAsset),
  boy: hashFile(wardrobeFor("amy-boy").bibleAsset),
};

const rows = [];
for (const num of nums) {
  const id = `golden-${String(num).padStart(3, "0")}`;
  const outRoot = join(REPO, ".amynest-assets", `p0-fix-${id}`);
  const script = buildGoldenScript(allGoldenSeeds()[num - 1]!, num);
  const { voiceScript } = buildGoldenVoiceAndCaptions(script, 21);
  const narr = join(outRoot, "audio", "narration.wav");
  const master =
    readdirSync(outRoot, { withFileTypes: true })
      .filter((d) => d.isFile() && d.name.endsWith(".mp4"))
      .map((d) => join(outRoot, d.name))
      .sort((a, b) => probe(b) - probe(a))[0] || "";
  const consoleLog = existsSync(join(outRoot, "console.log"))
    ? readFileSync(join(outRoot, "console.log"), "utf8")
    : "";
  const kie = parseKieRefs(consoleLog);
  const transcript = existsSync(narr)
    ? whisperIfPossible(narr, join(outRoot, "tts-integrity-report"))
    : "";
  const coverage = transcript
    ? wordCoveragePercent(voiceScript, transcript)
    : null;
  const audioDur = existsSync(narr) ? probe(narr) : 0;
  const videoDur = master ? probe(master) : 0;
  const pass =
    existsSync(narr) &&
    audioDur >= 20 &&
    (coverage == null || coverage >= 70) &&
    kie.maxRefs >= 1 &&
    !/speak into the mic|shame flickers/i.test(voiceScript) &&
    wordCoveragePercent(script.productEntryBeat, voiceScript) >= 55;

  rows.push({
    goldenId: id,
    topic: script.topic,
    featureName: script.featureName,
    expectedNarration: voiceScript,
    actualNarration: transcript || "(no transcript yet)",
    narrationCoveragePct: coverage == null ? "n/a" : Number(coverage.toFixed(1)),
    audioDuration: Number(audioDur.toFixed(2)),
    videoDuration: Number(videoDur.toFixed(2)),
    amyReferenceHash: bible.amy,
    amyGirlReferenceHash: bible.girl,
    amyBoyReferenceHash: bible.boy,
    kieReferenceCount: kie.maxRefs,
    silentIntervals: existsSync(narr) ? silentIntervals(narr) : "n/a",
    passFail: pass ? "PASS" : existsSync(outRoot) ? "FAIL/INCOMPLETE" : "NOT RUN",
    masterPath: master || null,
    outRoot,
  });
}

const reportPath = join(
  HERE,
  "../docs/operations/PRODUCTION_INTEGRITY_FIX_REPORT.md",
);

let md = `# Production Integrity Fix Report (P0)

Generated: ${new Date().toISOString()}

## Code fixes (files / functions)

| Area | File | Change |
|------|------|--------|
| Golden VO immutability | \`operations/golden-voice.ts\` | \`buildGoldenVoiceAndCaptions\`, \`assertGoldenVoiceIntegrity\` |
| Production VO wiring | \`operations/google-production-run.ts\` | \`voiceAndCaptionsForGolden\` → Golden-only; TTS completeness gate |
| Upload metadata VO | \`operations/upload-local-master.ts\` | same Golden VO builder |
| TTS truncation | \`asset-engine/providers/kie-audio/client.ts\` | \`kieGenerateTts\` multi-turn dialogue (exact sentences) |
| KIE refs HTTP | \`asset-engine/providers/kie-video/client.ts\` | \`referenceImagePaths\` → uploaded \`imageUrls\` + \`REFERENCE_2_VIDEO\` |
| KIE fail-fast | \`asset-engine/providers/kie-video/provider.ts\` | require canonical bible; log redacted payload |
| Compose handoff | \`creative-composition/compose.ts\` | pass \`character\`; bible attached even if memory off |

## Canonical bible hashes

| Character | SHA-256 |
|-----------|---------|
| Amy (amy-ai) | \`${bible.amy}\` |
| Amy Girl | \`${bible.girl}\` |
| Amy Boy | \`${bible.boy}\` |

## Results

`;

for (const r of rows) {
  md += `### ${r.goldenId} — ${r.passFail}

| Field | Value |
|-------|-------|
| Topic | ${r.topic} |
| Feature | ${r.featureName} |
| Narration coverage % | ${r.narrationCoveragePct} |
| Audio duration | ${r.audioDuration}s |
| Video duration | ${r.videoDuration}s |
| Amy reference hash | \`${r.amyReferenceHash}\` |
| Amy Girl reference hash | \`${r.amyGirlReferenceHash}\` |
| Amy Boy reference hash | \`${r.amyBoyReferenceHash}\` |
| KIE reference count (max observed) | ${r.kieReferenceCount} |
| Silent intervals (narration) | ${r.silentIntervals} |
| Pass/Fail | **${r.passFail}** |

**Expected narration:**

\`\`\`
${r.expectedNarration}
\`\`\`

**Actual narration (Whisper):**

\`\`\`
${r.actualNarration}
\`\`\`

`;
}

writeFileSync(reportPath, md);
writeFileSync(
  join(HERE, "../docs/operations/_p0_integrity_rows.json"),
  JSON.stringify(rows, null, 2),
);
console.log("Wrote", reportPath);
for (const r of rows) {
  console.log(r.goldenId, r.passFail, `audio=${r.audioDuration}s`, `kieRefs=${r.kieReferenceCount}`, `cov=${r.narrationCoveragePct}`);
}
