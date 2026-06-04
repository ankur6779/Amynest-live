import assert from "node:assert/strict";

const STATIC_AUDIO_RE = /^\/api\/static-audio\/[a-f0-9]{32}\.mp3$/i;
const PHONICS_LIBRARY_RE = /^\/api\/phonics-library\/.+\.mp3$/i;
const SPELLING_LIBRARY_RE = /^\/api\/spelling-library\/.+\.mp3$/i;
const WORLDS_LIBRARY_RE = /^\/api\/worlds-library\/.+$/i;
const ANIMAL_WORLD_LIBRARY_RE = /^\/api\/animal-world-library\/.+$/i;
const STORIES_STREAM_RE = /^\/api\/stories\/stream\/[a-zA-Z0-9_-]+$/;

function isCacheableAudioPath(pathname) {
  return (
    STATIC_AUDIO_RE.test(pathname) ||
    PHONICS_LIBRARY_RE.test(pathname) ||
    SPELLING_LIBRARY_RE.test(pathname)
  );
}

function isCacheableMediaPath(pathname) {
  return (
    isCacheableAudioPath(pathname) ||
    WORLDS_LIBRARY_RE.test(pathname) ||
    ANIMAL_WORLD_LIBRARY_RE.test(pathname) ||
    STORIES_STREAM_RE.test(pathname)
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

assert.equal(
  isCacheableMediaPath("/api/worlds-library/worlds/vehicles/road/car/hero.webp"),
  true,
);
assert.equal(
  isCacheableMediaPath("/api/animal-world-library/animal-world/farm/cow/moo-01.mp3"),
  true,
);
assert.equal(
  isCacheableMediaPath("/api/stories/stream/1CQrD-Rzj8IfmzgLk1bV-vDwgdS6pO6JS"),
  true,
);
assert.equal(isCacheableMediaPath("/api/nutrition-library/preview-url"), false);

console.log("worker.test.mjs OK");
