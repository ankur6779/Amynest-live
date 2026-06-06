/**
 * Audit + pre-generate infant TTS (coach listen-aloud + poems).
 *
 *   # Audit production (no secrets):
 *   API_BASE=https://www.amynest.in/api pnpm --filter @workspace/api-server run pregenerate:infant -- --audit-only
 *
 *   # Generate missing (loads Amynest-backend-dykj.env + .env):
 *   pnpm --filter @workspace/api-server run pregenerate:infant
 */
import { config } from "dotenv";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { INFANT_PROBLEMS } from "@workspace/infant-problems";
import { ALL_POEMS } from "../../kidschedule/src/data/infant-poems.ts";

/** Production TTS stack: ElevenLabs Flash primary when fallback flag is on. */
const ELEVEN_VOICE = "QbQKfe9vgx5OsbZUvlFv";
const ELEVEN_MODEL = "eleven_flash_v2_5";
const OPENAI_MODEL = process.env.OPENAI_TTS_MODEL?.trim() || "gpt-4o-mini-tts";
const OPENAI_VOICE = process.env.OPENAI_TTS_VOICE?.trim() || "coral";

function computeTtsCacheKey(text: string, model: string, voice: string): string {
  return createHash("sha256")
    .update(`${model}|${voice}|${text.trim()}`)
    .digest("hex");
}

function cacheKeysForText(text: string): string[] {
  return [
    computeTtsCacheKey(text, ELEVEN_MODEL, ELEVEN_VOICE),
    computeTtsCacheKey(text, OPENAI_MODEL, OPENAI_VOICE),
  ];
}

function buildCoachWinListenText(win: {
  win: number;
  title: string;
  objective: string;
  deep_explanation?: string;
  actions?: string[];
  example?: string;
  mistake_to_avoid?: string;
  micro_task?: string;
}): string {
  return [
    `${win.win}. ${win.title}.`,
    win.objective,
    win.deep_explanation,
    win.actions?.length ? win.actions.join(". ") : "",
    win.example ? win.example : "",
    win.mistake_to_avoid ? `${win.mistake_to_avoid}.` : "",
    win.micro_task ? `${win.micro_task}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");

config({ path: resolve(REPO_ROOT, ".env") });
config({ path: resolve(REPO_ROOT, ".env.local"), override: true });
config({ path: resolve(REPO_ROOT, "Amynest-backend-dykj.env"), override: true });

/** Render internal hostnames (no dot) only resolve inside Render — fix for local pregenerate runs. */
if (process.env.DATABASE_URL) {
  try {
    const u = new URL(process.env.DATABASE_URL);
    if (!u.hostname.includes(".")) {
      u.hostname = `${u.hostname}.singapore-postgres.render.com`;
    }
    if (!u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "require");
    }
    process.env.DATABASE_URL = u.toString();
  } catch {
    /* keep as-is */
  }
}

const args = new Set(process.argv.slice(2));
const auditOnly = args.has("--audit-only");

const API_BASE = (process.env.API_BASE ?? "https://www.amynest.in/api").replace(/\/$/, "");

type AuditItem = {
  kind: "coach" | "poem";
  id: string;
  win?: number;
  text: string;
  cacheKeys: string[];
};

function collectCoachItems(): AuditItem[] {
  const items: AuditItem[] = [];
  for (const problem of INFANT_PROBLEMS) {
    for (const win of problem.wins) {
      const text = buildCoachWinListenText(win);
      items.push({
        kind: "coach",
        id: problem.id,
        win: win.win,
        text,
        cacheKeys: cacheKeysForText(text),
      });
    }
  }
  return items;
}

function collectPoemItems(): AuditItem[] {
  return ALL_POEMS.map((poem) => {
    const text = poem.lines.join(" ");
    return {
      kind: "poem",
      id: poem.id,
      text,
      cacheKeys: cacheKeysForText(text),
    };
  });
}

async function ttsExistsOnApi(cacheKeys: string[]): Promise<boolean> {
  for (const key of cacheKeys) {
    try {
      const res = await fetch(`${API_BASE}/tts/audio/${key}.mp3`, { method: "HEAD" });
      if (res.ok) return true;
    } catch {
      /* try next key */
    }
  }
  return false;
}

async function auditItems(label: string, items: AuditItem[]) {
  let cached = 0;
  const missing: AuditItem[] = [];
  for (const item of items) {
    if (await ttsExistsOnApi(item.cacheKeys)) cached += 1;
    else missing.push(item);
  }
  console.log(
    JSON.stringify({
      section: label,
      total: items.length,
      cached,
      missing: missing.length,
      elevenModel: ELEVEN_MODEL,
      elevenVoice: ELEVEN_VOICE,
      openaiModel: OPENAI_MODEL,
      openaiVoice: OPENAI_VOICE,
      apiBase: API_BASE,
    }),
  );
  return missing;
}

async function main() {
  const coachItems = collectCoachItems();
  const poemItems = collectPoemItems();

  console.log("=== Infant TTS content audit ===");
  console.log(
    `Catalog: ${INFANT_PROBLEMS.length} coach problems, ${coachItems.length} listen clips, ${poemItems.length} poems`,
  );
  console.log(
    "Static (no TTS): tips, cry insight, sleep predict, logs, milestones, white noise synth.",
  );

  const missingCoach = await auditItems("coach_listen_aloud", coachItems);
  const missingPoems = await auditItems("infant_poems", poemItems);
  const totalMissing = missingCoach.length + missingPoems.length;

  console.log(
    JSON.stringify({
      totalMissing,
      coachMissing: missingCoach.length,
      poemsMissing: missingPoems.length,
    }),
  );

  if (missingCoach.length > 0) {
    console.log(
      "Coach gaps (sample):",
      missingCoach.slice(0, 8).map((m) => `${m.id}#${m.win}`).join(", "),
    );
  }
  if (missingPoems.length > 0) {
    console.log("Poem gaps:", missingPoems.map((m) => m.id).join(", "));
  }

  if (auditOnly) {
    console.log(totalMissing === 0 ? "✅ All infant TTS cached." : "⚠️  Gaps found — re-run without --audit-only to generate.");
    return;
  }

  if (totalMissing === 0) {
    console.log("✅ Nothing to generate.");
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL missing — set in Amynest-backend-dykj.env or env.");
    process.exit(1);
  }

  const { pregenerateAllInfantCoachAudio } = await import("../src/services/coachAudioCacheService.js");
  const { runTtsPregenerate } = await import("../src/services/domain-ai/tts-pregenerate-runner.js");

  if (missingCoach.length > 0) {
    console.log("\n--- Generating infant coach listen-aloud ---");
    const coachResult = await pregenerateAllInfantCoachAudio();
    console.log("Coach result:", JSON.stringify(coachResult));
  }

  if (missingPoems.length > 0) {
    console.log("\n--- Generating infant poems TTS ---");
    const poemResult = await runTtsPregenerate({
      texts: missingPoems.map((p) => p.text),
      mode: "default",
    });
    console.log("Poem result:", JSON.stringify(poemResult));
  }

  console.log("\n=== Re-audit ---");
  await auditItems("coach_listen_aloud", coachItems);
  await auditItems("infant_poems", poemItems);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
