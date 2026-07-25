# Birth Sky SCHEMA_ROOT_CAUSE

**Target:** Coolify Postgres `tcl9udyxcuq2zu598ebj0pfu` / database `postgres`  
**App DATABASE_URL host:** same Coolify PG (verified)

## Verdict

**Original root cause: migration never executed**

**Resolution (2026-07-25):** Additive SQL applied on Coolify Postgres after `drizzle-kit push` preview was **rejected as unsafe** (proposed CREATE for existing tables + DROP SEQUENCE).

## Verification (post-migration)

| Check | Result |
| --- | --- |
| Backup | `/root/amynest-backups/coolify-pg-pre-birth-sky-20260725T115501Z.dump` (311M) |
| drizzle-kit push | NOT executed (unsafe preview) |
| Method used | Explicit CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS |
| Tables | 6/6 PRESENT |
| public_table_count | 143 (was 137) |

## Tables now present

- `birth_profiles`
- `sky_snapshots`
- `birth_sky_preferences`
- `birth_sky_conversations`
- `birth_sky_messages`
- `birth_sky_ai_deliveries`

## Warning

Do **not** run unscoped `pnpm db:push` / `drizzle-kit push` against Coolify production — preview emitted destructive DROP SEQUENCE / recreate plans.
