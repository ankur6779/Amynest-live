# Staging deployment checklist

**Status:** `READY FOR HUMAN SETUP`  
Nothing in this checklist has been executed. Production DNS and production deploy workflows stay unchanged.

## DNS and TLS

Add these records in the existing `amynest.in` zone. Do not change `www` or the apex.

| Name | Type | Target |
|---|---|---|
| `staging` | CNAME | Cloudflare Pages project `amynest-web-staging` |
| `api-staging` | CNAME | Coolify staging API hostname for `amynest-api-staging` |

Certificate: Coolify-managed Let's Encrypt on `api-staging.amynest.in`, and Cloudflare proxy certificate on `staging.amynest.in`. No custom certificate was issued in this pass.

## Coolify

- New application `amynest-api-staging`.
- Dockerfile `docker/backend/Dockerfile`, context repository root.
- Port `5000`. Health check `GET /health`.
- New database and Redis services from the setup runbook.
- Domain `api-staging.amynest.in` on the staging application only.
- Production application domains and env are not edited.

## CORS, Firebase, webhooks

- Browser origin `https://staging.amynest.in`. The API already allows `https://*.amynest.in`.
- Firebase authorized domain: `staging.amynest.in` on the new project only.
- RevenueCat sandbox webhook: `https://api-staging.amynest.in/api/subscription/webhook`.
- Do not register that URL on the production RevenueCat app.

## Analytics readiness after the human setup

- Confirm `GET https://api-staging.amynest.in/health` returns `ok: true`.
- Confirm boot fails if `DATABASE_URL` is changed to the production host. Restore the staging URL after that negative test.
- Run **Staging isolation check** and require `STAGING ISOLATION: ok`.
- Insert one synthetic `first_open` and read it only from `amynest_staging`.
- Send RevenueCat sandbox fixtures for trial, paid initial, introductory, renewal, cancellation, refund, duplicate, and out-of-order delivery. Confirm `counts_as_paid` is false for trial, introductory, cancellation, refund, and unknown.
- Device checklist, still unverified: launch, `first_open`, offline queue, ACK, login stitch, game complete, game abandon, background, foreground, no duplicates.

## Rollback

Delete the staging Coolify application, staging database, staging Redis, the two DNS records, and Pages project `amynest-web-staging`. Do not roll back production.

## Manual actions still required

1. Approve VPS capacity or a resize.
2. Create the Coolify database, Redis, and API application.
3. Create the Firebase staging project and RevenueCat Test Store.
4. Add the DNS records.
5. Create the Pages project and set the Vite variables.
6. Store the secret names from `STAGING_ENVIRONMENT_VARIABLES.md`.
7. Run the isolation workflow.
8. Apply migrations except `0052`, then ask for a separate `0052` approval.

## Git commit plan, not executed

Proposed commits, only after approval:

1. Analytics closure: the existing uncommitted analytics files and migration `0052` SQL. Do not include staging files.
2. Staging isolation: `staging-isolation.ts`, boot guard, web staging origin, `staging-isolation-check.yml`, and `docs/devops/STAGING_*.md`.

No commit or push was made. Unrelated dirty files were not found outside that analytics set plus this staging preparation.
