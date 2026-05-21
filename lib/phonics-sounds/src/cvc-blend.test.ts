import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { playCvcBlend } from "./cvc-blend.js";
import { getCvcWordEntry, getPhonemeAudioText, getCvcWordAudioText } from "./cvc.js";

describe("playCvcBlend", () => {
  it("plays phonemes sequentially then the whole word (no overlap)", async () => {
    const cat = getCvcWordEntry("cat");
    assert.ok(cat);

    const calls: string[] = [];
    const speak = async (text: string) => {
      calls.push(text);
      return { success: true };
    };

    await playCvcBlend(cat!, speak, { slowGapMs: 0, fastGapMs: 0 });

    assert.deepEqual(calls, [
      getPhonemeAudioText("k"),
      getPhonemeAudioText("æ"),
      getPhonemeAudioText("t"),
      getPhonemeAudioText("k"),
      getPhonemeAudioText("æ"),
      getPhonemeAudioText("t"),
      getCvcWordAudioText("cat"),
    ]);
  });

  it("uses phonics lines not letter names for consonants and vowels", () => {
    assert.equal(getPhonemeAudioText("k"), "k");
    assert.equal(getPhonemeAudioText("æ"), "a as in apple");
    assert.equal(getPhonemeAudioText("t"), "t");
  });

  it("stops the chain when speak fails", async () => {
    const cat = getCvcWordEntry("cat");
    assert.ok(cat);

    const calls: string[] = [];
    let n = 0;
    await playCvcBlend(
      cat!,
      async (text) => {
        calls.push(text);
        n += 1;
        return { success: n < 2 };
      },
      { slowGapMs: 0, fastGapMs: 0 },
    );

    assert.equal(calls.length, 2);
  });
});
