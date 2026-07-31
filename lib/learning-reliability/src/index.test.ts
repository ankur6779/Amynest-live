import assert from "node:assert/strict";
import { test } from "node:test";
import { repairKnowledgeGraphDocument } from "@workspace/knowledge-graph";
import { formatReliabilityReport, runLearningChaosSuite } from "./index.js";

test("chaos suite produces score, matrix, recovery report", () => {
  const report = runLearningChaosSuite();
  assert.equal(report.schemaVersion, 1);
  assert.ok(report.scenarios.length >= 15);
  assert.equal(report.failureMatrix.length, report.scenarios.length);
  assert.ok(report.reliabilityScore >= 0 && report.reliabilityScore <= 100);
  assert.ok(report.recoveryReport.totalRepairs >= 0);
  assert.ok(typeof report.summary === "string");

  const failed = report.scenarios.filter((s) => s.status === "fail");
  assert.equal(
    failed.length,
    0,
    `unexpected failures:\n${failed
      .map(
        (f) =>
          `${f.id}: ${f.checks
            .filter((c) => !c.ok)
            .map((c) => `${c.domain}=${c.detail}`)
            .join("; ")}`,
      )
      .join("\n")}`,
  );

  const text = formatReliabilityReport(report);
  assert.ok(text.includes("Failure matrix"));
  assert.ok(text.includes("Reliability"));
});

test("subset only runs selected scenarios", () => {
  const report = runLearningChaosSuite({
    only: ["storage_corruption", "duplicate_events"],
  });
  assert.equal(report.scenarios.length, 2);
  assert.deepEqual(
    report.scenarios.map((s) => s.id).sort(),
    ["duplicate_events", "storage_corruption"],
  );
});

test("KG repair rebuilds garbage documents", () => {
  const result = repairKnowledgeGraphDocument("not-an-object", "child-x", []);
  assert.equal(result.repaired, true);
  assert.ok(result.actions.includes("replace_non_object"));
  const result2 = repairKnowledgeGraphDocument(null, "child-y", []);
  assert.equal(result2.doc.childId, "child-y");
});
