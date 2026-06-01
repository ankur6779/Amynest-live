# AmyNest Audio Architecture

## Canonical path (all narration / TTS)

```
Feature UI
  → useAmyVoice()  (or thin wrapper: useSpellingTTS, useInfantPoemPlayer)
  → amyVoiceController.speak() | playPreparedUrl() | fetchNarrationUrl()
  → amy-voice-pipeline (static → cache → API → fallbacks)
  → audioManager (speech channel)
  → HTMLAudioElement
```

## Phonics clips (curated MP3)

```
Phonics hub / CVC phonemes
  → phonics-static-audio.ts
  → phonics-player.ts (single phoneme owner)
  → /phonics-audio/*.mp3
```

CVC whole-word finale uses static catalog via `amyVoiceController.playPreparedUrl()`.

## Ambient poem playback (loop / fade / volume)

Infant poems use `useInfantPoemPlayer` — resolves URL via controller, manages loop/fade locally after `controller.pause()` clears speech channel.

## Amy Audio Lessons

Page open (`/audio-lessons`) → `warmAudioLessonsOnPageOpen()` prefetches up to **3 lessons × 4 paragraphs** (resume, quick play, daily pick, age recommendations) via `prefetchLessonParagraph` + static preload. Lesson player open still triggers server pregenerate for the full lesson.

Parent Hub **Learning tab** expand → `warmLearningZoneTabOnOpen()` prefetches (limited, idle):

- **Spelling Mastery** — 5 catalog words × 4 lookahead + feedback phrases
- **Abacus** — level-1 Learn mode first 4 steps + probe line
- **Smart Study** — up to 6 nursery play tile speak lines for child age

Parent Hub **Stories & Communication tab** expand → `warmSpeechCoachOnStoriesTabOpen()` prefetches top 12 coach warmup phrases (static + memory cache via `warmSpeechCoach`).

## SFX (not narration)

Procedural UI sounds use shared `lib/procedural-sfx.ts` (single `AudioContext` via `trackAudioContext`):

- `game-feedback.ts`, `abacus-zone.tsx`, `study-engagement.tsx` — short tones
- `use-sound-engine.ts`, `infant-mode.tsx` (lullaby) — ambient / scheduled oscillators on same context

Do **not** add `new AudioContext()` in feature code; extend `procedural-sfx` or use `getProceduralAudioContext()`.

## OpenAI Realtime (Speech Coach mic path — separate stack)

Live coaching uses **WebRTC + AudioWorklet** for microphone capture and streaming — not `amy-voice-pipeline` or `audioManager`. Narration playback still goes through `useAmyVoice` → static/TTS pipeline above. Do not route Realtime playback through `HTMLAudioElement` speech channel.

## Telemetry

All paths emit unified events via `lib/audio-playback-events.ts`:

- `audio_started`, `audio_completed`, `audio_failed`, `audio_interrupted`
- `fallback_used`, `source_selected`

Emitted from: `amy-voice-controller`, `audio-manager`, `phonics-player`, `useInfantPoemPlayer`.

## CI

`pnpm run check:amy-voice` runs:

1. `check-amy-voice-usage` — blocks direct `new Audio()`, `speechSynthesis`, `generateTts` outside engine allowlist; blocks `study-tts` imports
2. `check-amy-voice-contract` — lifecycle / ownership rules
3. Amy voice unit tests

## Removed (dead code)

- `lib/study-tts.ts` — Event Prep now uses `useAmyVoice`
- Server: `ttsPendingRegistry`, `ttsLiveStream`, `ttsStreamResponse`, pending GET path in `/tts/audio/:key`
