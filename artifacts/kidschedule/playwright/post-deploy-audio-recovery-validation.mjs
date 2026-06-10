#!/usr/bin/env node
/**
 * Post-deploy audio coverage validation — production runtime evidence.
 *
 * Prefers the Playwright audio-coverage spec when available; falls back to inline probes.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = (process.env.PLAYWRIGHT_BASE_URL ?? "https://www.amynest.in").replace(/\/$/, "");
const OUT_DIR = join(process.cwd(), "playwright", "post-deploy-audio-recovery-artifacts");
const COVERAGE_REPORT = join(process.cwd(), "playwright", "audio-coverage-artifacts", "report.json");

function runPlaywrightCoverage() {
  const env = {
    ...process.env,
    PLAYWRIGHT_BASE_URL: BASE,
    STRESS_TEST_EMAIL: process.env.STRESS_TEST_EMAIL ?? "demo@amynest.in",
    STRESS_TEST_PASSWORD: process.env.STRESS_TEST_PASSWORD ?? "AmyNest@2025",
  };
  const result = spawnSync(
    "pnpm",
    ["exec", "playwright", "test", "--config", "playwright.config.audio-coverage.ts"],
    { cwd: process.cwd(), env, encoding: "utf8", stdio: "pipe" },
  );
  return { code: result.status ?? 1, stdout: result.stdout, stderr: result.stderr };
}

async function fetchHealth() {
  const healthRes = await fetch(`${BASE}/api/healthz/audio`);
  const health = await healthRes.json();
  const healthPass =
    health.status === "PASS" &&
    health.playback?.phase1BlobFallback === true &&
    health.env?.enableMseStreaming === "false";
  return { health, healthPass };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const { health, healthPass } = await fetchHealth();
  const run = runPlaywrightCoverage();

  let coverage = null;
  if (existsSync(COVERAGE_REPORT)) {
    coverage = JSON.parse(readFileSync(COVERAGE_REPORT, "utf8"));
  }

  const featureResults = coverage?.detail ?? coverage?.features ?? [];
  const featuresPass = featureResults.length > 0 && featureResults.every((f) => f.verdict === "PASS");

  const report = {
    validatedAt: new Date().toISOString(),
    base: BASE,
    runner: "playwright.config.audio-coverage.ts",
    health: {
      verdict: healthPass ? "PASS" : "FAIL",
      status: health.status,
      phase1BlobFallback: health.playback?.phase1BlobFallback,
      enableMseStreaming: health.env?.enableMseStreaming,
      mseStreamingActive: health.playback?.mseStreamingActive,
      streamProbe: health.tts?.streamProbe,
    },
    features: featureResults.map((f) => ({
      feature: f.feature,
      verdict: f.verdict,
      reason: f.triggerError ?? f.audioReason ?? f.reason,
      checks: f.checks,
      screenshot: f.screenshot,
    })),
    playwrightExitCode: run.code,
    overall: healthPass && featuresPass && run.code === 0 ? "PASS" : "FAIL",
  };

  writeFileSync(join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (run.stderr) console.error(run.stderr);
  process.exit(report.overall === "PASS" ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
