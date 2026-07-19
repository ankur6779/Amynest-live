# Render → Coolify canary deployment

Weighted traffic split via **Cloudflare Worker**. Render stays live at every stage.

## Stages

| Stage | Coolify share | Render share | Advance after |
|-------|--------------:|-------------:|---------------|
| 1 | 1% | 99% | 30 min stable |
| 2 | 10% | 90% | 30 min stable |
| 3 | 25% | 75% | 30 min stable |
| 4 | 50% | 50% | 30 min stable |
| 5 | 100% | 0%* | cutover complete |

\*At 100%, set `CANARY_PERCENT=100` — Render backend **remains running** as hot standby until soak completes.

## Enable canary (start at 1%)

**Prerequisite:** Data plane consistency audit must PASS:

```bash
bash scripts/render-to-coolify/09-data-plane-audit.sh
# → audit/render-to-coolify/data-plane-audit-latest.md
# Canary approved: YES required before set-canary-percent.sh > 0
```

1. Set Coolify URL in `infra/cloudflare/amynest-api-proxy/wrangler.toml`:

```toml
CANARY_BACKEND_ORIGIN = "https://your-coolify-backend.example.com"
CANARY_PERCENT = "1"
```

2. Deploy worker:

```bash
cd infra/cloudflare/amynest-api-proxy
wrangler deploy
```

Or use helper:

```bash
bash scripts/render-to-coolify/set-canary-percent.sh 1
cd infra/cloudflare/amynest-api-proxy && wrangler deploy
```

3. Start monitor + dashboard:

```bash
export RENDER_API_URL='https://amynest-backend-dykj.onrender.com'
export COOLIFY_API_URL='https://...'
export SMOKE_FIREBASE_ID_TOKEN='...'
export RENDER_DATABASE_URL='...'
export COOLIFY_DATABASE_URL='...'

bash scripts/render-to-coolify/07-canary-monitor.sh --watch --advance
```

4. Open dashboard:

```bash
bash scripts/render-to-coolify/08-dashboard-serve.sh
# http://127.0.0.1:8799/dashboard.html
```

## Monitored metrics

| Metric | Source |
|--------|--------|
| HTTP 5xx | Probe error rate per backend |
| Latency | p95 across probes |
| Login success | `GET /api/parent-profile` with Firebase token |
| Subscription API | `GET /api/subscription` |
| AI jobs | `POST /api/audio-warmup/enqueue` |
| RevenueCat webhook | Auth + payload validation |
| Firebase login | 401 detection on Coolify only |
| Routine generation | `POST /api/routines/generate-ai` |
| Speech Coach | `/api/speech/v2/usage` or remote config |
| Database rows | Optional live COUNT from both Postgres URLs |
| Worker / Redis | `SMOKE_WORKER_HEALTH_URL` |

## Automatic rollback instructions

On degradation, monitor writes:

`audit/render-to-coolify/rollback-instructions.md`

Rollback = set `CANARY_PERCENT=0` and `wrangler deploy` (< 5 min). Render never stopped.

## Stage advancement

With `--advance`, after **30 minutes** stable at each stage the monitor:

1. Logs recommended next percent
2. Updates `canary-state.json` stage_index
3. Operator runs `set-canary-percent.sh <next>` + `wrangler deploy`

## Response headers

Proxied API responses include:

`x-amynest-backend: render` or `x-amynest-backend: coolify`

Use for traffic attribution in logs.

## Safe defaults

- `CANARY_PERCENT = "0"` in wrangler.toml — no canary until explicitly enabled
- `CANARY_BACKEND_ORIGIN = ""` — disabled when empty
- Sticky routing by device IP / `x-amynest-device-id` — same user stays on one backend per stage

## Commands

```bash
pnpm run migrate:render-to-coolify:canary-monitor -- --once
pnpm run migrate:render-to-coolify:canary-monitor -- --watch --advance
pnpm run migrate:render-to-coolify:dashboard:serve
```
