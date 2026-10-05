# BACKUP / RESTORE AND KEY HANDOVER

**Date:** 24 September 2026  
**No secrets. No live restore drill** (unsafe against production).

| Item | Documented? | Drill? | Status |
|------|-------------|--------|--------|
| Postgres dump/restore | Runbook names only | **NO** | **AWAITING OWNER** |
| GCS / media | — | **NO** | **AWAITING OWNER** |
| Git | GitHub remote | N/A | Exists |
| Env / Coolify secrets | Names in examples | **NO** | **AWAITING OWNER** |
| Android keystore | Founder-only | **NO** | **AWAITING OWNER** — loss is fatal for Play updates |
| iOS certs | Founder-only | **NO** | **AWAITING OWNER** |
| API key rotation | `docs/gcp-credential-rotation.md` exists | **NO** | Procedure PARTIAL |

## Runbook (do not execute in this sprint)

1. Snapshot Postgres to encrypted object storage; restore to a scratch instance; compare row counts.
2. Export GCS inventory; confirm versioning.
3. Escrow keystore + Apple certificates offline, two people.
4. Rotate OpenAI / Firebase / RC / Razorpay after close; revoke founder keys.

Until 1–3 are evidenced, **transferability remains FAIL**.
