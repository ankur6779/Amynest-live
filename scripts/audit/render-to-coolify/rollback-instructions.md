# Canary rollback instructions

Generated: 2026-07-12T10:38:52.469Z
Trigger: Coolify /health failed
Current canary: 1%

## Immediate actions (< 5 minutes)

1. **Set canary to 0%** (all traffic back to Render):

```bash
cd infra/cloudflare/amynest-api-proxy
# wrangler.toml → CANARY_PERCENT = "0"
wrangler deploy
```

2. **Verify Render is primary:**

```bash
curl -sS https://amynest-backend-dykj.onrender.com/health
curl -sS https://www.amynest.in/api/healthz
```

3. **Confirm response header** `x-amynest-backend: render` on proxied API calls.

4. **Do NOT stop Render backend or Postgres.**

5. **Investigate Coolify** before re-enabling canary:

```bash
bash scripts/render-to-coolify/06-smoke-test.sh
bash scripts/render-to-coolify/02-verify-replica.sh
```

## Optional: reset canary state

```bash
rm audit/render-to-coolify/canary-state.json
```

Render remains live throughout. No DNS changes required for rollback.
