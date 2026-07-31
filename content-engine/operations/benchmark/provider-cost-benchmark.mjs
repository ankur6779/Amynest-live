#!/usr/bin/env node
/**
 * ISOLATED provider cost/quality benchmark.
 * Does NOT modify production pipeline, providers, or defaults.
 *
 * Usage:
 *   node --env-file=../.env.development ./operations/benchmark/provider-cost-benchmark.mjs
 *   PROVIDER=kie|youbot|both node ...
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../../..");
const OUT_ROOT = join(REPO_ROOT, ".amynest-assets", "provider-benchmark");
const KEYFRAMES = join(
  REPO_ROOT,
  ".amynest-assets/second-production/work/cinematic/keyframes",
);
const AUDIO_NARR = join(
  REPO_ROOT,
  ".amynest-assets/second-production/audio/narration.wav",
);
const AUDIO_MUSIC = join(
  REPO_ROOT,
  ".amynest-assets/second-production/audio/music.wav",
);

const SHOTS = [
  {
    id: "shot-hook",
    duration: 4,
    character: "amy-girl",
    keyframe: "shot-hook-identity.png",
    prompt:
      "Vertical 9:16 Pixar-quality family animated commercial shot. Animate continuous motion from the first frame — never a static pose. Keep the exact same Amy Girl from the first frame — identical brown side ponytail with yellow bow, plain purple hoodie, dark purple leggings, purple sneakers with white soles, brown eyes. Do not redesign. Environment: warm child study desk with soft daylight and pastel stationery. Performance: looks at unfinished worksheets, soft bored expression, blinks, small sigh, glances toward window. Include body movement, eye blinks, facial expression change, and clear hand gestures. Camera: slow cinematic push-in. No random humans replacing the official character.",
  },
  {
    id: "shot-amy-host",
    duration: 4,
    character: "amy-ai",
    keyframe: "shot-amy-host-identity.png",
    prompt:
      "Vertical 9:16 Pixar-quality family animated commercial shot. Animate continuous motion from the first frame — never a static pose. Keep the exact same Amy AI character from the first frame — identical white soft-polymer body, purple AmyAI cap, headphones, purple eyes, halo. Do not redesign. Environment: cozy modern living room with soft purple rim light. Performance: floats into frame, waves hello, welcomes parents, points toward a tablet on the table, soft smile, blinks. Include body movement, eye blinks, facial expression change, and clear hand gestures. Camera: gentle camera pan right. No random humans replacing the official character.",
  },
  {
    id: "shot-amy-girl-learn",
    duration: 6,
    character: "amy-girl",
    keyframe: "shot-amy-girl-learn-identity.png",
    prompt:
      "Vertical 9:16 Pixar-quality family animated commercial shot. Animate continuous motion from the first frame — never a static pose. Keep the exact same Amy Girl from the first frame — identical brown side ponytail with yellow bow, plain purple hoodie, dark purple leggings, purple sneakers with white soles, brown eyes. Do not redesign. Environment: warm child study desk with soft daylight and pastel stationery. Performance: opens a tablet, taps Study Zone lesson card, eyes light up, small smile, finger taps progress ring briefly visible on device screen. A tablet in her hands briefly shows a clean Study Zone lesson card with a purple progress ring — UI readable for under two seconds, never fullscreen. Camera: slow cinematic push-in. No random humans replacing the official character.",
  },
  {
    id: "shot-amy-boy-celebrate",
    duration: 4,
    character: "amy-boy",
    keyframe: "shot-amy-boy-celebrate-identity.png",
    prompt:
      "Vertical 9:16 Pixar-quality family animated commercial shot. Animate continuous motion from the first frame — never a static pose. Keep the exact same Amy Boy from the first frame — identical fluffy dark brown hair, plain purple hoodie, dark purple joggers, purple sneakers with white soles, brown eyes. Do not redesign. Environment: cozy child's bedroom with fairy lights and soft morning light. Performance: celebrates finishing a lesson, small jump, fist pump, big smile, looks toward camera warmly. Include body movement, eye blinks, facial expression change, and clear hand gestures. Camera: soft orbital camera drift. No random humans replacing the official character.",
  },
  {
    id: "shot-cta",
    duration: 4,
    character: "amy-ai",
    keyframe: "shot-cta-identity.png",
    prompt:
      "Vertical 9:16 Pixar-quality family animated commercial shot. Animate continuous motion from the first frame — never a static pose. Keep the exact same Amy AI character from the first frame — identical white soft-polymer body, purple AmyAI cap, headphones, purple eyes, halo. Do not redesign. Environment: premium purple gradient stage with soft volumetric light. Performance: waves inviting parents to download, gentle float, eye contact with camera, warm smile. Include body movement, eye blinks, facial expression change, and clear hand gestures. Camera: slow cinematic zoom. No random humans replacing the official character.",
  },
];

function loadEnvKey(name) {
  if (process.env[name]) return process.env[name].trim();
  const envPath = join(REPO_ROOT, ".env.development");
  if (!existsSync(envPath)) return "";
  const line = readFileSync(envPath, "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim() : "";
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function httpJson(url, { method = "GET", key, body, formData } = {}) {
  const headers = {
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
    "User-Agent": "AmyNestProviderBenchmark/1.0",
  };
  let payload;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(url, { method, headers, body: payload });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json, text };
}

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

async function kieCredits(key) {
  const r = await httpJson("https://api.kie.ai/api/v1/chat/credit", { key });
  return Number(r.json?.data ?? NaN);
}

async function youbotCredits(key) {
  const r = await httpJson("https://you.bot/api/v1/credits", { key });
  return Number(r.json?.credits ?? r.json?.data ?? NaN);
}

async function kieUploadPng(key, filePath, fileName) {
  const b64 = readFileSync(filePath).toString("base64");
  const r = await httpJson("https://kieai.redpandaai.co/api/file-base64-upload", {
    method: "POST",
    key,
    body: {
      base64Data: `data:image/png;base64,${b64}`,
      uploadPath: "amynest-benchmark",
      fileName,
    },
  });
  const url =
    r.json?.data?.downloadUrl ||
    r.json?.data?.fileUrl ||
    r.json?.downloadUrl ||
    r.json?.data?.url;
  return { ...r, url };
}

async function kieGenerateShot(key, shot, imageUrl) {
  const started = Date.now();
  const create = await httpJson("https://api.kie.ai/api/v1/veo/generate", {
    method: "POST",
    key,
    body: {
      prompt: shot.prompt,
      imageUrls: [imageUrl],
      model: "veo3_fast",
      generationType: "FIRST_AND_LAST_FRAMES_2_VIDEO",
      aspect_ratio: "9:16",
      resolution: "720p",
      duration: shot.duration,
      enableTranslation: false,
    },
  });
  const taskId =
    create.json?.data?.taskId || create.json?.taskId || create.json?.data;
  if (!create.ok || !taskId || typeof taskId !== "string") {
    return {
      ok: false,
      create,
      elapsedMs: Date.now() - started,
      taskId: null,
      videoUrl: null,
    };
  }

  let last;
  for (let i = 0; i < 90; i++) {
    await sleep(10000);
    last = await httpJson(
      `https://api.kie.ai/api/v1/veo/record-info?taskId=${encodeURIComponent(taskId)}`,
      { key },
    );
    const flag = last.json?.data?.successFlag;
    if (flag === 1) {
      const urls =
        last.json?.data?.response?.resultUrls ||
        last.json?.data?.response?.fullResultUrls ||
        [];
      const videoUrl = Array.isArray(urls) ? urls[0] : null;
      return {
        ok: Boolean(videoUrl),
        create,
        poll: last,
        taskId,
        videoUrl,
        elapsedMs: Date.now() - started,
        creditsHint: create.json?.data?.consumeCredits ?? create.json?.consumeCredits,
      };
    }
    if (flag === 2 || flag === 3) {
      return {
        ok: false,
        create,
        poll: last,
        taskId,
        videoUrl: null,
        elapsedMs: Date.now() - started,
        error: last.json?.data?.errorMessage || last.json?.msg,
      };
    }
  }
  return {
    ok: false,
    create,
    poll: last,
    taskId,
    videoUrl: null,
    elapsedMs: Date.now() - started,
    error: "timeout",
  };
}

async function youbotUploadPng(key, filePath) {
  const bytes = readFileSync(filePath);
  const form = new FormData();
  form.append(
    "file",
    new Blob([bytes], { type: "image/png" }),
    filePath.split("/").pop(),
  );
  const r = await httpJson("https://you.bot/api/v1/files/upload", {
    method: "POST",
    key,
    formData: form,
  });
  const url =
    r.json?.url ||
    r.json?.fileUrl ||
    r.json?.data?.url ||
    r.json?.result?.url;
  return { ...r, url };
}

async function youbotGenerateShot(key, shot, imageUrl) {
  const started = Date.now();
  const create = await httpJson("https://you.bot/api/v1/generate", {
    method: "POST",
    key,
    body: {
      modelId: "veo-3-1-fast",
      input: {
        prompt: shot.prompt,
        imageUrls: imageUrl ? [imageUrl] : undefined,
        aspectRatio: "9:16",
        resolution: "720p",
        duration: `${shot.duration}s`,
      },
    },
  });
  const taskId = create.json?.taskId || create.json?.id;
  const creditsCharged = create.json?.creditsCharged;
  if (!create.ok || !taskId) {
    return {
      ok: false,
      create,
      elapsedMs: Date.now() - started,
      taskId: null,
      videoUrl: null,
      creditsCharged,
    };
  }

  let last;
  for (let i = 0; i < 90; i++) {
    await sleep(10000);
    last = await httpJson(
      `https://you.bot/api/v1/task/${encodeURIComponent(taskId)}?model=veo-3-1-fast`,
      { key },
    );
    const status = String(
      last.json?.status || last.json?.state || last.json?.data?.status || "",
    ).toLowerCase();
    const urls =
      last.json?.resultUrls ||
      last.json?.output?.urls ||
      last.json?.result?.urls ||
      last.json?.data?.resultUrls ||
      [];
    const videoUrl = Array.isArray(urls) && urls[0] ? urls[0] : last.json?.url;
    if (["succeeded", "success", "completed", "done"].includes(status) || videoUrl) {
      return {
        ok: Boolean(videoUrl),
        create,
        poll: last,
        taskId,
        videoUrl,
        creditsCharged,
        elapsedMs: Date.now() - started,
      };
    }
    if (["failed", "error", "cancelled"].includes(status)) {
      return {
        ok: false,
        create,
        poll: last,
        taskId,
        videoUrl: null,
        creditsCharged,
        elapsedMs: Date.now() - started,
        error: last.json?.error || last.json?.message || status,
      };
    }
  }
  return {
    ok: false,
    create,
    poll: last,
    taskId,
    videoUrl: null,
    creditsCharged,
    elapsedMs: Date.now() - started,
    error: "timeout",
  };
}

async function downloadFile(url, dest) {
  const res = await fetch(url, {
    headers: { "User-Agent": "AmyNestProviderBenchmark/1.0" },
  });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  return dest;
}

function assembleMaster(shotPaths, outMp4) {
  const listPath = join(dirname(outMp4), "concat.txt");
  writeFileSync(
    listPath,
    shotPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n") + "\n",
  );
  const silent = join(dirname(outMp4), "visuals.mp4");
  const v = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-vf",
      "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p",
      "-an",
      "-t",
      "21",
      silent,
    ],
    { encoding: "utf8" },
  );
  if (v.status !== 0) {
    return { ok: false, stderr: v.stderr };
  }
  const a = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      silent,
      "-i",
      AUDIO_NARR,
      "-i",
      AUDIO_MUSIC,
      "-filter_complex",
      "[1:a]volume=1.15[n];[2:a]volume=0.22[m];[n][m]amix=inputs=2:duration=first:dropout_transition=2,alimiter=limit=0.95[a]",
      "-map",
      "0:v",
      "-map",
      "[a]",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-shortest",
      "-t",
      "21",
      outMp4,
    ],
    { encoding: "utf8" },
  );
  return { ok: a.status === 0, stderr: a.stderr, outMp4 };
}

async function runProvider(name, {
  key,
  creditsBeforeFn,
  creditsAfterFn,
  uploadFn,
  generateFn,
  estimatedCreditsPerShot,
}) {
  const dir = join(OUT_ROOT, name);
  ensureDir(join(dir, "raw"));
  ensureDir(join(dir, "uploads"));
  const report = {
    provider: name,
    startedAt: new Date().toISOString(),
    creditsBefore: null,
    creditsAfter: null,
    creditsConsumed: null,
    shots: [],
    retries: 0,
    failures: 0,
    successes: 0,
    masterPath: null,
    blockedReason: null,
    notes: [],
  };

  if (!key) {
    report.blockedReason = "API key missing";
    writeJson(join(dir, "run-report.json"), report);
    return report;
  }

  report.creditsBefore = await creditsBeforeFn(key);
  const affordable = Number.isFinite(report.creditsBefore)
    ? Math.floor(report.creditsBefore / estimatedCreditsPerShot)
    : 0;
  if (affordable < 1) {
    report.blockedReason = `Insufficient credits for even 1 Veo Fast shot (balance=${report.creditsBefore}, need~${estimatedCreditsPerShot})`;
    writeJson(join(dir, "run-report.json"), report);
    return report;
  }

  const planned = SHOTS.slice(0, Math.min(SHOTS.length, affordable));
  if (planned.length < SHOTS.length) {
    report.notes.push(
      `Partial Short only: affordableShots=${planned.length}/${SHOTS.length} (balance=${report.creditsBefore})`,
    );
  }

  const localShots = [];
  for (const shot of planned) {
    const kf = join(KEYFRAMES, shot.keyframe);
    if (!existsSync(kf)) {
      report.failures += 1;
      report.shots.push({ id: shot.id, ok: false, error: `missing keyframe ${kf}` });
      continue;
    }
    const upload = await uploadFn(key, kf, `${name}-${shot.id}.png`);
    writeJson(join(dir, "uploads", `${shot.id}.json`), {
      status: upload.status,
      url: upload.url,
      body: upload.json,
    });
    if (!upload.url) {
      report.failures += 1;
      report.shots.push({
        id: shot.id,
        ok: false,
        error: "upload failed",
        uploadStatus: upload.status,
        uploadBody: upload.json,
      });
      continue;
    }
    const gen = await generateFn(key, shot, upload.url);
    const rawPath = join(dir, "raw", `${shot.id}.mp4`);
    if (gen.ok && gen.videoUrl) {
      await downloadFile(gen.videoUrl, rawPath);
      report.successes += 1;
      localShots.push(rawPath);
    } else {
      report.failures += 1;
    }
    report.shots.push({
      id: shot.id,
      ok: gen.ok,
      taskId: gen.taskId,
      videoUrl: gen.videoUrl,
      localPath: gen.ok ? rawPath : null,
      elapsedMs: gen.elapsedMs,
      creditsCharged: gen.creditsCharged ?? gen.creditsHint ?? null,
      error: gen.error || null,
      createStatus: gen.create?.status,
      createBody: gen.create?.json,
      pollBody: gen.poll?.json,
    });
  }

  report.creditsAfter = await creditsAfterFn(key);
  if (
    Number.isFinite(report.creditsBefore) &&
    Number.isFinite(report.creditsAfter)
  ) {
    report.creditsConsumed = report.creditsBefore - report.creditsAfter;
  }

  if (localShots.length === SHOTS.length) {
    const master = join(dir, `${name}-benchmark-short.mp4`);
    const mux = assembleMaster(localShots, master);
    report.masterPath = mux.ok ? master : null;
    if (!mux.ok) report.notes.push(`mux failed: ${(mux.stderr || "").slice(0, 400)}`);
  } else if (localShots.length > 0) {
    report.notes.push(
      `Skipped full 21s mux — only ${localShots.length}/${SHOTS.length} shots generated.`,
    );
  }

  report.finishedAt = new Date().toISOString();
  writeJson(join(dir, "run-report.json"), report);
  return report;
}

async function main() {
  ensureDir(OUT_ROOT);
  const which = (process.env.PROVIDER || "both").toLowerCase();
  const summary = {
    isolated: true,
    productionUntouched: true,
    startedAt: new Date().toISOString(),
    providers: {},
  };

  if (which === "kie" || which === "both") {
    summary.providers.kie = await runProvider("kie", {
      key: loadEnvKey("KIE_API_KEY"),
      creditsBeforeFn: kieCredits,
      creditsAfterFn: kieCredits,
      // KIE Fast listed ~60–80 credits/clip
      estimatedCreditsPerShot: 60,
      uploadFn: async (key, path, fileName) => kieUploadPng(key, path, fileName),
      generateFn: kieGenerateShot,
    });
  }

  if (which === "youbot" || which === "both") {
    summary.providers.youbot = await runProvider("youbot", {
      key: loadEnvKey("YOUBOT_API_KEY"),
      creditsBeforeFn: youbotCredits,
      creditsAfterFn: youbotCredits,
      // you.bot Veo Fast listed ~58–63 credits/call
      estimatedCreditsPerShot: 58,
      uploadFn: async (key, path) => youbotUploadPng(key, path),
      generateFn: youbotGenerateShot,
    });
  }

  summary.finishedAt = new Date().toISOString();
  summary.fingerprint = createHash("sha1")
    .update(JSON.stringify(summary.providers))
    .digest("hex")
    .slice(0, 12);
  writeJson(join(OUT_ROOT, "benchmark-summary.json"), summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
