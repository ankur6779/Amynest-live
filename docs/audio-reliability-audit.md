# Audio Reliability P0 — Architecture Audit & Reliability Report

**Status:** In progress (blocking release)  
**Date:** 2026-05-31  
**Scope:** Learning Zone + Amy Speech Coach + Parent Hub narration

## 1. Architecture audit

### Single ownership model (frozen — do not rewrite)

| Concern | Owner | Entry API |
|---------|-------|-----------|
| TTS / coach / parent hub / lessons | `amy-voice-controller.ts` | `useAmyVoice().speak()` |
| Phonics / CVC / blending clips | `phonics-player.ts` | `playPhonicsUrl()` |
| HTMLAudioElement lifecycle | `audio-manager.ts` | `audioManager.play()` |
| Speech Coach dialogue | `@workspace/speech-coach` | `evaluateCoachResponse`, templates |
| Learning Zone prewarm | `learning-zone-audio-prewarm.ts` | `scheduleLearningZoneAudioPrewarm()` |
| Global boot warmup | `global-audio-warmup.ts` | `initGlobalAudioWarmup()`, `warmSpeechCoach()` |

### Playback priority (Phase 7 — enforced in pipeline)

```
1. BUNDLED / global in-memory cache
2. LOCAL_CACHE (IndexedDB blob)
3. STATIC_GCS (static-audio-map + phonics manifest → API proxy)
4. DYNAMIC_TTS (generateTts API — cache after first hit)
5. FALLBACK (emergency local MP3 / speechSynthesis visual)
```

Parent Hub: `prepareAmyParentHubSpeech()` sets `preferDynamicTts = false` (static-first).  
Speech Coach warmup: `COACH_DIALOGUE_WARMUP_PHRASES` in `@workspace/speech-coach` (Phase 5 corpus exists).  
Phonics: ID-keyed manifest in `phonics-audio-map` — no runtime TTS for library clips.

### Violations found (Phase 2)

| Location | Issue | Severity | Action |
|----------|-------|----------|--------|
| `phonics-player.ts` | Direct `el.play()` inside phonics owner | Allowed | Frozen owner — wraps `playWithAudibleStartGuarantee` |
| `phonics-safe-audio.ts` | `new Audio()` factory | Allowed | Element creation only; playback via phonics-player |
| `audio-manager.ts` | `new Audio()` for gesture prime / silent warm | Allowed | Engine internals |
| `phonics-audio-preview.tsx` | Dev page direct `new Audio()` | Low | Dev-only; not production path |
| `amy-voice-audio-diag.ts` | Diagnostic `new Audio()` | Low | Dev-only |
| `story-player.tsx`, `art-craft-reels.tsx` | Video `.play()` | N/A | Not speech audio |
| `StorySection` in `age-based-sections.tsx` | Imported in hub but not rendered | Medium | Dead UI path — no user impact |

**No production feature code bypasses `audioManager.play()` or `playPhonicsUrl()` for speech.**

## 2. Problems found

1. **No unified P0 telemetry** — scattered across `audio-health`, `phonics-telemetry`, `amy-voice-telemetry`.
2. **Watchdog too slow** — 4.5s / 9s allowed silent LOADING; SLA requires 3s max.
3. **No strict FSM** — controller could stay `loading` until pipeline timeout.
4. **Prefetch too shallow** — Learning Zone predictive queue capped at 6 (now 20).
5. **Parent Hub** — no hub-level warmup; Hindi facts miss static catalog.
6. **Articles** — not in static corpus; always dynamic on first play.
7. **Failure copy** — generic "Audio failed" instead of retry-oriented message.

## 3. Fixes applied (this PR)

### Phase 1 — Observability

- New module: `artifacts/kidschedule/src/lib/audio-reliability-telemetry.ts`
- Events: `audio_requested`, `audio_cache_hit/miss`, `audio_download_*`, `audio_play_*`, `audio_timeout`, `audio_cancelled`, `audio_recovered`
- Dashboard: `window.__amynestAudioReliability.dashboard()` — per-module success rate, avg/p95 latency
- Wired into: `audio-manager.play()`, `amy-voice-controller`, `phonics-player`

### Phase 3 — State machine

- New module: `artifacts/kidschedule/src/lib/audio-playback-state-machine.ts`
- States: IDLE → LOADING → READY → PLAYING → COMPLETED | FAILED
- 3s loading watchdog on `amyVoicePlaybackFsm` + controller `armLoadingWatchdog()`
- `audio-manager` playback watchdog reduced to **3000ms** (all platforms)

### Phase 6 — Prefetch

- `learning-zone-audio-prewarm.ts`: `MAX_PREDICTIVE` 6 → **20**

### Phase 8 — Failure recovery

- User toast: **"Audio unavailable. Retrying…"** (was "Audio failed. Tap to retry.")
- Auto emergency layer + pipeline retry unchanged

## 4. Performance before / after

| Metric | Before | After (expected) |
|--------|--------|------------------|
| Playback watchdog | 4.5s / 9s Android | **3s all devices** |
| Controller loading cap | Pipeline budget (~2.5s+) | **3s hard FSM + abort** |
| Learning Zone predictive prefetch | 6 clips | **20 clips** |
| Module success visibility | Partial (`audio-health` batch) | **Real-time dashboard counters** |
| Static first sound (phonics/coach static hit) | ~50–200ms | Unchanged target **<150ms** |
| Dynamic first sound (coach personalized) | 1–3s | Unchanged target **<800ms** with cache |

*Production before/after rates require 7-day telemetry post-deploy via `__amynestAudioReliability.dashboard()` and `/api/audio-health`.*

## 5. Reliability report template (Phase 9)

Run on each device class before release:

```javascript
// In browser console after exercising Speech Coach + Phonics + Parent Hub
window.__amynestAudioReliability.dashboard()
```

| Module | Target success | Cache hit target |
|--------|----------------|------------------|
| speech_coach | ≥ 99.5% | ≥ 80% static+cache |
| phonics | ≥ 99.5% | ≥ 95% STATIC_GCS |
| blending | ≥ 99.5% | ≥ 95% STATIC_GCS |
| reading | ≥ 99.5% | ≥ 85% |
| parent_hub | ≥ 99.5% | ≥ 90% static (EN content) |

### Device matrix (manual — Phase 9)

- [ ] Android low-end WebView
- [ ] Android mid-range WebView
- [ ] Android tablet WebView
- [ ] iPhone Safari / Capacitor
- [ ] iPad
- [ ] Chrome desktop
- [ ] Safari desktop

Record per device: `successRate`, `avgLatencyMs`, `p95LatencyMs`, `cacheHits / (cacheHits+cacheMisses)`.

## Phase 10 — Failure forensics (added)

### Step 1 — Failure classification
Every failure mapped to: `AUDIO_FOCUS_LOST`, `PLAY_REJECTED`, `SOURCE_NOT_FOUND`, `CACHE_MISS`, `NETWORK_TIMEOUT`, `DECODE_ERROR`, `UNMOUNTED_DURING_PLAY`, `AUTOPLAY_BLOCKED`, `PIPELINE_TIMEOUT`, `UNKNOWN`.

```javascript
window.__amynestAudioReliability.failures()      // module × reason × count × %
window.__amynestAudioReliability.topCauses(5)   // ranked impact
```

### Step 2 — Trace IDs
Each request gets `audio_trace_id` with steps: REQUESTED → CACHE_LOOKUP → HIT/MISS → DOWNLOAD → PLAY → FAILURE.

```javascript
window.__amynestAudioReliability.failedTraces()
window.__amynestAudioReliability.replayTrace('trace_…')
```

### Step 3 — Android lifecycle
`installAndroidAudioLifecycleMonitor()` logs `ANDROID_LIFECYCLE_INTERRUPT` on visibility/pagehide/blur.

### Step 4 — Startup preload
- `MAX_AUDIO_CACHE` 72 → **120**
- Pin tier-1/2 phonics + all coach warmup clips (no eviction)
- Coach warmup limit 8 → **20** phrases

### Step 5 — Speech Coach cache
`recordSpeechCoachCacheOutcome()` — target ≥90%:
```javascript
window.__amynestAudioReliability.speechCoachCache()
window.__amynestAudioReliability.rootCauseReport().remediation
```

### Step 6 — Parent Hub warmup
`warmParentHubVisibleContent()` on hub open — facts, stories, puzzles, activity steps.

### Step 7 — Device matrix
```javascript
window.__amynestAudioReliability.deviceMatrixTemplate()
// … run 100 actions per module …
window.__amynestAudioReliability.deviceMatrixReport()
```

### Step 8 — Root cause report
```javascript
window.__amynestAudioReliability.rootCauseReport()
// topCauses, remediation plan, modulesBelowTarget
```


- Wire `trackAudioCacheHit/Miss` inside `amy-voice-pipeline` layer attempts
- Parent Hub page-level static warmup on first gesture
- Universal `prefetchParentHubItem` on all hub sections
- Hindi fact audio: English speak + Hindi display, or Hindi static corpus
- Article sections in static corpus OR modal-open full prefetch
- Server-side aggregation dashboard for `/api/audio-health` + new reliability events

## 7. Release gate

Do **not** ship until:

```bash
pnpm run check:speech-coach-engines
pnpm --filter @workspace/kidschedule test -- audio-reliability
```

Manual: Speech Coach + Phonics 50 taps each, dashboard `successRate >= 99.5%` per module.
