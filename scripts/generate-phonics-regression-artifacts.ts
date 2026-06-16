/**
 * Generate committed regression artifacts (snapshots + baselines).
 *   pnpm run audit:phonics:artifacts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getVisibleContentSnapshot,
  serializeVisibleSnapshot,
  runPhonicsCurriculumAudit,
} from "../lib/phonics-curriculum/src/index.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function writeSnapshots(): void {
  const dir = join(REPO_ROOT, "lib/phonics-curriculum/src/snapshots");
  mkdirSync(dir, { recursive: true });
  for (let l = 1; l <= 7; l++) {
    const snap = getVisibleContentSnapshot(l as 1);
    writeFileSync(
      join(dir, `visible-L${l}.json`),
      serializeVisibleSnapshot(snap),
    );
  }
  console.log("Wrote L1–L7 visible content snapshots");
}

async function writeStorySymbolBaseline(): Promise<void> {
  const { getDecodableStoryCatalog, STORY_LEVEL_GATES } = await import(
    "../artifacts/kidschedule/src/lib/phonics-v3/content/story-catalog.ts"
  );
  const { requiredLevelForSymbol } = await import(
    "../lib/phonics-curriculum/src/level-gating.ts"
  );

  function getStoryRequiredLevel(story: {
    id: string;
    level: 1 | 2 | 3 | 4 | 5;
  }): number {
    if (story.id.startsWith("dig-")) return 4;
    if (story.id.startsWith("blend-")) return 5;
    if (story.id.startsWith("cvcc-")) return 6;
    return STORY_LEVEL_GATES[story.level].requiredCurriculumLevel;
  }

  const violations: string[] = [];
  for (const story of getDecodableStoryCatalog()) {
    const maxLevel = getStoryRequiredLevel(story);
    for (const line of story.lines) {
      for (const token of line.text.toLowerCase().match(/[a-z]+/g) ?? []) {
        if (token.length < 3) continue;
        const owner = requiredLevelForSymbol(token, "word");
        if (owner > maxLevel) {
          violations.push(
            `${story.id}: "${token}" owner L${owner} > tier L${maxLevel}`,
          );
        }
      }
    }
  }

  const out = join(
    REPO_ROOT,
    "artifacts/kidschedule/src/lib/phonics-v3/story-symbol-baseline.json",
  );
  writeFileSync(out, `${JSON.stringify([...new Set(violations)].sort(), null, 2)}\n`);
  console.log(`Wrote story symbol baseline (${violations.length} known entries)`);
}

function writeAuditBaseline(): void {
  const report = runPhonicsCurriculumAudit();
  const keys = report.findings.map((f) => `${f.kind}:${f.id}`);
  const out = join(REPO_ROOT, "lib/phonics-curriculum/audit-baseline.json");
  writeFileSync(
    out,
    `${JSON.stringify({ version: 1, knownFindingKeys: keys }, null, 2)}\n`,
  );
  console.log(`Wrote audit baseline (${keys.length} known findings)`);
}

async function main(): Promise<void> {
  writeSnapshots();
  await writeStorySymbolBaseline();
  writeAuditBaseline();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
