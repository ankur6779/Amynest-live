# Phase A — Production Reality Probe

**Validated:** 2026-06-12T07:46:00Z  
**Target:** https://www.amynest.in  
**Credentials used:** demo@amynest.in (signed-in Playwright + manual API probes)

## Route HTTP Status (curl)

All routes return HTTP 200 (SPA shell). Auth gating is client-side.

See `audit/final-cert/production-routes-probe.json` for 55+ AppCore routes.

## Dev / Debug Routes — LIVE FAIL

| Route | curl HTTP | Playwright URL after 3s | Expected (ceeb2553) |
|-------|-----------|-------------------------|---------------------|
| `/debug-parity` | 200 | **stays on /debug-parity** | redirect → `/dashboard` |
| `/dev/phonics-audio-preview` | 200 | **stays on route** | redirect → `/dashboard` |
| `/dev/rhymes-audio-ab` | 200 | **stays on route** | redirect → `/dashboard` |
| `/debug/learning` | 200 | **accessible unauthenticated** | should require auth |

**Evidence:** `playwright/specs/dev-route-redirect.spec.ts` run 2026-06-12 — 4/4 failed. Screenshot: `audit/final-cert/screenshots/dev-route-debug-parity-no-redirect.png`.

Source code shows `IS_PROD ? DevRouteRedirect : DebugPage` in `AppCore.tsx`, but **deployed bundle does not redirect** — production build likely has `IS_PROD=false` or stale deploy.

## Admin Surfaces

| Endpoint | Unauthenticated | Body |
|----------|-----------------|------|
| `/api/admin/dashboard` | HTTP 401 | JSON unauthorized |
| `/api/admin/feedback` | HTTP 401 | JSON unauthorized |
| `/api/admin/audio-health` | HTTP 401 | JSON unauthorized |
| `/admin/dashboard` (SPA) | HTTP 200 | HTML shell only |

API admin routes correctly reject unauthenticated requests. SPA admin pages load shell without server-side block (client admin gate not verified with non-admin demo account).

## API Health

```json
GET /api/health → {"ok":true,"timestamp":...}
GET /api/healthz → HTTP 200
```

## Signed-In Journey (Playwright)

### Full app certification — PASS (16 routes)

`playwright/specs/full-app-certification.spec.ts` — no crash overlay, no 404 UI.

**Console errors observed (non-fatal, not filtered):**

- `/routines` — React hydration error: nested `<button>` inside `<button>`

### Audio coverage — FAIL (5/8)

See `audit/final-cert/audio-coverage-report.json`.

### Audio lessons isolated spec — FAIL (1 run)

`audio-lessons-playback.spec.ts`: `playback failed: synthesize=null audioPlaying=false` (same session as prod-verify suite; audio-coverage later PASS for audio_lesson — flaky or order-dependent).

## CTAs / Streams Verified Live

| Journey | Result |
|---------|--------|
| Story Hub video | PASS — stream proxy 200, video advancing |
| Amy Coach listen | PASS — blob audio advancing |
| Conversation Coach | PASS — TTS MP3 advancing |
| Speech Coach | PASS (paused after 2s — not_advancing but element present) |
| Audio Lessons | PASS in coverage run |
| Phonics tap-to-hear | **FAIL** — no audio element |
| Infant story/poem | **FAIL** — demo account lacks infant child fixture |

## Phase A Verdict

**FAIL** — Dev routes exposed in production; debug/learning reachable without auth; phonics/infant audio journeys broken on live demo account.
