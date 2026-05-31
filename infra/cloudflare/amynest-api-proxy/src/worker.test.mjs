import assert from "node:assert/strict";

const STATIC_AUDIO_RE = /^\/api\/static-audio\/[a-f0-9]{32}\.mp3$/i;
const PHONICS_LIBRARY_RE = /^\/api\/phonics-library\/.+\.mp3$/i;
const SPELLING_LIBRARY_RE = /^\/api\/spelling-library\/.+\.mp3$/i;

function isCacheableAudioPath(pathname) {
  return (
    STATIC_AUDIO_RE.test(pathname) ||
    PHONICS_LIBRARY_RE.test(pathname) ||
    SPELLING_LIBRARY_RE.test(pathname)
  );
}

assert.equal(
  isCacheableAudioPath("/api/static-audio/f6b24e6cd11393e9b8f7775b13635898.mp3"),
  true,
);
assert.equal(isCacheableAudioPath("/api/static-audio/not-a-hash.mp3"), false);
assert.equal(
  isCacheableAudioPath("/api/phonics-library/phonics/letters/a.mp3"),
  true,
);
assert.equal(
  isCacheableAudioPath("/api/spelling-library/spelling/v1/cat.mp3"),
  true,
);
assert.equal(isCacheableAudioPath("/api/healthz/audio"), false);
assert.equal(isCacheableAudioPath("/api/tts/generate"), false);

console.log("worker.test.mjs OK");
