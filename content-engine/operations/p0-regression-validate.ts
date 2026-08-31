/**
 * Hard validation for P0 regression masters (009–012).
 * Evidence only — does not modify production path.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { allGoldenSeeds } from "../golden-scripts/seeds.js";
import { buildGoldenScript } from "../golden-scripts/build.js";
import {
  buildGoldenVoiceAndCaptions,
  tokenizeWords,
  wordCoveragePercent,
} from "./golden-voice.js";
import { wardrobeFor } from "../character-memory-engine/wardrobe.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const ASSETS = join(REPO, ".amynest-assets");

function probe(path: string): number {
  try {
    const out = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        path,
      ],
      { encoding: "utf8" },
    ).trim();
    return Number(out) || 0;
  } catch {
    return 0;
  }
}

function hasAudioStream(path: string): boolean {
  try {
    const out = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-select_streams",
        "a",
        "-show_entries",
        "stream=codec_type",
        "-of",
        "csv=p=0",
        path,
      ],
      { encoding: "utf8" },
    ).trim();
    return /audio/i.test(out);
  } catch {
    return false;
  }
}

function silentIntervals(audioPath: string): { intervals: string[]; materialGap: boolean } {
  let err = "";
  try {
    execFileSync(
      "ffmpeg",
      ["-i", audioPath, "-af", "silencedetect=noise=-35dB:d=1.2", "-f", "null", "-"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (e: any) {
    err = String(e?.stderr || "");
  }
  const starts = [...err.matchAll(/silence_start:\s*([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...err.matchAll(/silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/g)];
  const intervals: string[] = [];
  let materialGap = false;
  for (let i = 0; i < starts.length; i++) {
    const endMatch = ends[i];
    const start = starts[i]!;
    const end = endMatch ? Number(endMatch[1]) : start;
    const dur = endMatch ? Number(endMatch[2]) : 0;
    // Ignore trailing silence after narration end / leading pad < 1.5s
    if (dur >= 2.0 && start > 1.0) {
      materialGap = true;
      intervals.push(`${start.toFixed(1)}-${end.toFixed(1)}s (${dur.toFixed(1)}s)`);
    }
  }
  return { intervals, materialGap };
}

function whisper(audioPath: string, outDir: string): string {
  mkdirSync(outDir, { recursive: true });
  try {
    execFileSync(
      "whisper",
      [
        audioPath,
        "--model",
        "tiny",
        "--language",
        "en",
        "--output_format",
        "txt",
        "--output_dir",
        outDir,
        "--fp16",
        "False",
      ],
      { stdio: "ignore", timeout: 180_000 },
    );
    const base = audioPath.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "narration";
    const p = join(outDir, `${base}.txt`);
    return existsSync(p) ? readFileSync(p, "utf8").trim() : "";
  } catch {
    return "";
  }
}

function sentenceCoverage(expected: string, actual: string): number {
  const sentences = expected
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
  if (!sentences.length) return 0;
  let hit = 0;
  const act = actual.toLowerCase();
  for (const s of sentences) {
    const tokens = tokenizeWords(s).slice(0, 6);
    const ok = tokens.filter((t) => act.includes(t)).length >= Math.min(4, tokens.length);
    if (ok) hit += 1;
  }
  return (100 * hit) / sentences.length;
}

function missingUnexpected(expected: string, actual: string): {
  missing: string[];
  unexpected: string[];
} {
  const exp = new Set(tokenizeWords(expected).filter((w) => w.length > 2));
  const act = new Set(tokenizeWords(actual).filter((w) => w.length > 2));
  const missing = [...exp].filter((w) => !act.has(w)).slice(0, 40);
  const unexpected = [...act].filter((w) => !exp.has(w)).slice(0, 40);
  return { missing, unexpected };
}

function parseKie(consoleLog: string): {
  maxRefs: number;
  hashesSeen: string[];
  memoryFrameSent: boolean;
  bibleHashesSeen: string[];
  lines: number;
} {
  const lines = consoleLog.split("\n").filter((l) => l.includes("[kie-video]"));
  let maxRefs = 0;
  const hashesSeen: string[] = [];
  let memoryFrameSent = false;
  for (const l of lines) {
    const m = l.match(/refs=(\d+)/);
    if (m) maxRefs = Math.max(maxRefs, Number(m[1]));
    const hm = l.match(/hash=([a-f0-9]{64})/i);
    if (hm) hashesSeen.push(hm[1]!);
    if (/character-memory|last\.png/i.test(l)) memoryFrameSent = true;
  }
  return {
    maxRefs,
    hashesSeen: [...new Set(hashesSeen)],
    memoryFrameSent,
    bibleHashesSeen: [],
    lines: lines.length,
  };
}

function extractFrames(master: string, outDir: string, duration: number): string[] {
  mkdirSync(outDir, { recursive: true });
  const times = [
    { name: "first", t: 0.3 },
    { name: "middle", t: Math.max(1, duration * 0.45) },
    { name: "story-final", t: Math.max(1, duration - 8) },
    { name: "cta", t: Math.max(1, duration - 2) },
  ];
  const paths: string[] = [];
  for (const { name, t } of times) {
    const out = join(outDir, `${name}.jpg`);
    try {
      execFileSync(
        "ffmpeg",
        ["-y", "-ss", String(t), "-i", master, "-frames:v", "1", "-q:v", "2", out],
        { stdio: "ignore" },
      );
      if (existsSync(out)) paths.push(out);
    } catch {
      /* skip */
    }
  }
  return paths;
}

function findMaster(outRoot: string): string | null {
  if (!existsSync(outRoot)) return null;
  const files = readdirSync(outRoot).filter((f) => f.endsWith(".mp4"));
  if (!files.length) return null;
  return join(outRoot, files.sort((a, b) => probe(join(outRoot, b)) - probe(join(outRoot, a)))[0]!);
}

function resolveOutDir(num: number): string {
  const id = String(num).padStart(3, "0");
  const regression = join(ASSETS, `p0-regression-golden-${id}`);
  const prior = join(ASSETS, `p0-fix-golden-${id}`);
  if (existsSync(join(regression, "console.log")) || findMaster(regression)) return regression;
  return prior;
}

const nums = (process.argv.slice(2).map(Number).filter(Boolean).length
  ? process.argv.slice(2).map(Number)
  : [9, 10, 11, 12]) as number[];

const bible = {
  amy: createHash("sha256").update(readFileSync(wardrobeFor("amy-ai").bibleAsset)).digest("hex"),
  girl: createHash("sha256").update(readFileSync(wardrobeFor("amy-girl").bibleAsset)).digest("hex"),
  boy: createHash("sha256").update(readFileSync(wardrobeFor("amy-boy").bibleAsset)).digest("hex"),
};

const rows = [];
for (const num of nums) {
  const script = buildGoldenScript(allGoldenSeeds()[num - 1]!, num);
  const { voiceScript, captions } = buildGoldenVoiceAndCaptions(script, 21);
  const outRoot = resolveOutDir(num);
  const narr = join(outRoot, "audio", "narration.wav");
  const master = findMaster(outRoot);
  const consoleLog = existsSync(join(outRoot, "console.log"))
    ? readFileSync(join(outRoot, "console.log"), "utf8")
    : "";
  const kie = parseKie(consoleLog);
  kie.bibleHashesSeen = kie.hashesSeen.filter(
    (h) => h === bible.amy || h === bible.girl || h === bible.boy,
  );

  const stopForeign =
    /speak into the mic|shame flickers/i.test(voiceScript) && script.number !== 6;

  let transcript = "";
  let wordCov = 0;
  let sentCov = 0;
  let missing: string[] = [];
  let unexpected: string[] = [];
  let silence = { intervals: [] as string[], materialGap: false };
  let audioDur = 0;
  let videoDur = 0;
  let audioStream = false;
  let frames: string[] = [];

  if (existsSync(narr)) {
    audioDur = probe(narr);
    silence = silentIntervals(narr);
    transcript = whisper(narr, join(outRoot, "regression-whisper"));
    wordCov = wordCoveragePercent(voiceScript, transcript);
    sentCov = sentenceCoverage(voiceScript, transcript);
    ({ missing, unexpected } = missingUnexpected(voiceScript, transcript));
  }
  if (master) {
    videoDur = probe(master);
    audioStream = hasAudioStream(master);
    frames = extractFrames(master, join(outRoot, "regression-frames"), videoDur);
  }

  const amyOnWire = kie.hashesSeen.includes(bible.amy);
  const girlOnWire = kie.hashesSeen.includes(bible.girl);
  const boyOnWire = kie.hashesSeen.includes(bible.boy);
  const kieVerified = kie.maxRefs >= 1 && kie.bibleHashesSeen.length >= 1;

  const ttsOk = audioDur >= 20 && wordCov >= 70 && !silence.materialGap && !stopForeign;
  const masterOk = Boolean(master) && videoDur >= audioDur * 0.9 && audioStream;
  const p0Ok = ttsOk && kieVerified && !stopForeign;

  let final: "PASS" | "FAIL" | "PARTIAL" = "FAIL";
  if (p0Ok && masterOk) final = "PASS";
  else if (p0Ok) final = "PARTIAL";

  // STOP conditions for report
  const stopReasons: string[] = [];
  if (stopForeign) stopReasons.push("Golden narration mutated to Speech Practice");
  if (existsSync(narr) && audioDur < 20) stopReasons.push("TTS incomplete");
  if (silence.materialGap) stopReasons.push("material silent gap in narration");
  if (kie.lines > 0 && !kieVerified) stopReasons.push("canonical character ref missing from KIE payload");
  if (kie.lines > 0 && kie.maxRefs < 1) stopReasons.push("KIE received no imageUrls");

  rows.push({
    golden: script.id,
    topic: script.topic,
    featureName: script.featureName,
    outRoot,
    p0Status: p0Ok ? "PASS" : "FAIL",
    ttsStatus: ttsOk ? "PASS" : existsSync(narr) ? "FAIL" : "MISSING",
    transcriptCoverageWord: Number(wordCov.toFixed(1)),
    transcriptCoverageSentence: Number(sentCov.toFixed(1)),
    missingWords: missing,
    unexpectedWords: unexpected,
    audioDuration: Number(audioDur.toFixed(2)),
    videoDuration: Number(videoDur.toFixed(2)),
    audioStreamOnMaster: audioStream,
    silentIntervals: silence.intervals.length ? silence.intervals.join("; ") : "none material",
    materialSilentGap: silence.materialGap,
    amyRefHash: bible.amy,
    amyGirlRefHash: bible.girl,
    amyBoyRefHash: bible.boy,
    amyOnWire,
    girlOnWire,
    boyOnWire,
    kieRequestVerified: kieVerified,
    kieRefCount: kie.maxRefs,
    kieImageUrlsMax: kie.maxRefs,
    sceneMemoryOnWire: kie.memoryFrameSent,
    veoGenerationStatus: master
      ? "COMPLETE"
      : kie.lines > 0
        ? "INCOMPLETE_AFTER_REFS"
        : "NOT_RUN",
    finalPassFail: final,
    stopReasons,
    expectedNarration: voiceScript,
    actualTranscript: transcript || "(none)",
    captionsSample: captions.map((c) => c.text),
    frames,
    masterPath: master,
  });
}

const reportPath = join(HERE, "../docs/operations/PRODUCTION_INTEGRITY_FIX_REPORT.md");
const existing = existsSync(reportPath) ? readFileSync(reportPath, "utf8") : "";
const withoutRegression = existing.replace(
  /\n## Regression re-test[\s\S]*$/m,
  "",
);

let section = `\n## Regression re-test (${new Date().toISOString()})\n\n`;
section += `| Golden | P0 | TTS | Transcript % | Audio | Video | Silent gaps | Amy on wire | Girl on wire | Boy on wire | KIE verified | Veo | Final |\n`;
section += `|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
for (const r of rows) {
  section += `| ${r.golden} | ${r.p0Status} | ${r.ttsStatus} | ${r.transcriptCoverageWord}% / ${r.transcriptCoverageSentence}% sent | ${r.audioDuration}s | ${r.videoDuration}s | ${r.silentIntervals} | ${r.amyOnWire} | ${r.girlOnWire} | ${r.boyOnWire} | ${r.kieRequestVerified} (refs=${r.kieRefCount}) | ${r.veoGenerationStatus} | **${r.finalPassFail}** |\n`;
}

section += `\n### Canonical reference hashes\n\n`;
section += `- Amy: \`${bible.amy}\`\n`;
section += `- Amy Girl: \`${bible.girl}\`\n`;
section += `- Amy Boy: \`${bible.boy}\`\n\n`;

for (const r of rows) {
  section += `### ${r.golden} — ${r.finalPassFail}\n\n`;
  section += `| Field | Value |\n|---|---|\n`;
  section += `| Topic | ${r.topic} |\n`;
  section += `| Feature | ${r.featureName} |\n`;
  section += `| P0 status | ${r.p0Status} |\n`;
  section += `| TTS status | ${r.ttsStatus} |\n`;
  section += `| Word coverage | ${r.transcriptCoverageWord}% |\n`;
  section += `| Sentence coverage | ${r.transcriptCoverageSentence}% |\n`;
  section += `| Audio duration | ${r.audioDuration}s |\n`;
  section += `| Video duration | ${r.videoDuration}s |\n`;
  section += `| Master has audio stream | ${r.audioStreamOnMaster} |\n`;
  section += `| Silent intervals | ${r.silentIntervals} |\n`;
  section += `| Amy on KIE wire | ${r.amyOnWire} |\n`;
  section += `| Girl on KIE wire | ${r.girlOnWire} |\n`;
  section += `| Boy on KIE wire | ${r.boyOnWire} |\n`;
  section += `| KIE request verified | ${r.kieRequestVerified} (max imageUrls=${r.kieImageUrlsMax}) |\n`;
  section += `| Scene-memory frame on wire | ${r.sceneMemoryOnWire} |\n`;
  section += `| Veo generation | ${r.veoGenerationStatus} |\n`;
  section += `| Frames | ${(r.frames || []).map((f) => f.split("/").pop()).join(", ") || "n/a"} |\n`;
  section += `| Stop reasons | ${r.stopReasons.length ? r.stopReasons.join("; ") : "none"} |\n`;
  section += `| Final | **${r.finalPassFail}** |\n\n`;
  section += `**Missing words (sample):** ${r.missingWords.slice(0, 15).join(", ") || "none"}\n\n`;
  section += `**Unexpected words (sample):** ${r.unexpectedWords.slice(0, 15).join(", ") || "none"}\n\n`;
  section += `**Expected narration:**\n\n\`\`\`\n${r.expectedNarration}\n\`\`\`\n\n`;
  section += `**Whisper transcript:**\n\n\`\`\`\n${r.actualTranscript}\n\`\`\`\n\n`;
}

writeFileSync(reportPath, withoutRegression.trimEnd() + "\n" + section);
writeFileSync(
  join(HERE, "../docs/operations/_p0_regression_rows.json"),
  JSON.stringify({ bible, rows }, null, 2),
);
console.log("Updated", reportPath);
for (const r of rows) {
  console.log(
    r.golden,
    r.finalPassFail,
    `tts=${r.ttsStatus}`,
    `cov=${r.transcriptCoverageWord}%`,
    `a=${r.audioDuration}s`,
    `v=${r.videoDuration}s`,
    `kie=${r.kieRefCount}`,
    `mem=${r.sceneMemoryOnWire}`,
    r.stopReasons.join("|") || "ok",
  );
}
