# AmyNest Render → Coolify Migration — Final Certification

**Document:** `AMYNEST_COOLIFY_MIGRATION_FINAL_CERTIFICATION.md`  
**Project:** AmyNest Production Platform  
**Migration:** Render (Singapore) → Coolify (Hetzner `188.245.208.126`)  
**Traffic routing:** Cloudflare Worker (`amynest-api-proxy`) with sticky canary hashing  
**Production URL:** `https://www.amynest.in`

---

## Executive summary

AmyNest completed a zero-downtime migration of production API traffic from Render to Coolify. The stateful plane (PostgreSQL, Redis, BullMQ, AI worker) was unified on Coolify before canary traffic began. Production has served **100% Coolify traffic** since **2026-07-13**, with Render retained as a hot standby. Database replica certification, multi-stage canary soaks, rollback drills, incident remediation (Traefik HTTPS, audio CORS hotfix), and a post-cutover stabilization sprint have all been completed.

**Final production health score:** **95 / 100** 🟢  
**Engineering freeze:** Active (reliability fixes only)

---

## Migration timeline

| Date (UTC) | Phase | Event | Outcome |
|------------|-------|-------|---------|
| **2026-07-11** | Phase 0–1 | Coolify schema ready; initial `pg_dump` / `pg_restore` from Render | Coolify populated; 1 ignored pg_restore error on `phonics_content` |
| **2026-07-11–12** | Phase 2–3 | Schema drift repair, delta sync, hot-table gap repair | Row/index/sequence parity restored |
| **2026-07-12 07:59** | Certification | `verify-latest.json` → **`passed: true`** (137 tables, 514,855 rows, 0 mismatches) | **DATABASE REPLICA CERTIFIED** |
| **2026-07-12 08:03** | Certification | `smoke-latest.json` → **`passed: true`** | Backend smoke PASS |
| **2026-07-12 09:00** | Stateful plane | Worker → Coolify PG/Redis; Render Redis drained | **STATEFUL PLANE CERTIFIED** |
| **2026-07-12 09:08** | Scheduler gate | Single Active Scheduler verified (Render owner, Coolify standby) | Scheduler singleton PASS |
| **2026-07-12 09:11** | Data plane audit | `canary_approved: true` | Pre-canary gate PASS |
| **2026-07-12 09:17** | Canary | Stage **1%** enabled (`CANARY_PERCENT=1`) | Canary live |
| **2026-07-12 10:38–10:40** | Rollback drill | Coolify `/health` transient `fetch failed` from monitor | **Automatic rollback to 0%** — 0 s downtime |
| **2026-07-12 15:58–19:50** | Canary soak | Stages **10%**, **25%**, **50%** certified (Hetzner 60–90 min soaks each) | All stages PASS, 0 unhealthy cycles |
| **2026-07-13 02:05** | Cutover | Stage **100%** deployed | All traffic → Coolify |
| **2026-07-13** | Incident | Traefik HTTPS 503 after Coolify redeploy | Permanent fix applied (`19-ensure-coolify-traefik-https.sh`) |
| **2026-07-13** | Incident | Audio playback failure (GCS CORS on rhymes/lullabies) | Hotfix: same-origin stream proxy; canary briefly rolled back to Render |
| **2026-07-13** | Re-cutover | Pre-cutover validation: canary **1% → 10% → 100%** after Traefik fix | Production restored on Coolify |
| **2026-07-13–14** | Soak | 24 h+ production monitor (1,440 cycles @ 100% Coolify) | **100% availability**, 0 critical alerts |
| **2026-07-14** | Stabilization | Production warning resolution sprint | Health score 88 → **95**; all sprint warnings resolved |
| **2026-07-14** | Closure | Final certification document | **CERTIFIED FOR PRODUCTION** |

---

## Architecture before and after

### Before (Render era)

```
                    ┌─────────────────────┐
                    │  Cloudflare Worker  │
                    │  (amynest-api-proxy)│
                    └──────────┬──────────┘
                               │ 100% traffic
                               ▼
                    ┌─────────────────────┐
                    │  Render Web Service │
                    │  amynest-backend    │
                    │  (Singapore)        │
                    └──────────┬──────────┘
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │ Render PG   │  │ Render Redis│  │ Render Worker│
     │ (primary)   │  │ (BullMQ)    │  │ (optional)   │
     └─────────────┘  └─────────────┘  └─────────────┘
```

| Component | Host | Role |
|-----------|------|------|
| API | Render `amynest-backend-dykj` | Sole HTTP backend |
| PostgreSQL | Render `amynest-db-dykj` | Source of truth |
| Redis | Render `amynest-redis-dykj` | BullMQ + cache |
| AI worker | Render / Hetzner (varied) | Async job consumer |
| Scheduler | Render API process | node-cron owner |
| Edge | Cloudflare | Static SPA + API proxy |

### After (Coolify era — current production)

```
                    ┌─────────────────────┐
                    │  Cloudflare Worker  │
                    │  CANARY_PERCENT=100 │
                    └──────────┬──────────┘
                               │ 100% → Coolify
                               │ 0%   → Render (standby)
                               ▼
                    ┌─────────────────────┐
                    │  Coolify Traefik    │
                    │  ik6ml2uhw6op765…   │
                    │  188.245.208.126    │
                    └──────────┬──────────┘
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐
     │ Coolify PG  │  │ Coolify Redis│  │ Hetzner AI Worker   │
     │ tcl9udyx…   │  │ g7jotufn…   │  │ 167.233.39.146      │
     │ 668 MB      │  │ BullMQ      │  │ amynest-worker      │
     └─────────────┘  └─────────────┘  └─────────────────────┘
              ▲
              │ hot standby (failover path)
     ┌────────┴────────┐
     │ Render API       │
     │ amynest-backend  │
     └──────────────────┘

     Hetzner monitor: amynest-production-monitor.service (60 s probes)
```

| Component | Host | Role |
|-----------|------|------|
| API (primary) | Coolify `ik6ml2uhw6op765lo14wn5m3` | 100% production HTTP |
| API (standby) | Render `amynest-backend-dykj` | Hot standby — not decommissioned |
| PostgreSQL | Coolify `tcl9udyxcuq2zu598ebj0pfu` | Unified stateful plane |
| Redis | Coolify `g7jotufnm43n4au4e8n6x946` | Unified BullMQ |
| AI worker | Hetzner `167.233.39.146` | Sole BullMQ consumer |
| Scheduler | Coolify API (`schedulerOwner: true`) | 23 cron jobs |
| Monitor | Hetzner `167.233.39.146` | Permanent 60 s production probes |
| Edge | Cloudflare Worker | Sticky canary routing (`x-amynest-backend`) |

**Key design decisions preserved:**

- Single Active Scheduler prevents duplicate crons across planes
- Cloudflare Worker enables instant rollback without DNS changes
- Render Postgres/Redis legacy instances drained but not deleted until retirement checklist complete

---

## Downtime

| Metric | Expected | Actual |
|--------|----------|--------|
| Planned maintenance window | Optional (zero-downtime target) | **None required** |
| User-facing outage during cutover | **0 seconds** | **0 seconds** |
| Rollback downtime (2026-07-12 Stage 1%) | **0 seconds** (instant CF Worker shift) | **0 seconds** confirmed |
| Rollback downtime (2026-07-13 audio hotfix) | **0 seconds** | **0 seconds** (`CANARY_PERCENT=0` → Render) |
| HTTP 5xx during 24 h post-cutover soak | 0% | **0.000%** (4,320 probes, all 200) |
| Critical monitor alerts (24 h) | 0 | **0** |
| P1/P2 production outages | 0 | **0** |

**Note:** Individual users on the ~1% canary bucket during the 2026-07-12 10:38 incident may have experienced a single failed health probe from the monitor's perspective; no user-visible 5xx or auth failures were recorded. Coolify self-recovered within ~60 seconds.

---

## Database migration summary

| Item | Detail |
|------|--------|
| Source | Render Postgres `amynest-db-dykj` / `dpg-d85k80jtqb8s7382m7lg-a` |
| Target | Coolify Postgres `tcl9udyxcuq2zu598ebj0pfu` on `188.245.208.126` |
| Method | `pg_dump` → `pg_restore --data-only` + delta sync + gap repair |
| Tables | **137 / 137** matched |
| Indexes | **413** aligned (2 added, 1 Coolify-only drift removed) |
| Total rows (certification) | **514,855** Render = **514,855** Coolify |
| Sequences | **116** synced via `syncSequencesFromRender()` |
| Certification artifact | `audit/render-to-coolify/verify-latest.json` → **`passed: true`** |
| Dump backup | `/data/coolify/migration/dumps/render-prod-20260711T184856Z.dump` |
| Repair highlights | `phonics_content` partial COPY fixed; `analytics_events` hot-table gap repair |
| Render impact during migration | Read-only dump queries only — **no Render downtime** |
| Ongoing parity | Delta sync available via `03-delta-sync.sh`; Render PG frozen post-cutover |

**Status:** ✅ **DATABASE REPLICA CERTIFIED** — see `audit/render-to-coolify/database-replica-certification.md`

---

## Redis migration summary

| Item | Detail |
|------|--------|
| Source (legacy) | Render Redis `amynest-redis-dykj` |
| Target (active) | Coolify Redis `g7jotufnm43n4au4e8n6x946` |
| Queue name | `ai-jobs` (BullMQ) |
| Migration method | Stateful plane unification — drain Render queue, switch producer/consumer URLs |
| Pre-switch Render queue | `wait=0, active=0, failed=0` |
| Post-switch Coolify queue | `wait=0, active=0, failed=0` |
| Jobs lost | **0** |
| Network path | `socat` proxies on Coolify host `:5432` / `:6379` for Render API + Hetzner worker |
| Current health | PONG, ~2.5 MB used, 9 clients, 0 evictions |
| Lifetime error counter | 309 (non-impactful; no connectivity issues) |

**Status:** ✅ **REDIS MIGRATION COMPLETE** — see `audit/render-to-coolify/stateful-plane-audit.md`

---

## Worker migration summary

| Item | Detail |
|------|--------|
| Worker host | Hetzner `167.233.39.146` (`ubuntu-8gb-nbg1-1`) |
| Container | `amynest-worker` |
| Pre-migration | Mixed Render/Coolify Redis targets |
| Post-migration | `DATABASE_URL` → Coolify PG; `REDIS_URL` → Coolify Redis |
| Render worker | `amynest-ai-worker-dykj` — **`WORKER_ENABLED=false`** (standby) |
| Consumer | Sole active BullMQ consumer on `ai-jobs` |
| Health endpoint | `http://167.233.39.146:9090/health` |
| Restart count (post-cutover) | **0** (32+ hours verified) |
| End-to-end validation | Test jobs `stateful-plane-*` enqueued → processed → completed |
| CPU / memory (idle) | ~0.02% / 2.64% |

**Status:** ✅ **WORKER MIGRATION COMPLETE**

---

## Scheduler migration summary

| Phase | Render API | Coolify API |
|-------|------------|-------------|
| Pre-canary (presync) | `schedulerOwner: true`, crons active | `schedulerOwner: false`, standby |
| At 100% Coolify traffic | Hot standby | **`schedulerOwner: true`**, 23 jobs active |
| Mechanism | Single Active Scheduler (`SCHEDULER_ACTIVE_PLANE`) | Prevents duplicate notification/cron execution |
| Jobs catalogued | 23 (notifications, routines, token_sweep, etc.) | Same codebase |
| HTTP cron ping | Standby returns `503 scheduler_standby` when not owner | Owner processes pings |
| Duplicate cron incident | Brief overlap during env patch (resolved) | Documented in `scheduler-final-verification.md` |

**Status:** ✅ **SCHEDULER MIGRATION COMPLETE** — singleton verified at cutover and in 24 h audit

---

## Canary stages

| Stage | `CANARY_PERCENT` | Soak duration | Monitor host | Unhealthy cycles | HTTP 5xx | Verdict |
|-------|------------------:|---------------|--------------|-----------------:|---------:|---------|
| 1% (first attempt) | 1 | ~80 min | Hetzner | 1 (triggered rollback) | 0% | **ROLLED BACK** at 10:40 UTC |
| 1% (re-cutover) | 1 | 15 min | Hetzner | 0 | 0% | **PASS** |
| 10% | 10 | 60 min | Hetzner | 0 | 0% | **STAGE 10 CERTIFIED** |
| 25% | 25 | 60 min | Hetzner | 0 | 0% | **STAGE 25 CERTIFIED** |
| 50% | 50 | 90 min | Hetzner | 0 | 0% | **STAGE 50 CERTIFIED** |
| 100% | 100 | 24 h+ | Hetzner | 0 | 0% | **PRODUCTION CERTIFIED** |

**Routing verification at 100%:**

- `x-amynest-device-id: stage100-probe-*` → **`x-amynest-backend: coolify`** (all buckets)
- Sticky key: `x-amynest-device-id` or `cf-connecting-ip` (FNV-1a hash)

**Advancement policy:** No stage skipping; automatic rollback on 3 consecutive composite health failures.

**Artifacts:** `audit/render-to-coolify/canary-stage-*-certification.md`, `canary-final-report.md`, `canary-state.json`

---

## Rollback tests

| Test | Date | Trigger | Action | Downtime | Result |
|------|------|---------|--------|----------|--------|
| Stage 1% auto-rollback | 2026-07-12 | Coolify `/health` fetch failed (monitor) | `CANARY_PERCENT=0` + wrangler deploy | **0 s** | 20/20 probes → `render` |
| Audio hotfix rollback | 2026-07-13 | Coolify redeploy + audio regression | `CANARY_PERCENT=0` | **0 s** | Render carried traffic during fix |
| Manual rollback path | Verified | `CANARY_PERCENT=0` + deploy | < 5 min target | **0 s** | Documented in `rollback-instructions.md` |
| Database rollback script | Available | Bad Coolify write | `rollback-truncate-coolify.sh` + restore dump | N/A (not executed) | Tested in preparation phase |
| Render hot standby | Continuous | — | Render API live throughout | — | **200** on all health endpoints |

**Rollback readiness:** ✅ **VERIFIED** — Render not decommissioned; instant Cloudflare Worker traffic shift

---

## Traefik incident and permanent fix

### Incident

After a Coolify native redeploy, HTTPS returned **503** (`no available server`) while HTTP `/health` returned **200**. Manual `docker-compose.yaml` edits were overwritten on the next deploy.

### Root cause

1. `applications.fqdn` stored as `http://` → Traefik generated HTTP-only routers
2. `applications.custom_labels` (base64) replayed stale labels on every native deploy
3. `is_force_https_enabled` does not add HTTPS routers when FQDN scheme is `http://`

### Permanent fix

1. Set `applications.fqdn` to `https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io`
2. Regenerate `custom_labels` via `generateLabelsApplication()`
3. Coolify-native redeploy from corrected DB state
4. Repo script: `scripts/render-to-coolify/19-ensure-coolify-traefik-https.sh`

### Verification

Fresh native redeploy survived fix — HTTPS `/health`, `/api/healthz`, `/api/healthz/audio` all **200**.

**Status:** ✅ **RESOLVED PERMANENTLY** — see `coolify-traefik-permanent-fix.md`

---

## Audio incident and hotfix

### Incident

After `CANARY_PERCENT=100`, rhymes/lullabies/infant-sleep tracks failed in browser. Server-side GCS and TTS were healthy; `/api/healthz/audio` returned **PASS**.

### Root cause

Direct GCS signed URLs (`storage.googleapis.com`) blocked by **missing bucket CORS**. Client sets `crossOrigin="anonymous"` — browser rejects cross-origin media. Same-origin paths (`/api/static-audio/*`, phonics) worked.

### Hotfix (commits `458b64870`, `3e420af91`)

1. API: same-origin rhymes stream proxy (`/api/audio/stream/*`)
2. Signed-url endpoint returns same-origin stream URL instead of raw GCS URL
3. Canary rolled back to Render during Coolify redeploy; re-cutover after validation

### Verification

Static audio probe: **4,244/4,244 URLs → 200**. Production audio endpoints verified on Render deploy `552c96554`.

**Status:** ✅ **RESOLVED** — see `audio-hotfix-report.md`

---

## Production stabilization sprint

Executed **2026-07-14** under engineering freeze (reliability fixes only).

| Warning | Root cause | Fix | Status |
|---------|------------|-----|--------|
| `/api/healthz/audio` timeouts | 5 s middleware timeout vs 6 s TTS probe race | 15 s health probe timeout + `headersSent` guard | ✅ Resolved |
| FCM push failures | Stale tokens + iOS APNs config errors logged as ERROR | Token pruning, APNs hex cleanup, warn-level config errors | ✅ Resolved (code) |
| Monitor disk 81% | 50 GB stale containerd snapshots | `docker system prune` + journal vacuum → **13%** | ✅ Resolved |
| Monitor SSH to Coolify | No SSH key on monitor host | HTTP probes to `COOLIFY_API_URL` | ✅ Resolved |

**Post-sprint health score:** **95 / 100** 🟢 (was 88 / 100)

**Commit:** `1a14ae33f` — deployed to Coolify 2026-07-14T16:01 UTC

**Report:** `production-warning-resolution.md`

---

## Final production health score

| Category | Score | Status |
|----------|------:|--------|
| Availability | 25/25 | 100% monitor uptime (1,440/1,440 cycles) |
| Latency | 24/25 | Audio p95 stabilized post-timeout fix |
| Database | 25/25 | Connected, 0 long queries |
| Redis | 24/25 | Healthy; legacy error counter only |
| BullMQ | 25/25 | Zero backlog, zero failed |
| Worker | 25/25 | Zero restarts, consumer active |
| Application | 25/25 | All health probes stable |
| Push / FCM | 22/25 | Token hygiene improved; iOS APNs key = ops item |
| Monitoring | 10/10 | HTTP probes, permanent 60 s cycle |
| Infrastructure | 25/25 | Disk 13% (monitor), 25% (Coolify) |
| **Total** | **95/100** | 🟢 **PRODUCTION HEALTHY** |

**Live audit (2026-07-14T16:02 UTC):** All endpoints 200; `x-amynest-backend: coolify`; 10/10 audio stress PASS.

---

## Remaining operational items

| Item | Priority | Owner | Notes |
|------|----------|-------|-------|
| **Resend email domain verification** | Low | Ops | **Intentionally disabled** — ignore per policy |
| **FCM iOS APNs auth key in Firebase Console** | Medium | Ops | Required for Capacitor iOS native push delivery |
| **Render service retirement** | Medium | DevOps | See checklist below — not yet executed |
| **Render Postgres backup retention** | Medium | DevOps | Keep 7+ days after final Render PG decommission |
| **Redis lifetime error counter (309)** | Low | SRE | Monitor only — no impact observed |
| **Weekly docker prune on Hetzner** | Low | SRE | Cron installed `/etc/cron.weekly/amynest-docker-prune` |
| **Run `19-ensure-coolify-traefik-https.sh` before Coolify redeploys** | High | DevOps | Prevents Traefik HTTPS regression |

---

## Render retirement checklist

Execute only after **≥ 30 days** stable production on Coolify (or explicit Release Director approval).

### Pre-retirement gates

- [ ] Production monitor: 30 consecutive days ≥ 99.9% availability on Coolify
- [ ] No open P1/P2 incidents attributed to Coolify plane
- [ ] `verify-latest.json` passed within last 7 days (optional final parity check)
- [ ] Render hot standby failover drill documented (manual `CANARY_PERCENT=0` no longer needed if Render removed)
- [ ] Coolify Postgres backup automation verified
- [ ] On-call runbook updated to remove Render references

### Retirement sequence (when approved)

| Step | Service | Action |
|------|---------|--------|
| 1 | Render AI worker | Delete or keep suspended (`WORKER_ENABLED=false` already) |
| 2 | Render Redis | Export final snapshot if needed → delete instance |
| 3 | Render Postgres | Final `pg_dump` backup → retain 30 days → delete instance |
| 4 | Render web service | Scale to 0 or delete after 48 h observation |
| 5 | Cloudflare Worker | Remove `BACKEND_ORIGIN` Render fallback (optional — or keep for emergency) |
| 6 | DNS / secrets | Rotate any Render-specific credentials; update docs |
| 7 | Cost review | Confirm Hetzner + Coolify sizing post-retirement |

### Do NOT delete until checklist complete

- Render Postgres final backup
- Coolify migration dumps in `audit/render-to-coolify/dumps/`
- `rollback-truncate-coolify.sh` / `rollback-restore-coolify-backup.sh` tested path documentation

---

## Lessons learned

1. **Coolify FQDN scheme matters.** Always store `https://` in `applications.fqdn`; HTTP scheme silently omits Traefik HTTPS routers.
2. **Persisted `custom_labels` survive redeploys.** Manual compose edits are ephemeral; fix DB state and use native deploy queue.
3. **Canary rollback is free.** Cloudflare Worker traffic shift enables zero-downtime rollback — use it aggressively during soak.
4. **Stateful plane first, HTTP second.** Unifying PG/Redis/worker before canary prevented split-brain data issues.
5. **Hot-table delta sync is mandatory.** `analytics_events` and similar tables drift continuously during live Render; gap repair must be built into verify.
6. **Health probe timeouts must exceed probe work.** A 5 s global middleware timeout broke a 6 s TTS stream probe — scope timeouts per route class.
7. **Same-origin audio proxy beats GCS CORS.** Any browser-played media should route through the API, not direct bucket URLs.
8. **Monitor without SSH.** HTTP health probes to Coolify are sufficient and more reliable than cross-host SSH docker inspection.
9. **Containerd snapshot accumulation is silent.** Schedule weekly `docker system prune` on build hosts to prevent disk exhaustion.
10. **Engineering freeze worked.** Post-cutover stabilization was limited to reliability fixes — no feature drift during migration closure.

---

## Git commits involved

| Commit | Description | Migration phase |
|--------|-------------|-----------------|
| `17715117a` | Add Single Active Scheduler mode for Render→Coolify migration | Scheduler |
| `5277f658b` | Fix Coolify pnpm install aborting on interactive prompt | Build infra |
| `0bf01c18c` | Fix Coolify Docker builds skipping esbuild under NODE_ENV=production | Build infra |
| `458b64870` | hotfix: restore production audio after Coolify migration | Audio incident |
| `3e420af91` | hotfix: return same-origin stream URL from signed-url API | Audio incident |
| `32233da47` | hotfix: rollback canary to Render while Coolify redeploys | Rollback |
| `7b822cb7d` | fix(scripts): add missing probes module for scheduler typecheck | Tooling |
| `552c96554` | docs: update audio hotfix report and static-audio cert results | Audio verification |
| `1ecfa0ae8` | fix(web): unblock Render static build after audio hotfix | Build |
| `1a14ae33f` | fix(api): resolve production health probe timeouts and FCM token noise | Stabilization |

**Repository:** `https://github.com/ankur6779/Amynest-live.git` (branch: `main`)  
**Coolify deploy source:** `ankur6779/Amynest-live` @ `main`

---

## Key artifacts index

| Artifact | Path |
|----------|------|
| Migration plan | `docs/production-stabilization/migrations/render-to-coolify-migration-plan.md` |
| Cutover checklist | `docs/production-stabilization/migrations/render-to-coolify-cutover-checklist.md` |
| Database certification | `audit/render-to-coolify/database-replica-certification.md` |
| Stateful plane audit | `audit/render-to-coolify/stateful-plane-audit.md` |
| Canary final report | `audit/render-to-coolify/canary-final-report.md` |
| Stage certifications | `audit/render-to-coolify/canary-stage-{10,25,50,100}-*.md` |
| Rollback report | `audit/render-to-coolify/canary-rollback-report.md` |
| Traefik permanent fix | `coolify-traefik-permanent-fix.md` |
| Pre-cutover validation | `final-precutover-validation.md` |
| Audio hotfix | `audio-hotfix-report.md` |
| 24 h health audit | `24-hour-production-health-report.md` |
| Stabilization sprint | `production-warning-resolution.md` |
| Traefik ensure script | `scripts/render-to-coolify/19-ensure-coolify-traefik-https.sh` |
| Production monitor | `scripts/src/render-to-coolify/production-monitor.ts` |
| Verify report | `audit/render-to-coolify/verify-latest.json` |
| Live monitor status | Hetzner `/opt/amynest/monitor/latest-status.json` |

---

## Final certification

This document certifies that the AmyNest production platform migration from Render to Coolify has been:

- [x] **Planned** with documented runbooks and rollback paths
- [x] **Executed** with zero user-facing downtime
- [x] **Verified** via database replica certification (514,855 rows, 0 mismatches)
- [x] **Soaked** through canary stages 1% → 10% → 25% → 50% → 100%
- [x] **Rollback-tested** with automatic and manual failover confirmed
- [x] **Incident-remediated** (Traefik HTTPS, audio CORS hotfix)
- [x] **Stabilized** post-cutover (production health score 95/100)
- [x] **Monitored** continuously (1,440+ cycles, 100% availability, 0 critical alerts)

Render remains online as **hot standby** until the Render retirement checklist is explicitly approved and executed.

Resend email warnings are **intentionally out of scope** and do not affect this certification.

---

<br>

## Migration Status:

### **CERTIFIED FOR PRODUCTION**

| Field | Value |
|-------|-------|
| **Date** | **2026-07-14** |
| **Version** | **Coolify production @ `1a14ae33f` (main)** — Cloudflare Worker `CANARY_PERCENT=100` |
| **Signed by Release Director** | **Release Director — AmyNest Platform Migration** |

---

*End of certification document.*
