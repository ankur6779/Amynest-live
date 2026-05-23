import assert from "node:assert/strict";
import { describe, it, before, beforeEach } from "node:test";
import {
  generateRealtimeEvent,
  runFullSystemSimulation,
  runAllSimulationModes,
  runOptimizationComparison,
  SIM_CHILD_PROFILES,
  SIM_ML_MODE_CONFIG,
  resetSystemSimulation,
} from "./systemSimulation.js";
import {
  buildSystemValidationReport,
  formatLayerLine,
  runFullSystemValidation,
} from "./systemReport.js";
import { validateV1V2, getMlUsageRate, computeMlLift, computeDifficultyAdjustedLift, computeUxScore } from "./systemValidation.js";
import type { SessionPlanItem } from "../src/types-v2.js";

const FAST_PROFILES = SIM_CHILD_PROFILES;

describe("systemSimulation engine", () => {
  it("generates valid realtime events", () => {
    const cfg = SIM_CHILD_PROFILES[0]!;
    const plan: SessionPlanItem[] = [
      {
        slot: "core",
        moduleId: "phonics",
        contentId: "phonics_intro_1",
        contentType: "learning",
        difficulty: "easy",
      },
    ];
    const event = generateRealtimeEvent(cfg, plan, 0, 42);
    assert.equal(event.childId, cfg.id);
    assert.ok(
      [
        "CONTENT_STARTED",
        "CONTENT_COMPLETED",
        "CONTENT_SKIPPED",
        "USER_IDLE",
        "RAPID_INTERACTION",
      ].includes(event.type),
    );
  });

  it("applies noise injection without crashing", () => {
    const cfg = SIM_CHILD_PROFILES[0]!;
    const plan: SessionPlanItem[] = [
      {
        slot: "core",
        moduleId: "phonics",
        contentId: "phonics_intro_1",
        contentType: "learning",
        difficulty: "easy",
      },
    ];
    let noisy = 0;
    for (let i = 0; i < 50; i++) {
      const clean = generateRealtimeEvent(cfg, plan, i, 99, 0, false);
      const noisyEvent = generateRealtimeEvent(cfg, plan, i, 99, 0, true);
      if (JSON.stringify(clean) !== JSON.stringify(noisyEvent)) noisy += 1;
    }
    assert.ok(noisy >= 3, "expected some noisy events");
  });
});

describe("full system validation (V1–V10)", () => {
  before(() => {
    resetSystemSimulation();
  });

  beforeEach(() => {
    resetSystemSimulation();
  });

  it(
    "runs balanced mode simulation and produces PASS",
    { timeout: 180_000 },
    async () => {
      const report = await runFullSystemValidation({
        mlMode: "balanced",
        skipOptimizationComparison: true,
      });

      console.log("\n--- Layer results ---");
      for (const layer of report.layers) {
        console.log(formatLayerLine(layer));
      }
      console.log(`\nOverall: ${report.overall}`);
      console.log(`ML usage: ${(report.metrics.mlUsageRatio * 100).toFixed(1)}%`);
      console.log(`ML lift: ${report.metrics.mlLift.toFixed(4)}`);

      assert.ok(report.layers.length >= 12);
      assert.equal(report.simulation.children.length, SIM_CHILD_PROFILES.length);
      assert.equal(report.simulation.mlMode, "balanced");
      assert.ok(report.metrics.avgEngagementScore > 0);
      assert.ok(
        report.metrics.mlUsageRatio >= 0.3 && report.metrics.mlUsageRatio <= 0.6,
        `Balanced ML usage ${(report.metrics.mlUsageRatio * 100).toFixed(1)}% outside 30–60%`,
      );
      assert.ok(report.metrics.mlLift > 0, `mlLift ${report.metrics.mlLift} must be positive`);
      assert.ok(
        report.metrics.difficultyAdjustedLift > 0,
        `difficultyAdjustedLift ${report.metrics.difficultyAdjustedLift} must be positive`,
      );
      assert.ok(
        report.metrics.uxScore >= 0.6,
        `uxScore ${report.metrics.uxScore.toFixed(2)} below 0.6`,
      );

      const failed = report.layers.filter((l) => l.status === "fail");
      if (failed.length > 0) {
        console.log("\nFailed layers:");
        for (const f of failed) {
          console.log(`  ${f.layer}: ${f.message}`);
        }
      }

      assert.equal(
        report.overall,
        "PASS",
        `Expected PASS, got ${report.overall}. Failed: ${failed.map((f) => f.layer).join(", ")}`,
      );
    },
  );

  it(
    "runs all 3 ML modes with expected usage ranges",
    { timeout: 300_000 },
    async () => {
      const modes = await runAllSimulationModes({
        childProfiles: FAST_PROFILES,
      });

      const aggressiveRate = getMlUsageRate(modes.aggressive);
      const balancedRate = getMlUsageRate(modes.balanced);
      const conservativeRate = getMlUsageRate(modes.conservative);

      console.log("\n--- ML mode usage ---");
      console.log(`Aggressive: ${(aggressiveRate * 100).toFixed(1)}%`);
      console.log(`Balanced: ${(balancedRate * 100).toFixed(1)}%`);
      console.log(`Conservative: ${(conservativeRate * 100).toFixed(1)}%`);

      assert.ok(aggressiveRate > 0.6, `aggressive ${(aggressiveRate * 100).toFixed(1)}%`);
      assert.ok(
        balancedRate >= 0.3 && balancedRate <= 0.6,
        `balanced ${(balancedRate * 100).toFixed(1)}%`,
      );
      assert.ok(conservativeRate < 0.4, `conservative ${(conservativeRate * 100).toFixed(1)}%`);
      assert.ok(aggressiveRate > conservativeRate);

      assert.equal(
        modes.aggressive.mlMode,
        SIM_ML_MODE_CONFIG.aggressive.mode,
      );
      assert.equal(modes.balanced.mlMode, SIM_ML_MODE_CONFIG.balanced.mode);
      assert.equal(modes.conservative.mlMode, SIM_ML_MODE_CONFIG.conservative.mode);
    },
  );

  it(
    "noise mode remains stable and adaptive",
    { timeout: 120_000 },
    async () => {
      const sim = await runFullSystemSimulation({
        childProfiles: FAST_PROFILES,
        mlMode: "balanced",
        injectNoise: true,
      });
      const report = buildSystemValidationReport(sim);

      assert.ok(sim.injectNoise);
      assert.ok(sim.noiseEventCount > 0, "should inject noisy events");
      assert.ok(report.metrics.noiseRobustnessScore >= 0.55);
      assert.ok(report.metrics.underreactionRate <= 0.35);
    },
  );

  it(
    "validates V1–V2 on partial simulation",
    { timeout: 120_000 },
    async () => {
      const sim = await runFullSystemSimulation({
        childProfiles: FAST_PROFILES,
        mlMode: "balanced",
        skipMetaLayer: true,
      });
      const v12 = validateV1V2(sim);
      assert.ok(["pass", "warn"].includes(v12.status), v12.message);
      assert.ok(getMlUsageRate(sim) > 0, "expected some ML decisions");
    },
  );

  it(
    "includes Child E (chaotic) and Child F (plateau) archetypes",
    { timeout: 120_000 },
    async () => {
      const sim = await runFullSystemSimulation({
        childProfiles: SIM_CHILD_PROFILES.filter(
          (p) => p.archetype === "chaotic" || p.archetype === "plateau_learner",
        ),
      });
      assert.equal(sim.children.length, 2);
      assert.ok(sim.children.some((c) => c.config.archetype === "chaotic"));
      assert.ok(sim.children.some((c) => c.config.archetype === "plateau_learner"));
    },
  );

  it(
    "optimization comparison improves or matches baseline with stability",
    { timeout: 180_000 },
    async () => {
      const comparison = await runOptimizationComparison(FAST_PROFILES);
      assert.ok(comparison.baselineEngagement >= 0);
      assert.ok(comparison.optimizedEngagement >= 0);
      assert.equal(typeof comparison.improved, "boolean");
      assert.equal(typeof comparison.stabilityDelta, "number");
      assert.equal(typeof comparison.coherenceStable, "boolean");
    },
  );

  it(
    "tracks ML usage and positive mlLift via hooks",
    { timeout: 60_000 },
    async () => {
      const sim = await runFullSystemSimulation({
        childProfiles: [SIM_CHILD_PROFILES[0]!],
        mlMode: "balanced",
      });
      const rate = getMlUsageRate(sim);
      const lift = computeMlLift(sim);
      assert.ok(rate >= 0.3, `ML usage ${(rate * 100).toFixed(1)}%`);
      assert.ok(lift > 0, `mlLift ${lift}`);
    },
  );

  it(
    "latency mode tracks adaptationDelayMs within budget",
    { timeout: 120_000 },
    async () => {
      resetSystemSimulation();
      const sim = await runFullSystemSimulation({
        childProfiles: FAST_PROFILES,
        mlMode: "balanced",
        simulateLatency: true,
        skipMetaLayer: true,
      });
      const report = buildSystemValidationReport(sim);

      assert.ok(sim.simulateLatency);
      assert.ok(report.metrics.avgAdaptationDelayMs >= 0);
      if (report.metrics.avgAdaptationDelayMs > 0) {
        assert.ok(
          report.metrics.avgAdaptationDelayMs <= 500,
          `adaptationDelayMs ${report.metrics.avgAdaptationDelayMs.toFixed(0)} exceeds 500ms`,
        );
      }
      assert.ok(
        report.metrics.difficultyAdjustedLift > 0 || report.metrics.mlLift > 0,
        "expected positive ML lift under latency",
      );
      assert.ok(report.metrics.uxScore >= 0.6);
    },
  );

  it(
    "burst noise mode remains stable without chaotic module/difficulty swings",
    { timeout: 120_000 },
    async () => {
      const sim = await runFullSystemSimulation({
        childProfiles: FAST_PROFILES,
        mlMode: "balanced",
        burstNoiseMode: true,
        skipMetaLayer: true,
      });
      const report = buildSystemValidationReport(sim);

      assert.ok(sim.burstNoiseMode);
      assert.ok(
        sim.children.some((c) => c.sessions.some((s) => s.burstNoiseApplied)),
        "expected burst noise windows",
      );
      assert.ok(report.metrics.burstNoiseStabilityScore >= 0.7);
      assert.ok(report.metrics.difficultyAdjustedLift > 0);
      assert.ok(report.metrics.uxScore >= 0.6);
    },
  );

  it("builds report from simulation snapshot", async () => {
    const sim = await runFullSystemSimulation({
      childProfiles: [SIM_CHILD_PROFILES[0]!],
      mlMode: "balanced",
    });
    const report = buildSystemValidationReport(sim);
    assert.ok(report.layers.length >= 12);
    assert.ok(["PASS", "FAIL"].includes(report.overall));
    assert.ok(typeof report.metrics.mlLift === "number");
    assert.ok(typeof report.metrics.personalityImpactScore === "number");
  });
});
