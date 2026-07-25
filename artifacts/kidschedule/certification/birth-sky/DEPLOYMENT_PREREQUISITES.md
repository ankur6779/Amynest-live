# Birth Sky DEPLOYMENT_PREREQUISITES

**App Build:** birth_sky_rc3/1.0.0  
**Production:** Coolify (Hetzner) + Cloudflare + dedicated AI Worker  
**Do not deploy from this document alone. Do not invent secret values.**

## Configuration contracts

| Variable / contract | Required for | Source | Local | Production (Coolify/CF) | Notes |
| --- | --- | --- | --- | --- | --- |
| DATABASE_URL | canary | .env.development.example | NOT_PROBED | SET | Coolify Postgres on Hetzner (Coolify Postgres (tcl9udyxcuq2zu598ebj0pfu) on Hetzner VPS) |
| BIRTH_SKY_FIELD_ENCRYPTION_KEY | canary | .env.development.example | NOT_PROBED | SET | Preferred 64-hex on Coolify API; SESSION_SECRET derive is fallback — set explicitly |
| SESSION_SECRET | canary | .env.development.example | NOT_PROBED | SET | ≥32 chars on Coolify API; phonics + Birth Sky key derive fallback |
| FIREBASE_PRIVATE_KEY | FIREBASE_SERVICE_ACCOUNT_JSON | canary | Coolify / Cloudflare / Pack 8 Part 4 | NOT_PROBED | SET | Coolify API auth |
| VITE_FIREBASE_API_KEY | ga | .env.development.example | NOT_PROBED | SET | Optional override — firebase-web-defaults.ts ships public web config (not a Birth Sky canary blocker) |
| VITE_FIREBASE_PROJECT_ID | ga | .env.development.example | NOT_PROBED | SET | Optional override — firebase-web-defaults.ts ships public web config (not a Birth Sky canary blocker) |
| OPENAI_API_KEY | AI_INTEGRATIONS_OPENAI_API_KEY | canary | Coolify / Cloudflare / Pack 8 Part 4 | NOT_PROBED | SET | Coolify API + Hetzner AI Worker |
| RevenueCat (existing premium; no new Birth Sky SKU) | canary | Coolify / Cloudflare / Pack 8 Part 4 | NOT_PROBED | SET | REVENUECAT_* on Coolify — existing premium gate |
| VITE_FF_BIRTH_SKY | canary | Coolify / Cloudflare / Pack 8 Part 4 | NOT_PROBED | SET | Master kill; default off when unset (feature-flags.ts) |
| VITE_FF_BIRTH_SKY_HUB_TILE | ga | Coolify / Cloudflare / Pack 8 Part 4 | NOT_PROBED | SET | Follows master |
| VITE_FF_BIRTH_SKY_DEEP_LINKS | ga | Coolify / Cloudflare / Pack 8 Part 4 | NOT_PROBED | SET | Follows master |

## Probe policy

- This certification host does **not** print or invent secret values.
- Production presence is probed on **Coolify (Hetzner)** and **Cloudflare** (see ENV_VERIFICATION.md / INFRASTRUCTURE.md).
- **Render is not production** and must not be used for certification probes.
- Backend: `https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io` · AI Worker: dedicated Hetzner · Static: Cloudflare.
- Before Birth Sky canary: every `canary` row must be **SET** (including `BIRTH_SKY_FIELD_ENCRYPTION_KEY` and web Firebase).

## Mobile shells

| Shell | Prerequisite | Status |
| --- | --- | --- |
| Android WebView (`android/`) | `google-services.json`, WebView UA | Tree present |
| iOS Capacitor | Xcode project / archive | `App.xcodeproj` present; archive not run |

## Migration order

1. Ensure `BIRTH_SKY_FIELD_ENCRYPTION_KEY` (or SESSION_SECRET ≥32) on API.
2. Deploy API with seal/unseal + lazy migrate (backward-compatible reads of plaintext).
3. Deploy web/Capacitor/WebView with offline envelope schema 2.
4. Enable `VITE_FF_BIRTH_SKY` per CANARY_PLAN.md.
