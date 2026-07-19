# Coolify Recovery Report — P1 Incident

**Generated:** 2026-07-13T09:30:00Z  
**Incident:** Coolify backend HTTPS returning 503 (`no available server`)  
**Production impact:** **None** — Render served 100% traffic throughout (`CANARY_PERCENT=0`)

---

## Executive summary

The Coolify API **container was healthy** and listening on port **5000**. Traefik routed **HTTP** correctly but had **no HTTPS router** for the application host after the 08:32 UTC redeploy. HTTPS requests fell through to Coolify's catch-all `noop` service → **503**.

**Fix:** Added missing Traefik **HTTPS router labels** to the Coolify `docker-compose.yaml`, force-recreated the backend container, restarted `coolify-proxy`. All health endpoints now return **200** over HTTPS.

**Not modified:** Render, Cloudflare, database, Redis, Hetzner worker, scheduler env, canary percent.

---

## Root cause

| Layer | Finding |
|-------|---------|
| **Application** | Healthy — `SERVER_LISTENING`, port 5000, DB/Redis/GCS OK |
| **Container** | Running, `RestartCount=0`, `OOMKilled=false` |
| **Docker network** | IP `10.0.2.11`, reachable on `:5000/health` → 200 |
| **Traefik HTTP router** | Present → external HTTP `/health` → **200** |
| **Traefik HTTPS router** | **Missing** → external HTTPS `/health` → **503** |
| **Catch-all router** | `default_redirect_503.yaml` binds `https` entrypoint to empty `noop` service when no app HTTPS router exists |

### Trigger

Coolify redeployed the backend at **2026-07-13T08:32:40Z** (image `1ecfa0ae8`) with only **HTTP** Traefik labels in `docker-compose.yaml`. Monitors and clients probe **`https://`** → 503 for ~7 hours.

### Ruled out

- Application crash / OOM
- Port binding failure (`PORT=5000` correct)
- Database connection failure
- Redis connection failure
- GCS / Firebase / RevenueCat startup errors
- Traefik proxy down (`coolify-proxy` healthy)

---

## Render vs Coolify comparison (Step 2)

| Item | Render (working) | Coolify (broken → fixed) |
|------|------------------|---------------------------|
| Public URL | `amynest-backend-dykj.onrender.com` | `ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io` |
| TLS termination | Render platform | Traefik + Let's Encrypt |
| App port | 10000 (Render) / 5000 in container | 5000 |
| Reverse proxy | Render load balancer | Traefik Docker provider |
| HTTPS routing | Platform-managed | Requires `https-0-*` Traefik labels |
| `/health` (during incident) | 200 | HTTP 200, **HTTPS 503** |
| Container state | live | running (healthy internally) |
| Image at incident | `1ecfa0ae8` | `1ecfa0ae8` (same commit) |
| Scheduler plane | owner (`render`) | standby (`SCHEDULER_ACTIVE_PLANE=render`) |

---

## Log evidence (Step 3)

### Coolify app boot (healthy)

```
ENV CHECK: { hasDB: true, hasFirebase: true, hasRedis: true }
Redis connected: true
SERVER_LISTENING
Server listening on port 5000
[STATIC AUDIO COLD START] GCS probe OK
```

No fatal errors, OOM, or port-bind failures in container logs.

### Traefik

```
http  /health → 200
https /health → 503 "no available server"
```

Prior error (stale routers from old containers):

```
Router defined multiple times with different configurations
routerName=http-0-ik6ml2uhw6op765lo14wn5m3
```

Resolved after proxy restart + single active container with HTTPS labels.

---

## Fix applied (Step 4 — minimum change)

Added Traefik HTTPS labels to Coolify application compose file:

```
traefik.http.routers.https-0-ik6ml2uhw6op765lo14wn5m3.entryPoints=https
traefik.http.routers.https-0-ik6ml2uhw6op765lo14wn5m3.rule=Host(`ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io`) && PathPrefix(`/`)
traefik.http.routers.https-0-ik6ml2uhw6op765lo14wn5m3.tls=true
traefik.http.routers.https-0-ik6ml2uhw6op765lo14wn5m3.tls.certresolver=letsencrypt
traefik.http.services.https-0-ik6ml2uhw6op765lo14wn5m3.loadbalancer.server.port=5000
```

---

## Files changed

| Location | Change |
|----------|--------|
| `/data/coolify/applications/ik6ml2uhw6op765lo14wn5m3/docker-compose.yaml` | Added HTTPS Traefik router + service labels |
| `/data/coolify/applications/ik6ml2uhw6op765lo14wn5m3/docker-compose.yaml.bak.20260713-*` | Pre-fix backup (on server) |

**No changes** to git repo, Render, Cloudflare Worker, `.env` scheduler vars, database, or Redis.

---

## Commands executed

```bash
# Diagnosis
ssh root@188.245.208.126 'docker ps -a'
ssh root@188.245.208.126 'docker logs ik6ml2uhw6op765lo14wn5m3-082745972931 | tail -80'
ssh root@188.245.208.126 'curl http://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io/health'
ssh root@188.245.208.126 'curl https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io/health'

# Fix
ssh root@188.245.208.126 '
  cd /data/coolify/applications/ik6ml2uhw6op765lo14wn5m3
  cp docker-compose.yaml docker-compose.yaml.bak.$(date +%Y%m%d-%H%M%S)
  # (python patch: insert https-0 Traefik labels)
  docker compose up -d --force-recreate
  docker restart coolify-proxy
'
```

SSH key: `~/.ssh/id_ed25519_hetzner`  
Host: `188.245.208.126` (`Amynest-Backend-prod`)

---

## Health verification (Step 5)

**Coolify** (`https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io`):

| Endpoint | Status | Result |
|----------|--------|--------|
| `/health` | **200** | `{"ok":true,...}` |
| `/api/healthz` | **200** | `{"status":"ok"}` |
| `/api/healthz/audio` | **200** | `{"ok":true,"status":"PASS",...}` |

Verified from Coolify host **and** external workstation.

**Production unchanged:**

| Check | Result |
|-------|--------|
| `www.amynest.in/health` | 200 |
| `amynest-backend-dykj.onrender.com/health` | 200 |
| `x-amynest-backend` header | `render` |

---

## Post-recovery status

| Component | Status |
|-----------|--------|
| Coolify API | **Recovered** |
| Render production | **Unchanged / healthy** |
| Cloudflare canary | **Still 0%** (not re-enabled) |
| Hetzner 48h monitor | Should clear on next cycle (`c=OK`) |
| Engineering freeze | **Still active** |

---

## Follow-up (non-blocking)

1. **Coolify UI redeploy** may overwrite `docker-compose.yaml` and drop HTTPS labels — confirm Coolify "HTTPS" setting is enabled for this application, or re-apply labels after UI deploys.
2. **Scheduler env drift observed** in boot logs (`notification_cron` started on Coolify despite standby presync) — **not changed** per freeze; verify separately when scheduler work resumes.
3. Consider a small ops script to validate HTTP **and** HTTPS after every Coolify redeploy.

---

## Sign-off

| Gate | Result |
|------|--------|
| Coolify `/health` | PASS |
| Coolify `/api/healthz` | PASS |
| Coolify `/api/healthz/audio` | PASS |
| Render production untouched | PASS |
| Canary re-enabled | **NO** (per incident instructions) |
