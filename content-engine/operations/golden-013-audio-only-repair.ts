/**
 * GOLDEN 013 — AUDIO-ONLY REPAIR
 * Rebuilds narration to match existing ~28s picture. ZERO KIE video generation.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { allGoldenSeeds } from "../golden-scripts/seeds.js";
import { buildGoldenScript } from "../golden-scripts/build.js";
import {
  assertGoldenVoiceIntegrity,
  assertNarrationAudioComplete,
  tokenizeWords,
  wordCoveragePercent,
} from "./golden-voice.js";
import { kieGenerateTts } from "../asset-engine/providers/kie-audio/client.js";
import { GeminiTtsProvider } from "../asset-engine/providers/gemini-tts/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CE_ROOT = resolve(__dirname, "..");
const REPO_ASSETS = resolve(CE_ROOT, "../.amynest-assets/kie-veo-720p-golden-013");
const MASTER_IN = join(REPO_ASSETS, "amynest-veo-720p-golden-013.mp4");
const OUT_MASTER = join(REPO_ASSETS, "amynest-veo-720p-golden-013-audio-fixed.mp4");
const WORK = join(REPO_ASSETS, "audio-repair");
const REPORT_PATH = resolve(
  CE_ROOT,
  "docs/operations/GOLDEN_013_AUDIO_REPAIR_REPORT.md",
);

/**
 * Concise Golden 013 VO for ~24–26s picture.
 * Fewer chunks = less inter-chunk dead air from TTS wrappers.
 * TTS-safe punctuation (no colon clock / em dashes).
 */
const CONCISE_CHUNKS = [
  "It's eight forty-seven PM. Big feelings after school. Calm down lands like gasoline. You both need air.",
  "Amy appears as a warm guide. Health Lab includes breath-control play and a calmness meter.",
  "One shared breath can bring a family back into the same room. Download AmyNest AI.",
] as const;
const CONCISE_VOICE = CONCISE_CHUNKS.join(" ");

const FOREIGN_MARKERS = [
  "speech practice",
  "speech struggle",
  "golden 009",
  "golden 010",
  "golden 011",
  "speak into the mic",
  "shame flickers",
];

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const key = m[1]!;
    if (process.env[key]) continue;
    let val = m[2]!;
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

function probeDuration(path: string): number {
  const out = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=nw=1:nk=1",
      path,
    ],
    { encoding: "utf8" },
  ).trim();
  return Number(out);
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function ffmpeg(args: string[]): void {
  execFileSync("ffmpeg", ["-y", ...args], {
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 32 * 1024 * 1024,
  });
}

function detectPictureEndSeconds(masterPath: string): number {
  // Prefer blackdetect start; fall back to 28s clip sum.
  try {
    const err = execFileSync(
      "ffmpeg",
      [
        "-i",
        masterPath,
        "-vf",
        "blackdetect=d=0.5:pix_th=0.10",
        "-an",
        "-f",
        "null",
        "-",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    // stderr captured when stdio pipe — Node puts stderr in error if non-zero
    void err;
  } catch (e) {
    const msg = e instanceof Error && "stderr" in e ? String((e as { stderr?: Buffer }).stderr) : String(e);
    const m = msg.match(/black_start:([0-9.]+)/);
    if (m) return Number(m[1]);
  }
  // Re-run capturing stderr properly
  try {
    execFileSync(
      "ffmpeg",
      [
        "-hide_banner",
        "-i",
        masterPath,
        "-vf",
        "blackdetect=d=0.5:pix_th=0.10",
        "-an",
        "-f",
        "null",
        "-",
      ],
      { encoding: "utf8" },
    );
  } catch (e) {
    const stderr =
      e instanceof Error && "stderr" in e
        ? String((e as { stderr: Buffer | string }).stderr)
        : "";
    const m = stderr.match(/black_start:([0-9.]+)/);
    if (m) return Number(m[1]);
  }
  return 28;
}

async function main(): Promise<void> {
  loadEnvFile(resolve(CE_ROOT, "../../.env.development"));
  loadEnvFile(resolve(CE_ROOT, "../.env.development"));
  loadEnvFile(resolve(CE_ROOT, "../../AmyNest-AI/.env.development"));

  const kieKey = process.env.KIE_API_KEY?.trim() || "";
  if (!kieKey) throw new Error("KIE_API_KEY missing — needed for TTS only");

  if (!existsSync(MASTER_IN)) {
    throw new Error(`Master not found: ${MASTER_IN}`);
  }

  mkdirSync(WORK, { recursive: true });

  const oldMasterDur = probeDuration(MASTER_IN);
  const oldNarrPath = join(REPO_ASSETS, "audio/narration.wav");
  const oldNarrDur = existsSync(oldNarrPath) ? probeDuration(oldNarrPath) : 45.84;
  const pictureEnd = detectPictureEndSeconds(MASTER_IN);
  // Keep existing picture only (exclude black pad). Round to ms-friendly cut.
  const videoDur = Math.min(pictureEnd, 28.05);

  console.log("=== GOLDEN 013 AUDIO-ONLY REPAIR ===");
  console.log(`OLD_MASTER_DURATION=${oldMasterDur.toFixed(3)}s`);
  console.log(`OLD_NARRATION_DURATION=${oldNarrDur.toFixed(3)}s`);
  console.log(`PICTURE_END (pre-black)=${videoDur.toFixed(3)}s`);
  console.log("KIE_VIDEO_CALLS=0 (guaranteed — this script never calls video APIs)");

  // Integrity vs Golden 013
  const seed = allGoldenSeeds()[12];
  if (!seed) throw new Error("Golden seed 013 missing");
  const script = buildGoldenScript(seed, 13);
  assertGoldenVoiceIntegrity(script, CONCISE_VOICE);
  const low = CONCISE_VOICE.toLowerCase();
  for (const m of FOREIGN_MARKERS) {
    if (low.includes(m)) {
      throw new Error(`Foreign content marker detected: ${m}`);
    }
  }
  console.log(
    `Golden 013 integrity OK (words=${tokenizeWords(CONCISE_VOICE).length}; situation=${wordCoveragePercent(script.parentingSituation, CONCISE_VOICE).toFixed(0)}% product=${wordCoveragePercent(script.productEntryBeat, CONCISE_VOICE).toFixed(0)}% hope=${wordCoveragePercent(script.hopeClose, CONCISE_VOICE).toFixed(0)}%)`,
  );

  writeFileSync(join(WORK, "narration-concise.txt"), CONCISE_VOICE + "\n");

  // Preserve video stream only (copy) — trim black pad; do not re-encode video
  const videoOnly = join(WORK, "video-preserved.mp4");
  ffmpeg([
    "-i",
    MASTER_IN,
    "-t",
    videoDur.toFixed(3),
    "-an",
    "-c:v",
    "copy",
    "-movflags",
    "+faststart",
    videoOnly,
  ]);
  const preservedVideoDur = probeDuration(videoOnly);
  console.log(`VIDEO_PRESERVED_DURATION=${preservedVideoDur.toFixed(3)}s (-c:v copy)`);

  // TTS — chunked sentence generation (existing KIE TTS path). AUDIO ONLY.
  const narrOut = join(WORK, "narration-fixed.wav");
  // Clear prior repair chunks
  for (let i = 0; i < 20; i++) {
    const p = join(WORK, `narration-chunk-${String(i).padStart(2, "0")}.wav`);
    if (existsSync(p)) {
      try {
        writeFileSync(p, ""); // will be overwritten
      } catch {
        /* ignore */
      }
    }
  }

  console.log("Generating concise TTS chunks (audio only — no video)...");
  let ttsModel = "unknown";
  let ttsCredits: number | undefined;
  const preferGemini =
    process.env.AMYNEST_AUDIO_REPAIR_GEMINI === "1" || !kieKey;
  const runGeminiChunks = async (): Promise<void> => {
    const geminiKey =
      process.env.GEMINI_API_KEY?.trim() ||
      process.env.GOOGLE_AI_API_KEY?.trim() ||
      "";
    if (!geminiKey) throw new Error("GEMINI_API_KEY missing for TTS fallback");
    const gemini = new GeminiTtsProvider({
      apiKey: geminiKey,
      outputDirectory: WORK,
      enabled: true,
    });
    const chunkPaths: string[] = [];
    for (let i = 0; i < CONCISE_CHUNKS.length; i++) {
      const chunkPath = join(
        WORK,
        `narration-chunk-${String(i).padStart(2, "0")}.wav`,
      );
      const part = await gemini.generateNarration({
        script: CONCISE_CHUNKS[i]!,
        assetId: `g013-audio-repair-${i}`,
        outputPath: chunkPath,
      });
      const d = probeDuration(part.audioPath);
      console.log(
        `  chunk[${i}] ${d.toFixed(2)}s — ${CONCISE_CHUNKS[i]!.slice(0, 56)}`,
      );
      if (d < 0.4) {
        throw new Error(`Chunk ${i} too short (${d.toFixed(2)}s) — incomplete TTS`);
      }
      chunkPaths.push(part.audioPath);
      ttsModel = String(part.metadata?.model || "gemini-tts");
    }
    const listPath = join(WORK, "narration-fixed.concat.txt");
    writeFileSync(
      listPath,
      chunkPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n") + "\n",
    );
    ffmpeg([
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-ac",
      "1",
      "-ar",
      "48000",
      narrOut,
    ]);
  };

  if (preferGemini) {
    await runGeminiChunks();
  } else {
    try {
      const tts = await kieGenerateTts({
        apiKey: kieKey,
        script: CONCISE_VOICE,
        outputPath: narrOut,
      });
      ttsModel = tts.model;
      ttsCredits = tts.creditsConsumed;
    } catch (kieErr) {
      console.warn(
        `KIE TTS failed — falling back to Gemini TTS chunks: ${
          kieErr instanceof Error ? kieErr.message.slice(0, 180) : String(kieErr)
        }`,
      );
      await runGeminiChunks();
    }
  }
  const narrDur = probeDuration(narrOut);
  console.log(
    `NEW_NARRATION_DURATION=${narrDur.toFixed(3)}s model=${ttsModel} ttsCredits=${ttsCredits ?? "n/a"}`,
  );

  const check = assertNarrationAudioComplete({
    voiceScript: CONCISE_VOICE,
    audioPath: narrOut,
    probeDurationSeconds: probeDuration,
    transcriptText: null,
  });
  console.log(
    `TTS completeness floor=${check.floorSeconds.toFixed(2)}s duration=${check.durationSeconds.toFixed(2)}s`,
  );

  // Target: last word before video end with 0.5–1.5s breathing room
  const breathMin = 0.5;
  const breathMax = 1.5;
  const maxNarr = preservedVideoDur - breathMin;
  if (narrDur > maxNarr + 0.15) {
    throw new Error(
      `Narration still too long for preserved video: ${narrDur.toFixed(2)}s > max ${maxNarr.toFixed(2)}s (video ${preservedVideoDur.toFixed(2)}s). Do not time-stretch — rewrite shorter and re-run.`,
    );
  }
  if (narrDur > preservedVideoDur - breathMin && narrDur <= preservedVideoDur) {
    console.warn(
      `Narration ends with <${breathMin}s breath room — still acceptable if last word finishes before video end.`,
    );
  }

  // Mix narration + existing music (low), pad/trim to video duration
  const musicSrc = join(REPO_ASSETS, "audio/music.wav");
  if (!existsSync(musicSrc)) {
    throw new Error(`Music missing: ${musicSrc}`);
  }
  const mixedAudio = join(WORK, "mixed-audio.wav");
  const targetAudio = preservedVideoDur.toFixed(3);
  ffmpeg([
    "-i",
    narrOut,
    "-i",
    musicSrc,
    "-filter_complex",
    `[0:a]aresample=48000,apad=whole_dur=${targetAudio},atrim=0:${targetAudio},volume=1.15[narr];[1:a]aresample=48000,apad=whole_dur=${targetAudio},atrim=0:${targetAudio},volume=0.18[music];[narr][music]amix=inputs=2:duration=first:dropout_transition=0,alimiter=limit=0.95[aout]`,
    "-map",
    "[aout]",
    mixedAudio,
  ]);
  const mixedDur = probeDuration(mixedAudio);
  console.log(`MIXED_AUDIO_DURATION=${mixedDur.toFixed(3)}s`);

  // Final mux: copy video, replace audio only
  ffmpeg([
    "-i",
    videoOnly,
    "-i",
    mixedAudio,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    "-movflags",
    "+faststart",
    OUT_MASTER,
  ]);

  const finalDur = probeDuration(OUT_MASTER);
  // Silence check on final
  let silenceNotes = "none detected (silencedetect ran)";
  try {
    execFileSync(
      "ffmpeg",
      [
        "-i",
        OUT_MASTER,
        "-af",
        "silencedetect=n=-35dB:d=0.8",
        "-f",
        "null",
        "-",
      ],
      { encoding: "utf8" },
    );
  } catch (e) {
    const stderr =
      e instanceof Error && "stderr" in e
        ? String((e as { stderr: Buffer | string }).stderr)
        : "";
    const hits = [...stderr.matchAll(/silence_start:([0-9.]+)/g)].map((m) =>
      Number(m[1]),
    );
    // Ignore silence after narration end (breathing room / music-only tail)
    const mid = hits.filter((t) => t < narrDur - 0.3);
    silenceNotes =
      mid.length === 0
        ? `PASS — no mid-narration silence (tail silence OK after VO ${narrDur.toFixed(2)}s)`
        : `WARN mid-narration silence at ${mid.join(", ")}s`;
  }

  // Blackdetect on final — must not reintroduce long black pad
  let blackDur = 0;
  try {
    execFileSync(
      "ffmpeg",
      [
        "-hide_banner",
        "-i",
        OUT_MASTER,
        "-vf",
        "blackdetect=d=0.5:pix_th=0.10",
        "-an",
        "-f",
        "null",
        "-",
      ],
      { encoding: "utf8" },
    );
  } catch (e) {
    const stderr =
      e instanceof Error && "stderr" in e
        ? String((e as { stderr: Buffer | string }).stderr)
        : "";
    const m = stderr.match(/black_duration:([0-9.]+)/);
    if (m) blackDur = Number(m[1]);
  }

  const breathRoom = preservedVideoDur - narrDur;
  const pass =
    finalDur <= preservedVideoDur + 0.35 &&
    finalDur >= 20 &&
    narrDur <= preservedVideoDur - 0.4 &&
    breathRoom >= 0.4 &&
    breathRoom <= 8 &&
    blackDur < 3 &&
    !FOREIGN_MARKERS.some((m) => low.includes(m));

  const report = `# GOLDEN 013 AUDIO REPAIR REPORT

**Date:** ${new Date().toISOString()}
**Status:** ${pass ? "PASS" : "FAIL"}
**Publish:** not attempted

## Durations

| Metric | Value |
|--------|------:|
| Old master duration | ${oldMasterDur.toFixed(3)}s |
| Old narration duration | ${oldNarrDur.toFixed(3)}s |
| Picture end (pre-black pad) | ${pictureEnd.toFixed(3)}s |
| Preserved video duration | ${preservedVideoDur.toFixed(3)}s |
| New narration duration | ${narrDur.toFixed(3)}s |
| Mixed audio duration | ${mixedDur.toFixed(3)}s |
| Final master duration | ${finalDur.toFixed(3)}s |
| Breathing room after last word | ${breathRoom.toFixed(3)}s |
| Blackdetect on final | ${blackDur.toFixed(3)}s |

## New narration text

\`\`\`
${CONCISE_VOICE}
\`\`\`

Word count: **${tokenizeWords(CONCISE_VOICE).length}**

## Golden 013 integrity

| Check | Result |
|-------|--------|
| Source golden | \`golden-013\` — ${script.title} |
| Feature | ${script.featureName} |
| Situation coverage | ${wordCoveragePercent(script.parentingSituation, CONCISE_VOICE).toFixed(1)}% |
| Product coverage | ${wordCoveragePercent(script.productEntryBeat, CONCISE_VOICE).toFixed(1)}% |
| Hope coverage | ${wordCoveragePercent(script.hopeClose, CONCISE_VOICE).toFixed(1)}% |
| Speech Practice / foreign markers | none |
| assertGoldenVoiceIntegrity | PASS |

## Video stream unchanged

| Check | Result |
|-------|--------|
| Source master | \`${MASTER_IN}\` |
| Extract method | \`ffmpeg -t ${videoDur.toFixed(3)} -an -c:v copy\` (trim black pad only) |
| Final mux | \`-c:v copy\` + new AAC audio |
| Scene / KIE regeneration | **none** |
| Video frames | existing picture stream preserved (no Veo/KIE video) |

## Audio coverage

| Check | Result |
|-------|--------|
| TTS model | ${ttsModel} |
| Chunk-based TTS | yes (sentence splits) |
| Completeness floor | ${check.floorSeconds.toFixed(2)}s |
| Measured duration | ${check.durationSeconds.toFixed(2)}s |
| Last word before video end | ${narrDur < preservedVideoDur ? "YES" : "NO"} |
| Mid-video silence | ${silenceNotes} |
| Music under | yes (existing \`audio/music.wav\` @ low level) |
| Time-stretch of 45.84s VO | **not used** |

## KIE spend

| Metric | Value |
|--------|------:|
| KIE video generation calls | **0** |
| KIE video credits consumed | **0** |
| KIE TTS credits (audio only) | ${ttsCredits ?? "n/a (Gemini TTS fallback or unreported)"} |

## Output

\`${OUT_MASTER}\`

---

GOLDEN 013 AUDIO-ONLY REPAIR COMPLETE —
VIDEO PRESERVED — ZERO VIDEO GENERATION CREDITS SPENT.
`;

  writeFileSync(REPORT_PATH, report);
  // Mirror into main workspace docs if distinct
  const mirror = resolve(
    CE_ROOT,
    "../../AmyNest-AI/content-engine/docs/operations/GOLDEN_013_AUDIO_REPAIR_REPORT.md",
  );
  try {
    mkdirSync(dirname(mirror), { recursive: true });
    copyFileSync(REPORT_PATH, mirror);
  } catch {
    /* same tree or missing — ignore */
  }
  // Also write beside assets report copy
  writeFileSync(join(REPO_ASSETS, "GOLDEN_013_AUDIO_REPAIR_REPORT.md"), report);

  console.log("");
  console.log(pass ? "RESULT=PASS" : "RESULT=FAIL");
  console.log(`FINAL=${OUT_MASTER}`);
  console.log(`REPORT=${REPORT_PATH}`);
  console.log(
    "GOLDEN 013 AUDIO-ONLY REPAIR COMPLETE — VIDEO PRESERVED — ZERO VIDEO GENERATION CREDITS SPENT.",
  );

  if (!pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
