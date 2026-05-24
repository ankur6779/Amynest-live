import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PHONICS_LOUDNORM_FILTER,
  PHONICS_MASTERING_FILTER_CHAIN,
  PHONICS_OUTPUT_CHANNELS,
  PHONICS_OUTPUT_SAMPLE_RATE,
  validatePostNormalizationDuration,
} from "./phonics-audio-master.js";

describe("phonics-audio-master", () => {
  it("uses speech loudness target", () => {
    assert.match(PHONICS_LOUDNORM_FILTER, /I=-16/);
    assert.match(PHONICS_LOUDNORM_FILTER, /TP=-1\.5/);
  });

  it("chains filters in fixed order with micro-fades", () => {
    const parts = PHONICS_MASTERING_FILTER_CHAIN.split(",");
    assert.equal(parts[0], "silenceremove=1:0:-40dB");
    assert.match(parts[1]!, /loudnorm=I=-16/);
    assert.match(parts[2]!, /alimiter=limit=-1\.5dB/);
    assert.match(PHONICS_MASTERING_FILTER_CHAIN, /afade=t=in:st=0:d=0\.02/);
    assert.match(PHONICS_MASTERING_FILTER_CHAIN, /afade=t=in:st=0:d=0\.03/);
  });

  it("targets mono 44.1kHz output", () => {
    assert.equal(PHONICS_OUTPUT_SAMPLE_RATE, 44100);
    assert.equal(PHONICS_OUTPUT_CHANNELS, 1);
  });

  it("validates post-normalization duration window", () => {
    assert.equal(validatePostNormalizationDuration(400).ok, true);
    assert.equal(validatePostNormalizationDuration(200).reason, "too_short_after_processing");
    assert.equal(validatePostNormalizationDuration(950).reason, "too_long_after_processing");
  });
});
