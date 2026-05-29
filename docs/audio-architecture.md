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

## SFX (not narration)

Web Audio in abacus, study-engagement, game-feedback, speech-coach-utils — procedural UI sounds only.

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
