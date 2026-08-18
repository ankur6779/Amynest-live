import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { shouldServerConsumeFreeInsightOnDelivery } from "./ai-entitlement.js";

const __dir = dirname(fileURLToPath(import.meta.url));

describe("Birth Sky free-insight consume authority", () => {
  it("consumes only on successful complete delivery, not moderated/errors", () => {
    assert.equal(shouldServerConsumeFreeInsightOnDelivery("complete"), true);
    assert.equal(shouldServerConsumeFreeInsightOnDelivery("moderated"), false);
    assert.equal(shouldServerConsumeFreeInsightOnDelivery("error"), false);
    assert.equal(shouldServerConsumeFreeInsightOnDelivery("cancelled"), false);
    assert.equal(shouldServerConsumeFreeInsightOnDelivery("timeout"), false);
    assert.equal(shouldServerConsumeFreeInsightOnDelivery("failed"), false);
  });

  it("stream success path consumes server-side (does not rely on client ACK alone)", () => {
    const src = readFileSync(join(__dir, "../../routes/birth-sky-ai.ts"), "utf8");
    assert.match(src, /shouldServerConsumeFreeInsightOnDelivery\("complete"\)/);
    assert.match(src, /await ackBirthSkyDelivery\(/);
    assert.match(
      src,
      /Consume free insight on the server once delivery is persisted/,
    );
  });

  it("ack claim uses conditional UPDATE so concurrent completes cannot double-consume", () => {
    const src = readFileSync(join(__dir, "./ai-entitlement.ts"), "utf8");
    assert.match(src, /COALESCE\(\$\{birthProfilesTable\.aiInsightsUsedCount\}, 0\) < 1/);
    assert.match(src, /\.returning\(\{ id: birthProfilesTable\.id \}\)/);
  });
});
