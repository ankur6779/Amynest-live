# AmyNest — Render Retirement Final Certification

**Document:** `render-retirement-final-certification.md`  
**Role:** Chief Infrastructure Architect  
**Audit time:** 2026-07-20T15:15 UTC  
**Audit type:** READ ONLY — no resume, deploy, DNS, Cloudflare, Coolify, GitHub, env, or service restarts  
**Declared production topology:** Static → Cloudflare Pages · API → Coolify · PostgreSQL → Coolify · Redis → Coolify · BullMQ → Coolify · Worker → Hetzner · Scheduler → Coolify  
**Render state (operator claim):** manually suspended ~5 days; no production incidents reported  

---

## Final verdict

# 🟢 CERTIFIED FOR PERMANENT RENDER RETIREMENT

Production no longer depends on any Render service for live traffic or live state. All four remaining Render resources are suspended (or already gone) and can be permanently deleted without breaking `www.amynest.in`.

---

## STEP 1 — Production verification

| Check | Result | Evidence (2026-07-20T15:14–15:15 UTC) |
|-------|--------|----------------------------------------|
| `https://www.amynest.in/` | **PASS** HTTP 200 | `server: cloudflare`; **no** `rndr-id`; deploy meta `amynest-deploy=2026-07-20-4f9542b`; asset `assets/index-czIqqlBK.js` |
| `https://www.amynest.in/health` | **PASS** HTTP 200 | SPA HTML from Pages (not API JSON) — same semantics as prior 48h / Pages certs |
| `https://www.amynest.in/api/healthz` | **PASS** HTTP 200 | Body `{"status":"ok"}`; header `x-amynest-backend: coolify` |
| `https://www.amynest.in/api/healthz/audio` | **PASS** HTTP 200 | `status: PASS`; `tts.streamProbe.ok=true`; `staticAudio.gcsProbeOk=true`; `x-amynest-backend: coolify` |
| Coolify origin `/health` | **PASS** HTTP 200 | `https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io/health` → `{"ok":true,...}` |
| Coolify origin `/api/healthz` | **PASS** HTTP 200 | `{"status":"ok"}` |
| Coolify origin `/api/healthz/audio` | **PASS** HTTP 200 | `status: PASS` |
| Render API direct | **SUSPENDED** HTTP 503 | `https://amynest-backend-dykj.onrender.com/health` → `x-render-routing: suspend-by-user` |
| Render Static direct | **SUSPENDED** HTTP 503 | `https://amynest-live-1-dykj.onrender.com/` → suspend-by-user |
| Pages project | **LIVE** HTTP 200 | `https://amynest-web.pages.dev/` 200; CF Pages project `amynest-web`; latest deploy `3738682e` @ 2026-07-20T14:50 UTC |

**Production health conclusion:** Healthy on Pages + Coolify. Render origins return 503 and are not in the live path.

---

## STEP 2 — Dependency audit (repository + infrastructure)

### Active production path — no Render dependency

| Surface | Production target | Render required? | Evidence |
|---------|-------------------|:----------------:|----------|
| DNS `www.amynest.in` | CNAME → `amynest-web.pages.dev` (proxied) | **NO** | Cloudflare DNS API — **zero** records containing `render` / `onrender` |
| DNS apex `amynest.in` | A → Cloudflare anycast `216.24.57.1` | **NO** | Cloudflare DNS; apex 301 → `https://www.amynest.in/` |
| DNS `api.amynest.in` / `cdn.amynest.in` | **No records** | **NO** | dig @1.1.1.1 empty |
| Cloudflare Pages | `amynest-web` serves `www.amynest.in` | **NO** | Pages project domains include `www.amynest.in`; `VITE_APP_API_ORIGIN=https://www.amynest.in` |
| Cloudflare Worker `amynest-api-proxy` | Routes `www.amynest.in/api/*`, `amynest.in/api/*` | **NO** (runtime) | Live bindings: `CANARY_PERCENT=100`, `CANARY_BACKEND_ORIGIN=<Coolify sslip.io>` → all API to Coolify |
| GitHub Actions production deploy | Pages + Hetzner only | **NO** | `.github/workflows/deploy-production.yml` comment: “Render API standby is retired”; `SMOKE_API_URL` = Coolify; no `trigger-render` |
| Hetzner AI worker | Coolify Postgres + Coolify Redis via `188.245.208.126` | **NO** | `audit/render-to-coolify/worker.env.probe` host targets (secrets redacted in this cert) |
| Coolify API env | Coolify internal DB/Redis | **NO** | `coolify-backend.env.probe`: `API_PUBLIC_URL=<sslip.io>`; `BACKGROUND_TASKS_ENABLED=true`; `NOTIFICATIONS_ENABLED=true` |
| Webhooks | `https://www.amynest.in/api/...` | **NO** | Same-origin Worker → Coolify (`x-amynest-backend: coolify`) |
| Static assets / SW | Pages | **NO** | `/manifest.json`, `/sw.js`, `/assets/*` — Cloudflare headers, **no** `rndr-id` |

### Stale / residual Render references (do **not** require Render to exist)

These are config debt or historical tooling. They do **not** send production user traffic to Render while `CANARY_PERCENT=100` and Pages DNS remain as verified.

| Location | Nature | Risk if Render deleted |
|----------|--------|------------------------|
| Live Worker binding `BACKEND_ORIGIN=https://amynest-backend-dykj.onrender.com` | Standby URL only; unused at `CANARY_PERCENT=100` | **Config footgun** if canary % lowered without updating origin |
| Repo `infra/cloudflare/amynest-api-proxy/wrangler.toml` + `worker.js` `DEFAULT_BACKEND` | Same standby default | Same — only if redeployed with canary &lt; 100 |
| `.github/workflows/audio-gates.yml` / `audio-load-test-weekly.yml` | Default `AUDIO_LOAD_BASE_URL` → onrender | CI load tests fail unless `vars.AUDIO_LOAD_BASE_URL` overrides |
| `.env.production.example`, migration scripts, docs, tests | Historical / fallback strings | Docs/tooling only |
| `render.yaml` Blueprint | Declares legacy stack | Not driving live deploys (`autoDeployTrigger: off`; services suspended) |

**Dependency conclusion:** No remaining **runtime** production dependency on Render. Residual references are standby/CI/docs only.

---

## STEP 3 — Runtime audit

| Assertion | Result | Evidence |
|-----------|--------|----------|
| No production request targets Render | **PASS** | All `www` API probes return `x-amynest-backend: coolify`; Render API returns 503 if hit directly |
| No DNS record points to Render | **PASS** | Cloudflare zone DNS: `dns_render_refs: []`; `www` → Pages |
| No Pages deployment points to Render | **PASS** | Pages serves static; API via separate Worker route; Pages env API origin = `https://www.amynest.in` |
| No Worker forwards to Render (current config) | **PASS** | `selectBackend`: `fullCanary` when percent ≥ 100 → Coolify only (`canary.js`) |
| No monitoring expects Render for prod smoke | **PASS** | `deploy-production.yml` smokes Pages + Coolify; Render not in smoke URLs |

**Control probe:** Hitting Render hostnames resolves on the public internet but returns **503 suspend-by-user** — proving hosts exist yet carry **no** production role.

**Suspend age:** Backend/static `updatedAt` 2026-07-15T18:09 UTC → ~**117 hours (~4.9 days)** suspended at audit time (aligned with operator claim of ~5 days).

---

## STEP 4 — Data audit

| Store | Status | Production-unique state? | Evidence |
|-------|--------|:------------------------:|----------|
| **Render PostgreSQL** `amynest-db-dykj` (`dpg-d85k80jtqb8s7382m7lg-a`) | `status: suspended` | **NO** | Stateful plane certified Coolify (2026-07-12); replica certified; Render frozen thereafter; Coolify has been sole live writer through canary 100% (2026-07-13) + suspend window |
| **Render Redis** `amynest-redis-dykj` (`red-d85k80btqb8s7382m7gg`) | `status: suspended` | **NO** | Queue drained to Coolify Redis pre-canary; BullMQ on Coolify; Hetzner worker uses Coolify Redis |
| **Render Backend** `Amynest-backend-dykj` | suspended | **NO** | Ephemeral compute; stateful plane already Coolify before suspend; HTTP 503 now |
| **Render Static** `Amynest-live-1-dykj` | suspended | **NO** | Production static on Pages since ≥ 2026-07-15 (`cloudflare-pages-production-certification.md`); Render static 503 |
| **Render AI Worker** | **Already absent** | **NO** | `get_service(srv-d98vh077f7vs739h85mg)` → **404**; not in `list_services` |

**Data conclusion:** No production-only state remains exclusively on Render. Coolify Postgres/Redis + GCS + Firebase hold live state. A frozen Render DB snapshot (if still recoverable after suspend) is at best a **stale archive**, not a live source of truth — Coolify is **days ahead**.

---

## STEP 5 — Rollback assessment (if Render deleted today)

Deleting Render **ends instant unsuspend failover**. Rebuild from Coolify/Git/GCS remains possible.

| Capability | Still possible after delete? | Estimate | Notes |
|------------|:---------------------------:|----------|-------|
| Recreate backend on Render (or elsewhere) | **YES** (new provision) | **2–6 hours** | Docker from repo + secrets re-entry; DNS/Worker rewiring if used as failover |
| Restore DB **from** Render | **NO useful path** | N/A | Suspended + stale vs Coolify; Coolify is ahead |
| Recreate DB **to** a new host from Coolify | **YES** | **1–3 hours** | `pg_dump`/`pg_restore` from Coolify (~680MB class previously) |
| Restore Redis from Render | **NO useful path** | N/A | Drained/suspended; recreate empty Coolify Redis in **minutes** |
| Redeploy static | **YES (already primary)** | **5–20 minutes** | Cloudflare Pages already serving; GH Actions `deploy-pages` |

**Rollback verdict:** Instant Render standby rollback is **already gone** (services suspended ~5 days). Permanent delete only removes the option to unsuspend that standby. True recovery path is **Coolify + Pages + Hetzner**, which are already production.

---

## STEP 6 — Retirement checklist

### Backend — `Amynest-backend-dykj` (`srv-d85k8jbtqb8s7382mjng`)

| Field | Value |
|-------|-------|
| **Safe to delete?** | **YES** |
| **Reason** | Suspended; production API 100% Coolify via Worker; no live requests; compute holds no unique state |
| **Evidence** | Live `x-amynest-backend: coolify`; Render `/health` 503 `suspend-by-user`; `CANARY_PERCENT=100`; suspended since 2026-07-15 |

### Static — `Amynest-live-1-dykj` (`srv-d85k80jtqb8s7382m7i0`)

| Field | Value |
|-------|-------|
| **Safe to delete?** | **YES** |
| **Reason** | Production static on Cloudflare Pages; DNS CNAME to `amynest-web.pages.dev`; Render static 503 |
| **Evidence** | No `rndr-id` on www; Pages project `amynest-web` custom domain `www.amynest.in`; deploy 2026-07-20; CI deploys Pages not Render |

### PostgreSQL — `amynest-db-dykj` (`dpg-d85k80jtqb8s7382m7lg-a`)

| Field | Value |
|-------|-------|
| **Safe to delete?** | **YES** |
| **Reason** | Suspended legacy replica; Coolify is sole production writer; no unique live rows |
| **Evidence** | Render MCP `status: suspended`; stateful-plane + replica certs; Coolify DB host in backend/worker probes |

### Redis — `amynest-redis-dykj` (`red-d85k80btqb8s7382m7gg`)

| Field | Value |
|-------|-------|
| **Safe to delete?** | **YES** |
| **Reason** | Suspended; BullMQ + worker on Coolify Redis; Render queue previously drained |
| **Evidence** | Render MCP Redis `status: suspended`; worker/backend Redis targets Coolify plane |

### AI Worker (legacy Render)

| Field | Value |
|-------|-------|
| **Safe to delete?** | **N/A — already gone** |
| **Reason** | Service ID from prior plan returns 404; Hetzner is sole consumer |
| **Evidence** | Render API 404; not listed in `list_services` |

---

## STEP 7 — Certification statement

### Preconditions already met

1. Static cutover to Cloudflare Pages completed and re-verified (no `rndr-id`, Pages DNS).  
2. API cutover at `CANARY_PERCENT=100` since 2026-07-13; Render API suspended ~2026-07-15; still healthy on Coolify.  
3. Stateful plane on Coolify (Postgres, Redis, BullMQ, Hetzner worker).  
4. CI production path no longer deploys Render.  
5. ~5 days suspended with no reported production incidents — empirical soak beyond the original 48h Coolify cert window.

### Residual hygiene (recommended **before or immediately after** delete — not blockers for service deletion)

1. Redeploy Worker with `BACKEND_ORIGIN` = Coolify URL (remove Render standby string) so a canary mis-set cannot target a deleted host.  
2. Override or update GH Actions `AUDIO_LOAD_BASE_URL` defaults away from `onrender.com`.  
3. Optional: cold `pg_dump` from Coolify to object storage before deleting Render Postgres (belt-and-suspenders archive — Coolify remains source of truth).  
4. Archive/remove `render.yaml` and migration scripts when operationally convenient.

### Live verification gap (documented, non-blocking)

`GET /api/healthz/env` returns 404 without `INTERNAL_HEALTH_SECRET`; this audit did **not** re-read live `schedulerOwner`. Supporting evidence that Coolify owns scheduling: operator topology, Jul-15 retirement/48h certs stating Coolify owner, Coolify probe `BACKGROUND_TASKS_ENABLED=true` + `NOTIFICATIONS_ENABLED=true`, and Render API unable to run crons while suspended for ~5 days with no incidents.

---

## Verdict (exactly one)

# 🟢 CERTIFIED FOR PERMANENT RENDER RETIREMENT

**Signed (role):** Chief Infrastructure Architect — AmyNest  
**Date:** 2026-07-20  
**Action authorized by this document:** Permanent deletion of suspended Render Backend, Static, PostgreSQL, and Redis is **safe for production continuity**.  
**Action NOT performed:** No deletes, resumes, deploys, or config changes were made during this audit.
