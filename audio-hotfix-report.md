# Audio Hotfix Report — Post Coolify Migration

**Date:** 2026-07-13  
**Incident:** Production audio failure after Render → Coolify migration  
**Status:** Hotfix committed & pushed — **Render manual deploy required** (autoDeploy off). Canary rolled back to Render (`CANARY_PERCENT=0`).

---

## Root Cause

**First failing point (client playback):** Rhymes, lullabies, and infant-sleep tracks that used **direct GCS signed URLs** (`storage.googleapis.com`) could not play in the browser.

| Stage | Result |
|-------|--------|
| Frontend | Requests `/api/audio/signed-url/:id` — **OK (200)** |
| API (Coolify) | GCS credentials set, signing works — **OK** |
| GCS object | `curl` + `ffprobe` confirm valid MP3 — **OK** |
| Signed URL fetch (browser) | `fetch(gcsUrl)` → **CORS blocked** (`TypeError: Failed to fetch`) |
| HTMLAudioElement + `crossOrigin=anonymous` | **MEDIA_ERR_SRC_NOT_SUPPORTED (code 4)** |
| Same-origin `/api/static-audio/*` | **Plays correctly** in browser |

The GCS bucket `amynest-audio-storage` does **not** return `Access-Control-Allow-Origin`. The client sets `crossOrigin="anonymous"` on cross-origin URLs via `configureMobileAudioElement()` (web). Without bucket CORS, the browser blocks media load.

**Why migration surfaced this:** `CANARY_PERCENT=100` routes all `/api/*` to Coolify. Coolify GCS/TTS config is healthy (identical to Render). The breakage is architectural: rhymes/lullabies were the only major audio path still using **direct GCS URLs** instead of the same-origin API proxy pattern used by phonics-library, static-audio, and TTS.

---

## Render vs Coolify Configuration

| Variable | Render | Coolify | Impact |
|----------|--------|---------|--------|
| `GCS_SERVICE_ACCOUNT_JSON` | set | set | None — signing works |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | `amynest-audio-storage` | `amynest-audio-storage` | None |
| `GCS_BUCKET_NAME` | set | set (via alias) | None |
| `TTS_USE_GCS` | `true` | `true` | None |
| `gcsCredentials` (healthz) | set | set | None |
| `API_PUBLIC_URL` | `onrender.com` | `sslip.io` | No playback impact (clients use same-origin) |
| `BACKGROUND_TASKS_ENABLED` | `true` | `false` | Cron only — not audio playback |
| `GCS_BUCKET_NAME` (Hetzner worker) | — | MISSING | Non-blocking (`DEFAULT_OBJECT_STORAGE_BUCKET_ID` set) |

**No missing GCS credentials on Coolify.** Server-side audio health: **PASS** on both planes.

---

## Evidence

### Server (production, 2026-07-13)

```
GET /api/healthz/audio        → 200 PASS (gcsConfigured, gcsProbeOk, ttsStorage=gcs)
GET /api/static-audio/{hash}  → 200 audio/mpeg, x-amynest-static-source: asset (30/30 sampled)
GET /api/phonics/sound/a.mp3  → 200 audio/mpeg
GET /api/audio/signed-url/*   → 200, valid storage.googleapis.com URL
curl signed URL               → 200, 4–7 MB valid MP3 (ffprobe OK)
```

### Browser (www.amynest.in)

```
/api/static-audio/*           → played, currentTime advanced
/api/phonics/sound/a.mp3      → played
/audio-pack/*                 → played
storage.googleapis.com signed → media_error code 4 (both with/without crossOrigin in test harness)
fetch(signedGcsUrl)           → TypeError: Failed to fetch (CORS)
```

### Cloudflare edge

```
x-amynest-backend: coolify
x-amynest-static-source: asset (not placeholder)
cf-cache-status: HIT (real assets, not 256-byte stubs)
```

---

## Fix Applied (minimum hotfix)

### 1. API: same-origin rhymes stream proxy

**File:** `artifacts/api-server/src/routes/audio-signed-url.ts`

- Added `GET /api/audio/stream/:audioId` — streams allowlisted GCS objects through the API (same pattern as `phonics-library`).
- **Backward-compatible:** `GET /api/audio/signed-url/:audioId` now returns `signedUrl: "/api/audio/stream/:id"` so **already-deployed web clients** pick up the fix without a frontend redeploy.
- Public routes, mounted before `requireAuth`.

### 2. Client: use stream URL for lullaby playback

**File:** `artifacts/kidschedule/src/lib/lullaby-gcs-audio.ts`

- `fetchSignedLullabyUrl()` now returns `/api/audio/stream/:audioId` (same-origin) instead of fetching a GCS signed URL.

### 3. Client: do not set crossOrigin on GCS URLs

**File:** `artifacts/kidschedule/src/lib/tts-guard.ts`

- `shouldSetAudioCrossOrigin()` returns `false` for `storage.googleapis.com` (defense-in-depth for any remaining signed-URL callers).

### 4. Edge: cache rhymes stream at Cloudflare Worker

**File:** `infra/cloudflare/amynest-api-proxy/src/worker.js`

- Added `RHYMES_STREAM_RE` to cacheable audio paths.

---

## Files Changed

| File | Change |
|------|--------|
| `artifacts/api-server/src/routes/audio-signed-url.ts` | New `/api/audio/stream/:audioId` GCS proxy route |
| `artifacts/kidschedule/src/lib/lullaby-gcs-audio.ts` | Playback via same-origin stream URL |
| `artifacts/kidschedule/src/lib/tts-guard.ts` | Skip crossOrigin on GCS hostnames |
| `infra/cloudflare/amynest-api-proxy/src/worker.js` | Edge cache for rhymes stream |

---

## Validation Plan (post-deploy)

| Module | Test |
|--------|------|
| Phonics | `/phonics` — tap speaker, hear phoneme |
| Speech Coach | Coach tile — hear prompt |
| Stories | Story playback — narration audio |
| Rhymes | `/rhymes` — play lullaby tile |
| Audio Warmup | Enqueue + playback |
| OpenAI TTS | Amy voice speak on dashboard |

**Deploy commands:**

1. Coolify API — redeploy backend with hotfix commit
2. Static site — rebuild/deploy kidschedule if client changes bundled in OTA
3. `wrangler deploy` in `infra/cloudflare/amynest-api-proxy/` for Worker cache rule

**Post-deploy probe:**

```bash
curl -I "https://www.amynest.in/api/audio/stream/twinkle-twinkle-little-star"
# Expect: HTTP 200, content-type: audio/mpeg, x-amynest-static-source: asset
```

---

## Summary

- **Root cause:** Direct GCS signed-URL playback blocked by missing bucket CORS + client `crossOrigin` policy — not missing Coolify GCS credentials.
- **Migration role:** 100% Coolify canary exposed the rhymes/lullaby path; API-proxied audio (static, phonics, TTS) was already healthy.
- **Fix:** Route rhymes/lullabies through same-origin `/api/audio/stream/:audioId` (established AmyNest pattern).
