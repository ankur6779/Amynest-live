import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const CATEGORIES = [
  "smart-study",
  "life-skills",
  "event-prep",
  "math-progression",
] as const;

function findRepoRoot(): string {
  const starts = [
    process.cwd(),
    resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", ".."),
  ];
  for (const start of starts) {
    let dir = resolve(start);
    for (let i = 0; i < 8; i += 1) {
      if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) return dir;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return resolve(starts[0]!);
}

function extractAudioFields(item: Record<string, unknown>): string[] {
  const out: string[] = [];
  const push = (raw: unknown) => {
    if (typeof raw !== "string") return;
    const t = raw.trim();
    if (t.length >= 2 && t.length <= 1200) out.push(t);
  };
  push(item.audioText);
  return out;
}

/** All speakable `audioText` lines from generated content-bank JSON shards. */
export function getContentBankAudioTextsForStaticCatalog(): string[] {
  const root = resolve(findRepoRoot(), "content-bank");
  const seen = new Set<string>();

  for (const category of CATEGORIES) {
    const jsonPath = resolve(root, category, "items.json");
    if (!existsSync(jsonPath)) continue;
    let items: unknown[];
    try {
      const parsed = JSON.parse(readFileSync(jsonPath, "utf8")) as unknown;
      items = Array.isArray(parsed) ? parsed : [];
    } catch {
      continue;
    }
    for (const raw of items) {
      if (!raw || typeof raw !== "object") continue;
      for (const line of extractAudioFields(raw as Record<string, unknown>)) {
        seen.add(line);
      }
    }
  }

  return [...seen];
}

export type ContentBankAudioMapEntry = {
  category: (typeof CATEGORIES)[number];
  audioText: string;
  hash: string;
  normalizedKey: string;
  staticAudioUrl: string | null;
};

export type ContentBankAudioMap = {
  version: string;
  generatedAt: string;
  manifestVersion: string;
  items: Record<string, ContentBankAudioMapEntry>;
};
