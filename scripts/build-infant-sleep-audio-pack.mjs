#!/usr/bin/env node
/**
 * Build infant sleep audio pack — REAL, audible, royalty-free audio synthesized
 * offline (no copyrighted recordings, no network, no TTS server dependency).
 *
 * Why this exists: the bundled /infant-sleep-audio/ MP3s used to be silent
 * `anullsrc` placeholders, so lullabies / poems / stories played a valid-but-silent
 * file and the player never fell back — the user heard nothing. This generator
 * synthesizes actual calming audio (PCM -> WAV -> MP3 via ffmpeg) so every tile
 * is audible out of the box and offline-first.
 *
 *   node scripts/build-infant-sleep-audio-pack.mjs [--force]
 *
 * --force overwrites existing files (used in CI / when content changes).
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const packRoot = join(repoRoot, "artifacts/kidschedule/public/infant-sleep-audio");
const catalogPath = join(repoRoot, "artifacts/kidschedule/src/data/infant-sleep-catalog.ts");
const poemsPath = join(repoRoot, "artifacts/kidschedule/src/data/infant-poems.ts");

const force = process.argv.includes("--force");
const SAMPLE_RATE = 44100;

/** Last-resort tiny valid MP3 frame so a file is never zero-length if ffmpeg is missing. */
const MINIMAL_MP3 = Buffer.from([
  0xff, 0xfb, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

function hasFfmpeg() {
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Catalog parsing
// ---------------------------------------------------------------------------
function extractAssetPaths(fileContent) {
  const paths = new Set();
  const re = /assetPath:\s*"([^"]+\.mp3)"/g;
  let m;
  while ((m = re.exec(fileContent)) !== null) paths.add(m[1]);
  const poemRe = /infantSleepAssetUrl\("([^"]+\.mp3)"\)/g;
  while ((m = poemRe.exec(fileContent)) !== null) paths.add(m[1]);
  return [...paths];
}

// ---------------------------------------------------------------------------
// Tiny deterministic PRNG (so regenerated audio is byte-stable per asset id)
// ---------------------------------------------------------------------------
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Notes / scales
// ---------------------------------------------------------------------------
const A4 = 440;
function noteFreq(semitonesFromA4) {
  return A4 * Math.pow(2, semitonesFromA4 / 12);
}
// Semitone offsets from A4 for named notes we use.
const N = {
  C3: -21, D3: -19, E3: -17, F3: -16, G3: -14, A3: -12, B3: -10,
  C4: -9, D4: -7, E4: -5, F4: -4, G4: -2, A4: 0, B4: 2,
  C5: 3, D5: 5, E5: 7, F5: 8, G5: 10, A5: 12,
};
const FREQ = Object.fromEntries(Object.entries(N).map(([k, v]) => [k, noteFreq(v)]));

// Major pentatonic, two octaves (always consonant — great for gentle beds).
const PENTA = ["C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5", "G5", "A5"];

// ---------------------------------------------------------------------------
// Voice synthesis — soft sine + gentle harmonics + ADSR + light vibrato.
// ---------------------------------------------------------------------------
function addNote(buf, startSec, durSec, freq, gain = 0.22) {
  if (freq <= 0) return; // rest
  const start = Math.floor(startSec * SAMPLE_RATE);
  const total = Math.floor(durSec * SAMPLE_RATE);
  const attack = Math.floor(0.03 * SAMPLE_RATE);
  const release = Math.floor(Math.min(0.35, durSec * 0.55) * SAMPLE_RATE);
  const sustain = 0.78;
  for (let i = 0; i < total; i++) {
    const idx = start + i;
    if (idx >= buf.length) break;
    const t = i / SAMPLE_RATE;
    // envelope
    let env;
    if (i < attack) env = (i / attack) * 1.0;
    else if (i > total - release) env = sustain * ((total - i) / release);
    else {
      const decayPos = (i - attack) / Math.max(1, total - attack - release);
      env = 1.0 - (1.0 - sustain) * Math.min(1, decayPos);
    }
    const vib = 1 + 0.004 * Math.sin(2 * Math.PI * 5.2 * t);
    const ph = 2 * Math.PI * freq * vib * t;
    const s =
      Math.sin(ph) +
      0.14 * Math.sin(2 * ph) +
      0.05 * Math.sin(3 * ph);
    buf[idx] += s * gain * env;
  }
}

/** Sustained pad voice for ambient story beds — slow swell, very soft. */
function addPad(buf, startSec, durSec, freq, gain = 0.12) {
  const start = Math.floor(startSec * SAMPLE_RATE);
  const total = Math.floor(durSec * SAMPLE_RATE);
  const fade = Math.floor(Math.min(2.5, durSec * 0.25) * SAMPLE_RATE);
  for (let i = 0; i < total; i++) {
    const idx = start + i;
    if (idx >= buf.length) break;
    const t = i / SAMPLE_RATE;
    let env = 1;
    if (i < fade) env = i / fade;
    else if (i > total - fade) env = (total - i) / fade;
    const tremolo = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.12 * t);
    const ph = 2 * Math.PI * freq * t;
    const s = Math.sin(ph) + 0.2 * Math.sin(2 * ph);
    buf[idx] += s * gain * env * tremolo;
  }
}

// One-pole low-pass for warmth (removes harsh edges; baby-safe softness).
function lowPass(buf, cutoffHz) {
  const dt = 1 / SAMPLE_RATE;
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const alpha = dt / (rc + dt);
  let prev = 0;
  for (let i = 0; i < buf.length; i++) {
    prev = prev + alpha * (buf[i] - prev);
    buf[i] = prev;
  }
}

function normalize(buf, peakTarget = 0.5) {
  let peak = 0;
  for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]));
  if (peak < 1e-6) return;
  const g = peakTarget / peak;
  for (let i = 0; i < buf.length; i++) {
    let v = buf[i] * g;
    // soft clip for safety
    v = Math.tanh(v * 1.1);
    buf[i] = v;
  }
}

function floatToWav(buf) {
  const numSamples = buf.length;
  const blockAlign = 2; // mono, 16-bit
  const dataSize = numSamples * blockAlign;
  const out = Buffer.alloc(44 + dataSize);
  out.write("RIFF", 0);
  out.writeUInt32LE(36 + dataSize, 4);
  out.write("WAVE", 8);
  out.write("fmt ", 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20); // PCM
  out.writeUInt16LE(1, 22); // mono
  out.writeUInt32LE(SAMPLE_RATE, 24);
  out.writeUInt32LE(SAMPLE_RATE * blockAlign, 28);
  out.writeUInt16LE(blockAlign, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36);
  out.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i++) {
    let v = Math.max(-1, Math.min(1, buf[i]));
    out.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Melody banks
// ---------------------------------------------------------------------------
// Faithful public-domain melodies (note name, beats). Quarter note = 1 beat.
const FAITHFUL = {
  twinkle: [
    ["C4", 1], ["C4", 1], ["G4", 1], ["G4", 1], ["A4", 1], ["A4", 1], ["G4", 2],
    ["F4", 1], ["F4", 1], ["E4", 1], ["E4", 1], ["D4", 1], ["D4", 1], ["C4", 2],
    ["G4", 1], ["G4", 1], ["F4", 1], ["F4", 1], ["E4", 1], ["E4", 1], ["D4", 2],
    ["G4", 1], ["G4", 1], ["F4", 1], ["F4", 1], ["E4", 1], ["E4", 1], ["D4", 2],
    ["C4", 1], ["C4", 1], ["G4", 1], ["G4", 1], ["A4", 1], ["A4", 1], ["G4", 2],
    ["F4", 1], ["F4", 1], ["E4", 1], ["E4", 1], ["D4", 1], ["D4", 1], ["C4", 2],
  ],
  brahms: [
    ["E4", 0.75], ["E4", 0.25], ["G4", 2],
    ["E4", 0.75], ["E4", 0.25], ["G4", 2],
    ["E4", 1], ["G4", 1], ["C5", 1], ["B4", 1], ["A4", 1], ["A4", 1], ["G4", 2],
    ["D4", 1], ["E4", 1], ["F4", 1], ["D4", 1], ["E4", 1], ["F4", 1],
    ["A4", 1], ["G4", 1], ["F4", 1], ["E4", 1], ["D4", 2], ["C4", 2],
  ],
  "rock-a-bye": [
    ["G4", 1], ["E4", 1], ["G4", 1], ["E4", 2], ["G4", 1],
    ["A4", 1], ["G4", 1], ["E4", 1], ["D4", 2], ["rest", 1],
    ["F4", 1], ["D4", 1], ["F4", 1], ["D4", 2], ["F4", 1],
    ["G4", 1], ["F4", 1], ["E4", 1], ["C4", 2], ["rest", 1],
  ],
  "hush-baby": [
    ["E4", 1], ["E4", 1], ["G4", 1], ["A4", 2], ["G4", 1],
    ["E4", 1], ["D4", 1], ["C4", 2], ["rest", 1],
    ["G4", 1], ["G4", 1], ["A4", 1], ["G4", 2], ["E4", 1],
    ["D4", 1], ["E4", 1], ["C4", 2], ["rest", 1],
  ],
  "lavenders-blue": [
    ["C4", 1], ["F4", 1], ["F4", 1], ["F4", 1], ["G4", 1], ["A4", 2],
    ["A4", 1], ["A4", 1], ["A4", 1], ["G4", 1], ["F4", 2],
    ["C4", 1], ["F4", 1], ["F4", 1], ["G4", 1], ["A4", 1], ["A4", 2],
    ["G4", 1], ["F4", 1], ["E4", 1], ["F4", 2], ["rest", 1],
  ],
};

// Gentle pentatonic phrases (scale-degree indices into PENTA) for everything else.
const PHRASES = [
  [[0, 2], [2, 1], [4, 1], [3, 2], [2, 2], [0, 2], [1, 1], [2, 1], [0, 4]],
  [[4, 1], [3, 1], [2, 2], [1, 1], [0, 2], [2, 1], [3, 2], [4, 2], [2, 4]],
  [[2, 1], [4, 1], [5, 2], [4, 1], [3, 1], [2, 2], [0, 2], [1, 1], [0, 3]],
  [[0, 1], [1, 1], [2, 1], [3, 1], [4, 2], [3, 1], [2, 1], [1, 2], [0, 4]],
  [[5, 2], [4, 1], [3, 1], [4, 2], [2, 1], [3, 1], [2, 2], [0, 2], [0, 2]],
  [[2, 2], [3, 1], [4, 1], [5, 2], [4, 2], [2, 1], [1, 1], [0, 2], [0, 2]],
];

function buildMelodyBuffer(id, kind, durationSec, seed) {
  const rand = mulberry32(seed);
  const totalSamples = Math.ceil(durationSec * SAMPLE_RATE) + SAMPLE_RATE;
  const buf = new Float32Array(totalSamples);

  // tempo: lullaby gentle, poem slower/airier
  const bpm = kind === "poem" ? 58 : 66;
  const beatSec = 60 / bpm;
  const noteGain = kind === "poem" ? 0.18 : 0.22;

  // Per-track micro-detune (±6 cents — musically inaudible) guarantees every
  // asset id renders to unique audio bytes even when it reuses a phrase.
  const detune = Math.pow(2, (((seed % 25) - 12) * 0.5) / 1200);

  // Soft sustained drone for warmth (root + fifth), very low level.
  const droneRoot = FREQ.C3 * detune;
  addPad(buf, 0, durationSec, droneRoot, 0.05);
  addPad(buf, 0, durationSec, droneRoot * 1.5, 0.035);

  let seq;
  if (FAITHFUL[id]) {
    seq = FAITHFUL[id].map(([n, b]) => [n === "rest" ? 0 : FREQ[n] * detune, b]);
  } else {
    // pick a phrase deterministically and a transpose for variety
    const phrase = PHRASES[seed % PHRASES.length];
    const transposeOpts = [-5, -3, 0, 0, 2, 3, 5, 7];
    const transpose = transposeOpts[(seed >>> 3) % transposeOpts.length];
    const octave = [(0), (0), (-12)][(seed >>> 6) % 3]; // occasional octave-down for warmth
    seq = phrase.map(([deg, b]) => {
      const name = PENTA[deg];
      return [FREQ[name] * detune * Math.pow(2, (transpose + octave) / 12), b];
    });
  }

  // Repeat the phrase (with tiny breaths) until we fill the duration.
  let t = 0.4;
  let guard = 0;
  while (t < durationSec - beatSec && guard < 5000) {
    for (const [freq, beats] of seq) {
      const dur = beats * beatSec;
      if (t >= durationSec - 0.2) break;
      // light humanization
      const jitter = (rand() - 0.5) * 0.01;
      addNote(buf, t + jitter, Math.min(dur, durationSec - t), freq, noteGain);
      t += dur;
      guard++;
    }
    t += beatSec * 1.5; // breath between repeats
  }

  lowPass(buf, kind === "poem" ? 2600 : 3200);
  normalize(buf, 0.55);
  return buf;
}

// ---------------------------------------------------------------------------
// Ambient story bed — slow evolving chord pad (calming, audible, loop-safe).
// ---------------------------------------------------------------------------
function buildStoryBuffer(id, durationSec, seed) {
  const totalSamples = Math.ceil(durationSec * SAMPLE_RATE) + SAMPLE_RATE;
  const buf = new Float32Array(totalSamples);
  const roots = [FREQ.C3, FREQ.D3, FREQ.F3, FREQ.G3, FREQ.A3];
  const detune = Math.pow(2, (((seed % 25) - 12) * 0.5) / 1200);
  const root = roots[seed % roots.length] * detune;
  // Layered chord: root, fifth, octave, gentle third.
  addPad(buf, 0, durationSec, root, 0.13);
  addPad(buf, 0, durationSec, root * 1.5, 0.09);
  addPad(buf, 0, durationSec, root * 2, 0.07);
  addPad(buf, 0, durationSec, root * Math.pow(2, 4 / 12) * 2, 0.045);
  // Slow sparse twinkle on top so it isn't a static drone.
  const rand = mulberry32(seed ^ 0x9e3779b9);
  let t = 4;
  while (t < durationSec - 4) {
    const deg = [4, 5, 7, 9][Math.floor(rand() * 4)];
    addNote(buf, t, 2.2, root * 2 * Math.pow(2, deg / 12), 0.07);
    t += 3 + rand() * 4;
  }
  lowPass(buf, 2400);
  normalize(buf, 0.5);
  return buf;
}

// ---------------------------------------------------------------------------
// White-noise loops — filtered noise textures (ocean / stream / rain).
// ---------------------------------------------------------------------------
function buildNoiseBuffer(id, durationSec, seed) {
  const totalSamples = Math.ceil(durationSec * SAMPLE_RATE);
  const buf = new Float32Array(totalSamples);
  const rand = mulberry32(seed);

  // brown-ish noise base
  let last = 0;
  for (let i = 0; i < totalSamples; i++) {
    const white = rand() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    buf[i] = last * 8;
  }

  if (id.includes("ocean")) {
    lowPass(buf, 700);
    // slow wave swell
    for (let i = 0; i < totalSamples; i++) {
      const t = i / SAMPLE_RATE;
      const swell = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.08 * t));
      buf[i] *= swell;
    }
  } else if (id.includes("stream")) {
    lowPass(buf, 4000);
    for (let i = 0; i < totalSamples; i++) {
      const t = i / SAMPLE_RATE;
      buf[i] *= 0.8 + 0.2 * Math.sin(2 * Math.PI * 0.7 * t);
    }
  } else {
    // window rain: filtered hiss + sparse droplet clicks
    lowPass(buf, 2200);
    let t = 0;
    while (t < durationSec) {
      const idx = Math.floor(t * SAMPLE_RATE);
      const amp = 0.3 + rand() * 0.4;
      for (let k = 0; k < 600 && idx + k < totalSamples; k++) {
        buf[idx + k] += amp * Math.exp(-k / 200) * (rand() * 2 - 1);
      }
      t += 0.05 + rand() * 0.18;
    }
  }
  normalize(buf, 0.42);
  return buf;
}

// ---------------------------------------------------------------------------
// Encode WAV buffer -> MP3 via ffmpeg
// ---------------------------------------------------------------------------
function encodeMp3(floatBuf, outPath, ffmpegOk) {
  mkdirSync(dirname(outPath), { recursive: true });
  if (!ffmpegOk) {
    writeFileSync(outPath, MINIMAL_MP3);
    return false;
  }
  const wav = floatToWav(floatBuf);
  const tmpWav = join(tmpdir(), `infant-sleep-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`);
  writeFileSync(tmpWav, wav);
  try {
    execSync(
      `ffmpeg -y -i "${tmpWav}" -ac 1 -ar 44100 -codec:a libmp3lame -q:a 5 "${outPath}"`,
      { stdio: "ignore" },
    );
    return true;
  } finally {
    try { rmSync(tmpWav, { force: true }); } catch { /* noop */ }
  }
}

function categoryOf(rel) {
  if (rel.includes("/stories/")) return "story";
  if (rel.includes("white-noise")) return "noise";
  if (rel.includes("/poems/")) return "poem";
  return "lullaby";
}

function idOf(rel) {
  return rel.replace(/^.*\//, "").replace(/\.mp3$/, "");
}

function durationFor(kind) {
  if (kind === "story") return 120;
  if (kind === "noise") return 60;
  if (kind === "poem") return 42;
  return 48; // lullaby
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const ffmpegOk = hasFfmpeg();
if (!ffmpegOk) {
  console.warn(
    "[infant-sleep] ffmpeg not found — writing minimal placeholder MP3s. " +
      "Install ffmpeg and re-run with --force to generate real audible audio.",
  );
}

const catalogSrc = readFileSync(catalogPath, "utf8");
const poemsSrc = readFileSync(poemsPath, "utf8");
const assetPaths = extractAssetPaths(catalogSrc + poemsSrc);

let generated = 0;
let skipped = 0;
for (const rel of assetPaths) {
  const out = join(packRoot, rel);
  if (!force && existsSync(out)) {
    skipped++;
    continue;
  }
  const kind = categoryOf(rel);
  const id = idOf(rel);
  const seed = hashString(rel);
  const durationSec = durationFor(kind);

  let buf;
  if (kind === "noise") buf = buildNoiseBuffer(id, durationSec, seed);
  else if (kind === "story") buf = buildStoryBuffer(id, durationSec, seed);
  else buf = buildMelodyBuffer(id, kind, durationSec, seed);

  encodeMp3(buf, out, ffmpegOk);
  generated++;
}

const manifestItems = assetPaths.map((assetPath) => {
  const packId = assetPath.includes("extended-v1") ? "extended-v1" : "core-v1";
  const id = idOf(assetPath);
  return { id, assetPath, packId };
});

const manifest = {
  version: 1,
  packId: "core-v1",
  generatedAt: new Date().toISOString(),
  items: manifestItems,
  packs: {
    "core-v1": { label: "Core Sleep Pack", bundled: true, estimatedMb: 12 },
    "extended-v1": { label: "Extended Sleep Pack", bundled: false, estimatedMb: 8 },
  },
};

mkdirSync(packRoot, { recursive: true });
writeFileSync(join(packRoot, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(
  `Infant sleep pack: ${assetPaths.length} assets (${generated} generated, ${skipped} kept) under ${packRoot}` +
    (ffmpegOk ? "" : " [PLACEHOLDER — ffmpeg missing]"),
);
