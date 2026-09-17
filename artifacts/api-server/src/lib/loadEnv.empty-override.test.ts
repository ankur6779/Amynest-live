import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { applyParsedEnv } from "./loadEnv.js";

const MARKER = "AMYNEST_LOADENV_TEST_KEY";

describe("applyParsedEnv", () => {
  afterEach(() => {
    delete process.env[MARKER];
  });

  it("does not wipe an existing secret with an empty dotenv placeholder", () => {
    process.env[MARKER] = "from-host";
    applyParsedEnv({ [MARKER]: "" }, true);
    assert.equal(process.env[MARKER], "from-host");
  });

  it("applies a non-empty dotenv value when override is true", () => {
    process.env[MARKER] = "from-host";
    applyParsedEnv({ [MARKER]: "from-file" }, true);
    assert.equal(process.env[MARKER], "from-file");
  });

  it("does not override a present value when override is false", () => {
    process.env[MARKER] = "from-host";
    applyParsedEnv({ [MARKER]: "from-file" }, false);
    assert.equal(process.env[MARKER], "from-host");
  });
});
