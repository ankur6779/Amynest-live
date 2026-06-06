import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getFixCandidateForFingerprint } from "../fix-candidates.js";
import { getFailureChainGraph } from "../failure-chain-graph.js";
import { getRegressionCandidateForFingerprint } from "../regression-candidates.js";
import {
  getSourceMappingForFingerprint,
  fingerprintToReviewSlug,
} from "../source-mappings.js";
import {
  scanFileForHookSites,
  validateSourceMappingLines,
} from "../source-scanner.js";
import { SOURCE_MAPPINGS } from "../source-mappings.js";

const CHILD_FP = "ChildForm|MaximumDepth|InfantEffect";

describe("fix candidate engine", () => {
  it("maps ChildForm infant effect to source locations", () => {
    const mapping = getSourceMappingForFingerprint(CHILD_FP);
    assert.ok(mapping);
    assert.equal(mapping.component, "ChildForm");
    const infantEffect = mapping.locations.find((l) => l.line === 324);
    assert.ok(infantEffect);
    assert.equal(infantEffect.hook, "useEffect");
    assert.ok(infantEffect.dependencies?.includes("isInfant"));
    assert.ok(infantEffect.stateMutation?.includes("educationStage"));
  });

  it("generates fix candidate with confidence and evidence", () => {
    const fix = getFixCandidateForFingerprint(CHILD_FP);
    assert.ok(fix);
    assert.ok(fix.confidence >= 90);
    assert.equal(fix.risk, "Low");
    assert.ok(fix.evidence.length >= 3);
    assert.ok(fix.proposedFix.includes("setValue"));
  });

  it("builds render-loop failure chain graph", () => {
    const graph = getFailureChainGraph(CHILD_FP);
    assert.ok(graph);
    assert.equal(graph.loopType, "render");
    assert.ok(graph.cycle.length >= 3);
    assert.ok(graph.nodes.some((n) => n.kind === "mutation"));
  });

  it("suggests regression scenarios with test files", () => {
    const reg = getRegressionCandidateForFingerprint(CHILD_FP);
    assert.ok(reg);
    assert.ok(reg.scenarios.some((s) => s.name === "Edit infant"));
    assert.ok(reg.scenarios.some((s) => s.name === "Refetch storm"));
    assert.ok(
      reg.scenarios.every((s) => s.suggestedTestFile.includes("kidschedule")),
    );
  });

  it("validates infant effect line via source scanner", () => {
    const validation = validateSourceMappingLines({
      file: "artifacts/kidschedule/src/pages/children/form.tsx",
      line: 324,
      hook: "useEffect",
    });
    assert.equal(validation.valid, true);
  });

  it("finds setValue sites in form.tsx", () => {
    const sites = scanFileForHookSites(
      "artifacts/kidschedule/src/pages/children/form.tsx",
    );
    const setValueSites = sites.filter((s) => s.hasSetValue);
    assert.ok(setValueSites.length >= 1);
  });

  it("slugifies fingerprint for review filename", () => {
    assert.equal(
      fingerprintToReviewSlug(CHILD_FP),
      "ChildForm-MaximumDepth-InfantEffect",
    );
  });

  it("lists all mapped fingerprints", () => {
    const fps = SOURCE_MAPPINGS.map((m) => m.readableFingerprint);
    assert.ok(fps.includes(CHILD_FP));
    assert.ok(fps.length >= 5);
  });
});
