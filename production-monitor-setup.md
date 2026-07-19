# AmyNest Production Monitor Setup

**Deployed:** 2026-07-13  
**Host:** Hetzner `167.233.39.146` (`ubuntu-8gb-nbg1-1`)  
**Production plane:** Coolify (100%) — Render Hot Standby  
**Engineering Freeze:** ACTIVE

---

## Service

| Property | Value |
|----------|-------|
| **Service name** | `amynest-production-monitor.service` |
| **Status** | `active (running)` |
| **Enabled on boot** | `enabled` |
| **Restart policy** | `Restart=always`, `RestartSec=10` |
| **Interval** | 60 seconds |
| **Working directory** | `/opt/amynest/monitor` |
| **Environment** | `/opt/amynest/monitor.env` (mode 600) |

### Commands

```bash
systemctl status amynest-production-monitor
journalctl -u amynest-production-monitor -f
systemctl restart amynest-production-monitor
```

---

## Logs

| Type | Location |
|------|----------|
| **Runtime logs** | `journalctl -u amynest-production-monitor` (journald) |
| **Probe cycle log** | `/opt/amynest/monitor/cycles.jsonl` |
| **Daily history** | `/opt/amynest/monitor/history/YYYY-MM-DD.jsonl` |
| **Checkpoint (crash recovery)** | `/opt/amynest/monitor/checkpoint.json` |

### Log rotation

`/etc/logrotate.d/amynest-production-monitor` — daily rotation, 30-day retention, compressed.

---

## Reports

| Report | Path | Frequency |
|--------|------|-----------|
| **Live status** | `/opt/amynest/monitor/latest-status.json` | Every 60s |
| **Hourly** | `/opt/amynest/monitor/hourly-report.md` | Every hour |
| **Daily** | `/opt/amynest/monitor/daily-report.md` | Every day |

History retained for **30 days** in `/opt/amynest/monitor/history/`.

---

## Monitored endpoints (every 60s)

### Production (`https://www.amynest.in`)

- `/health`
- `/api/healthz`
- `/api/healthz/audio`

### Infrastructure

- Docker containers (worker, Coolify proxy, Coolify app)
- Traefik (`coolify-proxy`)
- CPU, RAM, disk usage, disk I/O, load average

### Data plane

- PostgreSQL (via `/api/healthz/env`)
- Redis (ping, memory, connected clients)
- BullMQ (wait, active, failed, delayed, completed)
- Worker (heartbeat, restart count, CPU, memory)
- Scheduler singleton owner
- GCS probe (`/api/healthz/audio`)
- AI queue processing state
- Render hot standby `/health`

---

## Critical alert rules

Alerts fire only on sustained failures (single timeouts ignored):

| Rule | Threshold |
|------|-----------|
| Consecutive health failures | ≥ 3 |
| HTTP 5xx rate | > 2% (rolling 100 samples) |
| Worker restart | Restart count increase |
| PostgreSQL | Unavailable |
| Redis | Unavailable |
| BullMQ backlog | > 100 |
| Queue processing stopped | wait > 0, active = 0 |
| Scheduler ownership change | Owner flag changes |
| Container restart | Restart count increase |
| Disk usage | > 90% |
| Memory usage | > 90% |
| CPU | > 95% for 5 consecutive minutes |

Active alerts appear in `latest-status.json` → `alerts[]` and journald (`production_monitor.alert`).

---

## Self-healing

- **Process crash:** systemd restarts automatically (`Restart=always`).
- **Checkpoint:** `checkpoint.json` preserves consecutive-failure counters, scheduler baseline, worker restart baseline, and report timers across restarts.
- **History:** Probe history append-only; not lost on restart.

---

## Deployment

Re-deploy from repo:

```bash
bash scripts/render-to-coolify/20-deploy-production-monitor.sh
```

Source: `scripts/src/render-to-coolify/production-monitor.ts`

---

## Health verification (post-deploy)

```
systemctl is-enabled amynest-production-monitor  → enabled
systemctl is-active amynest-production-monitor   → active
latest-status.json                               → healthy: true, alerts: []
journalctl                                         → production_monitor.cycle events
```

**Verified 2026-07-13:** Cycle 1 healthy, `x-amynest-backend: coolify`, zero critical alerts.

---

## Independence

The monitor runs entirely on Hetzner under systemd. It does **not** depend on:

- Developer laptop
- SSH session
- Cursor / terminal
- screen / tmux

Survives server reboot (`WantedBy=multi-user.target`).
