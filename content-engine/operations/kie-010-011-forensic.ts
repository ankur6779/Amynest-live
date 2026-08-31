/**
 * DIAGNOSIS ONLY — Golden 010/011 KIE/Veo compose failure isolation.
 * Uses production kieGenerateVideo path. Does not modify pipeline code.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { allGoldenSeeds } from "../golden-scripts/seeds.js";
import { buildGoldenScript } from "../golden-scripts/build.js";
import { buildGoldenVoiceAndCaptions } from "./golden-voice.js";
import { planCinematicShort } from "../creative-composition/plan.js";
import { performancePrompt } from "../creative-composition/performances.js";
import { wardrobeFor } from "../character-memory-engine/wardrobe.js";
import { kieGenerateVideo, kieCredits } from "../asset-engine/providers/kie-video/client.js";
import { loadAmyNestEnvFiles } from "./env/load-env.js";
import type { ContentPackage } from "../types/content-package.js";
import { CONTENT_PACKAGE_VERSION } from "../types/content-package.js";
import { getTopicById } from "../topics/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const MAIN = "/Users/macbook/AmyNestProject/AmyNest-AI";
loadAmyNestEnvFiles(REPO);
loadAmyNestEnvFiles(MAIN);

const OUT = join(REPO, ".amynest-assets", "kie-010-011-forensic");
mkdirSync(OUT, { recursive: true });

const apiKey = process.env.KIE_API_KEY?.trim() || "";
if (!apiKey) {
  console.error("STOP: KIE_API_KEY missing");
  process.exit(1);
}

function sha(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function packageFor(num: number): {
  script: ReturnType<typeof buildGoldenScript>;
  content: ContentPackage;
} {
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
  const content: ContentPackage = {
    id: `forensic-${script.id}`,
    version: CONTENT_PACKAGE_VERSION,
    createdAt: new Date().toISOString(),
    title: script.title,
    topic: { ...base, title: script.topic, category: script.category as any },
    hook: script.selectedHook.text,
    voiceScript,
    captions,
    sceneScript: script.storyFlow?.map((b, i) => `SCENE ${i + 1} | ${b}`).join("\n") || "",
    description: script.title,
    hashtags: ["AmyNest"],
    keywords: ["amynest", script.featureName.toLowerCase()],
    cta: "Download AmyNest AI",
    readingTime: Math.round(voiceScript.split(/\s+/).length / 2.5),
    estimatedDuration: 21,
    language: "en-IN",
    provider: "golden-script",
  };
  return { script, content };
}

function safetyFlags(text: string): string[] {
  const flags: string[] = [];
  const checks: [RegExp, string][] = [
    [/child|kids|toddler|girl|boy/i, "child-related"],
    [/touch|shoulder|hand|hug|hold|contact|high-?five/i, "physical-contact"],
    [/pronunciation|speech|mic|fluency|coach/i, "speech/medical-adjacent"],
    [/exercise|body|balance|freeze|restless|naughty|behavior/i, "body/behavior"],
    [/mirror|practice|nook/i, "practice-environment"],
    [/health|lab|wellness|motion/i, "health-terminology"],
    [/Google Play|App Store|AmyNest|Speech Coach|Play Store/i, "brand/product"],
    [/Disney\+|Pixar|Paddington|Detective Pikachu|Netflix/i, "third-party-ip"],
    [/dialogue|speak|say|mouth|lip/i, "dialogue/mouth"],
  ];
  for (const [re, label] of checks) if (re.test(text)) flags.push(label);
  return flags;
}

type ShotProbe = {
  golden: string;
  shotId: string;
  character: string;
  durationSeconds: number;
  caption: string;
  spokenLine: string;
  environment: string;
  interaction?: string;
  actionBeforeDialogue?: string;
  speechMode?: string;
  allowAppUi?: boolean;
  prompt: string;
  promptHash: string;
  promptFlags: string[];
};

function buildShotProbes(num: number): ShotProbe[] {
  const { content } = packageFor(num);
  const plan = planCinematicShort(content, 21);
  const probes: ShotProbe[] = [];
  let prevMem: any = null;
  let prevStory: any = null;
  for (const shot of plan.shots) {
    const prompted = performancePrompt(shot as any, prevMem, prevStory);
    if (prompted.memory) prevMem = prompted.memory;
    if (prompted.story) prevStory = prompted.story;
    probes.push({
      golden: `golden-${String(num).padStart(3, "0")}`,
      shotId: shot.id,
      character: shot.character,
      durationSeconds: shot.durationSeconds,
      caption: shot.caption,
      spokenLine: shot.spokenLine || shot.caption,
      environment: String((shot as any).environment || ""),
      interaction: (shot as any).interaction,
      actionBeforeDialogue: (shot as any).actionBeforeDialogue,
      speechMode: (shot as any).speechMode,
      allowAppUi: (shot as any).allowAppUi,
      prompt: prompted.prompt,
      promptHash: sha(prompted.prompt).slice(0, 16),
      promptFlags: safetyFlags(
        [
          prompted.prompt,
          shot.caption,
          shot.spokenLine,
          (shot as any).interaction,
          (shot as any).actionBeforeDialogue,
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    });
  }
  return probes;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function runKieCase(options: {
  caseId: string;
  prompt: string;
  imagePaths: string[];
  durationSeconds: number;
  silentPromptSuffix?: boolean;
}): Promise<{
  caseId: string;
  ok: boolean;
  error?: string;
  taskId?: string;
  imageUrlCount: number;
  generationType?: string;
  durationSeconds?: number;
  promptHash: string;
  refs: string[];
}> {
  const work = join(OUT, "cases", options.caseId);
  mkdirSync(work, { recursive: true });
  const prompt = options.silentPromptSuffix
    ? `${options.prompt}\n\nSILENT VIDEO ONLY. No speech, no dialogue, no singing. Ambient silence. Visual performance only.`
    : options.prompt;
  writeFileSync(join(work, "prompt.txt"), prompt);
  writeFileSync(join(work, "images.json"), JSON.stringify(options.imagePaths, null, 2));

  const outPath = join(work, "out.mp4");
  const refs = options.imagePaths.filter(existsSync);
  try {
    const result = await kieGenerateVideo({
      apiKey,
      prompt,
      imagePath: refs[0]!,
      referenceImagePaths: refs,
      // Only force REFERENCE when ≥2 images; single image → FIRST_AND_LAST
      requiredReferencePaths: refs.length >= 2 ? refs.slice(0, 1) : [],
      outputPath: outPath,
      model: "veo3_fast",
      resolution: "720p",
      durationSeconds: options.durationSeconds as any,
      aspectRatio: "9:16",
      character: options.caseId,
    });
    return {
      caseId: options.caseId,
      ok: true,
      taskId: result.taskId,
      imageUrlCount: result.requestEvidence.imageUrlCount,
      generationType: result.requestEvidence.generationType,
      durationSeconds: result.requestEvidence.durationSeconds,
      promptHash: sha(prompt).slice(0, 16),
      refs,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    writeFileSync(join(work, "error.txt"), error);
    return {
      caseId: options.caseId,
      ok: false,
      error,
      imageUrlCount: refs.length,
      promptHash: sha(prompt).slice(0, 16),
      refs,
    };
  }
}

async function main() {
  const credits = await kieCredits(apiKey);
  console.log("[forensic] credits=", credits);

  const probes010 = buildShotProbes(10);
  const probes011 = buildShotProbes(11);
  const probes009 = buildShotProbes(9);
  const probes012 = buildShotProbes(12);

  const goldenMeta = [9, 10, 11, 12].map((n) => {
    const { script, content } = packageFor(n);
    return {
      golden: `golden-${String(n).padStart(3, "0")}`,
      title: script.title,
      topic: script.topic,
      featureName: script.featureName,
      category: script.category,
      voiceScriptPreview: content.voiceScript.slice(0, 400),
      captions: content.captions,
    };
  });

  writeFileSync(
    join(OUT, "shot-probes.json"),
    JSON.stringify({ probes009, probes010, probes011, probes012, goldenMeta }, null, 2),
  );

  const learn010 = probes010.find((p) => p.shotId === "shot-amy-girl-learn")!;
  const learn012 = probes012.find((p) => p.shotId === "shot-amy-girl-learn")!;
  const learn009 = probes009.find((p) => p.shotId === "shot-amy-girl-learn")!;
  const host011 = probes011.find((p) => p.shotId === "shot-amy-host")!;
  const host009 = probes009.find((p) => p.shotId === "shot-amy-host")!;
  const host012 = probes012.find((p) => p.shotId === "shot-amy-host")!;

  writeFileSync(join(OUT, "prompt-010-learn.txt"), learn010.prompt);
  writeFileSync(join(OUT, "prompt-011-host.txt"), host011.prompt);
  writeFileSync(join(OUT, "prompt-012-learn.txt"), learn012.prompt);
  writeFileSync(join(OUT, "prompt-012-host.txt"), host012.prompt);
  writeFileSync(join(OUT, "prompt-009-learn.txt"), learn009.prompt);
  writeFileSync(join(OUT, "prompt-009-host.txt"), host009.prompt);

  writeFileSync(
    join(OUT, "prompt-diff-focus.json"),
    JSON.stringify(
      {
        learn010_vs_learn012: {
          fail: {
            flags: learn010.promptFlags,
            env: learn010.environment,
            spoken: learn010.spokenLine,
            interaction: learn010.interaction,
            action: learn010.actionBeforeDialogue,
            hash: learn010.promptHash,
            promptLen: learn010.prompt.length,
            thirdPartyIp: /Disney\+|Pixar|Paddington|Pikachu|Netflix/i.test(learn010.prompt),
          },
          ok: {
            flags: learn012.promptFlags,
            env: learn012.environment,
            spoken: learn012.spokenLine,
            interaction: learn012.interaction,
            action: learn012.actionBeforeDialogue,
            hash: learn012.promptHash,
            promptLen: learn012.prompt.length,
            thirdPartyIp: /Disney\+|Pixar|Paddington|Pikachu|Netflix/i.test(learn012.prompt),
          },
        },
        host011_vs_host012: {
          fail: {
            flags: host011.promptFlags,
            env: host011.environment,
            spoken: host011.spokenLine,
            interaction: host011.interaction,
            hash: host011.promptHash,
            promptLen: host011.prompt.length,
            thirdPartyIp: /Disney\+|Pixar|Paddington|Pikachu|Netflix/i.test(host011.prompt),
          },
          ok: {
            flags: host012.promptFlags,
            env: host012.environment,
            spoken: host012.spokenLine,
            interaction: host012.interaction,
            hash: host012.promptHash,
            promptLen: host012.prompt.length,
            thirdPartyIp: /Disney\+|Pixar|Paddington|Pikachu|Netflix/i.test(host012.prompt),
          },
        },
        host009: {
          flags: host009.promptFlags,
          spoken: host009.spokenLine,
          env: host009.environment,
          hash: host009.promptHash,
        },
      },
      null,
      2,
    ),
  );

  const amy = wardrobeFor("amy-ai").bibleAsset;
  const girl = wardrobeFor("amy-girl").bibleAsset;
  const boy = wardrobeFor("amy-boy").bibleAsset;
  const learn010Memory = join(
    MAIN,
    ".amynest-assets/p0-regression-golden-010/work/cinematic/character-memory/shot-amy-host-last.png",
  );
  const host011Identity = join(
    MAIN,
    ".amynest-assets/p0-regression-golden-011/work/cinematic/keyframes/shot-amy-host-identity.png",
  );
  const mem = existsSync(learn010Memory) ? learn010Memory : girl;
  const hostId = existsSync(host011Identity) ? host011Identity : amy;

  // Focused matrix — production-supported shapes only
  const cases: Array<Parameters<typeof runKieCase>[0]> = [
    // A: production-like 010 learn
    {
      caseId: "010-learn-A-refs3-full",
      prompt: learn010.prompt,
      imagePaths: [girl, mem, amy],
      durationSeconds: 8,
    },
    // B: silence suffix (Veo native-audio OFF via prompt)
    {
      caseId: "010-learn-B-refs3-silent",
      prompt: learn010.prompt,
      imagePaths: [girl, mem, amy],
      durationSeconds: 8,
      silentPromptSuffix: true,
    },
    // C: full prompt, girl bible only
    {
      caseId: "010-learn-C-refs1-full",
      prompt: learn010.prompt,
      imagePaths: [girl],
      durationSeconds: 6,
    },
    // D: silent + girl only
    {
      caseId: "010-learn-D-refs1-silent",
      prompt: learn010.prompt,
      imagePaths: [girl],
      durationSeconds: 6,
      silentPromptSuffix: true,
    },
    // Ref-combo diagnostics (canonical + silent to reduce audio confound)
    {
      caseId: "010-learn-ref-amy-only-silent",
      prompt: learn010.prompt,
      imagePaths: [amy],
      durationSeconds: 6,
      silentPromptSuffix: true,
    },
    {
      caseId: "010-learn-ref-amy-girl-silent",
      prompt: learn010.prompt,
      imagePaths: [amy, girl],
      durationSeconds: 8,
      silentPromptSuffix: true,
    },
    {
      caseId: "010-learn-ref-amy-boy-silent",
      prompt: learn010.prompt,
      imagePaths: [amy, boy],
      durationSeconds: 8,
      silentPromptSuffix: true,
    },
    {
      caseId: "010-learn-ref-amy-girl-boy-silent",
      prompt: learn010.prompt,
      imagePaths: [amy, girl, boy],
      durationSeconds: 8,
      silentPromptSuffix: true,
    },
    // Control: 012 learn prompt + same refs as failing 010
    {
      caseId: "012-learn-control-refs3-silent",
      prompt: learn012.prompt,
      imagePaths: [girl, mem, amy],
      durationSeconds: 8,
      silentPromptSuffix: true,
    },
    // 011 host
    {
      caseId: "011-host-A-refs3-full",
      prompt: host011.prompt,
      imagePaths: [amy, hostId, girl],
      durationSeconds: 8,
    },
    {
      caseId: "011-host-B-refs3-silent",
      prompt: host011.prompt,
      imagePaths: [amy, hostId, girl],
      durationSeconds: 8,
      silentPromptSuffix: true,
    },
    {
      caseId: "011-host-C-refs1-full",
      prompt: host011.prompt,
      imagePaths: [amy],
      durationSeconds: 6,
    },
    {
      caseId: "012-host-control-refs3-silent",
      prompt: host012.prompt,
      imagePaths: [amy, hostId, girl],
      durationSeconds: 8,
      silentPromptSuffix: true,
    },
  ];

  writeFileSync(
    join(OUT, "audio-path-analysis.json"),
    JSON.stringify(
      {
        proven:
          "KIE Veo HTTP body contains prompt + imageUrls only — no narration WAV/URL, no captions file, no timing metadata from TTS.",
        audioBranchMeaning:
          "Provider error 'unable to generate audio' refers to Veo's native audio generation from dialogue in the prompt, not AmyNest TTS concat.",
        localTtsStatus:
          "Golden 010/011 TTS already PASS (49s+, Whisper ≥87%) before compose; failure stage is Veo generate/poll, not TTS or local mux.",
      },
      null,
      2,
    ),
  );

  const results = [];
  for (const c of cases) {
    console.log(`[forensic] CASE ${c.caseId} ...`);
    const r = await runKieCase(c);
    results.push(r);
    console.log(
      `[forensic] ${c.caseId} => ${r.ok ? "OK" : "FAIL"} ${(r.error || "").slice(0, 200)}`,
    );
    writeFileSync(join(OUT, "matrix-results.json"), JSON.stringify(results, null, 2));
    await sleep(1500);
  }

  console.log("[forensic] wrote", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
