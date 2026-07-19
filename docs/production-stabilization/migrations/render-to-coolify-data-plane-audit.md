# Data Plane Consistency Audit

Automated gate before enabling canary traffic.

```bash
bash scripts/render-to-coolify/09-data-plane-audit.sh
```

Outputs:

- `audit/render-to-coolify/data-plane-audit-latest.json`
- `audit/render-to-coolify/data-plane-audit-latest.md`

**Exit 0** only when `canary_approved: true`.

`set-canary-percent.sh` runs this automatically for any percent > 0.

## What it checks

| Group | Components |
|-------|------------|
| **database** | Render API, Coolify API, Hetzner worker, row counts |
| **redis** | Render API, Coolify API, Hetzner worker |
| **bullmq** | Queue state on Render vs Coolify Redis |
| **notification_scheduler** | In-process crons on each API |
| **cron_jobs** | Billing, phonics, TTS, recap crons per API |
| **third_party** | Firebase, GCS, OpenAI, Resend, Razorpay, RevenueCat (must be SHARED) |
| **routing** | Cloudflare Worker, RevenueCat/Razorpay webhook URLs |

## Approval rule

Canary is approved only when:

1. Every **stateful** group points at a **single** plane (all Render or all Coolify)
2. Postgres row counts match (replica synced)
3. Coolify public `/healthz` responds

Mixed planes (e.g. Coolify API on Coolify DB while worker on Render Redis) → **NOT_SAFE**.
