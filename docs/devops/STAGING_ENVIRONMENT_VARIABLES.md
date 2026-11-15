# Staging environment variables

Names only. Do not put values in git. Every secret below is new. Do not copy the production Coolify env group.

## Staging API

| Name | Required | Rule |
|---|---|---|
| `AMYNEST_ENV` | yes | `staging` |
| `NODE_ENV` | yes | `production` is allowed for Node, and does not make the profile production while `AMYNEST_ENV=staging` |
| `DATABASE_URL` | yes | Host must not be `tcl9udyxcuq2zu598ebj0pfu`, `188.245.208.126`, or `dpg-d85k80jtqb8s7382m7lg-a`. Database name must be `amynest_staging`. |
| `API_PUBLIC_URL` | yes | `https://api-staging.amynest.in` |
| `REDIS_URL` | yes if worker on | Host must not be `g7jotufnm43n4au4e8n6x946` |
| `WORKER_ENABLED` | yes | `false` until the staging Redis check passes |
| `PG_POOL_MAX` | yes | `5` |
| `PG_STATEMENT_TIMEOUT_MS` | yes | `30000` |
| `NOTIFICATIONS_ENABLED` | yes | `false` |
| `BACKGROUND_TASKS_ENABLED` | yes | `false` |
| `SCHEDULER_ACTIVE_PLANE` | yes | leave unset. Do not set `coolify`. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | yes | Staging Firebase project only |
| `SESSION_SECRET` | yes | New value, 32+ characters |
| `REVENUECAT_WEBHOOK_SECRET` | yes | New staging secret |
| `REVENUECAT_API_KEY` | yes | Test Store secret, not the production secret |
| `CORS_ALLOWED_ORIGINS` | no | `https://staging.amynest.in` is already allowed by the `*.amynest.in` CORS rule |
| `INTERNAL_HEALTH_SECRET` | yes | New value for `/healthz/env` |
| `OPENAI_API_KEY` | optional | Separate quota. Omit to keep AI off. |

## Staging web build

| Name | Required | Rule |
|---|---|---|
| `VITE_AMYNEST_ENV` | yes | `staging` |
| `VITE_APP_API_ORIGIN` | yes | `https://api-staging.amynest.in` |
| `VITE_FIREBASE_API_KEY` | yes | Staging Firebase web app |
| `VITE_FIREBASE_AUTH_DOMAIN` | yes | Staging project domain |
| `VITE_FIREBASE_PROJECT_ID` | yes | Not `amynest-836ff` |
| `VITE_FIREBASE_APP_ID` | yes | Staging app |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | yes | Staging app |
| `VITE_REVENUECAT_IOS_API_KEY` | yes for iOS sandbox | Prefix `test_` |

## GitHub Actions secrets for the isolation check

| Name | Used by |
|---|---|
| `STAGING_DATABASE_URL` | `.github/workflows/staging-isolation-check.yml` |
| `STAGING_REDIS_URL` | same |
| `STAGING_API_PUBLIC_URL` | same |
| `STAGING_WORKER_ENABLED` | same, optional |

The workflow prints pass or a reason. It does not print the URL and it does not deploy.

## Forbidden in staging

`DATABASE_URL` and `REDIS_URL` from the production Coolify application, Firebase project `amynest-836ff`, the production RevenueCat webhook secret, and the local database name `amynest_dev`.
