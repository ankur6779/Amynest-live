# DATABASE

**Engine:** PostgreSQL. **ORM:** Drizzle (`lib/db/`).  
**Dev default (docs):** `postgresql://amynest:amynest@localhost:5432/amynest_dev`  
**Prod host / backups:** UNVERIFIED (Coolify-attached instance assumed).

## Schema changes

After editing `lib/db/`:

```
DATABASE_URL=postgresql://amynest:amynest@localhost:5432/amynest_dev pnpm db:push
```

Production migrations: historical SQL under `docs/production-stabilization/migrations/` and repo migrate scripts. **Buyer must not run `db:push` against production without a backup.**

## What lives here (high sensitivity)

Parent accounts, child profiles (ages 0–12), routines, speech artifacts, entitlements cache, first-party analytics events, optional Birth Sky encrypted fields (`BIRTH_SKY_FIELD_ENCRYPTION_KEY`).

## Redis

Required in production for BullMQ. Dev can fall back in-memory (`AGENTS.md`).

## Backup / restore

See `BACKUP_RESTORE.md`. Automated backup schedule: **UNVERIFIED**.
