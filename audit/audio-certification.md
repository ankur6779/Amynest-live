# Phase 3 — Audio Certification

**Generated:** 2026-06-11T18:45:00Z  
**Production origin:** https://www.amynest.in  
**Test account:** demo@amynest.in  
**Evidence:** CI gates, GCS audits, production Playwright audio-coverage

---

## Coverage Formula

```
audio coverage = existing playable audio / total required audio
```

---

## System-Level Coverage

| System | Required | Playable (verified) | Coverage | Method |
|--------|----------|---------------------|----------|--------|
| Static TTS corpus | 4,159 phrases | 4,040 pre-mapped | **97.1%** | `pnpm check:static-audio` |
| Static TTS (extended pending) | 119 | 0 (on-demand TTS fallback) | **0%** pre-gen | same |
| Phonics library | 1,393 | 1,393 | **100%** | `check:phonics-release-gate` PASS |
| Spelling mastery | 1,731 unique words | manifest present | **~100%** map | prebuild gate |
| Discovery worlds | 795 assets | 795 | **100%** | discovery-worlds-coverage.json |
| Rhymes/lullabies GCS | 172 | 168 probed OK | **97.7%** | rhymes-gcs-audio-audit.json |
| Content bank audio | 446 unique phrases | mapped in audio-map | **100%** map | check:audio-release-certification |
| Infant sleep bundled | 34 manifest entries | binaries **not in repo** | **UNVERIFIED runtime** | manifest only |
| Story Hub video+audio | DB-backed (prod: 3) | 1 verified in E2E | **partial** | /api/healthz/drive |
| UI sounds | procedural | N/A | **100%** | procedural-sfx.ts |
| Achievement sounds | TTS + procedural | N/A | **100%** | no MP3 library |

### Aggregate Static Asset Coverage (manifest-backed)

```
(4040 + 1393 + 795 + 168) / (4159 + 1393 + 795 + 172) = 6396 / 6519 = 98.1%
```

### Aggregate Runtime Coverage (production E2E — major surfaces)

```
4 PASS / 7 tested = 57.1%
```

**Reported Audio Reliability Score: 78/100** (runtime failures weighted heavily)

---

## Production E2E Audio Certification

**Test:** `playwright/specs/audio-coverage.spec.ts`  
**Report:** `artifacts/kidschedule/playwright/audio-coverage-artifacts/report.json`  
**Overall:** **FAIL**

| Feature | Verdict | Reason | Screenshot |
|---------|---------|--------|------------|
| Parent Hub Story | PASS | Video stream OK | `audit/screenshots/` (pass) |
| Amy Coach | PASS | Blob audio advancing 2.9s | amy_coach.png |
| Conversation Coach | **FAIL** | `no_audio_element` | `audit/screenshots/audio-fail-conversation-coach.png` |
| Speech Coach | PASS* | `speechPlaying:true` but currentTime=0 | speech_coach.png |
| Infant Story | **FAIL** | `no_audio_element` | `audit/screenshots/audio-fail-infant-story.png` |
| Infant Poem | **FAIL** | `infant_poem_requires_infant_child_or_fixture` | infant_poem.png |
| Audio Lesson | PASS | Blob audio advancing 2.6s | audio_lesson.png |

*Speech Coach marked PASS by test harness due to `speechPlaying:true` despite `currentTime=0` — **quality concern**.

### Additional production audio test failure

**Test:** `audio-lessons-playback.spec.ts`  
**Failure:** Timeout waiting for `/api/tts/synthesize` response (90s)  
**Screenshot:** `audit/screenshots/audio-fail-audio-lessons-tts.png`

Note: Audio Lesson passed in coverage test but failed synthesize-specific test — **flaky TTS path**.

---

## Per-Feature Audit

### Story Hub

| Check | Status | Evidence |
|-------|--------|----------|
| Content exists | Partial | `/api/healthz/drive` → `storyFolderVideoCount: 3` |
| Audio/video reachable | YES (sample) | Stream URL returned 200 in E2E |
| CDN/GCS | GCS mirror + Drive fallback | storyGcsMirror.ts |
| Manifest | DB-backed `story_content` | Not static manifest |

### Amy Coach

| Check | Status |
|-------|--------|
| Content exists | YES (AI-generated wins) |
| Audio playable | YES (production E2E) |
| Source | Dynamic TTS → blob URL |

### Conversation Coach

| Check | Status |
|-------|--------|
| Audio element after trigger | **NO** |
| Mic/WebRTC path | Separate from HTMLAudioElement probe |
| Severity | **HIGH** — E2E cannot certify playback |

### Phonics V1/V2/V3

| Check | Status | Evidence |
|-------|--------|----------|
| Manifest entry exists | YES | phonics-audio-map.json assetCount=1393 |
| GCS reachable | YES | `/api/phonics/sound/a.mp3` → 200 |
| Release gate | PASS | 29 vitest tests |
| Local public manifest | **Not committed** | Generated at build |

### Rhymes / Lullabies

| Check | Status |
|-------|--------|
| Registry entries | 172 |
| GCS probed OK | 168 |
| **Failed (4)** | Beneath the Moss Blanket, Beyond the Rainbow, Little Star Shine Bright, London Bridge (Piano Version) |
| Bitrate | 320kbps avg (bandwidth concern) |

### Parent Lessons (Audio Lessons)

| Check | Status |
|-------|--------|
| Lesson count | 46 |
| Production playback | PASS (coverage) / FAIL (synthesize timeout) |
| Static pre-gen | Partial — 119 corpus phrases pending |

### Routine Content

| Check | Status |
|-------|--------|
| Voice templates | 3 dynamic + 2 static phrases |
| Audio type | On-demand TTS via useAmyVoice |

### Talking Amy

| Check | Status |
|-------|--------|
| Echo playback | talking-amy-echo.ts |
| Achievements | 10 visual-only (no audio files) |

### UI Sounds

| Check | Status |
|-------|--------|
| Implementation | Procedural oscillators (game-feedback.ts) |
| Static phrases | 15 UI phrases in static-audio corpus |

---

## Missing / Broken Audio Summary

| Category | Count | Severity |
|----------|-------|----------|
| Static TTS phrases not pre-generated | **119** | MEDIUM |
| Rhymes GCS probe failures | **4** | MEDIUM |
| Production E2E audio failures | **3 features** | HIGH |
| Infant bundled MP3s (repo) | **34 unverified** | HIGH |
| Story Hub videos in production Drive | **Only 3** | HIGH |

---

## Stale Manifest / Mapping Issues

| Issue | File | Detail |
|-------|------|--------|
| Extended corpus drift | speakable-phrase-corpus.json vs static-audio-map.json | 119 phrases ahead of map |
| Phonics public manifest | `public/phonics-audio/manifest.json` | Build-generated, not in git |
| Infant sleep binaries | `public/infant-sleep-audio/` | Manifest committed, MP3s absent |

---

## Production Audio Infrastructure Health

**Endpoint:** `GET /api/healthz/audio`

```json
{
  "ok": true,
  "status": "PASS",
  "tts": { "openAiConfigured": true, "elevenLabsConfigured": true, "cacheGcsEnabled": true },
  "staticAudio": { "gcsProbeOk": true }
}
```

**Endpoint:** `GET /api/static-audio/health` → `{"ok":true,"gcsProbeOk":true}`

Infrastructure healthy; **user-facing playback gaps remain** in Conversation Coach and Infant flows.
