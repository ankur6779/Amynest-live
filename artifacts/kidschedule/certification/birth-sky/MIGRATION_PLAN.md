# Birth Sky MIGRATION_PLAN

**Status:** EXECUTED (2026-07-25) via additive SQL — **not** `drizzle-kit push`  
**Target:** Coolify Postgres on Hetzner (`tcl9udyxcuq2zu598ebj0pfu`)

## Preconditions

- [x] Coolify API `DATABASE_URL` points at Coolify PG
- [x] `BIRTH_SKY_FIELD_ENCRYPTION_KEY` SET on Coolify API
- [x] Database backup: `/root/amynest-backups/coolify-pg-pre-birth-sky-20260725T115501Z.dump` (311M)
- [x] drizzle-kit push preview reviewed and **rejected** (unsafe DROP/CREATE plan)
- [x] Additive SQL applied; 6/6 tables verified PRESENT

## Tables to create (additive)

From `lib/db/src/schema/birth_sky.ts`:

1. `birth_profiles`
2. `sky_snapshots`
3. `birth_sky_preferences`
4. `birth_sky_conversations`
5. `birth_sky_messages`
6. `birth_sky_ai_deliveries`

Expected impact: **create-only** on an empty Birth Sky namespace (no destructive alters anticipated).

## Execution plan (manual)

1. Snapshot Coolify Postgres (Coolify UI or `pg_dump`).
2. From a trusted operator workstation with network access to Coolify PG (or SSH tunnel):

```bash
# Use Coolify DATABASE_URL (do not paste into chat/logs)
export DATABASE_URL='postgresql://…@tcl9udyxcuq2zu598ebj0pfu:5432/postgres'
pnpm db:push
```

3. Verify:

```sql
select tablename from pg_tables
where schemaname='public'
  and tablename in (
    'birth_profiles','sky_snapshots','birth_sky_preferences',
    'birth_sky_conversations','birth_sky_messages','birth_sky_ai_deliveries'
  )
order by 1;
```

4. Smoke: Coolify `/api/healthz` still 200; flag enablement remains an explicit Release Manager action.

## Rollback

- Prefer restore from pre-push snapshot if push misapplies.
- Do **not** drop unrelated tables.
- Flag-off kill switch does not require dropping Birth Sky tables.

## Explicit non-actions

- This package does **not** run `pnpm db:push`.
- This package does **not** enable `VITE_FF_BIRTH_SKY`.
