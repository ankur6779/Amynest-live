# FINAL INFRASTRUCTURE CLOSURE

**Date:** 24 September 2026  
**Do not perform transfers.** Account titles remain **UNKNOWN** unless noted.

| Provider | Current state | Unknowns | Owner evidence required | Transfer action | Vendor action | Buyer action | Acceptance test |
|----------|---------------|----------|-------------------------|-----------------|---------------|--------------|-----------------|
| GitHub | Public `ankur6779/Amynest-live`; sole collaborator `ankur6779`; `main` unprotected | — | Confirm still sole admin | Initiate transfer **later** | GitHub repo transfer | Create org; accept | Buyer Owner; push/workflow |
| Coolify | **INFERRED** API host | Account title; git method | Email + project + source settings | Invite or rebuild | Coolify | New admin / new instance | `/api/healthz` on origin buyer deploys |
| Hetzner | Worker **INFERRED**; holder **OWNER-CONFIRMED AmyWorld** | Documentary: legal entity, billing, active server, live IP, transfer possibility, control (no credentials in git) | Customer name + billing + live IP | Project/server move | Hetzner | Accept project | Worker processes BullMQ job |
| Cloudflare | Pages + Worker **INFERRED**; holder **OWNER-CONFIRMED Ankur personally** | Account identity, zone, transfer eligibility — **not AmyWorld** | Account + zone `amynest.in` + Pages `amynest-web` | Zone/Pages transfer | Cloudflare | Accept | www 200 + `/api/healthz` via Worker |
| GCP | Project `amynest-836ff` **INFERRED** | Owner email | IAM screenshot (no SA JSON) | Project move | Google | Accept | Buyer Owner on project |
| Firebase | Same project **INFERRED** | Same | Project settings + apps | Moves with GCP | Google | Confirm apps | Sign-in + push |
| GCS | Bucket `amynest-audio-storage` name **VERIFIED** | IAM; object list | Bucket + prefix list | IAM or copy | Google | New SA | `healthz/audio` |
| Render | Historic; suspended 20 Jul 2026 | Whether key still live | Confirm unused | None if unused | — | Ignore | Direct Render URL still unused; then revoke key |
| Redis | Required for worker | **Host** | Hostname only | New URL or host move | Host vendor | New Redis | Job dequeued |
| Postgres | Required | **Host** | Hostname only | Dump + restore | Host vendor | Scratch then prod | R/W smoke |
| RevenueCat | Project IDs documented | Org title | Org/collaborator screenshot | Invite | RevenueCat | Accept | Buyer edits offering; webhook 2xx |

**Blockers:** SB-F01, F02, F03, F04, F05, B01, G01, G03, K01, L01.
