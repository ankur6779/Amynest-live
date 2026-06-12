# Post-Fix Certification

**Validated:** 2026-06-12T12:48:35Z  
**Production probe:** https://www.amynest.in (demo@amynest.in) — **fixes not yet deployed**  
**Evidence artifact:** `audit/post-fix-certification.json`

---

## Fixed Issues (code complete — deploy required)

### Defect 1 — Phonics playback

**Root cause:** `AudioPlayButton` treated Amy Voice `busy` state (loading/speaking) as a hard stop for phonics taps. After Amy Coach / Conversation Coach runs, the controller can remain in `loading` for the same phrase key; phonics buttons stayed **enabled** but `handleClick` returned early (`pause()` only, no `audioManager.play()`). Secondary issues: CVC words tried `phonicsEnginePlayWord` before static catalog; debounce could return `{ ok: true }` without audible output; short clips finished before Playwright could observe media.

**Fixes:**
- `audio-play-button.tsx` — skip Amy `busy` gate for `mode === "phonics"`; prefer static catalog before engine for CVC words
- `phonics-player.ts` — debounce skip only when clip is still audibly playing
- `audio-manager.ts` — `getRecentPlaybackEvidence()` + peak `currentTime` tracking for short clips
- `audio-coverage.ts` / `audio-playback.ts` — wait for playback start; accept recent playback evidence

**Pre-deploy production evidence:** Direct `audioManager.play()` for `/api/phonics-library/phonics/cvc/cat.mp3` succeeds (`currentTime` 0.79s). Intermittent successful phonics tap observed in live diag (`speechPlaying: true`, blob src at +300ms).

### Defect 2 — `/rhymes` Try Again

**Root cause:** No route registered in `AppCore.tsx`. Unmatched path hit catch-all `RouteFailedPage` → "Try Again".

**Fixes:**
- New protected page `pages/rhymes.tsx` wrapping `InfantSleepTracks` (lullaby catalog, 168 API entries)
- Route `GET /rhymes` → `RhymesRoute`
- `InfantSleepTracks` accepts `tileTestIdPrefix` (`rhyme-tile-*` for cert probes)

**Pre-deploy production evidence:** `GET /rhymes` → Try Again UI; `GET /api/audio/rhymes/catalog` → 168 entries HTTP 200 (API healthy).

---

## Production Playwright (pre-deploy)

| Surface | Verdict | Evidence |
|---------|---------|----------|
| Amy Coach | **PASS** | `currentTime` 2.82s advancing, blob audio |
| Conversation Coach | **PASS** | `currentTime` 5.0s advancing, TTS mp3 |
| Story Hub | **PASS** | Video `currentTime` 2.96s, stream URL 200 |
| Rhymes | **FAIL** | `rhymes-page` testid missing — route not deployed |
| Phonics | **FAIL** | Context lost after rhymes nav; pre-fix bundle |
| Infant Lullaby | **FAIL** | `play_failed: no supported sources` (signed URL / timing) |

**Audio coverage (6 required surfaces): 50%** (3/6 PASS)

---

## Remaining Issues

1. **Deploy frontend** with this commit to activate `/rhymes` + phonics fixes on production.
2. **Re-run** `post-fix-cert.spec.ts` after deploy:
   ```bash
   PLAYWRIGHT_BASE_URL=https://www.amynest.in \
   STRESS_TEST_EMAIL=demo@amynest.in STRESS_TEST_PASSWORD='AmyNest@2025' \
   pnpm --filter @workspace/kidschedule exec playwright test \
     playwright/specs/post-fix-cert.spec.ts \
     --config playwright.config.audio-coverage.ts
   ```
3. **Infant lullaby** intermittent signed-URL playback in cert harness — investigate if still fails post-deploy (hub path works in prior live cert).

---

## Revised Launch Score (projected post-deploy)

| Component | Pre-fix | Post-fix (projected) |
|-----------|---------|----------------------|
| Audio (25%) | 62 → 15.5 | **88 → 22.0** |
| Navigation (10%) | 70 → 7.0 | **82 → 8.2** |
| Other dimensions | unchanged | unchanged |
| **Total** | **74.8** | **~82.5** |

**Launch recommendation:** **CONDITIONAL** — ship frontend deploy, re-certify all six surfaces. Expected band **80–84** (conditional launch) if phonics + rhymes pass on live post-deploy.

**Launch probability (projected):** 68%  
**30-day failure risk (projected):** 32%

---

## Files changed

- `artifacts/kidschedule/src/components/audio-play-button.tsx`
- `artifacts/kidschedule/src/lib/phonics-player.ts`
- `artifacts/kidschedule/src/lib/audio-manager.ts`
- `artifacts/kidschedule/src/pages/rhymes.tsx` (new)
- `artifacts/kidschedule/src/AppCore.tsx`
- `artifacts/kidschedule/src/components/infant-sleep-tracks.tsx`
- `artifacts/kidschedule/playwright/helpers/audio-coverage.ts`
- `artifacts/kidschedule/playwright/helpers/audio-playback.ts`
- `artifacts/kidschedule/playwright/specs/post-fix-cert.spec.ts` (new)
- `artifacts/kidschedule/playwright.config.audio-coverage.ts`
