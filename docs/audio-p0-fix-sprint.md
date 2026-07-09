# P0 Fix Sprint — Release Blocker Clearance

**Date:** 2026-07-09  
**Status:** Ready for **device QA** (not yet public GO)

## Bugs fixed

1. **Missing curriculum assets** — 32 keys mapped; 5 via phonics-library CVC, 27 TTS→GCS; pack synced via authenticated GCS download (API still serves placeholders for new hashes until server cache/registry refresh).
2. **Background learning pack false COMPLETE** — only stamps version when every required asset succeeds; otherwise `partial` + resumable progress.
3. **Validation gate** — orphans, broken refs, tiny/corrupt clips, curriculum must-haves, checksum field support.
4. **latencyReport** — P50/P95/P99/avg/min/max + source % + failures/retries/watchdog + `latencySummary()`.
5. **Device QA checklist** — `docs/audio-device-qa-checklist.md`.

## Assets

| Item | Count |
|------|------:|
| Curriculum keys required | 32 |
| Curriculum missing in pack | **0** |
| Pack MP3s | 606 |
| Manifest keys | 655 |
| Unique hashes | 527 |
| Pack size | ~17MB |

## Validation output

```
OK: audio-pack tier=core mp3=606 entries=655 unique=527 maxDup=2
curriculum_missing 0
Android + Capacitor www synced (17MB)
vitest: 37 passed (speech-mode, telemetry, local playback, static-audio-guard)
```

## Remaining blockers (not P0 code — ops/QA)

1. **Production `/api/static-audio/:hash` still returns 256-byte placeholders** for newly uploaded GCS objects until API registry/cache picks them up. Pack + map are correct; **CDN first-play via API may still placeholder until deploy/registry rebuild**.
2. **Real device matrix** not executed — required before public GO.
3. Optional: rebuild static-audio registry on API so production proxy serves new GCS bytes.

## Release readiness

| Score | Before cert | After P0 |
|------:|------------:|---------:|
| Overall | 58% | **78%** |
| Ready for device QA? | No | **YES** |
| Ready for public store? | No | **NO** (device QA + API placeholder lag) |

## Commands for next engineer

```bash
pnpm --filter @workspace/scripts run sync-p0-curriculum-pack
pnpm run validate:audio-pack
# after kidschedule/capacitor www copy:
rsync -a --delete artifacts/kidschedule/public/audio-pack/ android/app/src/main/assets/audio-pack/
rsync -a --delete artifacts/kidschedule/public/audio-pack/ artifacts/amynest-capacitor/www/audio-pack/
```

Device QA: follow `docs/audio-device-qa-checklist.md` and paste `latencySummary()`.
