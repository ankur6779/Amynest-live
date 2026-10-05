# INCIDENT RESPONSE

**Current alerting (env examples, not a live page this pass):**

| Channel | Status |
|---------|--------|
| `ADMIN_ALERT_EMAIL` | Founder mailbox `ankur6779@gmail.com` |
| Slack incoming webhook | Optional, empty in example |
| Telegram | Optional, not used by digest |
| Health digest cron | Default every 4h Asia/Kolkata if enabled |
| Sentry | Optional DSN |
| `/api/healthz` | Exists; `/api/healthz/env` can be secret-gated |

## Buyer Day-1 actions

1. Change `ADMIN_ALERT_EMAIL` to buyer on-call.
2. Confirm Coolify + Cloudflare + worker still receive pages.
3. Confirm RC webhook 2xx.
4. Confirm Firebase Auth not in lockdown.
5. If ads are still ENABLED, decide whether to pause (current spend dwarfs RC cash).

## Severity examples

| Class | Action |
|-------|--------|
| API down | Coolify logs + `DATABASE_URL` / Redis |
| Paywall broken | RC + store + webhook |
| Child-data leak | Take product offline; legal |
| LLM outage | Degrade Ask Amy / generate; do not silently invent answers |

**On-call runbook depth:** PARTIAL. Founder is the implicit IR team.
