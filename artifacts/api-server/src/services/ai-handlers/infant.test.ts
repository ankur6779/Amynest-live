import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { wrapJobInput } from "../../queue/ai-job-payload.js";

describe("handleInfantJob validation", () => {
  it("rejects invalid probe payloads with invalid_infant_sleep_context", async () => {
    const { handleInfantJob } = await import("./infant.js");
    const payload = wrapJobInput("audit/probe", { probe: true, invalid: true });

    await assert.rejects(
      () => handleInfantJob("infant.sleep_coach", payload),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.equal(err.message, "invalid_infant_sleep_context");
        return true;
      },
    );
  });
});
