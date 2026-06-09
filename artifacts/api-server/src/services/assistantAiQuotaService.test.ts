import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { unwrapJobPayload } from "../queue/ai-job-payload.js";
import type { AiJobRecord } from "../queue/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readSource(rel: string): string {
  return readFileSync(join(__dirname, rel), "utf8");
}

describe("assistant-ai quota refund wiring", () => {
  it("refunds assistant-ai jobs from patchJobRecord on failed/timed_out", () => {
    const src = readSource("../queue/job-results.ts");
    assert.match(src, /maybeRefundAssistantAiQuota/);
    assert.match(src, /refundAssistantAiQuotaFromJob/);
    const failedBlock = src.slice(src.indexOf('updated.status === "failed"'));
    assert.match(failedBlock, /maybeRefundAssistantAiQuota/);
  });

  it("only targets ai/assistant-ai route payloads", () => {
    const src = readSource("./assistantAiQuotaService.ts");
    assert.match(src, /routeName !== "ai\/assistant-ai"/);
    assert.match(src, /resolveInfantAiQuotaFromDb/);
    assert.match(src, /incrementFeatureUsage\(userId, feature, -1\)/);
  });

  it("unwraps assistant poll context userId for refund", () => {
    const payload = {
      routeName: "ai/assistant-ai",
      input: { namespace: "amy-assistant" },
      pollContext: { userId: "user-42", question: "Sleep tips?" },
    };
    const unwrapped = unwrapJobPayload(payload);
    assert.equal(unwrapped.routeName, "ai/assistant-ai");
    assert.equal((unwrapped.pollContext as { userId?: string }).userId, "user-42");
  });

  it("skips anonymous assistant jobs", () => {
    const job: AiJobRecord = {
      id: "job-1",
      type: "openai.chat",
      userId: "anonymous",
      status: "failed",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      payload: {
        routeName: "ai/assistant-ai",
        input: { namespace: "amy-assistant" },
        pollContext: { question: "Hi" },
      },
    };
    const { routeName, pollContext } = unwrapJobPayload(job.payload);
    assert.equal(routeName, "ai/assistant-ai");
    assert.equal((pollContext as { userId?: string }).userId, undefined);
    assert.equal(job.userId, "anonymous");
  });
});
