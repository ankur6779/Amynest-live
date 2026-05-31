/**
 * QA gate — static checks for phonics interaction architecture.
 *
 *   pnpm run check:phonics-interaction-gate
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const PHONICS_SRC = join(REPO_ROOT, "artifacts/kidschedule/src");

type GateResult = { id: string; ok: boolean; detail?: string };

const FORBIDDEN_AUToplay_PATTERNS: Array<{ id: string; pattern: RegExp; label: string }> = [
  {
    id: "useEffect_speak",
    pattern: /useEffect\s*\([\s\S]{0,400}?\bspeak\s*\(/,
    label: "speak() inside useEffect (autoplay)",
  },
  {
    id: "useEffect_playCvc",
    pattern: /useEffect\s*\([\s\S]{0,400}?\bplayCvcBlend/,
    label: "playCvcBlend inside useEffect (autoplay)",
  },
  {
    id: "useEffect_phonicsEnginePlay",
    pattern: /useEffect\s*\([\s\S]{0,400}?\bphonicsEnginePlay/,
    label: "phonicsEnginePlay inside useEffect (autoplay)",
  },
  {
    id: "fallback_a_mp3",
    pattern: /getPhonicsLibraryFallbackUrl\s*\(/,
    label: "getPhonicsLibraryFallbackUrl (wrong 'a' fallback)",
  },
  {
    id: "ui_new_audio",
    pattern: /\bnew Audio\s*\(/,
    label: "new Audio() outside phonics-player",
  },
];

const REQUIRED_FILES = [
  "artifacts/kidschedule/src/lib/phonics-audio-engine.ts",
  "artifacts/kidschedule/src/lib/phonics-cvc-lesson.ts",
  "artifacts/kidschedule/src/lib/phonics-audio-availability.ts",
];

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "dist") continue;
      walkTsFiles(full, out);
    } else if (/\.(tsx?|jsx?)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

function isPhonicsFile(path: string): boolean {
  const rel = path.slice(PHONICS_SRC.length);
  return (
    rel.includes("phonics") ||
    rel.includes("cvc-blend") ||
    rel.includes("audio-play-button")
  );
}

function scanAutoplayViolations(): GateResult[] {
  const results: GateResult[] = [];
  const files = walkTsFiles(PHONICS_SRC).filter(isPhonicsFile);

  for (const file of files) {
    if (file.endsWith("phonics-player.ts") || file.endsWith("phonics-safe-audio.ts")) {
      continue;
    }
    const content = readFileSync(file, "utf8");
    const rel = file.replace(REPO_ROOT + "/", "");

    for (const rule of FORBIDDEN_AUToplay_PATTERNS) {
      if (rule.id === "ui_new_audio") {
        if (
          rel.includes("phonics-player") ||
          rel.includes("phonics-safe-audio") ||
          rel.includes("phonics-audio-preview")
        ) {
          continue;
        }
        if (rel.includes("phonics-test.tsx") && content.includes("playTapSound")) continue;
        // Comment-only mentions (e.g. "no new Audio() paths here")
        const withoutComments = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
        if (!/\bnew Audio\s*\(/.test(withoutComments)) continue;
      }
      if (rule.id === "fallback_a_mp3") {
        if (rel.endsWith("phonics-audio-map.ts")) continue;
        if (!/\bgetPhonicsLibraryFallbackUrl\s*\(/.test(content)) continue;
      }
      if (rule.pattern.test(content)) {
        results.push({
          id: rule.id,
          ok: false,
          detail: `${rule.label} in ${rel}`,
        });
      }
    }
  }

  if (results.length === 0) {
    results.push({ id: "autoplay_scan", ok: true, detail: "No forbidden autoplay/fallback patterns" });
  }
  return results;
}

function checkRequiredArchitecture(): GateResult[] {
  return REQUIRED_FILES.map((rel) => {
    const full = join(REPO_ROOT, rel);
    try {
      statSync(full);
      return { id: `file:${rel}`, ok: true };
    } catch {
      return { id: `file:${rel}`, ok: false, detail: "Missing required module" };
    }
  });
}

function checkEngineStopBeforePlay(): GateResult {
  const enginePath = join(PHONICS_SRC, "lib/phonics-audio-engine.ts");
  const content = readFileSync(enginePath, "utf8");
  const hasStopOnSinglePlay =
    /phonicsEnginePlayLetter[\s\S]*?phonicsEngineStop/.test(content) &&
    /phonicsEnginePlayWord[\s\S]*?phonicsEngineStop/.test(content);
  const blendUsesDirectClips =
    /phonicsEnginePlayCvcBlend[\s\S]*?playLetterClipDirect/.test(content) &&
    !/phonicsEnginePlayCvcBlend[\s\S]*?phonicsEnginePlayLetter/.test(content);

  if (hasStopOnSinglePlay && blendUsesDirectClips) {
    return {
      id: "engine_queue",
      ok: true,
      detail: "Single-play stops first; blend queue uses direct clips",
    };
  }
  return {
    id: "engine_queue",
    ok: false,
    detail: "phonics-audio-engine must stop-before-single-play and direct-play blend steps",
  };
}

function checkCvcLessonStates(): GateResult {
  const path = join(PHONICS_SRC, "lib/phonics-cvc-lesson.ts");
  const content = readFileSync(path, "utf8");
  const states = ["idle", "word_selected", "playing_phonemes", "playing_blend", "completed"];
  const missing = states.filter((s) => !content.includes(`"${s}"`));
  if (missing.length === 0) {
    return { id: "cvc_state_machine", ok: true, detail: "CVC lesson phases defined" };
  }
  return { id: "cvc_state_machine", ok: false, detail: `Missing phases: ${missing.join(", ")}` };
}

function runGate(): void {
  const results: GateResult[] = [
    ...checkRequiredArchitecture(),
    checkEngineStopBeforePlay(),
    checkCvcLessonStates(),
    ...scanAutoplayViolations(),
  ];

  console.log("\n[check:phonics-interaction-gate]\n");
  for (const r of results) {
    const icon = r.ok ? "✔" : "✗";
    console.log(`  ${icon} [${r.id}]${r.detail ? ` ${r.detail}` : ""}`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n  ${results.length - failed.length}/${results.length} passed\n`);

  if (failed.length > 0) {
    console.error("[check:phonics-interaction-gate] FAIL\n");
    process.exit(1);
  }
  console.log("[check:phonics-interaction-gate] PASS\n");
}

runGate();
