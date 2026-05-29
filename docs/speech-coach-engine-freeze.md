# Amy Speech Coach — Engine Freeze Protocol

**Status:** FROZEN (production infrastructure)

These systems are core platform infrastructure. The goal is stability, predictability, and regression prevention.

## Frozen engines

| Engine | Single owner | Location |
|--------|--------------|----------|
| **Audio playback** | `amyVoiceController` | `artifacts/kidschedule/src/lib/amy-voice-controller.ts`, `amy-voice-pipeline.ts`, `use-amy-voice.ts` |
| **Microphone session** | `MicrophoneSessionManager` | `artifacts/kidschedule/src/lib/microphone-session-manager.ts` |
| **Speech Coach dialogue** | `@workspace/speech-coach` coach-dialogue | `lib/speech-coach/src/coach-dialogue.ts` |
| **Coach memory** | `@workspace/speech-coach` coach-memory | `lib/speech-coach/src/coach-memory.ts` |
| **Learning journey** | `@workspace/speech-coach` coach-journey | `lib/speech-coach/src/coach-journey.ts` |
| **Audio warmup** | `global-audio-warmup` | `artifacts/kidschedule/src/lib/global-audio-warmup.ts` |
| **Phonics playback** | `phonics-player` | `artifacts/kidschedule/src/lib/phonics-player.ts` |

**Not the same package:** `@workspace/coach-journey` is the parent-hub 3-day coaching plan — not Speech Coach learning journey memory.

## Allowed consumer APIs

### Audio (TTS)

- `useAmyVoice().speak(text, opts?)`
- `useAmyVoice().pause()` — explicit user intent only
- `useAmyVoice().primeSpeakGesture()` — Android gesture priming
- `warmSpeechCoach()` — Speech Coach phrase pre-cache

See also: `.cursor/rules/amy-voice-ownership.mdc`

### Microphone (STT)

- `useSpeechRecognition()` — Web Speech + Whisper path
- `getSpeechCoachMicStatusMessage()` — user-facing mic status copy
- `openAndroidMicrophoneSettings()` — permission recovery

### Dialogue, memory, journey

- `@workspace/speech-coach` exports: `createCoachDialogueContext`, `evaluateCoachResponse`, `buildSessionGreeting`, `buildSessionClosing`, `buildCoachSessionMemory`, `mergeCoachJourneySnapshot`, etc.
- `loadCoachLocalSnapshot` / `saveCoachJourneySnapshot` — `speech-coach-utils.ts` (persistence only)

### Session orchestration (UI)

- `artifacts/kidschedule/src/pages/speech-coach/live-speech-coach.tsx` — live session state machine
- `artifacts/kidschedule/src/pages/speech-coach/index.tsx` — hub pronunciation lab
- UI **consumes** engine APIs; it does **not** own playback, mic, or dialogue logic.

## Forbidden in feature / UI code

Never call directly from pages, components, or hooks outside approved engine modules:

- `new Audio()`
- `HTMLAudioElement.play()`
- `MediaRecorder`
- `navigator.mediaDevices.getUserMedia`
- `window.speechSynthesis`
- `new AudioContext()` / `webkitAudioContext`

Never create parallel owners:

- Duplicate session managers, playback controllers, or dialogue template arrays in UI files
- Bypass `amyVoiceController` for Speech Coach TTS
- Bypass `compareTranscript` / `evaluateCoachResponse` for scoring feedback

## Freeze rules (summary)

1. **No architecture rewrites** — extend existing systems; do not replace ownership models or add alternate playback paths.
2. **No direct resource access** — use approved engine APIs only (see above).
3. **Single ownership** — one owner per engine; parallel ownership is rejected.
4. **Features consume, engines own** — new work may add UI, analytics, phrases, dashboards; it may not change playback/mic lifecycle or session coordination.
5. **Regression gate required** — any PR touching these areas must pass `pnpm run check:speech-coach-engines`.
6. **Prefer building above the engine** — animations, celebrations, parent insights, achievements, UX polish.
7. **Core changes need justification** — see template below.

## Regression gate

Run before merge when touching audio, microphone, speech coach, memory, or journey:

```bash
pnpm run check:speech-coach-engines
```

This runs:

1. `pnpm run typecheck:libs`
2. `pnpm --filter @workspace/speech-coach test`
3. `pnpm --filter @workspace/scripts run check-speech-coach-engine-freeze` (Speech Coach UI freeze + no direct audio/mic APIs)
4. Vitest: `amy-speech-mode`, `amy-voice-controller`, `amy-voice-playback-contract`, `global-audio-warmup`, `phonics-player`

Optional broader gates (recommended before release, may surface pre-existing issues outside Speech Coach):

- `pnpm --filter @workspace/kidschedule run check:amy-voice-contract`
- `pnpm --filter @workspace/scripts run check-amy-voice-usage`
- `pnpm run check:amy-voice` (full Amy voice test suite)

Mic ownership is enforced by architecture (`useSpeechRecognition` → `microphone-session-manager.ts`); dedicated mic unit tests are planned above the engine, not inside UI pages.

If any step fails: **reject merge**.

## Allowed future work (above the engine)

- Animations and celebrations
- New coaching phrases (add to `coach-dialogue.ts` templates or i18n — do not fork dialogue in UI)
- Learning personality and parent insights dashboards
- Telemetry, reports, achievements, progress summaries
- UX improvements that call existing APIs

## Core engine change template

Any modification to a **frozen engine file** must include in the PR description:

1. **Root cause** — what broke or what measurable gap exists
2. **Reproduction steps** — reliable steps on iOS / Android / desktop
3. **Why existing architecture cannot solve it** — why extension or consumer-layer fix is insufficient
4. **Risk assessment** — blast radius (audio, mic, sessions, memory corruption)
5. **Regression test** — new or updated test in the relevant engine test suite

Without all five: **reject the change**.

## Architectural success criteria (already achieved — do not rebuild)

| Engine | Target state |
|--------|----------------|
| Audio | Stable, fast, predictable |
| Mic | Reliable, recoverable, Android-safe |
| Dialogue | Teacher-like, personalized, consistent |
| Memory | Child-aware, long-term |
| Journey | Learning-focused, parent-trust-building |

## Principle

Optimize experience, not infrastructure. Next gains come from better teaching, engagement, retention, parent trust, and learning outcomes — **not** engine rewrites.

Assume engines are correct unless proven otherwise with reproducible evidence.
