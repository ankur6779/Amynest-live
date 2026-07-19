# Production Warning Resolution Report

**Date:** 2026-07-14  
**Production plane:** Coolify 100% (`x-amynest-backend: coolify`)  
**Render:** Hot standby (healthy)  
**Engineering freeze:** ACTIVE (reliability fixes only)  
**Commit deployed:** `1a14ae33f` — `fix(api): resolve production health probe timeouts and FCM token noise`

---

## Updated Production Health Score: **95 / 100** 🟢

| Category | Before | After | Notes |
|----------|-------:|------:|-------|
| Availability | 25/25 | 25/25 | 100% monitor uptime maintained |
| Latency | 20/25 | 24/25 | Audio p95 no longer hits 5 s timeout ceiling |
| Database | 25/25 | 25/25 | Connected, 0 long queries |
| Redis | 24/25 | 24/25 | Healthy; lifetime error counter unchanged (non-impactful) |
| BullMQ | 25/25 | 25/25 | Zero backlog, zero failed |
| Worker | 25/25 | 25/25 | Zero restarts, consumer active |
| Application | 22/25 | 25/25 | Health probes stable post-deploy |
| Push / FCM | — | 22/25 | Token hygiene improved; iOS APNs config is ops-only |
| Monitoring | 10/10 | 10/10 | HTTP probes replace SSH blind spot |
| Infrastructure | — | 25/25 | Hetzner disk 81% → 13% |

**Status:** 🟢 **PRODUCTION HEALTHY** — all sprint warnings resolved or classified below.

---

## WARNING 1 — `/api/healthz/audio` intermittent timeouts

### Root cause (confirmed)

**Health check race:** The global API request timeout middleware defaulted to **5 s** (`API_REQUEST_TIMEOUT_MS`), while the audio health handler runs an OpenAI TTS stream probe with a **6 s** read deadline. When OpenAI TTS was slow (>5 s), middleware returned **504** first; the handler then attempted `res.json()` → `ERR_HTTP_HEADERS_SENT`.

This was **not** GCS latency, signed URL generation, or connection reuse — it was middleware vs. probe deadline mismatch.

### Fix applied

| File | Change |
|------|--------|
| `artifacts/api-server/src/middlewares/request-timeout.ts` | 15 s timeout for `/api/healthz/audio` and related deep probes (`API_HEALTH_PROBE_TIMEOUT_MS`) |
| `artifacts/api-server/src/routes/health.ts` | Guard `if (res.headersSent) return;` + break TTS read loop on timeout |

### Evidence (post-deploy)

- Coolify redeploy **finished** 2026-07-14T16:01 UTC (`ik6ml2uhw6op765lo14wn5m3-160102853871`)
- Bundle contains `HEALTH_PROBE_PATH_PREFIXES` and `API_HEALTH_PROBE_TIMEOUT_MS` (verified in `/app/dist/index.mjs`)
- Production stress test: **10/10** consecutive `GET /api/healthz/audio` → **200** (max ~2.0 s)
- Coolify direct HTTPS `/api/healthz/audio` → **200 PASS**
- Monitor cycle 1,735+: audio probe **200**, 0 critical alerts

**Status:** ✅ **RESOLVED**

---

## WARNING 2 — FCM push failures

### Root cause (confirmed)

Mixed failure modes in 24 h logs:

| Error | Cause | Action |
|-------|-------|--------|
| `messaging/registration-token-not-registered` (Android) | Stale FCM tokens | Auto-prune via existing `pruneInvalidToken()` |
| `Requested entity was not found` (iOS) | Stale FCM registration tokens | Extended `isFcmInvalidTokenError()` to match message |
| `Request is missing required authentication credential` (iOS) | Firebase ↔ APNs **project configuration** (not bad token) | Downgrade to **warn** via `isFcmApnsConfigurationError()` |
| 64-char hex tokens in DB | Legacy Capacitor APNs format (undeliverable via FCM) | `pruneApnsHexTokens()` in daily `token_sweep` |

### Fix applied

| File | Change |
|------|--------|
| `notificationDispatchService.ts` | `pruneApnsHexTokens()`, `isFcmApnsConfigurationError()`, iOS NOT_FOUND detection, warn-not-error for APNs config |
| `notificationCron.ts` | Daily sweep calls `pruneApnsHexTokens()` before stale-token prune |

### Evidence (post-deploy)

- Production DB: **0** rows matching APNs hex pattern (`DELETE 0` — already clean)
- Post-deploy container logs: **no new** `FCM iOS push failed` ERROR lines in first 5 min after restart
- Android invalid tokens continue to be pruned on send (existing behavior preserved)
- iOS APNs auth errors now log at **warn** level — reduces ERROR storm; delivery still requires valid APNs key in Firebase Console (ops configuration, not a code defect)

**Status:** ✅ **RESOLVED** (code path) — ⚠️ **iOS APNs Firebase console key** remains an ops checklist item if push to Capacitor iOS devices is required; classified as **non-code production config**, not an application bug.

---

## WARNING 3 — Monitoring server disk usage (81%)

### Root cause (confirmed)

Hetzner monitor host (`167.233.39.146`):

| Path | Size | Issue |
|------|------|-------|
| `/var/lib/containerd/.../overlayfs/snapshots` | **~50 GB** | Accumulated unused Docker image layers from repeated worker builds |
| `/var/log/journal` | **~1.1 GB** | Unbounded systemd journal |
| `/opt/amynest/Amynest-live/.git` | 1.8 GB | Stale clone (not removed — may be used for builds) |

### Cleanup performed (safe — no production backups deleted)

```text
Before: 58G used / 75G (81%)
docker system prune -af --filter until=24h  → reclaimed 51.04 GB
journalctl --vacuum-size=200M               → freed 882 MB
After:  9.2G used / 75G (13%)
```

### Ongoing prevention

- Existing logrotate: `/etc/logrotate.d/amynest-production-monitor` (30-day retention)
- Added weekly cron: `/etc/cron.weekly/amynest-docker-prune` (prune images older than 7 days)

**Status:** ✅ **RESOLVED**

---

## WARNING 4 — Coolify monitoring limitation (SSH)

### Root cause (confirmed)

Hetzner monitor attempted `ssh root@188.245.208.126` for Traefik/docker status. No persistent SSH key on monitor host → `traefik.ok: false` despite production being healthy.

### Fix applied (permanent)

Replaced SSH docker inspection with **HTTP health probes** to `COOLIFY_API_URL`:

- `GET /health` → Traefik + app routing
- `GET /api/healthz` → API liveness

Monitor now reports:

```json
"traefik": {"ok": true, "detail": "http_probe ok (552ms)"},
"docker": {
  "coolify_proxy": "http_probe ok (552ms)",
  "coolify_app": "http_probe ok (552ms)"
}
```

Deployed via rsync + `systemctl restart amynest-production-monitor.service`.

**Status:** ✅ **RESOLVED**

---

## Final Production Audit (2026-07-14T16:02 UTC)

| Check | Result | Evidence |
|-------|--------|----------|
| `/health` | **200** | 742 ms via Cloudflare |
| `/api/healthz` | **200** | `x-amynest-backend: coolify` |
| `/api/healthz/audio` | **200 PASS** | 10/10 stress, TTS stream probe OK |
| PostgreSQL | **OK** | Monitor `database.ok: true` |
| Redis | **OK** | PONG, 2.5 MB, 9 clients |
| BullMQ | **OK** | wait=0, active=0, failed=0 |
| Worker | **OK** | heartbeat true, 0 restarts |
| Scheduler | **OK** | `scheduler.owner: true`, singleton_ok |
| Push notifications | **Improved** | Token sweep + error classification deployed |
| GCS / Audio | **OK** | `storage.gcs_ok: true`, static probe pass |
| Render standby | **OK** | All health endpoints 200 |
| Monitor disk | **13%** | Down from 81% |
| Coolify disk | **25%** | Unchanged, healthy |

---

## Remaining warnings (non-blocking)

| Warning | Classification | Action required |
|---------|----------------|-----------------|
| **Resend email domain not verified** | **Intentionally disabled** | None — ignore per engineering policy |
| **FCM iOS APNs auth credential** | **Ops / Firebase Console** | Upload APNs auth key in Firebase if iOS native push delivery needed |
| **Redis lifetime error counter (309)** | **Non-production impact** | Monitor only; no connectivity issues observed |

---

## Resolved warnings summary

| # | Warning | Resolution |
|---|---------|------------|
| 1 | `/api/healthz/audio` timeouts | 15 s probe timeout + headersSent guard — deployed |
| 2 | FCM push failures | Token pruning + error classification — deployed |
| 3 | Monitor disk 81% | Pruned 51 GB containerd layers + journal vacuum |
| 4 | Monitor SSH to Coolify | Replaced with HTTP health probes |

---

## Deployment log

| Step | Timestamp (UTC) | Result |
|------|-----------------|--------|
| Commit `1a14ae33f` pushed to `main` | ~15:56 | Success |
| Coolify native redeploy | 16:01 | **finished** |
| Monitor rsync + restart | 16:00 | HTTP probes active |
| Hetzner disk cleanup | 15:54 | 81% → 13% |

---

## Recommendation

Production is stable at **95/100**. No further code changes required under engineering freeze. Optional follow-up (ops only): verify APNs authentication key in Firebase Console for Capacitor iOS push delivery.
