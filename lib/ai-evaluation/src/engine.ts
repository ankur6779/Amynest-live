/**
 * EvaluationEngine — runs golden scenarios through the intelligence pipeline (read-only).
 */

import { computeAdaptiveSnapshot } from "@workspace/birth-sky-adaptive";
import { computeConversationPlan } from "@workspace/birth-sky-conversation";
import { computeDevelopmentSnapshot } from "@workspace/birth-sky-development";
import { computeEvidenceSnapshot } from "@workspace/birth-sky-evidence";
import { computeMeaningSnapshot } from "@workspace/birth-sky-meaning";
import {
  compareToBaseline,
  fingerprintOutput,
  loadBaselines,
  saveBaselines,
  DEFAULT_BASELINES_PATH,
  type BaselineStore,
} from "./regression.js";
import { buildReport } from "./report.js";
import { GOLDEN_SCENARIOS } from "./scenarios.js";
import { scoreScenario, type PipelineBundle } from "./scoring.js";
import {
  DEFAULT_MIN_OVERALL_SCORE,
  EVALUATION_FRAMEWORK_VERSION,
  type EvaluationOptions,
  type EvaluationReport,
  type GoldenScenario,
  type ScenarioPipelineOutput,
  type ScenarioResult,
} from "./types.js";

export class EvaluationEngine {
  readonly version = EVALUATION_FRAMEWORK_VERSION;

  run(options: EvaluationOptions = {}): EvaluationReport {
    const threshold = options.threshold ?? DEFAULT_MIN_OVERALL_SCORE;
    const baselinesPath = options.baselinesPath ?? DEFAULT_BASELINES_PATH;
    let baselines = loadBaselines(baselinesPath);
    const previousOverall =
      options.previousOverall ?? baselines?.overallScore ?? null;

    const scenarioResults: ScenarioResult[] = [];
    const nextFingerprints: Record<string, string> = {
      ...(baselines?.fingerprints ?? {}),
    };

    for (const scenario of GOLDEN_SCENARIOS) {
      const result = this.evaluateScenario(scenario, baselines);
      scenarioResults.push(result);
      nextFingerprints[scenario.id] = result.output.fingerprint;
    }

    const report = buildReport({
      scenarioResults,
      threshold,
      previousOverall,
    });

    if (options.updateBaselines) {
      const store: BaselineStore = {
        version: EVALUATION_FRAMEWORK_VERSION,
        updatedAt: new Date().toISOString(),
        overallScore: report.overallScore,
        fingerprints: nextFingerprints,
      };
      saveBaselines(store, baselinesPath);
      baselines = store;
    }

    return report;
  }

  evaluateScenario(
    scenario: GoldenScenario,
    baselines: BaselineStore | null,
  ): ScenarioResult {
    const bundle = runPipeline(scenario);
    const output = toOutput(bundle);
    output.fingerprint = fingerprintOutput(output);

    const { metrics, overall, warnings, failures } = scoreScenario(
      scenario,
      bundle,
      output,
    );

    const baseline = compareToBaseline(
      scenario.id,
      output.fingerprint,
      baselines,
    );
    if (baseline.match === false) {
      failures.push(`regression:${baseline.note}`);
      warnings.push(`baseline_mismatch:${scenario.id}`);
    }

    const passed = failures.length === 0 && overall >= 70;

    return {
      scenarioId: scenario.id,
      category: scenario.category,
      passed,
      overallScore: overall,
      metrics,
      warnings,
      failures,
      output,
      baselineMatch: baseline.match,
    };
  }
}

function runPipeline(scenario: GoldenScenario): PipelineBundle {
  const astronomy = {
    sunSign: scenario.astronomy.sunSign,
    moonSign: scenario.astronomy.moonSign,
    risingSign: scenario.astronomy.risingSign ?? null,
    planetHouseMap: scenario.astronomy.planetHouseMap,
  };

  const meaning = computeMeaningSnapshot(astronomy);
  const meaning2 = computeMeaningSnapshot(astronomy);

  const development = computeDevelopmentSnapshot({
    meaning,
    ageMonths: scenario.ageMonths,
    parentGoals: scenario.parentGoals,
    routines: scenario.routines,
    asOfDate: "2026-07-01",
  });

  const adaptive = computeAdaptiveSnapshot({
    development,
    history: scenario.adaptiveHistory ?? null,
  });

  const conversation = computeConversationPlan({
    meaning,
    development,
    adaptive,
    userQuestion: scenario.userQuestion,
    entryPoint: scenario.entryPoint,
  });
  const conversation2 = computeConversationPlan({
    meaning: meaning2,
    development,
    adaptive,
    userQuestion: scenario.userQuestion,
    entryPoint: scenario.entryPoint,
  });

  const evidence = computeEvidenceSnapshot({
    astronomy,
    meaning,
    development,
    adaptive,
    conversation,
    level: "compact",
  });

  return {
    astronomy,
    meaning,
    development,
    adaptive,
    conversation,
    evidence,
    conversation2,
    meaning2,
  };
}

function toOutput(bundle: PipelineBundle): ScenarioPipelineOutput {
  return {
    meaningEngineVersion: bundle.meaning.meaningEngineVersion,
    developmentEngineVersion: bundle.development.developmentEngineVersion,
    adaptiveEngineVersion: bundle.adaptive.adaptiveEngineVersion,
    conversationEngineVersion: bundle.conversation.conversationEngineVersion,
    evidenceEngineVersion: bundle.evidence.evidenceEngineVersion,
    meaningProfile: {
      strengths: bundle.meaning.profile.strengths,
      learningStyle: bundle.meaning.profile.learningStyle,
      emotionalProfile: bundle.meaning.profile.emotionalProfile,
      curiosityPattern: bundle.meaning.profile.curiosityPattern,
    },
    developmentStage: bundle.development.stage.label,
    developmentPriorities: bundle.development.profile.topPriorities,
    engagementLevel: bundle.adaptive.profile.engagementLevel,
    conversationIntent: bundle.conversation.intent,
    conversationDepth: bundle.conversation.recommendedDepth,
    conversationTone: bundle.conversation.recommendedTone,
    conversationOrder: bundle.conversation.recommendedOrder,
    safetyFlags: bundle.conversation.safetyFlags,
    avoidTopics: bundle.conversation.avoidTopics,
    evidenceTraceCount: bundle.evidence.ruleTrace.length,
    evidenceEdgeCount: bundle.evidence.dependencyGraph.edges.length,
    fingerprint: "",
  };
}

let singleton: EvaluationEngine | null = null;

export function getEvaluationEngine(): EvaluationEngine {
  if (!singleton) singleton = new EvaluationEngine();
  return singleton;
}

export function runEvaluation(
  options?: EvaluationOptions,
): EvaluationReport {
  return getEvaluationEngine().run(options);
}
