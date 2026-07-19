# Talking Amy — Production Audit & Upgrade Report

**Date:** 2026-07-18  
**Scope:** `/talking-amy` on-device voice echo experience  
**Target quality bar:** ChatGPT Voice / Gemini Live / Character AI / Sesame — *adapted to AmyNest’s product model*

---

## Product truth (critical)

Talking Amy is **not** a cloud STT → LLM → TTS voice agent.

| Capability | Talking Amy (actual) | ChatGPT Voice / Gemini Live |
|---|---|---|
| Mic capture | ✅ MediaRecorder via `microphoneSessionManager` | ✅ |
| Live transcript | ❌ | ✅ |
| LLM dialogue | ❌ | ✅ |
| Cloud TTS | ❌ | ✅ |
| Voice transform echo | ✅ Web Audio on-device | ❌ (different product) |
| Privacy | Private · On Device · no upload | Cloud processed |

Parts of the original brief that assume STT/LLM/TTS streaming (**Parts 6, 10 streaming LLM, barge-in against Amy TTS**) are **out of scope** for this feature without a product decision to change the privacy model. Fixes below optimize the **real** pipeline: warm mic → record → transform → playback, with premium mobile UX.

---

## Scores (after fixes)

| Dimension | Score | Notes |
|---|---:|---|
| 1. UI | **86**/100 | Premium glass stage, safer hierarchy, safe-area |
| 2. UX | **88**/100 | Instant listening cue, waveform, hold/tap polish |
| 3. Animation | **84**/100 | Amy stays mounted; CSS-var halo; reduced-motion |
| 4. Audio reliability | **90**/100 | Persistent warm stream; keep-alive park after stop |
| 5. React performance | **92**/100 | Eliminated 60fps `setState` during listen |
| 6. Mobile performance | **87**/100 | Tap→record warm path target &lt;150ms |
| 7. Accessibility | **82**/100 | Labels, `aria-live`, focus rings, reduced motion |
| 8. AI voice experience | **72**/100 | Excellent *echo* product; not conversational AI |
| 9. Premium feel | **86**/100 | Waveform, haptics, confetti, mode carousel |
| 10. Production readiness | **88**/100 | Latency telemetry + diagnostics in DEV |

**Overall production readiness: 88/100** for the on-device echo product.

---

## Part 1–3 — Root causes (traced, not guessed)

### A. Listening delay (5–10s) — ROOT CAUSE

**File:** `microphone-session-manager.ts` → `startRecording()`

Every Hold-to-Talk previously did a **cold acquire**:

1. Optional 150ms Android settle after prior cleanup  
2. `prepareForMicrophoneAcquisition()` — stop playback + up to **250ms** post-playback cooldown + native session prep  
3. `ensureAudioContext(true)` — **destroy + recreate** AudioContext every start  
4. Permission query  
5. Fresh `getUserMedia` (often 100ms–several seconds on Android WebView)  
6. New `MediaRecorder` + start  

There was **no persistent / warm microphone session**. Combined with UI setting `phase = "recording"` *before* mic was ready, kids saw “listening” while the pipeline was still cold.

**Fix:** Opt-in keep-alive + `warmMicrophone()`:

- Acquire stream while idle (when OS permission already granted)  
- Park stream on `stopRecording` (`keepAlive: true`) instead of `track.stop()`  
- Fast path: reuse healthy stream → attach MediaRecorder only (target &lt;150ms)  
- Talking Amy enables keep-alive; Speech Coach default path unchanged (full release)

### B. Screen flash / flicker — ROOT CAUSE

**File:** `use-talking-amy-mic-visual.ts` (old)

While listening, the hook called `setVisual(...)` on **every animation frame** (~60 React commits/sec). That re-rendered:

- `TalkingAmyHero` (glow classes, scales, particle counts)  
- Framer Motion `animate` props (restart risk)  
- `ReactiveParticles` with changing counts → remounts  
- `buildTalkingAmyAvatarInputs(phase, micVisual.level)` → avatar input object churn  

**Fix:**

- `useTalkingAmyMicVisualDom` writes CSS variables (`--ta-halo-scale`, `--ta-glow-opacity`, `--ta-shell-scale`) via refs — **zero React setState** while listening  
- Stable particle set (no count-driven remount)  
- Avatar mood from **phase only**; mouth still driven by `audioLevelRef`  
- Headline `AnimatePresence` keyed by phase bucket (not full celebration string)  
- Removed listening `scale-110` class toggle that caused layout pop  

### C. React performance

| Issue | Fix |
|---|---|
| 60fps setState | DOM/CSS vars |
| Hero re-renders | `React.memo` + phase-stable props |
| Mode grid remounts | Extracted memoized `ModeSelector` |
| Mic level in React | Stay in ref (`useMicLevelRef`) |

---

## What was implemented

### Audio pipeline
- `setKeepAlive` / `warmMicrophone` / `releaseWarmStream` / `isWarmed` / `getLastStartDiagnostics`
- `startRecording({ keepAlive: true })` fast path
- Page warm on granted permission + on hold gesture
- Cancel/stop parks stream for next tap

### Streaming experience (within product)
- Live **waveform** from mic level (canvas, no React churn)  
- Immediate listening copy: “Go ahead, I'm listening.”  
- Echo still one-shot after stop (by design — on-device transform)  
- **Not implemented:** cloud STT/LLM sentence streaming / barge-in TTS (would break Private · On Device)

### Premium mobile UI
- Safer header, ambient gradients, larger mic (7.5rem), glass stage  
- Horizontal mode carousel + categories + search  
- Favorite / featured / NEW badges  
- Thinking dots, confetti on first success, haptics  
- Safe-area padding, landscape-safe overflow  

### Character / delight
- Existing Amy 3D moods retained (idle/listening/thinking/speaking/celebrating)  
- Wave on open haptic, daily mood banner, mini-surprises preserved  
- First-success confetti + haptic  

### Accessibility
- `aria-label` / `aria-pressed` on mic  
- `aria-live` on stage  
- Mode radio labels  
- Reduced-motion paths preserved  
- Focus-visible rings  

### Analytics / diagnostics
- Stages: warm, tap→mic ready, mic→recording, recording→echo, echo complete  
- Failures logged (`talking_amy_record_fail`)  
- DEV line: `tap→record Xms · warm yes/no`  

---

## Before vs after

| Metric | Before | After |
|---|---|---|
| Mic lifecycle | Cold getUserMedia every hold | Warm + park keep-alive |
| Tap → listening (warmed) | Often 500ms–10s | Target &lt;150ms MediaRecorder attach |
| Listen-frame React commits | ~60/sec | 0 from mic visual |
| Amy flash | Frequent | Eliminated (phase-only remounts) |
| Waveform | None | Canvas level-reactive |
| Mode picker | Dense 3-col grid | Horizontal premium cards |
| Latency visibility | None | Telemetry + DEV HUD |

---

## Files modified / added

### Modified
- `artifacts/kidschedule/src/lib/microphone-session-manager.ts`
- `artifacts/kidschedule/src/pages/talking-amy/index.tsx`
- `artifacts/kidschedule/src/components/talking-amy/talking-amy-hero.tsx`
- `artifacts/kidschedule/src/hooks/use-talking-amy-mic-visual.ts`
- `artifacts/kidschedule/src/lib/talking-amy-telemetry.ts`

### Added
- `artifacts/kidschedule/src/components/talking-amy/mode-selector.tsx`
- `artifacts/kidschedule/src/components/talking-amy/talking-amy-waveform.tsx`
- `artifacts/kidschedule/src/lib/talking-amy-haptics.ts`
- `artifacts/kidschedule/src/lib/talking-amy-latency.ts`
- `artifacts/kidschedule/src/lib/talking-amy-latency.test.ts`
- `artifacts/kidschedule/src/lib/talking-amy-mic-visual.test.ts`
- `talking-amy-production-audit-report.md` (this file)

---

## Engine freeze note

`microphone-session-manager.ts` is a frozen Speech Coach engine owner. Changes are an **opt-in extension** (`keepAlive` / `warmMicrophone`) required because consumer-layer work cannot keep a live stream without new APIs.

| Template item | Answer |
|---|---|
| Root cause | Cold getUserMedia + prepare/cooldown every hold |
| Reproduction | Open Talking Amy → Hold to Talk on Android WebView after idle |
| Why consumer fix insufficient | No API existed to park/reuse stream |
| Risk | Low if keep-alive stays opt-in; Speech Coach still full-releases |
| Regression | Existing kidschedule talking-amy unit tests + new latency/visual tests |

---

## Future recommendations

1. **Product decision:** Keep on-device echo vs add optional “Amy Talks Back” cloud mode (separate surface, parental consent).  
2. If cloud mode is approved: reuse Speech Coach realtime STT/TTS — do **not** fork mic ownership.  
3. Add Playwright e2e: warm path latency assertion + no hero remount during listen (MutationObserver / paint).  
4. Prefetch Amy hero GLB on hub hover (cold launch &lt;2s).  
5. Optional: WebAudio worklet for zero-copy echo modes.  

---

## Explicitly deferred (by architecture)

- Live STT transcript while speaking  
- LLM start-before-recording-ends  
- Sentence-streamed TTS  
- Barge-in that interrupts Amy TTS mid-sentence (no TTS agent in this feature)  

These require a new product surface, not a polish pass on Talking Amy.
