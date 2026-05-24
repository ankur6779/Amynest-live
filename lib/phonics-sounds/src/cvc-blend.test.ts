import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CVC_WORDS } from "./cvc.js";
import { playCvcBlend } from "./cvc-blend.js";

describe("playCvcBlend", () => {
  it("plays phoneme audio keys sequentially (slow then fast)", async () => {
    const cat = CVC_WORDS.find((w) => w.word === "cat")!;
    const calls: string[] = [];
    await playCvcBlend(cat, async (audioKey) => {
      calls.push(audioKey);
      return { success: true };
    });
    assert.deepEqual(calls, ["k", "a", "t", "k", "a", "t"]);
  });

  it("uses phonics audio keys not letter names for consonants and vowels", async () => {
    const cat = CVC_WORDS.find((w) => w.word === "cat")!;
    const calls: string[] = [];
    await playCvcBlend(cat, async (audioKey) => {
      calls.push(audioKey);
      return { success: true };
    }, { skipSlowPass: true });
    assert.deepEqual(calls, ["k", "a", "t"]);
    assert.ok(!calls.includes("c"));
    assert.ok(!calls.includes("cat"));
  });

  it("can skip fast pass for a single teaching pass", async () => {
    const cat = CVC_WORDS.find((w) => w.word === "cat")!;
    const calls: string[] = [];
    await playCvcBlend(
      cat,
      async (audioKey, meta) => {
        calls.push(`${meta?.phase}:${audioKey}`);
        return { success: true };
      },
      { skipFastPass: true },
    );
    assert.deepEqual(calls, ["slow:k", "slow:a", "slow:t"]);
  });

  it("can include whole word when explicitly requested", async () => {
    const cat = CVC_WORDS.find((w) => w.word === "cat")!;
    const calls: string[] = [];
    await playCvcBlend(
      cat,
      async (audioKey) => {
        calls.push(audioKey);
        return { success: true };
      },
      { skipSlowPass: true, includeWordFinale: true },
    );
    assert.equal(calls[calls.length - 1], "cat");
  });
});
