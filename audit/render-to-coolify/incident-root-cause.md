# Incident Root Cause Analysis — Stage 1 Canary Rollback

**Generated:** 2026-07-12T10:45:00Z  
**Incident ID:** CANARY-STAGE1-20260712  
**SRE classification:** Monitoring false positive (client-side probe failure)  
**Confidence:** **High (92%)**

---

## Summary

The Stage 1 rollback was triggered by **one failed monitor interval** at `2026-07-12T10:38:52.469Z`. Coolify infrastructure **did not fail**. Evidence shows the monitoring host lost probe continuity for ~64 minutes (likely OS sleep), then on resume the **first** `fetch()` to `/health` failed in **2ms** with `fetch failed` — a client-side network error. **Subsequent probes in the same interval succeeded** (`/ready` 404 in 2047ms, `/api/healthz/env` 200 in 1159ms, `/api/healthz/audio` 200 in 1574ms).

**Root cause category:** **Monitoring script** (with **False positive**)

The Coolify application, Traefik, Docker, Redis, Postgres, and worker remained healthy throughout.

---

## Timeline

| Time (UTC) | Event | Evidence |
|------------|-------|----------|
| 09:17:46 | Canary enabled at 1% | `canary-state.json` interval #1 |
| 09:18:26 | Background monitor started | Terminal PID 26890 |
| 09:18–09:34 | Intervals #2–#17: all PASS (100/100) | 16 consecutive healthy checks |
| 09:34:13 | Last healthy interval before gap | `canary-state.json` |
| 09:34–10:38 | **Monitor gap ~64m 39s** | No checks recorded; process wall time continued |
| **10:38:52** | **Interval #18 FAIL** | `/health` status 0, `fetch failed`, 2ms |
| 10:38:52 | Same interval: `/api/healthz/env` **200** | Failure snapshot (see `sre-failure-interval.json`) |
| 10:38:52 | Degradation flagged; rollback instructions written | `rollback-instructions.md` |
| 10:39:55 | Interval #19: recovered 100/100 | `canary-state.json` |
| ~10:40:28 | Rollback deployed `CANARY_PERCENT=0` | Worker `c1c690a3` |
| 10:43:07 | Coolify host inspection | App up 2h, restart=0, no journal alerts |

---

## Failed interval — exact timestamp

```
2026-07-12T10:38:52.469Z
```

Monitor check index: **18 of 19** (before rollback verification checks).

Captured probe detail: `audit/render-to-coolify/sre-failure-interval.json`

---

## Evidence collected (±5 minutes)

### Coolify application logs (`ik6ml2uhw6op765lo14wn5m3`)

**Window:** 10:33–10:43 UTC

```
GET /ready → 404 (monitor probe only)
```

- No application crashes, OOM, or `/health` errors
- No container restart (`restart_count=0`, `OOMKilled=false`)
- Container started `2026-07-12T09:06:17Z` — continuous uptime through incident

### Traefik (`coolify-proxy`)

- Health checks passing (wget ping exec events at 10:42:59 UTC)
- No error lines in Traefik docker logs for 10:37–10:40 UTC
- Traefik access logs **not configured** (no `/var/log/traefik` volume)
- HTTPS probe from host at investigation time: **200** in 0.91s

### Docker events (10:33–10:43 UTC)

- Routine Coolify platform health execs (`pg_isready`, `redis-cli ping`, Traefik ping)
- **No** `die`, `kill`, `oom`, or AmyNest app container restart events

### Host kernel / journal (10:33–10:43 UTC)

```
journalctl -p warning..alert → No entries
dmesg → No relevant lines
load average: 0.60 — normal
memory: 5.0 GiB available / 7.6 GiB
```

### Worker (`167.233.39.146`)

- Running since `2026-07-12T08:33:45Z`, `restart_count=0`
- No log activity required during window — consumer healthy

### Cloudflare request logs

**Not available** — Cloudflare Analytics API credentials not in scope for this investigation. Production canary traffic was ~1%; no user-reported incidents.

### Monitoring host (MacBook dev environment)

| Signal | Value |
|--------|-------|
| Failed probe latency | **2ms** (not server timeout) |
| Error string | `fetch failed` (Node undici — connection not established) |
| Same-cycle recovery | `/api/healthz/env` 200 in 1159ms |
| Monitor process wall time | 4,981,778ms (~83 min) for 19 checks |
| Expected checks at 60s interval | ~83; actual **19** → **64-min gap** |

**Conclusion:** Monitor ran on a **non-production, suspend-capable host**. Gap aligns with **host sleep/network resume**, not Coolify outage.

---

## Layer classification

| Layer | Failed? | Evidence |
|-------|---------|----------|
| Application | **No** | Logs clean; healthz/env/audio OK same interval |
| Traefik | **No** | Proxy healthy; HTTPS 200 |
| Docker | **No** | No restart/OOM events |
| Coolify platform | **No** | Routine health execs passing |
| Kernel (Hetzner) | **No** | No journal/dmesg alerts |
| Network (Hetzner) | **No** | Server-side probes OK |
| DNS | **No** | Subsequent probes resolved same hostname |
| TLS | **No** | ssl_verify=0; cert valid |
| Cloudflare | **No** | Not in probe path for direct Coolify checks |
| Hetzner | **No** | Host healthy, low load |
| **Monitoring script** | **Yes** | Single-probe gate; no retry; no gap detection |
| **False positive** | **Yes** | Infra healthy; client fetch blip only |

**Exactly one root cause:** **Monitoring script false positive** — triggered by transient client-side `fetch failed` on the monitor host after a ~64-minute probe gap, not by Coolify service failure.

---

## Application vs probe failure

| System | Status during incident |
|--------|------------------------|
| Coolify app uptime | **Continuous** (2h+) |
| Worker uptime | **Continuous** (2h+, 0 restarts) |
| BullMQ | `redisPing: true`, wait=0, active=0 |
| Redis | OK on both API planes |
| PostgreSQL | Session secret OK; no reconnect signals |
| System load (Coolify) | 0.60 — normal |
| CPU / memory (worker) | 0.03% CPU, 1.84% mem |
| User-visible impact | **None observed** |

**Verdict:** **Only the monitoring probe failed** — not the application or infrastructure.

---

## Contributing factors

1. **Monitor host sleep** — 64-minute gap between intervals #17 and #18
2. **Single-probe degradation gate** — `isDegraded()` returns immediately on `!coolify.health.ok` without retry or composite check
3. **No gap detection** — soak timer did not invalidate after monitor discontinuity
4. **Laptop-based watch loop** — not an always-on, production-grade probe location
5. **Traefik access logging disabled** — limits post-hoc request correlation (not causal)

---

## Fix (recommended — not deployed per engineering freeze)

### Monitor hardening (`canary-monitor.ts` / `probes.ts`)

| Change | Purpose |
|--------|---------|
| **3 retries** with 2s backoff on `/health` before marking failed | Absorb transient client blips |
| **3 consecutive failed intervals** before degradation | Prevent single-sample rollback |
| **Composite health gate** — require `/api/healthz` AND `/health` failure | Same-cycle contradiction would have passed |
| **Monitor gap detector** — if `now - last_check > 120s`, reset soak and alert | Prevent sleep-corrupted soaks |
| **Run monitor on Hetzner/Coolify/Render cron** — not dev laptop | Eliminate sleep-induced gaps |
| **Log full `error` string** in `dashboard-latest.json` | Faster RCA |
| **Secondary probe region** (optional) | Cross-validate from Coolify host localhost |

### Infrastructure repair

**None required.** Coolify stack is healthy.

---

## Preventive actions

1. **Never run canary soak monitors on suspend-capable workstations**
2. Deploy always-on monitor (Hetzner cron or Render worker job) before next canary attempt
3. Implement retry + consecutive-failure policy before next canary
4. Enable Traefik access logging for future RCA (ops task, not routing change)
5. Keep rollback-on-degradation policy — it worked correctly given the signal received

---

## Controlled soak (Step 6)

**Status:** **IN PROGRESS**

```bash
audit/render-to-coolify/sre-soak-probe.sh   # 30s interval, 60 minutes
```

Output:
- `audit/render-to-coolify/sre-soak-probe.jsonl` (raw probes)
- `audit/render-to-coolify/sre-soak-summary.json` (on completion)
- `audit/render-to-coolify/sre-soak-run.log`

Probes: `/health`, `/api/healthz`, TLS verify. Canary remains **0%**.

*Update this document with soak summary when complete.*

---

## Error summary

| Error | Count | Severity | Real impact |
|-------|------:|----------|-------------|
| `fetch failed` on `/health` | 1 | Monitor only | None |
| HTTP 5xx | 0 | — | None |
| Container restart | 0 | — | None |
| Scheduler drift | 0 | — | None |
| BullMQ failure | 0 | — | None |

---

## Confidence level

| Finding | Confidence |
|---------|------------|
| Coolify did not fail | **95%** |
| Probe failure was client-side | **92%** |
| Monitor gap caused by host suspend | **85%** |
| Rollback was policy-correct but unnecessary | **90%** |

Lower confidence items: exact sleep mechanism on monitor Mac (no `pmset` log captured); Cloudflare edge behavior not examined.

---

## Retry recommendation

### **NOT READY** to re-enable 1% canary (yet)

| Prerequisite | Status |
|--------------|--------|
| Root cause understood | **Done** |
| Coolify infra healthy | **Confirmed** |
| 60-minute controlled soak | **In progress** |
| Monitor hardening implemented | **Not done** (engineering freeze) |
| Always-on monitor host | **Not done** |
| Engineering sign-off on monitor fixes | **Pending** |

### Path to **READY TO RETRY 1%**

1. Complete 60-min soak with **100% pass rate** (or document any real failures)
2. After engineering freeze lifts: implement monitor retries + consecutive-failure gate + gap detection
3. Run monitor from **Hetzner** (not laptop) for full 30-min stage soak
4. Re-attempt `CANARY_PERCENT=1` with hardened monitor only

**Do not re-enable canary automatically.**

---

## Artifacts

| File | Description |
|------|-------------|
| `sre-failure-interval.json` | Failed interval probe reconstruction |
| `sre-soak-probe.jsonl` | Controlled 60-min soak (live) |
| `canary-stage-1-final.md` | Stage 1 report |
| `canary-rollback-report.md` | Rollback execution record |
| `scripts/audit/render-to-coolify/canary-state.json` | Full interval history |
| `scripts/audit/render-to-coolify/dashboard-latest.json` | Post-failure healthy snapshot |

---

*SRE investigation — no canary re-enable, no Cloudflare changes, no production deploys.*
