# Birth Sky GA1_BLOCKER_REEVAL

**Ops verify:** birth_sky_ops_verify/1.0.0  
**Infra:** Coolify + Hetzner + Cloudflare  
**Generated:** 2026-07-31T17:06:34.474Z

| ID | Item | Classification | Evidence |
| --- | --- | --- | --- |
| G-PART9 | Part 9 human sign-off | PASS | WAIVER_REGISTER.md — Release Manager final signature SIGNED (Ankur Raman, 2026-07-25); founder-operated |
| G-DB | DATABASE_URL | PASS | Coolify app container printenv; host=tcl9udyxcuq2zu598ebj0pfu; db=postgres; Postgres select 1 PASS |
| G-KEY | BIRTH_SKY_FIELD_ENCRYPTION_KEY | PASS | Coolify API printenv SET; resolveOk=true; source_class=base64; len_class=GE32 (value not recorded). App reads process.env.BIRTH_SKY_FIELD_ENCRYPTION_KEY in birth-field-crypto.ts. |
| G-SESSION | SESSION_SECRET | PASS | Coolify app container printenv SET; length class GE32; healthz/env phonicsSessionReady=true |
| G-FIREBASE | Firebase configuration (Coolify API) | PASS | API FIREBASE_SERVICE_ACCOUNT_JSON=SET. Web VITE_FIREBASE_* not required for Birth Sky (firebase-web-defaults.ts). Cloudflare VITE probe=NOT SET (informational only). |
| G-FIREBASE-WEB | Cloudflare VITE_FIREBASE_* (optional) | PASS | Removed as deployment blocker — firebase-web-defaults.ts provides public web client config when VITE_* unset |
| G-RC | RevenueCat configuration | PASS | Coolify: REVENUECAT_V2_SECRET_KEY + REVENUECAT_WEBHOOK_SECRET + REVENUECAT_PROJECT_ID all SET |
| G-OPENAI | OpenAI configuration | PASS | Coolify OPENAI_API_KEY SET; healthz/env openai.configured=true |
| G-OWNERS | Named operational owners | PASS | OPERATIONAL_OWNERSHIP.md — all roles assigned to Ankur Raman (founder-operated) |
| G-SCHEMA | Birth Sky DB schema on Coolify | PASS | All 6 Birth Sky tables PRESENT; public_table_count=143; applied via additive SQL after unsafe drizzle push preview rejected |
| G-STAGING | Hosted staging for live E2E | UNKNOWN | No dedicated staging stack — NOT AVAILABLE (W-STAGING-LIVE) |

PASS = verified SET/ready. BLOCKED = must clear. UNKNOWN = not hosted / not accessible.
