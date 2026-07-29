/**
 * Probe the FINAL MP4 with ffprobe/ffmpeg/tesseract.
 * Fail-closed: any probe failure → incomplete evidence (INCONCLUSIVE).
 */

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveBrandAssetPath } from "../../brand/assets-resolver.js";
import { getBrandIdentityKit } from "../../brand/identity.js";
import { EVIDENCE_THRESHOLDS } from "./thresholds.js";
import type {
  AudioProbe,
  CharacterProbe,
  ComplianceProbe,
  MediaEvidenceReport,
  OcrFrameSample,
  OcrProbe,
  TemplateMatchProbe,
  VisualProbe,
} from "./types.js";
import { MEDIA_EVIDENCE_VERSION } from "./types.js";

function run(
  bin: string,
  args: string[],
  options?: { ignoreError?: boolean },
): { ok: boolean; stdout: string; stderr: string } {
  // spawnSync keeps stderr on success — required for volumedetect/blackdetect.
  const result = spawnSync(bin, args, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  const stdout = String(result.stdout ?? "");
  const stderr = String(result.stderr ?? "");
  if (result.status === 0) {
    return { ok: true, stdout, stderr };
  }
  if (options?.ignoreError) {
    return { ok: false, stdout, stderr };
  }
  // ffmpeg -f null analysis often exits 0; if not, still return stderr for parsers.
  if (stderr.trim().length > 0) {
    return { ok: true, stdout, stderr };
  }
  return {
    ok: false,
    stdout,
    stderr: stderr || result.error?.message || `exit ${result.status}`,
  };
}

function parseJsonSafe(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function probeAudio(videoPath: string): AudioProbe {
  const streams = run("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "a:0",
    "-show_entries",
    "stream=codec_name,sample_rate,channels",
    "-of",
    "json",
    videoPath,
  ]);
  const parsed = parseJsonSafe(streams.stdout);
  const streamList = (parsed?.streams as Array<Record<string, unknown>>) ?? [];
  const a0 = streamList[0];
  if (!a0) {
    return {
      hasAudioStream: false,
      meanVolumeDb: null,
      maxVolumeDb: null,
      silenceRatio: null,
      silentTrack: true,
      speechLikely: false,
      musicLikely: false,
      duckingLikely: false,
      probeError: "No audio stream in final MP4",
    };
  }

  const vol = run(
    "ffmpeg",
    ["-i", videoPath, "-af", "volumedetect", "-f", "null", "-"],
    { ignoreError: true },
  );
  const volText = `${vol.stderr}\n${vol.stdout}`;
  const meanM = /mean_volume:\s*([-\d.]+)\s*dB/i.exec(volText);
  const maxM = /max_volume:\s*([-\d.]+)\s*dB/i.exec(volText);
  const meanVolumeDb = meanM ? Number(meanM[1]) : null;
  const maxVolumeDb = maxM ? Number(maxM[1]) : null;

  const durProbe = run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    videoPath,
  ]);
  const durationSec = Number(durProbe.stdout.trim()) || 0;

  const silence = run(
    "ffmpeg",
    [
      "-i",
      videoPath,
      "-af",
      "silencedetect=noise=-45dB:d=0.35",
      "-f",
      "null",
      "-",
    ],
    { ignoreError: true },
  );
  const silenceText = `${silence.stderr}\n${silence.stdout}`;
  let silenceTotal = 0;
  const silenceStarts: number[] = [];
  const silenceEnds: number[] = [];
  for (const line of silenceText.split("\n")) {
    const s = /silence_start:\s*([-\d.]+)/i.exec(line);
    if (s) silenceStarts.push(Number(s[1]));
    const e = /silence_end:\s*([-\d.]+).*silence_duration:\s*([-\d.]+)/i.exec(
      line,
    );
    if (e) {
      silenceEnds.push(Number(e[1]));
      silenceTotal += Number(e[2]);
    }
  }
  const silenceRatio =
    durationSec > 0 ? Math.min(1, silenceTotal / durationSec) : null;

  const silentTrack =
    meanVolumeDb == null ||
    meanVolumeDb <= -70 ||
    (maxVolumeDb != null && maxVolumeDb <= -70);

  const speechLikely =
    !silentTrack &&
    meanVolumeDb != null &&
    meanVolumeDb >= EVIDENCE_THRESHOLDS.minMeanVolumeDb &&
    silenceRatio != null &&
    silenceRatio < EVIDENCE_THRESHOLDS.maxSilenceRatio;

  // Music bed: energy present and not collapsing to full silence windows.
  const musicLikely =
    !silentTrack &&
    meanVolumeDb != null &&
    meanVolumeDb >= EVIDENCE_THRESHOLDS.musicFloorDb &&
    (silenceRatio == null || silenceRatio < 0.85);

  // Ducking heuristic: speech+music present, peaks not slamming 0 dBFS,
  // and mean not equal to max (flat unducked bed/clip).
  const duckingLikely =
    speechLikely &&
    musicLikely &&
    meanVolumeDb != null &&
    maxVolumeDb != null &&
    maxVolumeDb < -0.3 &&
    meanVolumeDb < maxVolumeDb - 3;

  return {
    hasAudioStream: true,
    codec: String(a0.codec_name ?? ""),
    sampleRate: Number(a0.sample_rate) || undefined,
    channels: Number(a0.channels) || undefined,
    meanVolumeDb,
    maxVolumeDb,
    silenceRatio,
    silentTrack,
    speechLikely,
    musicLikely,
    duckingLikely,
  };
}

function probeVisual(videoPath: string): VisualProbe {
  const meta = run("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height,avg_frame_rate,codec_name,nb_frames",
    "-show_entries",
    "format=duration",
    "-of",
    "json",
    videoPath,
  ]);
  if (!meta.ok) {
  return {
    width: null,
    height: null,
    durationSec: null,
    fps: null,
    blackSeconds: null,
    freezeSeconds: null,
    sceneChangeCount: null,
    frameCount: null,
    meanLuma: null,
    corrupt: true,
    probeError: meta.stderr || "ffprobe failed",
  };
  }
  const parsed = parseJsonSafe(meta.stdout);
  const stream = (
    (parsed?.streams as Array<Record<string, unknown>>) ?? []
  )[0];
  const format = (parsed?.format as Record<string, unknown>) ?? {};
  if (!stream) {
    return {
      width: null,
      height: null,
      durationSec: null,
      fps: null,
      blackSeconds: null,
      freezeSeconds: null,
      sceneChangeCount: null,
      frameCount: null,
      meanLuma: null,
      corrupt: true,
      probeError: "No video stream",
    };
  }

  const width = Number(stream.width) || null;
  const height = Number(stream.height) || null;
  const durationSec = Number(format.duration) || null;
  const rate = String(stream.avg_frame_rate ?? "0/1");
  const [n, d] = rate.split("/").map(Number);
  const fps = d ? n / d : null;
  const frameCount =
    Number(stream.nb_frames) ||
    (durationSec && fps ? Math.round(durationSec * fps) : null);

  const black = run(
    "ffmpeg",
    [
      "-i",
      videoPath,
      "-vf",
      "blackdetect=d=0.1:pix_th=0.10",
      "-an",
      "-f",
      "null",
      "-",
    ],
    { ignoreError: true },
  );
  const blackText = `${black.stderr}\n${black.stdout}`;
  let blackSeconds = 0;
  for (const m of blackText.matchAll(/black_duration:([-\d.]+)/gi)) {
    blackSeconds += Number(m[1]);
  }

  const freeze = run(
    "ffmpeg",
    [
      "-i",
      videoPath,
      "-vf",
      "freezedetect=n=-60dB:d=0.5",
      "-an",
      "-f",
      "null",
      "-",
    ],
    { ignoreError: true },
  );
  const freezeText = `${freeze.stderr}\n${freeze.stdout}`;
  let freezeSeconds = 0;
  for (const m of freezeText.matchAll(/freeze_duration:\s*([-\d.]+)/gi)) {
    freezeSeconds += Number(m[1]);
  }

  const scenes = run(
    "ffmpeg",
    [
      "-i",
      videoPath,
      "-vf",
      "select='gt(scene,0.25)',showinfo",
      "-an",
      "-f",
      "null",
      "-",
    ],
    { ignoreError: true },
  );
  const sceneChangeCount = (
    `${scenes.stderr}\n${scenes.stdout}`.match(/Parsed_showinfo/g) ?? []
  ).length;

  return {
    width,
    height,
    durationSec,
    fps,
    codec: String(stream.codec_name ?? ""),
    blackSeconds,
    freezeSeconds,
    sceneChangeCount,
    frameCount,
    meanLuma: null,
    corrupt: false,
  };
}

function extractFrames(
  videoPath: string,
  workDir: string,
  durationSec: number,
): { full: string[]; caption: string[]; endcard: string[]; times: number[] } {
  const frameDir = join(workDir, "frames");
  mkdirSync(frameDir, { recursive: true });
  const times: number[] = [];
  const step = Math.max(1, Math.min(2.5, durationSec / 8));
  for (let t = 0.4; t < Math.max(1, durationSec - 0.2); t += step) {
    times.push(Number(t.toFixed(2)));
  }
  // Always sample early hook + late end card.
  times.unshift(0.3, 1.0, 2.5);
  times.push(Math.max(0.5, durationSec - 2.2), Math.max(0.5, durationSec - 1.0));
  const uniqueTimes = [...new Set(times.map((t) => Number(t.toFixed(2))))]
    .filter((t) => t >= 0 && t <= durationSec)
    .sort((a, b) => a - b)
    .slice(0, 14);

  const full: string[] = [];
  const caption: string[] = [];
  const endcard: string[] = [];

  for (let i = 0; i < uniqueTimes.length; i++) {
    const t = uniqueTimes[i]!;
    const fullPath = join(frameDir, `full_${i}.png`);
    const capPath = join(frameDir, `cap_${i}.png`);
    run(
      "ffmpeg",
      [
        "-y",
        "-ss",
        String(t),
        "-i",
        videoPath,
        "-frames:v",
        "1",
        "-q:v",
        "2",
        fullPath,
      ],
      { ignoreError: true },
    );
    if (existsSync(fullPath)) full.push(fullPath);

    run(
      "ffmpeg",
      [
        "-y",
        "-ss",
        String(t),
        "-i",
        videoPath,
        "-frames:v",
        "1",
        "-vf",
        "crop=iw:ih*0.32:0:ih*0.68",
        "-q:v",
        "2",
        capPath,
      ],
      { ignoreError: true },
    );
    if (existsSync(capPath)) caption.push(capPath);

    if (t >= durationSec - 3.2) {
      const endPath = join(frameDir, `end_${i}.png`);
      run(
        "ffmpeg",
        [
          "-y",
          "-ss",
          String(t),
          "-i",
          videoPath,
          "-frames:v",
          "1",
          "-q:v",
          "2",
          endPath,
        ],
        { ignoreError: true },
      );
      if (existsSync(endPath)) endcard.push(endPath);
    }
  }

  return { full, caption, endcard, times: uniqueTimes };
}

function ocrImage(path: string): string {
  const result = run(
    "tesseract",
    [path, "stdout", "--psm", "6", "-l", "eng"],
    { ignoreError: true },
  );
  if (!result.ok && !result.stdout.trim()) return "";
  return result.stdout.replace(/\s+/g, " ").trim();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
}

function overlapRatio(a: string, b: string): number {
  const A = new Set(tokenize(a));
  const B = new Set(tokenize(b));
  if (A.size === 0 || B.size === 0) return 0;
  let hit = 0;
  for (const w of A) if (B.has(w)) hit++;
  return hit / A.size;
}

function probeOcr(
  frames: ReturnType<typeof extractFrames>,
  transcript: string,
  captions: Array<{ start: number; end: number; text: string }>,
): OcrProbe {
  const tess = run("tesseract", ["--version"], { ignoreError: true });
  if (!tess.ok && !/tesseract/i.test(tess.stderr + tess.stdout)) {
    return {
      available: false,
      frames: [],
      fullText: "",
      captionText: "",
      endCardText: "",
      transcriptOverlap: null,
      subtitleCoverage: null,
      error: "tesseract CLI unavailable — subtitle/OCR gates INCONCLUSIVE",
    };
  }

  const samples: OcrFrameSample[] = [];
  const fullParts: string[] = [];
  const capParts: string[] = [];
  const endParts: string[] = [];

  frames.full.forEach((path, i) => {
    const text = ocrImage(path);
    const ts = frames.times[i] ?? i;
    samples.push({
      timestampSec: ts,
      frameNumber: i,
      path,
      text,
      region: "full",
    });
    if (text) fullParts.push(text);
  });
  frames.caption.forEach((path, i) => {
    const text = ocrImage(path);
    const ts = frames.times[i] ?? i;
    samples.push({
      timestampSec: ts,
      frameNumber: i,
      path,
      text,
      region: "caption",
    });
    if (text) capParts.push(text);
  });
  frames.endcard.forEach((path, i) => {
    const text = ocrImage(path);
    samples.push({
      timestampSec: frames.times[frames.times.length - 1] ?? 0,
      frameNumber: 9000 + i,
      path,
      text,
      region: "endcard",
    });
    if (text) endParts.push(text);
  });

  const fullText = fullParts.join(" ");
  const captionText = capParts.join(" ");
  const endCardText = endParts.join(" ");
  const ocrAll = `${fullText} ${captionText} ${endCardText}`;
  const transcriptOverlap = transcript
    ? overlapRatio(transcript, ocrAll)
    : null;

  let covered = 0;
  for (const cue of captions) {
    const cueWords = tokenize(cue.text);
    if (cueWords.length === 0) continue;
    const hit = cueWords.some((w) => ocrAll.toLowerCase().includes(w));
    if (hit) covered++;
  }
  const subtitleCoverage =
    captions.length > 0 ? covered / captions.length : null;

  return {
    available: true,
    frames: samples,
    fullText,
    captionText,
    endCardText,
    transcriptOverlap,
    subtitleCoverage,
  };
}

function histogramSignature(imagePath: string, workDir: string): number[] | null {
  const out = join(workDir, `hist_${Buffer.from(imagePath).toString("hex").slice(0, 24)}.txt`);
  // Downscale + dump raw RGB for a cheap palette signature.
  const raw = join(workDir, `raw_${Buffer.from(imagePath).toString("hex").slice(0, 16)}.rgb`);
  const scaled = run(
    "ffmpeg",
    [
      "-y",
      "-i",
      imagePath,
      "-vf",
      "scale=32:32",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgb24",
      raw,
    ],
    { ignoreError: true },
  );
  if (!scaled.ok && !existsSync(raw)) return null;
  try {
    const buf = readFileSync(raw);
    const bins = new Array<number>(24).fill(0);
    for (let i = 0; i + 2 < buf.length; i += 3) {
      const r = buf[i]! >> 6;
      const g = buf[i + 1]! >> 6;
      const b = buf[i + 2]! >> 6;
      bins[r] += 1;
      bins[4 + g] += 1;
      bins[8 + b] += 1;
      // purple-ish accent bins
      if (buf[i + 2]! > buf[i]! && buf[i]! > 40) bins[12 + (buf[i + 2]! >> 6)] += 1;
      if (buf[i + 1]! > 160 && buf[i]! > 140) bins[16 + (buf[i + 1]! >> 6)] += 1;
      bins[20 + ((buf[i]! + buf[i + 1]! + buf[i + 2]!) % 4)] += 1;
    }
    writeFileSync(out, bins.join(","));
    const sum = bins.reduce((a, b) => a + b, 0) || 1;
    return bins.map((v) => v / sum);
  } catch {
    return null;
  }
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function probeCharacter(
  framePaths: string[],
  workDir: string,
): CharacterProbe {
  const kit = getBrandIdentityKit();
  const refs: Record<string, string> = {
    "amy-ai": kit.characters["amy-ai"].bibleAsset,
    "amy-girl": kit.characters["amy-girl"].bibleAsset,
    "amy-boy": kit.characters["amy-boy"].bibleAsset,
  };
  const refSigs: Record<string, number[]> = {};
  for (const [id, path] of Object.entries(refs)) {
    if (!existsSync(path)) continue;
    const sig = histogramSignature(path, workDir);
    if (sig) refSigs[id] = sig;
  }
  if (Object.keys(refSigs).length === 0) {
    return {
      samplesCompared: 0,
      bestSimilarity: null,
      bestCharacterId: null,
      perCharacter: {},
      error: "Character bible assets missing — character gate INCONCLUSIVE",
    };
  }

  const perCharacter: Record<string, number> = {
    "amy-ai": 0,
    "amy-girl": 0,
    "amy-boy": 0,
  };
  let bestSimilarity = 0;
  let bestCharacterId: string | null = null;
  let samplesCompared = 0;

  for (const frame of framePaths.slice(0, 10)) {
    const sig = histogramSignature(frame, workDir);
    if (!sig) continue;
    samplesCompared++;
    for (const [id, ref] of Object.entries(refSigs)) {
      const score = cosine(sig, ref);
      perCharacter[id] = Math.max(perCharacter[id] ?? 0, score);
      if (score > bestSimilarity) {
        bestSimilarity = score;
        bestCharacterId = id;
      }
    }
  }

  return {
    samplesCompared,
    bestSimilarity: samplesCompared > 0 ? bestSimilarity : null,
    bestCharacterId,
    perCharacter,
    error:
      samplesCompared === 0
        ? "No frames comparable to character bible"
        : undefined,
  };
}

function purpleRatio(imagePath: string, workDir: string): number | null {
  const raw = join(
    workDir,
    `purple_${Buffer.from(imagePath).toString("hex").slice(0, 12)}.rgb`,
  );
  run(
    "ffmpeg",
    [
      "-y",
      "-i",
      imagePath,
      "-vf",
      "scale=64:64",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgb24",
      raw,
    ],
    { ignoreError: true },
  );
  if (!existsSync(raw)) return null;
  try {
    const buf = readFileSync(raw);
    let purple = 0;
    let total = 0;
    for (let i = 0; i + 2 < buf.length; i += 3) {
      const r = buf[i]!;
      const g = buf[i + 1]!;
      const b = buf[i + 2]!;
      total++;
      // AmyNest purple family
      if (b > r + 20 && b > g + 10 && b > 80 && r > 40 && r < 180) purple++;
    }
    return total ? purple / total : null;
  } catch {
    return null;
  }
}

function iconSimilarity(
  endFrame: string,
  iconPath: string,
  workDir: string,
): number | null {
  if (!existsSync(iconPath) || !existsSync(endFrame)) return null;
  const a = histogramSignature(endFrame, workDir);
  const b = histogramSignature(iconPath, workDir);
  if (!a || !b) return null;
  return cosine(a, b);
}

function probeTemplate(
  endFrames: string[],
  ocrEndText: string,
  ocrAll: string,
  durationSec: number,
  workDir: string,
): TemplateMatchProbe {
  const icon = resolveBrandAssetPath("appIcon");
  let bestIcon = 0;
  let bestPurple = 0;
  for (const frame of endFrames) {
    const sim = iconSimilarity(frame, icon, workDir);
    if (sim != null) bestIcon = Math.max(bestIcon, sim);
    const pr = purpleRatio(frame, workDir);
    if (pr != null) bestPurple = Math.max(bestPurple, pr);
  }
  const hay = `${ocrEndText} ${ocrAll}`.toLowerCase();
  return {
    appIconSimilarity: endFrames.length ? bestIcon : null,
    endCardPurpleRatio: endFrames.length ? bestPurple : null,
    googlePlayTextDetected: /google\s*play|get\s*it\s*on\s*google/i.test(hay),
    appStoreTextDetected:
      /app\s*store|available\s*on\s*the\s*app\s*store|apple\s*store/i.test(hay),
    ctaTextDetected:
      /download\s*amynest|try\s*amynest|get\s*amynest|install|build\s*better\s*habits/i.test(
        hay,
      ),
    logoTextDetected: /amynest/i.test(hay),
    endCardDurationSec: durationSec >= 2 ? 2.5 : null,
    error: endFrames.length === 0 ? "No end-card frames extracted" : undefined,
  };
}

function probeCompliance(ocrAll: string, videoPath: string): ComplianceProbe {
  const hits: string[] = [];
  const lower = ocrAll.toLowerCase();
  const checks: Array<[RegExp, string]> = [
    [/\bplaceholder\b/i, "placeholder"],
    [/\btodo\b/i, "todo"],
    [/\bdebug\b/i, "debug"],
    [/\blorem\s+ipsum\b/i, "lorem"],
    [/\bshutterstock\b/i, "stock-watermark"],
    [/\bgetty\s*images\b/i, "stock-watermark"],
    [/\bunsplash\b/i, "stock-watermark"],
    [/\btemp[_-]?file\b/i, "temporary"],
  ];
  for (const [re, label] of checks) {
    if (re.test(lower)) hits.push(label);
  }
  const missingMedia =
    !existsSync(videoPath) ||
    (() => {
      try {
        return statSync(videoPath).size < EVIDENCE_THRESHOLDS.minFileBytes;
      } catch {
        return true;
      }
    })();
  if (missingMedia) hits.push("missing-or-tiny-media");

  return {
    placeholderDetected: hits.includes("placeholder"),
    todoDetected: hits.includes("todo"),
    debugOverlayDetected: hits.includes("debug"),
    stockWatermarkDetected: hits.some((h) => h.includes("stock")),
    missingMedia,
    hits,
  };
}

function meanLumaOfFrame(imagePath: string, workDir: string): number | null {
  const raw = join(
    workDir,
    `luma_${Buffer.from(imagePath).toString("hex").slice(0, 12)}.rgb`,
  );
  run(
    "ffmpeg",
    [
      "-y",
      "-i",
      imagePath,
      "-vf",
      "scale=64:64,format=gray",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "gray",
      raw,
    ],
    { ignoreError: true },
  );
  if (!existsSync(raw)) return null;
  try {
    const buf = readFileSync(raw);
    if (buf.length === 0) return null;
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i]!;
    return sum / buf.length;
  } catch {
    return null;
  }
}

export interface ProbeMediaOptions {
  videoPath: string;
  transcript?: string;
  captions?: Array<{ start: number; end: number; text: string }>;
  workDir?: string;
}

/** Probe final MP4 — source of truth for certification. */
export function probeMediaEvidence(
  options: ProbeMediaOptions,
): MediaEvidenceReport {
  const generatedAt = new Date().toISOString();
  const videoPath = options.videoPath;
  const workDir =
    options.workDir ??
    join(tmpdir(), `amynest-evidence-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(workDir, { recursive: true });

  const probeErrors: string[] = [];
  let fileExists = existsSync(videoPath);
  let fileSizeBytes = 0;
  if (fileExists) {
    try {
      fileSizeBytes = statSync(videoPath).size;
    } catch {
      fileExists = false;
    }
  }

  if (!fileExists || fileSizeBytes < 32) {
    return {
      version: MEDIA_EVIDENCE_VERSION,
      generatedAt,
      videoPath,
      fileExists,
      fileSizeBytes,
      workDir,
      audio: {
        hasAudioStream: false,
        meanVolumeDb: null,
        maxVolumeDb: null,
        silenceRatio: null,
        silentTrack: true,
        speechLikely: false,
        musicLikely: false,
        duckingLikely: false,
        probeError: "Final MP4 missing or unreadable",
      },
      visual: {
        width: null,
        height: null,
        durationSec: null,
        fps: null,
        blackSeconds: null,
        freezeSeconds: null,
        sceneChangeCount: null,
        frameCount: null,
        meanLuma: null,
        corrupt: true,
        probeError: "Final MP4 missing or unreadable",
      },
      ocr: {
        available: false,
        frames: [],
        fullText: "",
        captionText: "",
        endCardText: "",
        transcriptOverlap: null,
        subtitleCoverage: null,
        error: "Skipped OCR — media missing",
      },
      character: {
        samplesCompared: 0,
        bestSimilarity: null,
        bestCharacterId: null,
        perCharacter: {},
        error: "Skipped character probe — media missing",
      },
      template: {
        appIconSimilarity: null,
        endCardPurpleRatio: null,
        googlePlayTextDetected: false,
        appStoreTextDetected: false,
        ctaTextDetected: false,
        logoTextDetected: false,
        endCardDurationSec: null,
        error: "Skipped template probe — media missing",
      },
      compliance: {
        placeholderDetected: false,
        todoDetected: false,
        debugOverlayDetected: false,
        stockWatermarkDetected: false,
        missingMedia: true,
        hits: ["missing-media"],
      },
      probeComplete: false,
      probeErrors: ["Final MP4 missing or unreadable"],
    };
  }

  const audio = probeAudio(videoPath);
  if (audio.probeError) probeErrors.push(audio.probeError);
  const visual = probeVisual(videoPath);
  if (visual.probeError) probeErrors.push(visual.probeError);

  const durationSec = visual.durationSec ?? 0;
  const frames = extractFrames(videoPath, workDir, Math.max(1, durationSec));
  const lumaSamples = frames.full
    .slice(0, 6)
    .map((p) => meanLumaOfFrame(p, workDir))
    .filter((v): v is number => v != null);
  visual.meanLuma =
    lumaSamples.length > 0
      ? lumaSamples.reduce((a, b) => a + b, 0) / lumaSamples.length
      : null;
  // Treat near-black masters as black even if blackdetect misses continuous black.
  if (visual.meanLuma != null && visual.meanLuma < 12) {
    visual.blackSeconds = Math.max(
      visual.blackSeconds ?? 0,
      durationSec || 1,
    );
  }
  const ocr = probeOcr(
    frames,
    options.transcript ?? "",
    options.captions ?? [],
  );
  if (ocr.error) probeErrors.push(ocr.error);

  const character = probeCharacter(frames.full, workDir);
  if (character.error) probeErrors.push(character.error);

  const template = probeTemplate(
    frames.endcard.length ? frames.endcard : frames.full.slice(-2),
    ocr.endCardText,
    `${ocr.fullText} ${ocr.captionText}`,
    durationSec,
    workDir,
  );
  if (template.error) probeErrors.push(template.error);

  const compliance = probeCompliance(
    `${ocr.fullText} ${ocr.captionText} ${ocr.endCardText}`,
    videoPath,
  );

  const probeComplete =
    !visual.corrupt &&
    visual.width != null &&
    visual.durationSec != null &&
    audio.meanVolumeDb != null;

  return {
    version: MEDIA_EVIDENCE_VERSION,
    generatedAt,
    videoPath,
    fileExists,
    fileSizeBytes,
    workDir,
    audio,
    visual,
    ocr,
    character,
    template,
    compliance,
    probeComplete,
    probeErrors,
  };
}
