# Playback quality audit (phonics / Hear & Tap / CVC)

**Status: UNRESOLVED on device** until you capture logs with audit mode and confirm child-quality criteria.

This document is the engineering deliverable for the “audio plays but sounds wrong” report. Code fixes and instrumentation are in-repo; **proof requires a real device session**.

---

## 1. Root cause(s) (code-level, ranked)

### RC-1 — Hear & Tap played a full CVC blend instead of one prompt (FIXED in this branch)

**Symptom:** Repeated syllables, long prompt, overlap feel on every speaker tap.

**File:** `artifacts/kidschedule/src/components/phonics-test.tsx` (`playPrompt`)

**Before:** When `getCvcWordEntry(blendWord)` existed, `playCvcBlendWithSpeak` → `phonicsEnginePlayCvcBlend` queued **phoneme₁ → phoneme₂ → phoneme₃ → word** (e.g. `/s/ /a/ /t/ sat`) with 120ms gaps.

**After:** `phonicsEnginePlayWord(playbackWordId)` — **one** whole-word static clip per tap.

**Reproduce (old build):** Phonics test → Hear & Tap → CVC question (e.g. “sat”) → tap speaker → hear 4 clips in sequence.

### RC-2 — Two playback owners (ongoing risk)

| Owner | Entry | Element |
|-------|--------|---------|
| `phonics-player.ts` | `playPhonicsUrl` | Fresh `HTMLAudioElement` per clip |
| `audio-manager.ts` | `play` / `playUrl` | Speech channel + retries/watchdog |
| `amy-voice-controller.ts` | `speak` / `playPreparedUrl` | Pipeline → `audioManager.play` |

`phonicsEngineStop` + `stopPhonicsPlayback` reduce overlap but **races** remain if `speak()` fallback runs while phonics is playing.

### RC-3 — Post-load “audible start” gates (timeout / stutter on some builds)

**Files:** `amy-voice-audio-start.ts`, `audio-manager.ts` (`runPlaybackWatchdog`), pipeline `waitForAudible`.

`readyState=4` does not satisfy gates that wait for `playing` + `currentTime > 0.02`. Recovery mode (`AUDIO_PLAYBACK_RECOVERY_MODE`) relaxes this; production may still ship older bundles.

### RC-4 — Fallback stacking

**File:** `phonics-test.tsx` — if `phonicsEnginePlayWord` fails, `speak(..., { mode: "phonics" })` can add **second** layer (Amy/TTS/static pipeline).

**File:** `phonics-audio.ts` — `playPhonicsBlend` non-CVC path can run **slow pass then fast pass** (double sequence).

### RC-5 — Coalescing / duplicate tap paths

- `coalesceAudioRequest` (500ms window) in `audio-playback-queue.ts`
- `playPhonicsUrl` TAP_DEBOUNCE_MS + same-URL debounce
- `speakExecutor.runLatest` / `coalesceAudioRequest` on speak

Duplicates within 400ms emit `audio_duplicate_detected` when audit mode is on.

### RC-6 — Cross-origin library fetch (mitigated when bypass on)

`phonics-audio-map.ts` → Render API URLs caused CORS from `www.amynest.in`. Bypass routes to `/api/static-audio/...` (`unified-catalog-playback.ts`).

---

## 2. Instrumentation (Phase 1)

**Module:** `artifacts/kidschedule/src/lib/playback-quality-telemetry.ts`

**Enable on device:**

```js
localStorage.setItem('PLAYBACK_QUALITY_AUDIT', '1');
location.reload();
// or: https://www.amynest.in/...?playbackQuality=1
```

**Events:** `audio_requested`, `audio_loaded`, `audio_started`, `audio_completed`, `audio_failed`, `audio_interrupted`, `audio_overlap_detected`, `audio_duplicate_detected`

**Wired at:**

- `phonics-player.ts` — each `playPhonicsUrl`
- `phonics-audio-engine.ts` — letter, word, each CVC step
- `audio-manager.ts` — `play()`
- `amy-voice-controller.ts` — `runSpeak` request

**Console:** `[PLAYBACK_QUALITY]` objects

**Copy helpers:**

```js
window.__PLAYBACK_QUALITY_LOG__      // last 200 events
window.__PLAYBACK_QUALITY_LAST__
window.__PLAYBACK_QUALITY_LATENCY__() // p50/p95 tap→start from audio_started
```

Also: `PLAYBACK_TRACE=1`, `AUDIBLE_START_DIAG=1` (see `playback-trace.ts`, `audible-start-diagnostic.ts`).

---

## 3. Caller inventory (Phase 2) — phonics-relevant

| Caller | Path |
|--------|------|
| `playPhonicsUrl` | `phonics-static-audio.ts` → engine clips |
| `phonicsEnginePlayLetter` | engine → `playLetterClipDirect` |
| `phonicsEnginePlayWord` | engine → `playWordClipDirect` |
| `phonicsEnginePlayCvcBlend` | blend UI, `playCvcBlendWithSpeak` |
| `playCvcBlendWithSpeak` | `phonics-audio.ts`, `cvc-blend-panel.tsx`, learning flows |
| `playPhonicsBlend` | legacy double-pass for non-CVC |
| `amyVoiceController.speak` | `use-amy-voice.ts`, spelling, speech coach, phonics-test fallback |
| `amyVoiceController.playPreparedUrl` | `phonics-audio.ts`, `unified-catalog-playback.ts` |
| `audioManager.play` | pipeline, static-audio, emergency-audio, poems |
| `emergency-audio` / `playControllerEmergencyAudio` | failure path only |
| `speechSynthesis.speak` | `emergency-audio.ts`, **preview page only** (not Hear & Tap) |

**No** Expo AV / react-native-track-player on production web/Android WebView path.

---

## 4. Asset quality report (Phase 3)

**Script:** `node scripts/playback-quality-asset-report.mjs [--base https://www.amynest.in]`

**Output:** `scripts/playback-quality-asset-report.json`

Inspect **Expected vs Actual** per key: map key → GCS hash → proxy URL → HTTP status → estimated duration.

**Note:** Letter `a` may be absent from `static-audio-map.json` (use phonics-library or grapheme alias); verify map for your curriculum keys.

---

## 5. Playback engine (Phase 4)

- Single phonics element owner: `phonics-player.ts` (`activeElement`, `ownershipToken`)
- Speech channel: `audio-manager.ts` (`playInFlight`, channel tokens)
- **Risk:** `playAsync` before metadata — mitigated by `playWithAudibleStartGuarantee` + recovery mode
- **Risk:** `unloadAsync` N/A (web); `teardownElement` on settle/interrupt
- **Risk:** duplicate subscriptions — phonics uses one-shot listeners per element

---

## 6. Phonics flow (Phase 5)

### Hear & Tap (after fix)

```
tap speaker
  → phonicsEngineStop
  → phonicsEnginePlayWord(wordId)  // ONE session in audit log
  → playWordClipDirect → playPhonicsUrl
  → audio_requested … audio_started … audio_completed
```

### CVC blending

```
word selected / blend button
  → phonicsEnginePlayCvcBlend
  → for each step: audio_requested (PhonicsEngine/CvcBlend) × N
  → gap 120ms (skipSlowPass) between steps
```

---

## 7. Latency (Phase 6)

**Targets:** &lt;100ms warm, &lt;250ms cold (tap → first sample).

**Measure:** With audit on, after 10+ taps:

```js
window.__PLAYBACK_QUALITY_LATENCY__()
// { count, p50, p95, worst } in ms from audio_started.tapToStartMs
```

**Before/after metrics:** Not captured in CI — fill from device log after deploy.

---

## 8. Hard failures / legacy paths (Phase 7)

| Pattern | Location | Active on phonics? |
|---------|----------|-------------------|
| `setTimeout` + play | `spelling-mastery.tsx` (250ms delay) | Spelling, not Hear & Tap |
| Emergency audio | `emergency-audio.ts`, `amy-voice-audio-guard.ts` | On speak failure |
| `playPhonicsBlend` slow+fast | `phonics-audio.ts` | Blending UI, not Hear & Tap |
| `speechSynthesis` | `emergency-audio.ts`, preview page | Fallback / dev |
| Force restart playback | `audio-manager.ts` | Unless recovery mode |
| Warmup / prewarm | `global-audio-warmup.ts`, `phonics-static-audio.ts` | Parallel fetch, not second play |

---

## 9. Proof checklist (you must run on device)

1. Enable `PLAYBACK_QUALITY_AUDIT=1`
2. **Hear & Tap:** tap speaker 5× on same CVC item → expect **1** `audio_requested` per tap with owner `PhonicsEngine`, clipType `word`, **no** `PhonicsEngine/CvcBlend` steps
3. **CVC panel:** run blend → expect **N** step events (`sat:p0`, …) then word step; **no** `audio_overlap_detected` / `audio_duplicate_detected`
4. Export: `copy(JSON.stringify(window.__PLAYBACK_QUALITY_LOG__, null, 2))`
5. Latency: `__PLAYBACK_QUALITY_LATENCY__()` meets targets on warmed session

---

## 10. Reproduction steps (quality bug)

1. Production or staging with phonics test
2. Mode: Hear & Tap
3. Question with CVC word (e.g. sat)
4. Tap speaker icon repeatedly
5. **Old:** hear s, a, t, sat sequence / stutter / overlap with Amy voice on retry
6. **Expected after fix:** single “sat” pronunciation per tap, consistent timing

---

## Files changed in this audit pass

- `playback-quality-telemetry.ts` — telemetry + latency export
- `phonics-player.ts`, `phonics-audio-engine.ts`, `audio-manager.ts`, `amy-voice-controller.ts` — wiring
- `phonics-test.tsx` — Hear & Tap single-word play
- `scripts/playback-quality-asset-report.mjs`
- This document
