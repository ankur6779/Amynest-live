# Phase I — Regression Re-test (Production)

**Account:** demo@amynest.in  
**Date:** 2026-06-12

| Feature | Prior E2E (reaudit ~84) | This audit (live) | Delta |
|---------|-------------------------|-------------------|-------|
| Amy Coach | Claimed pass | **PASS** — audio advancing, blob src | OK |
| Conversation Coach | Claimed pass | **PASS** — TTS MP3 advancing | OK |
| Story Hub | Claimed pass | **PASS** — video stream 22MB, currentTime advancing | OK |
| Rhymes | Not fully live-probed | **168/172 GCS probe** (97.67%) | **REGRESSION vs 99.5% gate** |
| Phonics | Manifest 100% | **FAIL runtime** — no audio element on `/phonics` | **REGRESSION** |
| Routine Generator | Not in full-app list | **NOT TESTED** (`/routines/generate` omitted) | **GAP** |
| Cry Insights | Not in full-app list | Shell loads (`/insights` PASS) — no cry playback tested | **INCOMPLETE** |
| Talking Amy | Not in full-app list | **NOT TESTED** | **GAP** |
| Speech Coach | Pass | PASS (audio present; paused/not advancing at 2s checkpoint) | Marginal |
| Audio Lessons | Mixed | PASS in coverage; FAIL in isolated spec (flaky) | Unstable |

## Prior Audit Disputes

The reaudit launch score of **84** assumed:

- Static audio map completeness = playable (we confirm HTTP 200 on 4434 URLs — OK)
- Dev routes redirect in prod (**disproven live**)
- Audio surfaces working (**phonics, infant fail**)
- Performance acceptable (**3.35 MB main chunk fails gate**)

## Phase I Verdict

**FAIL** — Regressions in phonics runtime and rhymes probe; critical journeys (Talking Amy, Routine Generator, Cry Insights) untested.
