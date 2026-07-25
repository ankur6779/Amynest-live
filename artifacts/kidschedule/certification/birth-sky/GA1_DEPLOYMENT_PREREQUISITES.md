# Birth Sky GA1_DEPLOYMENT_PREREQUISITES

**GA1 Build:** birth_sky_ga1_readiness/1.0.0  
**Ops verify:** birth_sky_ops_verify/1.0.0  
**Statuses:** READY | NOT_READY | BLOCKED | UNKNOWN  
**Production:** Coolify + Hetzner + Cloudflare  
**Do not deploy. Do not invent secret values.**

| ID | Item | Status | Required for allowlist | Evidence |
| --- | --- | --- | --- | --- |
| P-PKG | RC3 certification package present | READY | yes | All RC3 authority files present |
| P-ENG | Engineering GO (RC3) | READY | yes | GO_NO_GO.md |
| P-DB | DATABASE_URL configured on deploy target | READY | yes | Coolify app container printenv; host=tcl9udyxcuq2zu598ebj0pfu; db=postgres; Postgres select 1 PASS |
| P-KEY | BIRTH_SKY_FIELD_ENCRYPTION_KEY configured on Coolify | READY | yes | Coolify API printenv SET; resolveOk=true; source_class=base64; len_class=GE32 (value not recorded). App reads process.env.BIRTH_SKY_FIELD_ENCRYPTION_KEY in birth-field-crypto.ts. |
| P-SESSION | SESSION_SECRET configured on Coolify | READY | yes | Coolify app container printenv SET; length class GE32; healthz/env phonicsSessionReady=true |
| P-FIREBASE | Firebase configuration (Coolify API + Cloudflare web) | READY | yes | API FIREBASE_SERVICE_ACCOUNT_JSON=SET. Web VITE_FIREBASE_* not required for Birth Sky (firebase-web-defaults.ts). Cloudflare VITE probe=NOT SET (informational only). |
| P-RC | RevenueCat configuration (existing premium; no new SKU) | READY | yes | Coolify: REVENUECAT_V2_SECRET_KEY + REVENUECAT_WEBHOOK_SECRET + REVENUECAT_PROJECT_ID all SET |
| P-OPENAI | OpenAI configuration | READY | yes | Coolify OPENAI_API_KEY SET; healthz/env openai.configured=true |
| P-FLAGS | Feature flag defaults (master off) | READY | yes | RELEASE_CHECKLIST + CANARY_PLAN + feature-flags default off |
| P-MIG-ORDER | Migration ordering documented | READY | yes | DEPLOYMENT_PREREQUISITES.md Migration order § |
| P-PART9 | Part 9 human sign-off | READY | yes | WAIVER_REGISTER.md — Release Manager final signature SIGNED (Ankur Raman, 2026-07-25) |
| P-KILL | Kill switch procedure documented + engineering verified | READY | yes | ROLLBACK_RUNBOOK + ROLLBACK_CHECKLIST + RC2 Playwright/unit |
| P-SCHEMA | Birth Sky schema on Coolify Postgres | READY | yes | All 6 Birth Sky tables PRESENT; public_table_count=143; applied via additive SQL after unsafe drizzle push preview rejected |

See ENV_VERIFICATION.md and INFRASTRUCTURE.md.
