# AmyNest — Cloudflare Pages Static SPA Migration Report

**Document:** `cloudflare-pages-migration-report.md`  
**Role:** Senior Platform Engineer  
**Date:** 2026-07-15  
**Scope:** Move **only** the static SPA from Render → Cloudflare Pages. Backend remains on Coolify.

---

## Executive Summary

| Phase | Status |
|-------|--------|
| Pages project created | ✅ **DONE** |
| SPA deployed to Pages (preview) | ✅ **DONE** |
| Build env vars configured | ✅ **DONE** (11 `VITE_*` / `NODE_VERSION`) |
| Static asset verification (preview) | ✅ **ALL PASS** |
| API chain verification (production) | ✅ **PASS** (`x-amynest-backend: coolify`) |
| Custom domain attached | 🟡 **PENDING** (`www.amynest.in` — CNAME not set) |
| Production DNS cutover | 🔴 **NOT DONE** — `www.amynest.in` still serves Render (`rndr-id` present) |
| GitHub CI integration | 🟡 **BLOCKED** — Direct Upload project; Git source requires dashboard or new project |
| Render Static retirement | 🔴 **NOT RECOMMENDED YET** |

**Verdict:** Migration is **~90% complete**. The SPA is live and verified on Pages preview. **Do not retire Render Static** until DNS cutover completes and a 48-hour production soak passes with **no `rndr-id`** on `www.amynest.in`.

---

## Architecture (Target vs Current)

### Target (after DNS cutover)

```
Browser / Android WebView / iOS
        ↓
www.amynest.in (Cloudflare edge)
   ├─ /*           → Cloudflare Pages (amynest-web)
   └─ /api/*       → CF Worker (amynest-api-proxy) → Coolify API
```

### Current (2026-07-15 23:10 IST)

```
www.amynest.in
   ├─ /*           → Render Static (Amynest-live-1-dykj)  ← rndr-id header
   └─ /api/*       → CF Worker → Coolify API             ← unchanged ✅
```

**Backend, PostgreSQL, Redis, scheduler, Hetzner worker:** untouched per requirements.

---

## Work Completed

### 1. Cloudflare Pages project

| Setting | Value |
|---------|-------|
| Project name | `amynest-web` |
| Account | AmyNest (`362bb082e16cf42fbcd036e164f0fbc4`) |
| Production branch | `main` (for future Git builds) |
| Preview URL (latest) | `https://3a069879.amynest-web.pages.dev` |
| Deployment type | Direct Upload (wrangler CLI) |

### 2. Code changes (repo)

| File | Change |
|------|--------|
| `artifacts/kidschedule/public/_headers` | **NEW** — cache rules matching Render (`index.html`/`sw.js` no-cache; `/assets/*` immutable 1y) |
| `artifacts/kidschedule/vite.config.ts` | `resolveDeployVersion()` accepts `CF_PAGES_COMMIT_SHA` before `RENDER_GIT_COMMIT` |
| `scripts/cloudflare-pages-api.mjs` | **NEW** — Pages API helper (uses wrangler OAuth) |
| `scripts/cloudflare-dns-api.mjs` | **NEW** — DNS API helper (requires token with DNS Edit) |
| `scripts/cloudflare-pages-dns-cutover.sh` | **NEW** — one-command DNS cutover script |

### 3. Build configuration (Pages project API)

| Setting | Value |
|---------|-------|
| Build command | `bash scripts/render-frontend-build.sh` |
| Output directory | `artifacts/kidschedule/dist/public` |
| Node version (env) | `20` |

**Production env vars configured on Pages:**

- `VITE_AMYNEST_ENV=production`
- `VITE_APP_API_ORIGIN=https://www.amynest.in`
- `VITE_FIREBASE_*` (public web defaults from `firebase-web-defaults.ts`)
- `VITE_FF_ONBOARDING_STRICT_COMPLETE_GATE=1`
- `VITE_FF_ONBOARDING_SHORT_CHILD_BRANCH=1`
- `VITE_FF_FIRST_VALUE_ACTIVATION=1`

**Not yet configured:** `VITE_GA4_MEASUREMENT_ID`, `VITE_FIREBASE_VAPID_KEY` (copy from Render dashboard `Amynest-live-1-dykj` before Git-connected rebuild).

### 4. Deployments

| Deployment | URL | Notes |
|------------|-----|-------|
| `bfac7ac7` | `https://bfac7ac7.amynest-web.pages.dev` | First upload; FCM SW missing (no build env) |
| `3a069879` | `https://3a069879.amynest-web.pages.dev` | **Production candidate** — FCM SW present, Firebase config baked |

Upload: 3,219 files (~144 MB). First attempt failed (`ERR_HTTP2_STREAM_ERROR`); retry succeeded.

### 5. Custom domain

`www.amynest.in` added to Pages project:

- Status: **pending**
- Error: **CNAME record not set**
- Zone: `amynest.in` (`22df688650348e0d0cff1ff1a358020d`)

Wrangler OAuth token has `zone:read` only — **DNS write requires dashboard or API token with Zone.DNS Edit**.

---

## Verification Results

### Preview static (`https://3a069879.amynest-web.pages.dev`)

| Check | Result |
|-------|--------|
| `index.html` / `/` | ✅ 200 |
| JS bundles | ✅ 200 (bootstrap + lazy `main-*.js`) |
| CSS | ✅ 200 (`main-*.css`) |
| `manifest.json` | ✅ 200 — `display: standalone`, 2 icons |
| `sw.js` | ✅ 200 — `amynest-v16`, `amynest-audio-v5`, navigation network-only |
| `firebase-messaging-sw.js` | ✅ 200 — Firebase init + `onBackgroundMessage` |
| SPA routing `/dashboard`, `/hub/routines`, `/onboarding`, `/login` | ✅ 200 |
| Deep links | ✅ 200 |
| PWA icon `/pwa-icon-192.png` | ✅ 200 |
| `/health` | ✅ 200 |
| Cache headers `sw.js` | ✅ `no-cache, no-store, must-revalidate` |
| Cache headers `/assets/*` | ✅ `public, max-age=31536000, immutable` |
| `_redirects` | ✅ deployed (debug routes → `/dashboard` 302) |
| `_headers` | ✅ deployed |

### Production API (unchanged — Coolify via Worker)

| Check | Result |
|-------|--------|
| `GET /api/healthz` | ✅ 200, `x-amynest-backend: coolify` |
| `GET /api/healthz/audio` | ✅ 200 |
| `POST /api/static-audio/missing` (no auth) | ✅ 401 |
| `GET /api/auth/whoami` | ✅ 404 (expected) |

### Post-deploy smoke (adapted)

```bash
SMOKE_BASE_URL=https://3a069879.amynest-web.pages.dev \
SMOKE_API_URL=https://www.amynest.in \
bash scripts/post-deploy-smoke.sh
```

**Result:** ✅ All checks passed.

### Production static (pre-cutover baseline)

| Check | Result |
|-------|--------|
| `curl -I https://www.amynest.in/` | `rndr-id: e3b7e101-d3b6-4903` — **still Render** |
| `last-modified` | `2026-07-15T03:37:08 UTC` (Render deploy) |

---

## Remaining Step: DNS Cutover (Manual)

### Option A — Cloudflare Dashboard (recommended)

1. Open [Pages → amynest-web → Custom domains](https://dash.cloudflare.com/362bb082e16cf42fbcd036e164f0fbc4/pages/view/amynest-web/domains)
2. Activate `www.amynest.in` (or confirm CNAME target `amynest-web.pages.dev`, **Proxied**)
3. In [DNS → Records](https://dash.cloudflare.com/) for `amynest.in`:
   - Set `www` → **CNAME** → `amynest-web.pages.dev` (orange cloud / proxied)
   - Remove conflicting `www` A records if present
4. **Do not remove** Worker route `www.amynest.in/api/*` (amynest-api-proxy)

### Option B — API script

```bash
CLOUDFLARE_API_TOKEN=<token-with-Zone.DNS-Edit> \
  bash scripts/cloudflare-pages-dns-cutover.sh
```

### Post-cutover verification (must all pass)

```bash
# Static no longer from Render
curl -sI https://www.amynest.in/ | grep -i rndr-id
# Expected: no output

# API still Coolify
curl -sI https://www.amynest.in/api/healthz | grep x-amynest-backend
# Expected: x-amynest-backend: coolify

# Full smoke
SMOKE_BASE_URL=https://www.amynest.in \
SMOKE_API_URL=https://www.amynest.in \
bash scripts/post-deploy-smoke.sh
```

### Rollback (< 5 minutes)

Repoint `www` DNS back to Render origin (`amynest-live-1-dykj.onrender.com`). API path unchanged.

---

## GitHub Integration (Follow-up)

The project was created via **Direct Upload**. Cloudflare API returns:

> `You cannot update the source object in a Direct Uploads project.`

**Options:**

1. **Dashboard:** Workers & Pages → amynest-web → Settings → Connect to Git → `ankur6779/Amynest-live`
2. **CI deploy:** Add `wrangler pages deploy` to `.github/workflows/deploy-production.yml` (replace Render static trigger)
3. **New project:** Create Git-connected `amynest-web-git`, migrate custom domain, delete direct-upload project

Until Git is connected, deploy with:

```bash
export PATH="/usr/local/bin:$PATH"
bash scripts/render-frontend-build.sh
wrangler pages deploy artifacts/kidschedule/dist/public \
  --project-name=amynest-web --branch=main --commit-dirty=true
```

---

## Render Retirement Recommendation

| Service | Retire now? | Reason |
|---------|:-----------:|--------|
| **Render Static** (`srv-d85k80jtqb8s7382m7i0` / `Amynest-live-1-dykj`) | **NO** | `www.amynest.in` still serves Render; DNS cutover + 48h soak required |
| **Render API** (`srv-d85k8jbtqb8s7382mjng`) | **NO** | Hot standby; explicitly out of scope until static migration certified |

### Retire Render Static when:

1. `curl -sI https://www.amynest.in/` returns **no `rndr-id`**
2. All post-cutover smoke tests pass for **48 hours**
3. PWA install + push (FCM) verified on production host
4. GitHub/Pages deploy path documented and tested

---

## Risk Register

| Risk | Mitigation |
|------|------------|
| Worker `/api/*` overridden by Pages | Worker routes take precedence over Pages for matching paths; verify after cutover |
| FCM / VAPID missing in future builds | Copy `VITE_FIREBASE_VAPID_KEY` from Render before Git builds |
| GA4 gap | Copy `VITE_GA4_MEASUREMENT_ID` from Render |
| Direct-upload drift vs `main` | Connect Git or add wrangler deploy to CI |
| Large upload failures | Retry deploy; first attempt hit `NGHTTP2_PROTOCOL_ERROR`, second succeeded |

---

## Appendix: Service IDs

| Component | ID / URL |
|-----------|----------|
| Render Static | `srv-d85k80jtqb8s7382m7i0` — `amynest-live-1-dykj.onrender.com` |
| Render API (standby) | `srv-d85k8jbtqb8s7382mjng` — **do not touch** |
| CF Pages project | `amynest-web` |
| CF Worker | `amynest-api-proxy` — `CANARY_PERCENT=100` |
| GitHub repo | `ankur6779/Amynest-live` (`1239971874`) |

---

*Generated after preview deployment verification. Production cutover pending DNS activation.*
