# AmyNest — Render Final Cleanup Report

**Document:** `render-final-cleanup-report.md`  
**Date:** 2026-07-20  
**Scope:** Production / CI / script default cleanup only  
**Constraints honored:** No deploy · No infrastructure changes · Historical documentation untouched  

**Prior certification:** `render-retirement-final-certification.md` — 🟢 CERTIFIED FOR PERMANENT RENDER RETIREMENT  

---

## Summary

Production defaults, GitHub Actions, Cloudflare Worker repo config, smoke/monitor script defaults, and app/API fallbacks no longer point at `*.onrender.com`.

Public defaults → `https://www.amynest.in`  
Direct API upstream defaults → Coolify  
`https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io`

---

## Files changed (30)

### CI

| File | Change |
|------|--------|
| `.github/workflows/audio-gates.yml` | `AUDIO_LOAD_BASE_URL` default → `https://www.amynest.in` |
| `.github/workflows/audio-load-test-weekly.yml` | Same |

### Cloudflare Worker (repo config — not deployed by this change)

| File | Change |
|------|--------|
| `infra/cloudflare/amynest-api-proxy/wrangler.toml` | `BACKEND_ORIGIN` + `CANARY_BACKEND_ORIGIN` → Coolify |
| `infra/cloudflare/amynest-api-proxy/src/worker.js` | `DEFAULT_BACKEND` → Coolify |
| `infra/cloudflare/amynest-api-proxy/src/canary.js` | Comments + lane label `render` → `primary` |

### Env examples

| File | Change |
|------|--------|
| `.env.production.example` | `API_PUBLIC_URL` → Coolify; `SCHEDULER_ACTIVE_PLANE=coolify`; Expo/client → `www.amynest.in` |
| `.env.hetzner-worker.example` | Redis/DB examples → Coolify host proxy (no Render KV) |

### App / API defaults

| File | Change |
|------|--------|
| `artifacts/kidschedule/src/config.ts` | Dev default → `http://localhost:5000` (was `amynest-dev.onrender.com`) |
| `artifacts/kidschedule/src/lib/api-origin.test.ts` | Tests updated for new defaults |
| `artifacts/api-server/src/services/audio-health-gate-live.ts` | Fallback → `https://www.amynest.in` |

### Scripts / monitors / smoke helpers

| File | Change |
|------|--------|
| `scripts/audio-load-test.ts` | Comment example → www |
| `scripts/audio-recovery-audit.mjs` | Default API → www |
| `scripts/tts-orphan-dry-run.ts` | Default API → www |
| `scripts/playback-quality-asset-report.mjs` | Default API → www |
| `scripts/gcs-lullaby-prod-probe.mjs` | Second origin → Coolify (not Render) |
| `scripts/certify-ios-worker-api-path.mjs` | Removed Render origin constant |
| `scripts/cloudflare-pages-dns-cutover.sh` | Rollback comment → Pages |
| `scripts/render-to-coolify/07-canary-monitor.sh` | Default → Coolify |
| `scripts/render-to-coolify/15-deploy-hetzner-monitor.sh` | Default → Coolify |
| `scripts/render-to-coolify/17-start-stage-50-autonomous-monitor.sh` | Default → Coolify |
| `scripts/render-to-coolify/18-start-production-48h-monitor.sh` | Default → Coolify |
| `scripts/render-to-coolify/20-deploy-production-monitor.sh` | `RENDER_API_URL` → Coolify |
| `scripts/render-to-coolify/env.example` | Comment URL → Coolify |
| `scripts/src/render-to-coolify/canary-monitor.ts` | Default → Coolify |
| `scripts/src/render-to-coolify/stage-50-autonomous-monitor.ts` | Default → Coolify |
| `scripts/src/render-to-coolify/production-48h-monitor.ts` | Default → Coolify |
| `scripts/src/render-to-coolify/monitor-soak.ts` | Default → Coolify |
| `scripts/src/render-to-coolify/data-plane-audit.ts` | Default → Coolify |
| `scripts/src/render-to-coolify/production-monitor.ts` | Default → Coolify; `render_standby: "retired"` |
| `scripts/src/render-to-coolify/verify-scheduler-singleton.ts` | Default → Coolify |

`scripts/post-deploy-smoke.sh` and `.github/workflows/deploy-production.yml` already targeted Pages + Coolify — no edit required.

**Tests run:** `api-origin.test.ts` — 15/15 passed.

---

## Remaining Render references (intentional / non-production)

| Location | Why kept | Production dependency? |
|----------|----------|:----------------------:|
| Historical docs / certs / audit JSON (`audit/`, `docs/`, `*-certification.md`, `render-retirement-*.md`, etc.) | Explicitly out of scope | **NO** |
| `render.yaml` | Legacy Render blueprint comment/URLs | **NO** (services suspended; CI does not deploy it) |
| `artifacts/kidschedule/src/lib/domain-gate.ts` | Allows legacy `*.onrender.com` hostnames if visited | **NO** (DNS does not route www to Render) |
| `artifacts/kidschedule/src/lib/canonical-domain.ts` | Same | **NO** |
| `lib/phone-auth/src/site-domain.ts` | Firebase/auth site allowlist for old hosts | **NO** |
| `artifacts/kidschedule/src/lib/runtime-crash-policy.ts` | Host heuristic for non-www onrender | **NO** |
| `artifacts/api-server/src/lib/env.ts` / `loadEnv.ts` | Builds URL only if `RENDER_SERVICE_NAME` set (legacy runtime) | **NO** on Coolify |
| Domain-gate unit tests (`password-reset.test.ts`, `email-verification.test.ts`) | Exercise allowlist with old hostname fixtures | **NO** |
| `scripts/src/render-to-coolify/data-plane-audit.ts` | Still *detects* `onrender.com` strings when classifying planes | **NO** |
| `artifacts/amynest-capacitor/ios-config/APPSTORE-REVIEW-NOTES.md` | Historical documentation | **NO** |
| Local env dumps (`Amynest-backend-dykj.env`, etc.) if present | Operator local files — not production defaults | **NO** |

**Zero** remaining `amynest-backend-dykj.onrender.com` / `amynest-live-1-dykj.onrender.com` defaults in CI, Worker repo config, env examples, or operational scripts (aside from `render.yaml` blueprint).

---

## Does any production dependency still exist?

| Layer | Still depends on Render? | Notes |
|-------|:------------------------:|-------|
| Live traffic (DNS / Pages / Worker runtime) | **NO** | Unchanged by this PR; already Coolify + Pages. **Repo** Worker defaults updated; **live** Worker bindings update only on a future `wrangler deploy` (not done here). |
| CI / smoke / load-test defaults | **NO** | Point at www or Coolify |
| App / API code fallbacks | **NO** | www / localhost |
| Monitor script defaults | **NO** | Coolify; standby marked retired |

**Verdict:** No production **code/default** dependency on Render remains after this cleanup. Live Cloudflare Worker still had `BACKEND_ORIGIN=Render` at last infrastructure audit (unused at `CANARY_PERCENT=100`); aligning live bindings requires a separate, explicit Worker deploy — **not performed**.

---

## Not done (by design)

- No Cloudflare / Coolify / DNS / Render dashboard changes  
- No `wrangler deploy`  
- No deletion of Render services  
- No edits to historical migration docs or audit artifacts  
- No changes to domain allowlists for legacy `*.onrender.com` hostnames  

---

## Follow-up (optional, separate change window)

1. Redeploy Worker so live `BACKEND_ORIGIN` matches repo (Coolify).  
2. Optionally trim legacy `*.onrender.com` entries from domain allowlists after Firebase console cleanup.  
3. Archive or delete `render.yaml` when Render services are permanently removed.
