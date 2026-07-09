# Audio Instant Playback — Production Sprint Notes

Architecture hierarchy is **unchanged**:

```
Bundled → Memory → Filesystem/IndexedDB → Static GCS → Dynamic TTS → Fallback
```

## What shipped in this sprint

| Phase | Change |
|-------|--------|
| 1 | `core` audio-pack tier (~16MB / 569 clips: letters, digraphs, CVC, numbers, colors, animals, shapes, feedback, short catalog). Default `pnpm run build:audio-pack` builds core. Raise auto-fill cap toward 20–40MB if release budget allows. |
| 2 | `forbidDynamicTts` on phonics / spelling / lesson / catalog speech policies — curriculum never hits runtime TTS. |
| 3–5 | Deeper Learning Zone + Audio Lessons prefetch; predictive memory window; `ensureAudioPredecoded` on warm. |
| 6 | `native-audio-filesystem-cache.ts` — IndexedDB filesystem-equivalent for native shells (SW skipped). |
| 7 | `background-learning-pack.ts` — Wi‑Fi preferred, versioned, idle download after boot warm. |
| 8 | `guaranteeAudioUnlockedFromGesture()` + hub tile pointerdown warm/unlock. |
| 9 | Playback watchdog **2s** (was 3s). |
| 10/13 | Latency report adds `memory_cache` + `source_mix.tts_percent`. |
| 11 | CDN immutable headers already in `staticAudioServe.ts` — no change needed. |
| 12 | Compression deferred — regenerate packs at 64–96kbps mono in a follow-up asset job. |

## Release commands

```bash
pnpm run build:audio-pack          # core hot pack
pnpm run validate:audio-pack
# Android: syncAudioPackAssets before AAB
```

## Diagnostics

```js
window.__amynestAudioReliability.latencyReport()
window.__amynestAudioReliability.dashboard()
```

## Rollback

1. Revert client commits.
2. Ship previous `audio-pack` (`--tier minimal`) if core pack size is an issue.
3. Set `VITE_LOCAL_AUDIO_RECOVERY=0` only for debug (disables bundled recovery).
