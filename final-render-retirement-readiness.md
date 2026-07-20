# AmyNest — Final Render Retirement Readiness

**Document:** `final-render-retirement-readiness.md`  
**Role:** Release Manager  
**Audit time:** 2026-07-20T15:25–15:35 UTC  
**Scope:** Synchronize live Cloudflare Worker with repository (if needed) + production verification  
**Constraints honored:** No app/Coolify/Pages/DB/Redis/DNS/monitoring changes · No Render delete/suspend · No traffic-policy changes beyond Worker sync  

---

## Verdict

# 🟢 SAFE TO PERMANENTLY DELETE ALL RENDER SERVICES

---

## STEP 1 — Worker comparison & deployment

### Before (live)

| Item | Value | Evidence |
|------|-------|----------|
| Version ID | `c79bc37d-479d-4af0-9a0a-62034d658bb6` (version **28**) | Cloudflare Workers API `versions` / prior deployment `17080c7f-…` @ 2026-07-13T11:00:38Z |
| `BACKEND_ORIGIN` | `https://amynest-backend-dykj.onrender.com` | Cloudflare `workers/scripts/amynest-api-proxy/settings` |
| `CANARY_BACKEND_ORIGIN` | Coolify sslip.io | Same |
| `CANARY_PERCENT` | `100` | Same (traffic already Coolify via canary) |

### Repository (target)

| Item | Value |
|------|-------|
| `BACKEND_ORIGIN` | `https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io` |
| `CANARY_BACKEND_ORIGIN` | same Coolify URL |
| `CANARY_PERCENT` | `100` |
| `DEFAULT_BACKEND` (worker.js) | Coolify URL |

### Diff result

**NOT identical** — live `BACKEND_ORIGIN` still referenced Render.

### Was Worker deployment required?

**YES**

### Deploy action

```text
npx wrangler deploy  (cwd: infra/cloudflare/amynest-api-proxy)
```

| Item | Value |
|------|-------|
| Deployed at | 2026-07-20T15:25:10Z |
| Deployment ID | `bacbff1e-3a5d-4230-bb5c-aa926e44c787` |
| **Version after** | `2c95a294-3bed-4eec-a739-536522336423` |
| Routes | `www.amynest.in/api/*`, `amynest.in/api/*` |
| GCS secret preserved | **YES** (`GCS_SERVICE_ACCOUNT_JSON` still present) |

---

## STEP 2 — Production verification (post-deploy)

| Endpoint | HTTP | `x-amynest-backend` | Result |
|----------|-----:|---------------------|--------|
| `https://www.amynest.in/api/healthz` | **200** | **coolify** | PASS (`{"status":"ok"}`) |
| `https://www.amynest.in/api/healthz/audio` | **200** | **coolify** | PASS (`status: PASS`, GCS + TTS stream OK) |
| `https://www.amynest.in/api/healthz/env` | **404** | **coolify** | Expected without `INTERNAL_HEALTH_SECRET` (not available in local env files this session) |
| 5× `/api/healthz` sticky check | **200** | **coolify** every time | PASS |

No Render backend in response path.

---

## STEP 3 — Live Worker configuration search

Post-deploy Cloudflare settings bindings:

| Binding | Value | Render? |
|---------|-------|:-------:|
| `BACKEND_ORIGIN` | Coolify sslip.io | **NO** |
| `CANARY_BACKEND_ORIGIN` | Coolify sslip.io | **NO** |
| `CANARY_PERCENT` | `100` | N/A |
| `GCS_BUCKET` | `amynest-audio-storage` | NO |
| `REELS_*` | GCS paths / `1` | NO |
| `GCS_SERVICE_ACCOUNT_JSON` | secret present | NO |

**`renderish_bindings`:** `[]` (empty)

Searched live config for:

- `onrender.com` — **absent**
- `RENDER_API_URL` — **absent**
- `RENDER_BACKEND_URL` — **absent**
- `BACKEND_ORIGIN` → Render — **absent** (now Coolify)
- `AUDIO_LOAD_BASE_URL` — N/A (not a Worker binding)
- `CANARY_BACKEND_ORIGIN` → Render — **absent**

---

## STEP 4 — Production smoke tests

### `scripts/post-deploy-smoke.sh`

**PASS** — Pages web + Coolify `/api/health`, `/api/healthz`, `/api/healthz/audio`, auth guards.

### Feature matrix (www via Worker, post-deploy)

| Area | Result | Evidence |
|------|--------|----------|
| **API** | **PASS** | `/api/healthz` 200, `x-amynest-backend: coolify` |
| **Audio** | **PASS** | `/api/healthz/audio` PASS; TTS stream OK; static GCS probe OK |
| **GCS** | **PASS** | `staticAudio.gcsProbeOk=true`; storageBackend `gcs` |
| **Phonics** | **PASS** | `/api/phonics-library/phonics/letters/a.mp3` → 200 `audio/mpeg`, coolify |
| **Static audio** | **PASS** | `/api/static-audio/{hash}.mp3` → 200 `audio/mpeg`, coolify |
| **PWA** | **PASS** | `/` 200 HTML; `/manifest.json` 200; `/sw.js` 200 |
| **Speech Coach** | **PASS*** | Routes reachable on Coolify (`/api/speech-coach/health` → **401** auth required, not 404 / not Render) |
| **Stories** | **PASS*** | Stream endpoint on Coolify (`story_not_found` 404 for unknown id; list endpoints require auth) |
| **Scheduler** | **PARTIAL** | Cannot read `/api/healthz/env` without secret this session; Render cannot own scheduler (suspended + removed from Worker). Coolify is sole live API. |
| **BullMQ** | **PARTIAL** | Same env endpoint gap; queue plane previously certified on Coolify Redis; no Render Redis in path |
| **Worker (Hetzner)** | **PARTIAL** | `:9090/health` not reachable from public internet (timeout); not a Render dependency |

\*Auth-gated or ID-gated responses still prove Worker → Coolify routing with **no** Render involvement.

**Render leak check:** no `onrender` / `amynest-backend-dykj` in `/api/healthz` response headers.

---

## Remaining Render references

| Class | Status | Blocks delete? |
|-------|--------|:--------------:|
| Live Worker bindings | **Cleared** (Coolify only) | **NO** |
| Production traffic / DNS / Pages | Already non-Render | **NO** |
| Suspended Render services | Still exist (unused) | **NO** — deletion target |
| Repo historical docs / allowlists / `render.yaml` | Residual strings only | **NO** |

---

## Blockers

**None for permanent Render deletion.**

Non-blocking verification gaps (do not require Render):

1. `/api/healthz/env` not re-read (no `INTERNAL_HEALTH_SECRET` in local env this session).  
2. Hetzner worker heartbeat port not publicly reachable from this runner.  
3. Authenticated end-to-end Speech Coach / Stories content playback not exercised (auth required).

---

## Version summary

| | Version ID |
|--|-----------|
| **Before** | `c79bc37d-479d-4af0-9a0a-62034d658bb6` |
| **After** | `2c95a294-3bed-4eec-a739-536522336423` |

---

## Final statement

Live Worker is synchronized with the repository. Production API traffic continues on Coolify with `x-amynest-backend: coolify`. Live Worker configuration contains **no** Render production origins.

# 🟢 SAFE TO PERMANENTLY DELETE ALL RENDER SERVICES

**No deletes were performed by this release action.**
