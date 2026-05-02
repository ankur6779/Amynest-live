// Unit tests for the pure-JS WAV synth used by the mobile InfantSoundsTab.
//
// Run from the repo root with:
//   node --test --experimental-strip-types lib/infant-hub/src/audioSynth.test.ts

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildNoiseWav,
  buildMelodyWav,
  bytesToBase64,
  NOTE_FREQ,
  type Note,
  type SynthKind,
} from "./audioSynth.ts";

const KINDS: SynthKind[] = ["white", "pink", "brown"];

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  );
}

function readUint16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function asciiAt(bytes: Uint8Array, offset: number, len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) out += String.fromCharCode(bytes[offset + i]);
  return out;
}

describe("buildNoiseWav", () => {
  for (const kind of KINDS) {
    it(`${kind}: emits a valid mono PCM16 RIFF/WAVE header`, () => {
      const wav = buildNoiseWav(kind, { durationSeconds: 1, sampleRate: 22050 });
      assert.equal(asciiAt(wav, 0, 4), "RIFF");
      assert.equal(asciiAt(wav, 8, 4), "WAVE");
      assert.equal(asciiAt(wav, 12, 4), "fmt ");
      assert.equal(readUint32LE(wav, 16), 16);            // PCM chunk size
      assert.equal(readUint16LE(wav, 20), 1);             // PCM format
      assert.equal(readUint16LE(wav, 22), 1);             // mono
      assert.equal(readUint32LE(wav, 24), 22050);         // sample rate
      assert.equal(readUint16LE(wav, 32), 2);             // block align
      assert.equal(readUint16LE(wav, 34), 16);            // bits/sample
      assert.equal(asciiAt(wav, 36, 4), "data");
    });

    it(`${kind}: total byte length matches header + dataSize`, () => {
      const wav = buildNoiseWav(kind, { durationSeconds: 1, sampleRate: 22050 });
      const dataSize = readUint32LE(wav, 40);
      assert.equal(dataSize, 22050 * 2);
      assert.equal(wav.length, 44 + dataSize);
    });

    it(`${kind}: produces non-silent samples`, () => {
      const wav = buildNoiseWav(kind, { durationSeconds: 1, sampleRate: 22050 });
      let nonZero = 0;
      for (let i = 44; i < wav.length; i += 2) {
        const lo = wav[i];
        const hi = wav[i + 1];
        // signed 16-bit reconstruction
        let v = (hi << 8) | lo;
        if (v & 0x8000) v -= 0x10000;
        if (v !== 0) nonZero++;
      }
      // White / pink / brown all have plenty of energy; > 50% non-zero is safe.
      assert.ok(nonZero > 11000, `expected lots of non-zero samples, got ${nonZero}`);
    });
  }

  it("respects durationSeconds and sampleRate options", () => {
    const wav = buildNoiseWav("white", { durationSeconds: 2, sampleRate: 8000 });
    assert.equal(readUint32LE(wav, 24), 8000);
    assert.equal(readUint32LE(wav, 40), 8000 * 2 * 2);
  });
});

describe("bytesToBase64", () => {
  it("matches a known fixture (round-trip via Buffer)", () => {
    const fixture = new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f]); // "hello"
    assert.equal(bytesToBase64(fixture), "aGVsbG8=");
  });

  it("handles 1-byte and 2-byte tail padding", () => {
    assert.equal(bytesToBase64(new Uint8Array([0x66])), "Zg==");
    assert.equal(bytesToBase64(new Uint8Array([0x66, 0x6f])), "Zm8=");
    assert.equal(bytesToBase64(new Uint8Array([0x66, 0x6f, 0x6f])), "Zm9v");
  });

  it("agrees with Buffer.toString('base64') on a synthesised WAV", () => {
    const wav = buildNoiseWav("pink", { durationSeconds: 1, sampleRate: 8000 });
    const ours = bytesToBase64(wav);
    const reference = Buffer.from(wav).toString("base64");
    assert.equal(ours, reference);
  });
});

describe("buildMelodyWav", () => {
  const TWO_NOTES: Note[] = [
    { freqHz: NOTE_FREQ.C4, durMs: 500 },
    { freqHz: NOTE_FREQ.G4, durMs: 500 },
  ];

  it("emits a valid mono PCM16 RIFF/WAVE header sized to the note durations", () => {
    const wav = buildMelodyWav(TWO_NOTES, { sampleRate: 8000 });
    assert.equal(asciiAt(wav, 0, 4), "RIFF");
    assert.equal(asciiAt(wav, 8, 4), "WAVE");
    assert.equal(readUint16LE(wav, 22), 1);          // mono
    assert.equal(readUint32LE(wav, 24), 8000);       // sample rate
    assert.equal(readUint16LE(wav, 34), 16);         // bits/sample
    // 1 second of 8 kHz mono PCM16 = 16000 bytes of data.
    assert.equal(readUint32LE(wav, 40), 16000);
    assert.equal(wav.length, 44 + 16000);
  });

  it("treats freqHz=0 as a rest (zero samples in that span)", () => {
    const wav = buildMelodyWav(
      [
        { freqHz: 0, durMs: 250 },
        { freqHz: NOTE_FREQ.A4, durMs: 250 },
      ],
      { sampleRate: 8000 },
    );
    // First 100ms (800 samples = 1600 bytes) of the data section should
    // be near-silent — we only check that the *opening* span is exact zero
    // before the fade-in of the second note begins.
    let sumAbs = 0;
    for (let i = 44; i < 44 + 1600; i += 2) {
      const lo = wav[i];
      const hi = wav[i + 1];
      let v = (hi << 8) | lo;
      if (v & 0x8000) v -= 0x10000;
      sumAbs += Math.abs(v);
    }
    assert.equal(sumAbs, 0);
  });

  it("produces audible non-silent samples for a real melody phrase", () => {
    const wav = buildMelodyWav(TWO_NOTES, { sampleRate: 22050 });
    let nonZero = 0;
    for (let i = 44; i < wav.length; i += 2) {
      if (wav[i] !== 0 || wav[i + 1] !== 0) nonZero++;
    }
    // Most samples should be non-zero (sine + envelope + fades).
    assert.ok(nonZero > 5000, `expected audible melody, got ${nonZero} non-zero`);
  });

  it("noiseBed mixes a noise floor under the melody (energy increases)", () => {
    const dry = buildMelodyWav(TWO_NOTES, { sampleRate: 8000, amplitude: 0.05 });
    const wet = buildMelodyWav(TWO_NOTES, {
      sampleRate: 8000,
      amplitude: 0.05,
      noiseBed: { kind: "pink", level: 0.6 },
    });
    function energy(b: Uint8Array) {
      let e = 0;
      for (let i = 44; i < b.length; i += 2) {
        let v = (b[i + 1] << 8) | b[i];
        if (v & 0x8000) v -= 0x10000;
        e += v * v;
      }
      return e;
    }
    assert.ok(energy(wet) > energy(dry) * 4, "noise bed should add energy");
  });
});
