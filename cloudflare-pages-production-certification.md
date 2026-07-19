# AmyNest — Cloudflare Pages Production Certification

**Document:** `cloudflare-pages-production-certification.md`  
**Role:** Senior Platform Engineer — Post-cutover read-only verification  
**Audit time:** 2026-07-15T18:00 UTC (~23:30 IST)  
**Audit type:** Evidence only — no deployments, DNS, or configuration changes made  
**Production URL:** `https://www.amynest.in`  
**Pages deployment:** `3a069879` → `https://3a069879.amynest-web.pages.dev`

---

## Verdict

# 🟢 Cloudflare Pages Production Certified

Static SPA traffic on `www.amynest.in` is served from **Cloudflare Pages**, not Render. API traffic remains on **Coolify** via the Cloudflare Worker. All production smoke checks pass.

---

## 1. Static Origin — Cloudflare Pages (NOT Render)

### Header evidence (`curl -I https://www.amynest.in/`)

| Header | Value | Interpretation |
|--------|-------|----------------|
| `HTTP/2` | `200` | SPA reachable |
| `server` | `cloudflare` | Cloudflare edge |
| `cf-ray` | `a1baaa88dc883e4e-SIN` | CF edge (Singapore) |
| `cf-cache-status` | `DYNAMIC` | Pages HTML (not long-cached) |
| `cache-control` | `public, max-age=0, must-revalidate` | Matches Pages `_headers` |
| `rndr-id` | **ABSENT** | ✅ Not Render |

### `rndr-id` absence across static paths

| Path | `rndr-id` |
|------|:---------:|
| `/` | **Absent** |
| `/manifest.json` | **Absent** |
| `/sw.js` | **Absent** |
| `/assets/` | **Absent** |
| `/dashboard` | **Absent** |
| `/assets/index-DRikFzYb.js` | **Absent** |

### Render Static control (direct origin — NOT production traffic)

| Probe | Result |
|-------|--------|
| `https://amynest-live-1-dykj.onrender.com/` | `rndr-id: 6202c97a-cf60-4fe9` — Render still alive as standby |
| Render bundle | `assets/index-BeJfahIn.js` (stale, pre-cutover) |
| Render `last-modified` | `2026-07-15T03:37:08 UTC` (frozen) |

**Conclusion:** Production `www.amynest.in` does **not** traverse Render Static.

---

## 2. API Backend — Coolify (Unchanged)

### `GET https://www.amynest.in/api/healthz`

| Header / Body | Value |
|---------------|-------|
| HTTP | `200` |
| `x-amynest-backend` | **`coolify`** ✅ |
| `server` | `cloudflare` |
| `cf-ray` | `a1baaa857ca357a7-SIN` |
| Body | `{"status":"ok"}` |

Worker route `www.amynest.in/api/*` → `amynest-api-proxy` → Coolify confirmed on all API probes.

---

## 3. Bundle Hash Parity — Production vs Pages Deployment

| Asset | Production (`www`) | Pages (`3a069879`) | SHA-256 match |
|-------|-------------------|---------------------|:-------------:|
| Bootstrap JS | `assets/index-DRikFzYb.js` | `assets/index-DRikFzYb.js` | ✅ |
| Bootstrap SHA | `7962e2e6ff44c30d39e0296e985322a480a8ab9004c39898e28bef5b84e6e4b7` | Same | ✅ |
| Lazy main JS | `main-BOawJ4YK.js` | `main-BOawJ4YK.js` | ✅ |
| Main SHA | `00821e027e9aee65b6798679c30c6df0fb07a16d39424b8fbb038049dc6fd0f4` | Same | ✅ |

Render Static still serves **`assets/index-BeJfahIn.js`** — a different, older bundle.

---

## 4. Production Smoke Tests

### 4.1 `scripts/post-deploy-smoke.sh`

```bash
SMOKE_BASE_URL=https://www.amynest.in SMOKE_API_URL=https://www.amynest.in \
  bash scripts/post-deploy-smoke.sh
```

| Check | Result |
|-------|--------|
| Web `/health` | ✅ 200 |
| API `/health` | ✅ 200 |
| API `/api/healthz` | ✅ 200 |
| API `/api/healthz/audio` | ✅ 200 (`ok: true`) |
| `POST /api/static-audio/missing` (no auth) | ✅ 401 |
| `GET /api/auth/whoami` | ✅ 404 (expected) |

**Result:** All checks passed.

### 4.2 SPA / PWA / Static

| Check | HTTP | Notes |
|-------|-----:|-------|
| `/` | 200 | SPA shell |
| `/manifest.json` | 200 | `display: standalone`, 2 icons |
| `/sw.js` | 200 | `amynest-v16`, network-first navigation |
| `/firebase-messaging-sw.js` | 200 | Firebase init + FCM handlers |
| `/pwa-icon-192.png` | 200 | PWA icon |
| `/dashboard` | 200 | SPA routing |
| `/hub/routines` | 200 | Deep link |
| `/onboarding` | 200 | Deep link |
| `/login` | 200 | Auth route |
| `/health` | 200 | SPA health page |
| `assets/index-DRikFzYb.js` | 200 | JS bundle |
| `sw.js` Cache-Control | — | `no-cache, no-store, must-revalidate` ✅ |
| `/assets/*` Cache-Control | — | `public, max-age=31536000, immutable` ✅ |

### 4.3 Audio

| Endpoint | HTTP | Evidence |
|----------|-----:|----------|
| `/api/healthz/audio` | 200 | `ok: true` |
| `/api/healthz/tts` | 200 | OpenAI TTS configured, GCS cache enabled |
| `/api/healthz/tts-cache` | 200 | 6,499 cached audios, `storageBackend: gcs` |
| `POST /api/static-audio/missing` | 401 | Auth gate intact |

### 4.4 Speech Coach

| Endpoint | HTTP | Evidence |
|----------|-----:|----------|
| `/api/remote-config/speech-coach-v2` | 200 | `speechCoachV2Enabled: true` |

### 4.5 Phonics

| Endpoint | HTTP | Evidence |
|----------|-----:|----------|
| `GET /api/phonics` | 401 | API reachable; auth gate enforced (expected) |

### 4.6 Stories / Content

| Endpoint | HTTP | Evidence |
|----------|-----:|----------|
| `/api/healthz/reels-catalog` | 200 | `ok: true` |
| `/api/stories/catalog` | 401 | API reachable; auth required (expected) |
| `/api/content/system/health` | 401 | API reachable; auth required (expected) |

### 4.7 API / Worker

| Endpoint | `x-amynest-backend` | HTTP |
|----------|---------------------|-----:|
| `/api/healthz` | `coolify` | 200 |
| `/api/healthz/audio` | `coolify` | 200 |
| `/api/healthz/tts` | `coolify` | 200 |
| `/api/healthz/tts-cache` | `coolify` | 200 |
| `/api/healthz/reels-catalog` | `coolify` | 200 |
| `/api/healthz/stability-metrics` | `coolify` | 200 |

### 4.8 BullMQ / Scheduler

Static cutover does **not** modify the backend plane. Scheduler and BullMQ were certified on Coolify in the [48-hour production certification](48-hour-production-certification.md) (61 h soak, `schedulerOwner: true`, BullMQ `wait=0/failed=0`).

**Live surrogate probes (public, no secrets):**

| Probe | Result |
|-------|--------|
| `/api/healthz/stability-metrics` | `ok: true`; analytics **6,108/6,108** success (rate 1.0) |
| `/api/healthz/env` (no secret) | **404** — secret gate intact (expected) |
| All `/api/*` probes | `x-amynest-backend: coolify` on every request |

Backend continuity confirmed; no regression detected from static origin change.

---

## 5. No Production Traffic to Render Static

| Evidence | Production (`www`) | Render Static (direct) |
|----------|---------------------|------------------------|
| `rndr-id` header | **Absent** | Present |
| Index bundle | `index-DRikFzYb.js` | `index-BeJfahIn.js` |
| Bundle SHA-256 | Pages-matched | Different (stale) |
| `last-modified` | Not Render-stamped | `2026-07-15T03:37:08 UTC` |

**Conclusion:** Zero evidence of production static traffic reaching Render.

---

## 6. Architecture (Post-Certification)

```
Browser / Android WebView / iOS
        ↓
www.amynest.in (Cloudflare edge)
   ├─ /*           → Cloudflare Pages (amynest-web / 3a069879)  ✅ CERTIFIED
   └─ /api/*       → CF Worker (amynest-api-proxy) → Coolify API  ✅ UNCHANGED
```

| Component | Host | Status |
|-----------|------|--------|
| Static SPA | Cloudflare Pages | ✅ Certified |
| API | Coolify | ✅ Unchanged |
| CF Worker | `amynest-api-proxy` | ✅ Routing OK |
| Render Static | `amynest-live-1-dykj` | Standby only (no prod traffic) |
| Render API | `amynest-backend-dykj` | Hot standby (not in prod path) |

---

## 7. Render Static Retirement

With this certification, **Render Static (`srv-d85k80jtqb8s7382m7i0`) may be retired** after:

1. **48-hour production soak** on Cloudflare Pages (monitor `rndr-id` absence)
2. GitHub/CI deploy path documented (currently Direct Upload)
3. Copy remaining secrets (`VITE_GA4_MEASUREMENT_ID`, `VITE_FIREBASE_VAPID_KEY`) if not already in Pages env

**Render API hot standby:** retain per existing runbook; not in scope of this certification.

---

## Appendix — Raw Probe Commands

```bash
# 1. Confirm Pages (no Render)
curl -sI https://www.amynest.in/ | grep -i rndr-id
# Expected: empty

# 2. Confirm Coolify API
curl -sI https://www.amynest.in/api/healthz | grep x-amynest-backend
# Expected: coolify

# 3. Bundle parity
curl -s https://www.amynest.in/ | grep -oE 'assets/index-[^"]+\.js'
curl -s https://3a069879.amynest-web.pages.dev/ | grep -oE 'assets/index-[^"]+\.js'
# Expected: identical

# 4. Full smoke
SMOKE_BASE_URL=https://www.amynest.in SMOKE_API_URL=https://www.amynest.in \
  bash scripts/post-deploy-smoke.sh
```

---

*Read-only audit. No infrastructure changes made during this certification.*
