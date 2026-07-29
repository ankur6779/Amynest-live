/**
 * AmyNest Continuous Learning Engine
 *
 * Additive feedback layer ABOVE production — after publish + metrics.
 * Does NOT create a new WorkflowPhase or modify production modules.
 *
 * Ingest published videos → Video DNA × performance → knowledge,
 * prompt hints, A/B experiments, failure analysis, monthly reports.
 */

export * from "./types.js";
export * from "./enable.js";
export * from "./dna/engine.js";
export * from "./metrics/normalize.js";
export * from "./correlate/engine.js";
export * from "./knowledge/store.js";
export * from "./prompts/optimizer.js";
export * from "./experiments/engine.js";
export * from "./failure/engine.js";
export * from "./report/monthly.js";
export * from "./orchestrator.js";
