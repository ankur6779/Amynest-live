# BACKUP / RESTORE

| Asset | Backup evidenced in repo? | Restore drill evidenced? |
|-------|---------------------------|--------------------------|
| Postgres | **UNVERIFIED** automated | **NO** |
| Redis | Ephemeral expected | N/A / UNVERIFIED |
| GCS objects | Versioning **UNVERIFIED** | **NO** |
| Coolify images | Platform history UNVERIFIED | **NO** |
| Cloudflare Pages | Platform history UNVERIFIED | **NO** |
| Git | This remote | Yes |
| Store listings | Consoles | N/A |
| Signing keys / keystore | **Founder-only — if lost, fatal** | **NO** |

## Minimum buyer requirement before close

1. Encrypted Postgres dump + restore to a scratch instance.
2. Keystore / Apple cert escrow.
3. GCS inventory.
4. Confirm who can still rotate Firebase / GCP.

Until those exist, **transferability FAIL**.
