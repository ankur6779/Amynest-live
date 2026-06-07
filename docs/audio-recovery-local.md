# Audio recovery reset (local pack)

**Frozen:** No new network/GCS/TTS/proxy/retry/AudioManager work for phonics, spelling static words, or Speech Coach fixed prompts.

## Child requirement

Tap → one bundled sound → instant playback. No fallback.

## Enable / disable

- **On by default** (`isLocalAudioRecoveryEnabled()`).
- Debug network path only: `VITE_LOCAL_AUDIO_RECOVERY=0`.

## Build the pack (CI / release — not runtime)

```bash
node scripts/build-local-audio-pack.mjs --tier minimal
# or full catalog + 500 spelling words:
node scripts/build-local-audio-pack.mjs --tier full --spelling-limit 500
```

Output: `artifacts/kidschedule/public/audio-pack/` + `manifest.json`.

## Playback owners (recovery only)

| Surface | Module |
|---------|--------|
| Tap → play | `local-audio-playback.ts` |
| Manifest | `local-audio-pack.ts` |
| Phonics | `phonics-local-playback.ts` → engine |
| Spelling | `spelling-local-playback.ts` → `useSpellingTTS` |
| Coach static | `coach-local-playback.ts` → `live-speech-coach.tsx` |
| Hear & Tap | `phonics-test.tsx` → `phonicsEnginePlayWord` (not blend) |

Speech Coach **dynamic** lines still use `useAmyVoice().speak()` (TTS). Static corpus lines never call TTS in the same turn.

## Evidence (automated)

```bash
pnpm --filter @workspace/kidschedule exec vitest run \
  src/lib/local-audio-playback.test.ts \
  src/lib/hear-tap-one-sound.test.ts
```

- `local-audio-playback.test.ts`: 100 taps → 100 `play()` calls.
- `hear-tap-one-sound.test.ts`: 100 taps → 100 `playWord`, 0 blend.

## Android AAB (Play Store WebView)

- `syncAudioPackAssets` copies `artifacts/kidschedule/public/audio-pack` into the APK/AAB before each build.
- `MainActivity` intercepts `https://www.amynest.in/audio-pack/*` and serves files from assets (no network).
- Bump `versionCode` / `versionName` in `android/app/build.gradle.kts`, then:

```bash
cd android && ./gradlew bundleRelease
```

Output: `android/releases/amynest-<version>-<versionCode>.aab`

Replace stub pack with real clips before store upload:

```bash
pnpm run build:audio-pack          # --force re-downloads via www.amynest.in/api/static-audio
pnpm run validate:audio-pack     # fails if tier=stub or duplicate placeholder clips
```

Set `STATIC_AUDIO_ORIGIN=https://www.amynest.in` when building from CI without direct GCS access.

## Device proof (required before “done”)

1. Build pack + deploy web bundle.
2. Phonics Hear & Tap: 100 speaker taps — one sound each, no repeats/overlap.
3. Spelling practice: 100 play taps — same.
4. Speech Coach: 10 sessions — static lines local only; no overlap with mic/TTS on same prompt.

Record screen + note `listLocalPackEntryCount()` in console after load.
