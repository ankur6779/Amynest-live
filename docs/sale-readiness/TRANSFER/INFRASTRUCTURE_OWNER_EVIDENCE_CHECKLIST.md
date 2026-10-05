# INFRASTRUCTURE OWNER EVIDENCE CHECKLIST

**Date:** 25 September 2026  
Do **not** log in via this agent. Do **not** retrieve secret values.  
Owner-confirmed holders are **not** documentary proof.

| Provider | Owner-confirmed holder | Owner must screenshot / export | Field that proves ownership | Field that proves production linkage | Must NOT expose | Status |
|----------|------------------------|--------------------------------|-----------------------------|--------------------------------------|-----------------|--------|
| Coolify | — | Account email + project list | Login email / team role | Service URL matching sslip.io or API origin | `DATABASE_URL`, env values | **UNKNOWN** |
| Hetzner | **AmyWorld** | Legal entity, billing, project, **live server IP**, transfer possibility if shown | Customer/account name = AmyWorld | Server **public IP** of live worker | SSH private key | **OWNER-CONFIRMED / EVIDENCE PENDING** |
| Cloudflare | **Ankur Raman personally** | Account email/ID, zone list — **not** AmyWorld | Account ID / login = Ankur | Zone `amynest.in`; Pages `amynest-web` | API token | **OWNER-CONFIRMED / EVIDENCE PENDING** |
| GCP | Project IAM | Project Owner email | Project `amynest-836ff` | SA JSON | **UNKNOWN** |
| Firebase | Project settings | Same GCP | Apps `com.amynest.app` / web app | Admin JSON | **UNKNOWN** |
| GCS | Bucket details | Same project | Bucket `amynest-audio-storage` | SA JSON | **UNKNOWN** |
| Postgres | Coolify DB or host panel | Hosting account | Hostname **only** (not password) | Full `DATABASE_URL` | **UNKNOWN** host |
| Redis | Host panel | Hosting account | Hostname **only** | Password | **UNKNOWN** host |
| Coolify git deploy | Settings → source | — | GitHub repo URL + method (App / hook / poll) | Webhook secret | **UNKNOWN** |
| Render | Service list or empty | — | Confirm suspended/deleted | `RENDER_API_KEY` | **UNKNOWN** 24 Sep |

**CURRENT PRODUCTION DB HOST = UNKNOWN**
