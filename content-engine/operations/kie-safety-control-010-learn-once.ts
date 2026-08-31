/**
 * ONE-SHOT KIE safety control — Golden 010 learn WITHOUT memory frame.
 * HARD RULE: exactly one POST to /veo/generate. No silence retry. No fallback.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kieCredits, kieUploadImage } from "../asset-engine/providers/kie-video/client.js";
import { loadAmyNestEnvFiles } from "./env/load-env.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const MAIN = "/Users/macbook/AmyNestProject/AmyNest-AI";
loadAmyNestEnvFiles(REPO);
loadAmyNestEnvFiles(MAIN);

const apiKey = process.env.KIE_API_KEY?.trim() || "";
if (!apiKey) {
  console.error("STOP: KIE_API_KEY missing");
  process.exit(1);
}

const OUT = join(MAIN, ".amynest-assets", "kie-safety-control-010-learn");
mkdirSync(OUT, { recursive: true });

const GIRL = join(
  REPO,
  "content-engine/brand/assets/amy-girl-bible.jpeg",
);
const AMY = join(REPO, "content-engine/brand/assets/amy-ai-bible.jpeg");
const PROMPT_PATH = join(
  MAIN,
  ".amynest-assets/kie-safety-filter-forensic/prompt-010-learn-production.txt",
);

const MEMORY_FORBIDDEN =
  "9a043e55794c931842ea4f89a5e96f75570233aa6594983a8931140b5c7f164f";
const GIRL_EXPECT =
  "dc09bf858293f02de97d51e0cee1344257304d301916c7bc4f33490482f09f2f";
const AMY_EXPECT =
  "6f65f19d2ac5b6b48056370c943cb4c6f0665c3e9c65ad8f4d171acb73f543fb";

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    const path =
      u.pathname.length > 48
        ? `${u.pathname.slice(0, 24)}…${u.pathname.slice(-16)}`
        : u.pathname;
    return `${u.protocol}//${u.host}${path}`;
  } catch {
    return "[redacted-url]";
  }
}

async function httpJson(
  url: string,
  options: { method?: string; key: string; body?: unknown },
): Promise<{ ok: boolean; status: number; json: any }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.key}`,
    Accept: "application/json",
    "User-Agent": "AmyNestKieSafetyControl/1.0",
  };
  let body: string | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body,
  });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 2000) };
  }
  return { ok: res.ok, status: res.status, json };
}

let generateCalls = 0;

async function main() {
  if (!existsSync(GIRL) || !existsSync(AMY) || !existsSync(PROMPT_PATH)) {
    throw new Error("Required assets or prompt freeze missing");
  }

  const girlHash = sha256File(GIRL);
  const amyHash = sha256File(AMY);
  const prompt = readFileSync(PROMPT_PATH, "utf8");
  const promptHash = sha256Text(prompt);

  if (girlHash !== GIRL_EXPECT || amyHash !== AMY_EXPECT) {
    throw new Error(
      `Bible SHA mismatch — abort. girl=${girlHash} amy=${amyHash}`,
    );
  }
  if ([girlHash, amyHash].includes(MEMORY_FORBIDDEN)) {
    throw new Error("Memory hash somehow in bible paths — abort");
  }

  const creditsBefore = await kieCredits(apiKey);
  console.log("[control] creditsBefore=", creditsBefore);

  // Upload ONLY girl + amy (not counted as veo/generate)
  const girlUrl = await kieUploadImage(
    apiKey,
    GIRL,
    `control-girl-${Date.now()}.png`,
  );
  const amyUrl = await kieUploadImage(
    apiKey,
    AMY,
    `control-amy-${Date.now()}.png`,
  );

  const imageUrls = [girlUrl, amyUrl];
  const localPaths = [GIRL, AMY];
  const hashes = [girlHash, amyHash];

  // HARD VERIFY before generate
  if (imageUrls.length !== 2) {
    throw new Error(`Expected exactly 2 imageUrls, got ${imageUrls.length}`);
  }
  if (hashes.includes(MEMORY_FORBIDDEN)) {
    throw new Error("Memory frame present — abort before generate");
  }
  if (hashes[0] !== GIRL_EXPECT || hashes[1] !== AMY_EXPECT) {
    throw new Error("imageUrls order must be girl bible then amy bible");
  }

  const requestBody = {
    prompt,
    imageUrls,
    model: "veo3_fast",
    generationType: "REFERENCE_2_VIDEO",
    aspect_ratio: "9:16",
    resolution: "720p",
    duration: 8,
    enableTranslation: false,
  };

  const redactedPayload = {
    label: "CONTROL_NO_MEMORY_FRAME",
    promptHash,
    promptLen: prompt.length,
    promptPreview: prompt.slice(0, 160),
    model: requestBody.model,
    generationType: requestBody.generationType,
    aspect_ratio: requestBody.aspect_ratio,
    resolution: requestBody.resolution,
    duration: requestBody.duration,
    enableTranslation: requestBody.enableTranslation,
    imageUrls: imageUrls.map((u, i) => ({
      slot: i,
      role: i === 0 ? "canonical-girl-bible" : "canonical-amy-bible",
      sha256: hashes[i],
      path: localPaths[i],
      urlRedacted: redactUrl(u),
    })),
    memoryFramePresent: false,
    forbiddenMemorySha: MEMORY_FORBIDDEN,
    audioParams: [],
    negativePrompt: "NOT SENT",
  };

  console.log("\n======== FINAL REDACTED PAYLOAD (PRE-FLIGHT) ========");
  console.log(JSON.stringify(redactedPayload, null, 2));
  console.log("======== VERIFY: imageUrls exactly Girl bible + Amy bible ========");
  console.log("======== VERIFY: memory 9a043e… ABSENT ========\n");
  writeFileSync(
    join(OUT, "control-payload-redacted.json"),
    JSON.stringify(redactedPayload, null, 2),
  );

  // ===== ONE AND ONLY generate call =====
  if (generateCalls !== 0) {
    throw new Error("HARD STOP: generate already called");
  }
  generateCalls += 1;
  console.log("[control] EXECUTING SINGLE veo/generate (call #1 of 1)…");

  const create = await httpJson("https://api.kie.ai/api/v1/veo/generate", {
    method: "POST",
    key: apiKey,
    body: requestBody,
  });

  const taskId = create.json?.data?.taskId as string | undefined;
  const createRecord = {
    httpStatus: create.status,
    ok: create.ok,
    taskId: taskId ?? null,
    body: create.json,
  };
  writeFileSync(
    join(OUT, "control-create-response.json"),
    JSON.stringify(createRecord, null, 2),
  );
  console.log(
    "[control] create HTTP",
    create.status,
    "taskId=",
    taskId ?? "NONE",
  );

  let pollError: string | undefined;
  let pollSuccess = false;
  let pollAttempts = 0;
  let rawUri: string | undefined;
  const outputPath = join(OUT, "control-out.mp4");

  if (taskId) {
    for (; pollAttempts < 90; pollAttempts++) {
      await new Promise((r) => setTimeout(r, 8000));
      const poll = await httpJson(
        `https://api.kie.ai/api/v1/veo/record-info?taskId=${encodeURIComponent(taskId)}`,
        { key: apiKey },
      );
      const flag = poll.json?.data?.successFlag;
      if (flag === 1) {
        const urls = poll.json?.data?.response?.resultUrls || [];
        rawUri = urls[0];
        if (rawUri) {
          const res = await fetch(rawUri, {
            headers: { "User-Agent": "AmyNestKieSafetyControl/1.0" },
          });
          if (res.ok) {
            writeFileSync(outputPath, Buffer.from(await res.arrayBuffer()));
            pollSuccess = true;
          } else {
            pollError = `download failed HTTP ${res.status}`;
          }
        } else {
          pollError = "success without result URL";
        }
        writeFileSync(
          join(OUT, "control-poll-final.json"),
          JSON.stringify(poll.json, null, 2),
        );
        break;
      }
      if (flag === 2 || flag === 3) {
        pollError =
          poll.json?.data?.errorMessage || "KIE generation failed";
        writeFileSync(
          join(OUT, "control-poll-final.json"),
          JSON.stringify(poll.json, null, 2),
        );
        break;
      }
    }
    if (!pollSuccess && !pollError) {
      pollError = `timeout after ${pollAttempts} polls taskId=${taskId}`;
    }
  } else {
    pollError =
      typeof create.json === "object"
        ? JSON.stringify(create.json).slice(0, 800)
        : "create failed without taskId";
  }

  // HARD: never second generate
  if (generateCalls !== 1) {
    throw new Error(`HARD STOP: generateCalls=${generateCalls}`);
  }

  const creditsAfter = await kieCredits(apiKey);
  const result = {
    label: "CONTROL_NO_MEMORY_FRAME",
    generateCalls,
    creditsBefore,
    creditsAfter,
    creditsConsumed: Number((creditsBefore - creditsAfter).toFixed(4)),
    createHttpStatus: create.status,
    taskId: taskId ?? null,
    pollAttempts,
    pollSuccess,
    pollError: pollError ?? null,
    outputPath: pollSuccess ? outputPath : null,
    rawUriRedacted: rawUri ? redactUrl(rawUri) : null,
    payload: redactedPayload,
    providerCreateBody: create.json,
  };
  writeFileSync(join(OUT, "control-result.json"), JSON.stringify(result, null, 2));
  console.log("\n======== CONTROL RESULT ========");
  console.log(JSON.stringify(result, null, 2));
  console.log("\nONE CONTROL TEST EXECUTED — KIE GENERATION STOPPED.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
