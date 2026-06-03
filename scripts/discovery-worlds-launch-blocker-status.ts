/**
 * Launch Blocker Status — aggregates visual, audio, performance gates.
 * Run: pnpm run report:discovery-worlds-blockers
 *
 * Writes: docs/discovery-worlds-launch-blocker-status.md
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_MD = join(root, "docs/discovery-worlds-launch-blocker-status.md");

const COVERAGE_JSON = join(root, "artifacts/kidschedule/public/discovery-worlds-coverage.json");
const AUDIO_JSON = join(root, "artifacts/kidschedule/public/discovery-worlds-audio-qa.json");
const PERF_MD = join(root, "docs/discovery-worlds-performance-audit.md");

function run(cmd: string): { ok: boolean; output: string } {
  try {
    const output = execSync(cmd, { cwd: root, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    return { ok: true, output };
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string };
    return { ok: false, output: [err.stdout, err.stderr].filter(Boolean).join("\n") };
  }
}

function readJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function main(): void {
  console.log("[blockers] Running visual asset report…");
  const visualRun = run("pnpm run report:discovery-worlds-assets");
  console.log("[blockers] Running audio QA…");
  const audioRun = run("pnpm run report:discovery-worlds-audio-qa");
  console.log("[blockers] Running performance audit…");
  const perfRun = run("pnpm run report:discovery-worlds-performance");

  const visual = readJson<{
    coveragePct: number;
    presentAssets: number;
    totalAssets: number;
    gcsPresent?: number;
    criticalBlockers?: string[];
    mode?: string;
  }>(COVERAGE_JSON);

  const audio = readJson<{
    healthScore: number;
    present: number;
    missing: number;
    totalAudioAssets: number;
    criticalBlockers?: string[];
    mode?: string;
  }>(AUDIO_JSON);

  const p0: string[] = [];
  const visualOk = visualRun.ok && (visual?.coveragePct ?? 0) >= 95;
  const audioOk = audioRun.ok && (audio?.healthScore ?? 0) >= 95;
  const perfOk = perfRun.ok && existsSync(PERF_MD);

  if (!visualOk) {
    p0.push(
      `BLOCKER 1 — Visual: ${visual?.coveragePct ?? 0}% (${visual?.presentAssets ?? 0}/${visual?.totalAssets ?? 795}), GCS ${visual?.gcsPresent ?? "?"}/${visual?.totalAssets ?? 795}`,
    );
  }
  if (!audioOk) {
    p0.push(
      `BLOCKER 2 — Audio health: ${audio?.healthScore ?? 0}/100 (${audio?.present ?? 0}/${audio?.totalAudioAssets ?? 907} present, ${audio?.missing ?? 577} missing)`,
    );
  }
  if (!perfOk) {
    p0.push("BLOCKER 3 — Performance audit not generated");
  }

  const recommendation =
    p0.length === 0
      ? "**READY** — All P0 launch gates passed (visual ≥95%, audio ≥95, performance audit present)."
      : `**NOT READY** — ${p0.length} P0 blocker(s) remain.`;

  const md = `# Discovery Worlds — Launch Blocker Status

Generated: ${new Date().toISOString()}

## Launch recommendation

${recommendation}

## P0 blockers remaining

${p0.length ? p0.map((b) => `- ${b}`).join("\n") : "_None_"}

## Gate summary

| Blocker | Metric | Target | Current | Status |
|---------|--------|--------|---------|--------|
| 1 Visual | Coverage | ≥95% | ${visual?.coveragePct ?? "—"}% (${visual?.presentAssets ?? 0}/${visual?.totalAssets ?? 795}) | ${visualOk ? "PASS" : "FAIL"} |
| 1 Visual (GCS) | Production upload | ≥95% | ${visual?.gcsPresent != null ? `${Math.round((visual.gcsPresent / (visual.totalAssets || 1)) * 100)}% (${visual.gcsPresent}/${visual.totalAssets})` : "n/a"} | ${visual?.gcsPresent != null && visual.gcsPresent >= Math.ceil((visual.totalAssets ?? 795) * 0.95) ? "PASS" : visual?.gcsPresent != null ? "FAIL" : "n/a"} |
| 2 Audio | Health score | ≥95 | ${audio?.healthScore ?? "—"}/100 | ${audioOk ? "PASS" : "FAIL"} |
| 3 Performance | Audit report | present | ${perfOk ? "docs/discovery-worlds-performance-audit.md" : "missing"} | ${perfOk ? "PASS" : "FAIL"} |

## Visual asset completion

- Mode: ${visual?.mode ?? "—"}
- Critical blockers: ${visual?.criticalBlockers?.length ? visual.criticalBlockers.join("; ") : "none"}

## Audio completion

- Mode: ${audio?.mode ?? "—"}
- Missing clips: ${audio?.missing ?? "—"}
- Critical blockers: ${audio?.criticalBlockers?.length ? audio.criticalBlockers.join("; ") : "none"}

## Performance status

See [discovery-worlds-performance-audit.md](./discovery-worlds-performance-audit.md).

## Commands

\`\`\`bash
pnpm run report:discovery-worlds-assets
pnpm run upload:discovery-worlds-visuals
pnpm run generate:animal-world-audio
pnpm run generate:discovery-worlds-audio
pnpm run report:discovery-worlds-audio-qa
pnpm run report:discovery-worlds-performance
pnpm run report:discovery-worlds-blockers
\`\`\`
`;

  writeFileSync(OUT_MD, md);
  console.log(`\n${recommendation}\n`);
  console.log(`Wrote ${OUT_MD}`);
  if (p0.length) process.exit(1);
}

main();
