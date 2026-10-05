# ROUND 4 — HANDOVER PASS CRITERIA

A row is **PASS** only if the buyer can **operate** from delivered assets. Docs alone = fail.

| Area | Minimum external evidence to convert FAIL → PASS |
|------|--------------------------------------------------|
| Source | GitHub admin on `Amynest-live` **or** transfer accepted + local clone builds |
| Database | Encrypted dump **and** successful restore to a scratch DB (row-count note) |
| Deployment | Coolify (or equivalent) login that can ship API; one successful non-prod deploy **or** witnessed prod rollback |
| Domain | Registrar login or completed transfer; buyer can change nameservers |
| DNS | Cloudflare (or actual DNS host) access; can edit a TXT record |
| Cloud / GCS / Firebase | GCP project Owner/Editor for buyer; can list buckets and Auth users |
| Play | Transfer in progress or complete; **keystore in escrow** with passwords offline |
| Apple | Transfer in progress or complete; buyer can archive in Xcode |
| RevenueCat | Buyer org access; webhook URL they control returns 2xx on a test |
| Razorpay | Buyer merchant **or** completed KYC transfer; test payment or settlement view |
| Analytics | GA4/Firebase access; can open an event report |
| AI / TTS | Buyer keys work on `/api/healthz` paths that need them; founder keys revoked |
| Signing | Keystore + iOS certs in dual-control escrow (not only “we have them”) |
| Backups | Restore log dated; GCS inventory |
| 2FA / recovery | Every critical account: buyer 2FA on, founder recovery email **off** or listed for cutover date |

**Current: REQUIRES OWNER ACTION.** None of the operate-tests above were delivered this gate.
