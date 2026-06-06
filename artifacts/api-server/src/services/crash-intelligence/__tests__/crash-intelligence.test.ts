import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeCrashSeverity, isCoreFlowRoute } from "../severity.js";
import { getRootCauseForFingerprint } from "../root-cause-playbooks.js";
import { getFixSuggestionForFingerprint } from "../fix-suggestions.js";
import {
  getRegressionForFingerprint,
  verifyRegressionTestFiles,
} from "../regression-registry.js";
import { evaluateLaunchGate } from "../launch-gate.js";
import { parseCrashEventFromClientLog } from "../ingest-parsers.js";
import type { FingerprintAggregate } from "../types.js";

describe("crash intelligence", () => {
  it("classifies P0 for core flow + any 24h count", () => {
    const sev = computeCrashSeverity({
      count24h: 1,
      count7d: 1,
      recoverySuccessRate: 95,
      coreFlowAffected: true,
    });
    assert.equal(sev, "P0");
  });

  it("classifies P0 when recovery below 70%", () => {
    const sev = computeCrashSeverity({
      count24h: 2,
      count7d: 5,
      recoverySuccessRate: 60,
      coreFlowAffected: false,
    });
    assert.equal(sev, "P0");
  });

  it("detects core flow routes", () => {
    assert.equal(isCoreFlowRoute("/children/42"), true);
    assert.equal(isCoreFlowRoute("/settings"), false);
  });

  it("returns ChildForm root cause chain with evidence", () => {
    const rc = getRootCauseForFingerprint("ChildForm|MaximumDepth|InfantEffect");
    assert.ok(rc);
    assert.equal(rc.component, "ChildForm");
    assert.ok(rc.chain.length >= 5);
    assert.ok(rc.evidence.some((e) => e.includes("child-form-hydration")));
  });

  it("returns fix suggestion for ChildForm infant effect", () => {
    const fix = getFixSuggestionForFingerprint("ChildForm|MaximumDepth|InfantEffect");
    assert.ok(fix);
    assert.match(fix.minimalFix, /equality/i);
    assert.equal(fix.regressionRisk, "Low");
  });

  it("verifies ChildForm regression test files exist", () => {
    const reg = getRegressionForFingerprint("ChildForm|MaximumDepth|InfantEffect");
    assert.ok(reg);
    const verified = verifyRegressionTestFiles(reg);
    assert.equal(verified.ok, true, `missing: ${verified.missing.join(", ")}`);
  });

  it("blocks launch gate for unresolved P0 without root cause", () => {
    const aggregates: FingerprintAggregate[] = [
      {
        readableFingerprint: "Unknown|Error|NewCrash",
        fingerprint: "fp_deadbeef",
        count24h: 25,
        count7d: 30,
        affectedUsers: 10,
        affectedChildren: 5,
        affectedRoutes: ["/children/1"],
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        recoverySuccessRate: 50,
        severity: "P0",
        exampleErrorIds: ["ERR-20260101-ABC"],
        coreFlowAffected: true,
      },
    ];
    const gate = evaluateLaunchGate({ aggregates, globalRecoveryRate: 95 });
    assert.equal(gate.pass, false);
    assert.ok(gate.blockers.length > 0);
  });

  it("passes launch gate when no active P0 fingerprints", () => {
    const gate = evaluateLaunchGate({
      aggregates: [],
      globalRecoveryRate: 95,
    });
    assert.equal(gate.pass, true);
  });

  it("parses crash event from client log meta", () => {
    const parsed = parseCrashEventFromClientLog({
      message: "[ERR-20260101-ABC] Maximum update depth",
      route: "/children/1",
      userId: "u1",
      meta: {
        errorId: "ERR-20260101-ABC",
        fingerprint: "fp_abc123",
        readableFingerprint: "ChildForm|MaximumDepth|InfantEffect",
        stack: "Error: x",
      },
    });
    assert.ok(parsed);
    assert.equal(parsed.readableFingerprint, "ChildForm|MaximumDepth|InfantEffect");
  });
});
