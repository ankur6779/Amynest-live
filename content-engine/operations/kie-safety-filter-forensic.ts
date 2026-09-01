/**
 * DIAGNOSIS ONLY — KIE "restricted third-party content" safety isolation.
 * Create+poll with credit deltas. Does not modify production pipeline.
 *
 * Uses production diversity path to reconstruct failing prompts.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  statSync,
} from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { allGoldenSeeds } from "../golden-scripts/seeds.js";
import { buildGoldenScript } from "../golden-scripts/build.js";
import { buildGoldenVoiceAndCaptions } from "./golden-voice.js";
import { planCinematicShort } from "../creative-composition/plan.js";
import { performancePrompt } from "../creative-composition/performances.js";
import { wardrobeFor } from "../character-memory-engine/wardrobe.js";
import { runContentDiversityGate } from "../content-diversity/gate.js";
import { kieCredits, kieUploadImage } from "../asset-engine/providers/kie-video/client.js";
import { loadAmyNestEnvFiles } from "./env/load-env.js";
import type { ContentPackage } from "../types/content-package.js";
import { CONTENT_PACKAGE_VERSION } from "../types/content-package.js";
import { getTopicById } from "../topics/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const MAIN = "/Users/macbook/AmyNestProject/AmyNest-AI";
loadAmyNestEnvFiles(REPO);
loadAmyNestEnvFiles(MAIN);

const OUT = join(REPO, ".amynest-assets", "kie-safety-filter-forensic");
mkdirSync(OUT, { recursive: true });

const apiKey = process.env.KIE_API_KEY?.trim() || "";
if (!apiKey) {
  console.error("STOP: KIE_API_KEY missing");
  process.exit(1);
}

const MINIMAL_PROMPT =
  "Create a short cinematic scene using the supplied character reference images. Preserve the visual identity of the supplied characters. Natural family environment, cinematic lighting, non-violent educational interaction.";

const SILENCE_SUFFIX =
  "\n\nSILENT VIDEO ONLY. No speech, no dialogue, no singing. Ambient silence. Visual performance only.";

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function httpJson(
  url: string,
  options: { method?: string; key: string; body?: unknown },
): Promise<{ ok: boolean; status: number; json: any }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.key}`,
    Accept: "application/json",
    "User-Agent": "AmyNestKieSafetyForensic/1.0",
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

function packageFor(num: number): ContentPackage {
  const script = buildGoldenScript(allGoldenSeeds()[num - 1]!, num);
  const { voiceScript, captions } = buildGoldenVoiceAndCaptions(script, 21);
  const base =
    getTopicById("parenting-001") ??
    ({
      id: "parenting-001",
      title: script.topic,
      category: "Parenting" as const,
      difficulty: "beginner" as const,
      ageGroup: "all" as const,
      keywords: ["amynest"],
      cta: "Download AmyNest AI",
      priority: 10,
      estimatedDuration: 21,
      videoStyle: "short" as const,
    });
  return {
    topic: { ...base, title: script.topic, category: "Parenting" as const },
    title: script.title,
    alternateTitles: [script.title],
    hook: script.selectedHook.text,
    openingQuestion: script.selectedHook.text,
    story: script.parentingSituation,
    keyPoints: [script.hopeClose],
    cta: "Download AmyNest AI",
    voiceScript,
    captions,
    sceneScript: script.storyFlow?.map((b, i) => `SCENE ${i + 1} | ${b}`).join("\n") || "",
    description: script.title,
    hashtags: ["AmyNest"],
    keywords: ["amynest", script.featureName.toLowerCase()],
    seoScore: 80,
    readingTime: Math.round(voiceScript.split(/\s+/).length / 2.5),
    estimatedDuration: 21,
    language: "en-IN",
    provider: "golden-script",
    generatedAt: new Date().toISOString(),
    version: CONTENT_PACKAGE_VERSION,
  };
}

function buildProductionFailingPrompts(): {
  golden010Learn: { shot: any; prompt: string; negativePrompt: string; planNotes: any };
  golden011Host: { shot: any; prompt: string; negativePrompt: string; planNotes: any };
  golden010PlanSummary: any;
  golden011PlanSummary: any;
} {
  const out: any = {};
  for (const num of [10, 11] as const) {
    const content = packageFor(num);
    const basePlan = planCinematicShort(content, 21);
    const diversity = runContentDiversityGate({
      content,
      plan: basePlan,
      goldenScriptId: `golden-${String(num).padStart(3, "0")}`,
      outputDir: join(OUT, `diversity-${num}`),
    });
    let prevMem: any = null;
    let prevStory: any = null;
    const shotSummaries = [];
    for (const shot of diversity.plan.shots) {
      const prompted = performancePrompt(shot as any, prevMem, prevStory);
      if (prompted.memory) prevMem = prompted.memory;
      if (prompted.story) prevStory = prompted.story;
      shotSummaries.push({
        id: shot.id,
        character: shot.character,
        durationSeconds: shot.durationSeconds,
        environment: shot.environment,
        spokenLine: shot.spokenLine || shot.caption,
        allowAppUi: (shot as any).allowAppUi,
        notes: shot.notes,
        promptHash: sha256Text(prompted.prompt).slice(0, 16),
        promptLen: prompted.prompt.length,
      });
      if (num === 10 && shot.id === "shot-amy-girl-learn") {
        out.golden010Learn = {
          shot: {
            id: shot.id,
            character: shot.character,
            durationSeconds: shot.durationSeconds,
            environment: shot.environment,
            caption: shot.caption,
            spokenLine: shot.spokenLine,
            allowAppUi: (shot as any).allowAppUi,
            interaction: (shot as any).interaction,
            notes: shot.notes,
          },
          prompt: prompted.prompt,
          negativePrompt: prompted.negativePrompt,
        };
      }
      if (num === 11 && shot.id === "shot-amy-host") {
        out.golden011Host = {
          shot: {
            id: shot.id,
            character: shot.character,
            durationSeconds: shot.durationSeconds,
            environment: shot.environment,
            caption: shot.caption,
            spokenLine: shot.spokenLine,
            allowAppUi: (shot as any).allowAppUi,
            interaction: (shot as any).interaction,
            notes: shot.notes,
          },
          prompt: prompted.prompt,
          negativePrompt: prompted.negativePrompt,
        };
      }
    }
    if (num === 10) out.golden010PlanSummary = shotSummaries;
    if (num === 11) out.golden011PlanSummary = shotSummaries;
  }
  return out;
}

function inspectAsset(path: string, role: string) {
  const hash = sha256File(path);
  const st = statSync(path);
  let dims: string | undefined;
  let format: string | undefined;
  try {
    const id = execFileSync("file", ["-b", path], { encoding: "utf8" }).trim();
    format = id;
    const sips = execFileSync(
      "sips",
      ["-g", "pixelWidth", "-g", "pixelHeight", path],
      { encoding: "utf8" },
    );
    const w = /pixelWidth:\s+(\d+)/.exec(sips)?.[1];
    const h = /pixelHeight:\s+(\d+)/.exec(sips)?.[1];
    if (w && h) dims = `${w}x${h}`;
  } catch {
    /* optional */
  }
  // Visual inspection notes from prior forensic reads / filenames (no mutation)
  const name = basename(path).toLowerCase();
  const notes: string[] = [];
  if (/bible|amy-ai|amy-girl|amy-boy/.test(name)) notes.push("canonical-character-bible");
  if (/identity|last\.png|memory/.test(name)) notes.push("generated-continuity-frame");
  return {
    role,
    filename: basename(path),
    path,
    sha256: hash,
    bytes: st.size,
    dimensions: dims,
    format,
    source: path.includes("brand/assets")
      ? "Official Character Bible (content-engine/brand/assets)"
      : path.includes("character-memory")
        ? "Scene memory last-frame (pipeline-generated)"
        : path.includes("keyframes")
          ? "Identity keyframe (pipeline-generated)"
          : "other",
    visualFlagsObserved: {
      amyNestOrAmyAiLogoText:
        /amy-ai-bible|shot-amy-host/.test(name) || role.includes("amy"),
      trademarkTextOnCap: role.includes("amy-ai") || role.includes("amy"),
      brandedClothingPurpleHoodie: role.includes("girl") || role.includes("boy"),
      uiScreenshots: /memory|last/.test(name) ? "possible-in-memory-frame" : "none-expected",
      thirdPartyCharacterLikeness: "UNKNOWN — requires human review; not asserted",
      copyrightedArtwork: "UNKNOWN — not asserted",
      otherRecognizableBrand: "AmyAI text on hat (first-party brand) — PROVEN for Amy bible/host frames",
    },
    notes,
  };
}

type ProbeResult = {
  caseId: string;
  promptKind: "production" | "minimal";
  silent: boolean;
  refs: string[];
  refRoles: string[];
  createHttpStatus: number;
  createOk: boolean;
  createBodySnippet: string;
  taskId?: string;
  pollError?: string;
  pollSuccess?: boolean;
  creditsBefore: number;
  creditsAfterCreate: number;
  creditsAfterPoll?: number;
  creditDeltaCreate: number;
  creditDeltaTotal?: number;
  generationType: string;
  model: string;
  duration: number;
  aspectRatio: string;
  resolution: string;
  enableTranslation: boolean;
  imageUrlCount: number;
  promptHash: string;
  promptLen: number;
  negativePromptPresent: boolean;
  audioParamsInBody: string[];
  safety400: boolean;
  thirdPartySafety: boolean;
};

async function probeOnce(options: {
  caseId: string;
  prompt: string;
  promptKind: "production" | "minimal";
  imagePaths: string[];
  refRoles: string[];
  silent?: boolean;
  pollIfAccepted?: boolean;
  generationTypeOverride?: "TEXT_2_VIDEO" | "REFERENCE_2_VIDEO" | "FIRST_AND_LAST_FRAMES_2_VIDEO";
}): Promise<ProbeResult> {
  const prompt = options.silent ? `${options.prompt}${SILENCE_SUFFIX}` : options.prompt;
  const creditsBefore = await kieCredits(apiKey);
  const imageUrls: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < options.imagePaths.length; i++) {
    const p = options.imagePaths[i]!;
    hashes.push(sha256File(p));
    const url = await kieUploadImage(
      apiKey,
      p,
      `safety-forensic-${Date.now()}-${i}.png`,
    );
    imageUrls.push(url);
  }

  let generationType =
    options.generationTypeOverride ??
    (imageUrls.length >= 2
      ? "REFERENCE_2_VIDEO"
      : imageUrls.length === 1
        ? "FIRST_AND_LAST_FRAMES_2_VIDEO"
        : "TEXT_2_VIDEO");
  const duration = generationType === "REFERENCE_2_VIDEO" ? 8 : 6;
  const model = "veo3_fast";
  const resolution = "720p";
  const aspectRatio = "9:16";
  const enableTranslation = false;

  const requestBody: Record<string, unknown> = {
    prompt,
    model,
    generationType,
    aspect_ratio: aspectRatio,
    resolution,
    duration,
    enableTranslation,
  };
  if (imageUrls.length > 0) {
    requestBody.imageUrls = imageUrls;
  }

  // Document absence of audio fields — production client never sends them
  const audioParamsInBody = Object.keys(requestBody).filter((k) =>
    /audio|sound|voice|speech|mute|silent/i.test(k),
  );

  const create = await httpJson("https://api.kie.ai/api/v1/veo/generate", {
    method: "POST",
    key: apiKey,
    body: requestBody,
  });
  const creditsAfterCreate = await kieCredits(apiKey);
  const taskId = create.json?.data?.taskId as string | undefined;
  const errMsg = JSON.stringify(create.json).slice(0, 800);
  const thirdPartySafety =
    /restricted third-party content|safety filters/i.test(errMsg) ||
    /restricted third-party content|safety filters/i.test(
      String(create.json?.msg || create.json?.message || ""),
    );
  const safety400 =
    create.status === 400 &&
    /safety|third-party|blocked/i.test(errMsg + String(create.json?.msg || ""));

  const result: ProbeResult = {
    caseId: options.caseId,
    promptKind: options.promptKind,
    silent: Boolean(options.silent),
    refs: options.imagePaths,
    refRoles: options.refRoles,
    createHttpStatus: create.status,
    createOk: Boolean(create.ok && taskId),
    createBodySnippet: errMsg,
    taskId,
    creditsBefore,
    creditsAfterCreate,
    creditDeltaCreate: Number((creditsAfterCreate - creditsBefore).toFixed(4)),
    generationType,
    model,
    duration,
    aspectRatio,
    resolution,
    enableTranslation,
    imageUrlCount: imageUrls.length,
    promptHash: sha256Text(prompt).slice(0, 16),
    promptLen: prompt.length,
    negativePromptPresent: false, // production kie client does not send negativePrompt
    audioParamsInBody,
    safety400,
    thirdPartySafety,
  };

  writeFileSync(
    join(OUT, "cases", `${options.caseId}.json`),
    JSON.stringify(
      {
        ...result,
        requestBodyRedacted: {
          ...requestBody,
          imageUrls: imageUrls.map(
            (u, i) => `uploaded[${i}] hash=${hashes[i]?.slice(0, 12)} urlRedacted`,
          ),
          promptPreview: prompt.slice(0, 240),
        },
        referenceHashes: hashes,
      },
      null,
      2,
    ),
  );

  if (!taskId || options.pollIfAccepted === false) {
    return result;
  }

  // Poll — safety may appear here (as in production) even when create returns 200
  let pollError: string | undefined;
  let pollSuccess = false;
  for (let i = 0; i < 90; i++) {
    await sleep(8000);
    const poll = await httpJson(
      `https://api.kie.ai/api/v1/veo/record-info?taskId=${encodeURIComponent(taskId)}`,
      { key: apiKey },
    );
    const flag = poll.json?.data?.successFlag;
    if (flag === 1) {
      pollSuccess = true;
      break;
    }
    if (flag === 2 || flag === 3) {
      pollError = poll.json?.data?.errorMessage || "KIE generation failed";
      break;
    }
  }
  const creditsAfterPoll = await kieCredits(apiKey);
  result.pollError = pollError;
  result.pollSuccess = pollSuccess;
  result.creditsAfterPoll = creditsAfterPoll;
  result.creditDeltaTotal = Number((creditsAfterPoll - creditsBefore).toFixed(4));
  if (pollError && /restricted third-party|safety filters/i.test(pollError)) {
    result.thirdPartySafety = true;
  }
  writeFileSync(
    join(OUT, "cases", `${options.caseId}.json`),
    JSON.stringify(result, null, 2),
  );
  return result;
}

async function main() {
  mkdirSync(join(OUT, "cases"), { recursive: true });
  console.log("[safety-forensic] reconstructing production diversified prompts…");
  const prompts = buildProductionFailingPrompts();
  writeFileSync(join(OUT, "production-failing-prompts.json"), JSON.stringify({
    golden010Learn: {
      ...prompts.golden010Learn,
      prompt: undefined,
      promptHash: sha256Text(prompts.golden010Learn.prompt).slice(0, 16),
      promptLen: prompts.golden010Learn.prompt.length,
      thirdPartyIpMentions: Array.from(
        prompts.golden010Learn.prompt.matchAll(
          /Disney\+|Pixar|Paddington|Detective Pikachu|Netflix|Ted\b|Google Play|App Store|Play Store/gi,
        ),
      ).map((m) => m[0]),
    },
    golden011Host: {
      ...prompts.golden011Host,
      prompt: undefined,
      promptHash: sha256Text(prompts.golden011Host.prompt).slice(0, 16),
      promptLen: prompts.golden011Host.prompt.length,
      thirdPartyIpMentions: Array.from(
        prompts.golden011Host.prompt.matchAll(
          /Disney\+|Pixar|Paddington|Detective Pikachu|Netflix|Ted\b|Google Play|App Store|Play Store/gi,
        ),
      ).map((m) => m[0]),
    },
    golden010PlanSummary: prompts.golden010PlanSummary,
    golden011PlanSummary: prompts.golden011PlanSummary,
  }, null, 2));
  writeFileSync(join(OUT, "prompt-010-learn-production.txt"), prompts.golden010Learn.prompt);
  writeFileSync(join(OUT, "prompt-011-host-production.txt"), prompts.golden011Host.prompt);
  writeFileSync(
    join(OUT, "negative-010-learn.txt"),
    prompts.golden010Learn.negativePrompt || "(none — not sent on KIE wire)",
  );

  const amy = wardrobeFor("amy-ai").bibleAsset;
  const girl = wardrobeFor("amy-girl").bibleAsset;
  const boy = wardrobeFor("amy-boy").bibleAsset;
  const mem010 = join(
    MAIN,
    ".amynest-assets/p0-regression-golden-010/work/cinematic/character-memory/shot-amy-host-last.png",
  );
  const hostId011 = join(
    MAIN,
    ".amynest-assets/p0-regression-golden-011/work/cinematic/keyframes/shot-amy-host-identity.png",
  );

  const assets = [
    inspectAsset(amy, "amy-ai-bible"),
    inspectAsset(girl, "amy-girl-bible"),
    inspectAsset(boy, "amy-boy-bible"),
    ...(existsSync(mem010) ? [inspectAsset(mem010, "010-host-last-memory")] : []),
    ...(existsSync(hostId011) ? [inspectAsset(hostId011, "011-host-identity")] : []),
  ];
  writeFileSync(join(OUT, "asset-metadata.json"), JSON.stringify(assets, null, 2));

  // Captured failed-request characteristics (from production client body shape)
  const failedRequestShape = {
    note: "Production kieGenerateVideo body — negativePrompt is NOT sent; TTS audio is NOT sent",
    model: "veo3_fast",
    duration: 8,
    generationType: "REFERENCE_2_VIDEO",
    aspect_ratio: "9:16",
    resolution: "720p",
    enableTranslation: false,
    imageUrlsCount: 3,
    audioParameters: "NONE in HTTP body (Veo may still synthesize native audio from prompt dialogue)",
    golden010: {
      failShot: "shot-amy-girl-learn",
      refRoles: ["amy-girl-bible", "shot-amy-host-last memory", "amy-ai-bible"],
      hashesFromLog: [
        "dc09bf858293f02de97d51e0cee1344257304d301916c7bc4f33490482f09f2f",
        "9a043e55794c931842ea4f89a5e96f75570233aa6594983a8931140b5c7f164f",
        "6f65f19d2ac5b6b48056370c943cb4c6f0665c3e9c65ad8f4d171acb73f543fb",
      ],
      providerError:
        "Request blocked: The input content was flagged by safety filters for involving restricted third-party content.",
      reportTimestamp: "2026-08-19T18:43:39.263Z",
    },
    golden011: {
      failShot: "shot-amy-host",
      refRoles: ["amy-ai-bible", "shot-amy-host-identity", "amy-girl-bible"],
      hashesFromLog: [
        "6f65f19d2ac5b6b48056370c943cb4c6f0665c3e9c65ad8f4d171acb73f543fb",
        "4241de9b84cf83a32ef29be93874b2a5a99d36c68d2111a8287175bcee990274",
        "dc09bf858293f02de97d51e0cee1344257304d301916c7bc4f33490482f09f2f",
      ],
      providerError:
        "Request blocked: The input content was flagged by safety filters for involving restricted third-party content.",
    },
  };
  writeFileSync(join(OUT, "failed-request-shape.json"), JSON.stringify(failedRequestShape, null, 2));

  const results: ProbeResult[] = [];
  const push = async (r: ProbeResult) => {
    results.push(r);
    writeFileSync(join(OUT, "isolation-results.json"), JSON.stringify(results, null, 2));
    console.log(
      `[safety-forensic] ${r.caseId} create=${r.createHttpStatus} ok=${r.createOk} safety400=${r.safety400} thirdParty=${r.thirdPartySafety} pollErr=${(r.pollError || "").slice(0, 100)} Δc=${r.creditDeltaTotal ?? r.creditDeltaCreate}`,
    );
  };

  // --- Reference isolation with MINIMAL prompt (poll to catch generation-time safety) ---
  const refCases: Array<{ id: string; paths: string[]; roles: string[]; gen?: any }> = [
    { id: "A-no-refs", paths: [], roles: [], gen: "TEXT_2_VIDEO" },
    { id: "B-amy-only", paths: [amy], roles: ["amy-ai-bible"] },
    { id: "C-girl-only", paths: [girl], roles: ["amy-girl-bible"] },
    { id: "D-boy-only", paths: [boy], roles: ["amy-boy-bible"] },
    { id: "E-amy-girl", paths: [amy, girl], roles: ["amy-ai-bible", "amy-girl-bible"] },
    { id: "F-amy-boy", paths: [amy, boy], roles: ["amy-ai-bible", "amy-boy-bible"] },
    { id: "G-girl-boy", paths: [girl, boy], roles: ["amy-girl-bible", "amy-boy-bible"] },
    { id: "H-amy-girl-boy", paths: [amy, girl, boy], roles: ["amy-ai-bible", "amy-girl-bible", "amy-boy-bible"] },
  ];

  for (const c of refCases) {
    // For no-refs, minimal prompt without "supplied character reference images"
    const prompt =
      c.paths.length === 0
        ? "Create a short cinematic scene of a friendly stylized robot companion in a natural family home. Cinematic lighting, non-violent educational interaction."
        : MINIMAL_PROMPT;
    await push(
      await probeOnce({
        caseId: `ref-${c.id}-minimal`,
        prompt,
        promptKind: "minimal",
        imagePaths: c.paths,
        refRoles: c.roles,
        silent: true,
        pollIfAccepted: true,
        generationTypeOverride: c.gen,
      }),
    );
    await sleep(1500);
  }

  // --- Production prompt isolation (010 learn, production 3-ref stack) ---
  const prod010Refs = [girl, mem010, amy].filter(existsSync);
  await push(
    await probeOnce({
      caseId: "010-learn-production-prompt-refs3",
      prompt: prompts.golden010Learn.prompt,
      promptKind: "production",
      imagePaths: prod010Refs,
      refRoles: ["girl-bible", "010-memory", "amy-bible"],
      silent: false,
      pollIfAccepted: true,
    }),
  );
  await push(
    await probeOnce({
      caseId: "010-learn-minimal-prompt-refs3",
      prompt: MINIMAL_PROMPT,
      promptKind: "minimal",
      imagePaths: prod010Refs,
      refRoles: ["girl-bible", "010-memory", "amy-bible"],
      silent: true,
      pollIfAccepted: true,
    }),
  );

  // Audio isolation: same visual, silence suffix vs full (no separate audio API field)
  await push(
    await probeOnce({
      caseId: "010-learn-production-prompt-refs3-silent",
      prompt: prompts.golden010Learn.prompt,
      promptKind: "production",
      imagePaths: prod010Refs,
      refRoles: ["girl-bible", "010-memory", "amy-bible"],
      silent: true,
      pollIfAccepted: true,
    }),
  );

  // --- 011 host production ---
  const prod011Refs = [amy, hostId011, girl].filter(existsSync);
  await push(
    await probeOnce({
      caseId: "011-host-production-prompt-refs3",
      prompt: prompts.golden011Host.prompt,
      promptKind: "production",
      imagePaths: prod011Refs,
      refRoles: ["amy-bible", "011-identity", "girl-bible"],
      silent: false,
      pollIfAccepted: true,
    }),
  );
  await push(
    await probeOnce({
      caseId: "011-host-minimal-prompt-refs3",
      prompt: MINIMAL_PROMPT,
      promptKind: "minimal",
      imagePaths: prod011Refs,
      refRoles: ["amy-bible", "011-identity", "girl-bible"],
      silent: true,
      pollIfAccepted: true,
    }),
  );

  // Prompt-only third-party IP strip test: production prompt with Disney+/Pixar/etc removed
  const scrubbed010 = prompts.golden010Learn.prompt
    .replace(/Disney\+\/?Pixar-quality/gi, "premium family-film quality")
    .replace(/Disney\+/gi, "premium family film")
    .replace(/Pixar/gi, "premium animation")
    .replace(/Paddington\s*\/\s*Ted\s*\/\s*Detective Pikachu/gi, "integrated stylized character in live-action world")
    .replace(/Paddington/gi, "stylized companion")
    .replace(/Detective Pikachu/gi, "stylized companion")
    .replace(/\bTed\b/gi, "stylized companion")
    .replace(/Netflix/gi, "premium streaming")
    .replace(/Google Play|App Store|Play Store/gi, "app store");
  await push(
    await probeOnce({
      caseId: "010-learn-scrubbed-ip-prompt-refs3-silent",
      prompt: scrubbed010,
      promptKind: "production",
      imagePaths: prod010Refs,
      refRoles: ["girl-bible", "010-memory", "amy-bible"],
      silent: true,
      pollIfAccepted: true,
    }),
  );

  console.log("[safety-forensic] done →", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
