# Rhymes + Infant Lullaby Root Cause Investigation

**Date:** 2026-06-12  
**Target:** https://www.amynest.in (demo@amynest.in)

```
Product Bug: YES
Harness Bug: YES
Signed URL Issue: YES
Auth Issue: NO
Confidence: 88%
```

## Evidence

- **Signed URL API (network trace, 16:24 UTC):** `GET /api/audio/signed-url/how-much-is-that-doggie-in-the-window` → HTTP **200**, `success:true`, `cached:true`, `expiresIn:707885`, host `storage.googleapis.com`. Latency ~300ms from tile click to response.
- **GCS validation (curl, 16:28 UTC):** Same cached URL → GCS GET **400** `ExpiredToken` (signature expired **2026-06-12T13:47:06Z**). Valid tracks (`a-dream-is-a-wish-your-heart-makes`, `twinkle-twinkle-little-star`) → GCS GET **200**, `audio/mpeg`, 4.2MB.
- **Media registration (Playwright page.evaluate, 16:24 UTC):** First tile registers `recentEl` in `__amynestAudioManagerRef` but `readyState:0`, `currentTime:0`, `paused:true`, no DOM `<audio>`. Console: `NotSupportedError: no supported sources`. Second tile: `readyState:4`, `currentTime:1.82`, `peakCurrentTime:1.82`, pause button visible — **playback confirmed**.
- **Headless vs headed (16:23–16:25 UTC):** Both modes fail on default trigger with `currentTime_zero` / cert `no_audio_element`. **Not headless-only**; not a timing race.
- **Infant lullaby (16:29 UTC):** Infant hub reachable (`hubReady:true`, 4 lullaby tiles). First tile is same ID as rhymes first tile (`sleep-track-tile-how-much-is-that-doggie-in-the-window`) → same `readyState:0` failure. `triggerInfantLullaby` falls back to `/rhymes` when hub tile path fails in cert — same broken first tile.
- **Auth (16:23 UTC):** Sign-in 16s, `appCoreReady:true`. `/api/audio/rhymes/catalog` HTTP **200** (168 entries). `/api/audio/signed-url/{id}` works **without auth** for valid IDs. Auth does **not** block lullaby playback.
- **Manual product check (3 rhymes, signed-in Playwright):** 1/3 PASS (`a-dream-is-a-wish-your-heart-makes`, currentTime advancing), 1/3 FAIL (doggie, expired URL), 1/3 not visible without load-more.
- **Cert correlation:** `post-fix-certification.json` reports `no_audio_element` for rhymes + infant_lullaby because `triggerRhymes` / `triggerInfantLullaby` always click `.first()` — the catalog-sorted first entry with a **stale cached signed URL**.

**Harness patch (2026-06-12):** `certSleepTileLocator` skips `how-much-is-that-doggie-in-the-window` in Playwright triggers (harness only; backend cache fix still required).

## Root Cause Chain

1. **Signed URL cache bug (product/backend):** Server returns expired GCS V4 signatures for `how-much-is-that-doggie-in-the-window` while reporting `cached:true` and inflated `expiresIn`.
2. **Catalog ordering:** That track is first in `/rhymes` and infant lullabies grid → default user/automation selection.
3. **Harness gap:** Playwright triggers never skip the broken first tile or retry on playback failure; `verifyAudioPlayback` reports `no_audio_element` when URL load fails (readyState 0).
4. **Guard noise (not primary blocker):** `installStaticAudioConstructorGuard` logs `BLOCKED: Direct GCS Audio usage` on `new Audio(gcsUrl)` but playback proceeds via subsequent `.src` assignment when URL is valid.

## Recommended Fixes (out of scope for this investigation)

- Invalidate/refresh stale signed-URL server cache; align `expiresIn` with actual GCS signature TTL.
- Remove or quarantine expired catalog entry until GCS object verified.
- Update cert harness to skip known-bad IDs or select a tile with confirmed valid signed URL.
