# AmyNest v1.0 — Disaster Recovery Runbook (Coolify Postgres)

**Last verified:** 2026-07-18  
**Host:** Coolify Hetzner `188.245.208.126`  
**Postgres container:** `tcl9udyxcuq2zu598ebj0pfu`

---

## Backup automation (LIVE)

| Item | Value |
|------|--------|
| Script | `/usr/local/sbin/amynest-pg-backup.sh` |
| Verify | `/usr/local/sbin/amynest-pg-backup-verify.sh` |
| Schedule | Daily **02:15 UTC** (`crontab`) |
| Output | `/data/coolify/backups/postgres/amynest-prod-YYYYMMDDTHHMMSSZ.dump` |
| Checksum | sibling `.sha256` |
| Latest symlink | `/data/coolify/backups/postgres/latest.dump` |
| Retention | **14 days** (`AMYNEST_PG_BACKUP_RETENTION_DAYS`) |
| Log | `/var/log/amynest-pg-backup.log` |

### First production backup (this certification)

- File: `amynest-prod-20260718T040305Z.dump` (~302 MB)
- SHA-256 verified
- TOC entries: **1174** (`VERIFY_OK`)
- Format: PostgreSQL custom (`pg_dump -Fc`) via container PG 18

---

## RPO / RTO targets

| Metric | Target | Measured (2026-07-18) |
|--------|--------|------------------------|
| **RPO** | ≤ 24 h (nightly) | Nightly cron + on-demand dump |
| **RTO** | ≤ 60 min for DB restore to temp/prod | **~44 s** restore into empty drill DB on same host |

---

## Restore drill (non-destructive — preferred)

```bash
# On Coolify host as root
DUMP=/data/coolify/backups/postgres/latest.dump
PASS=$(docker inspect tcl9udyxcuq2zu598ebj0pfu --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^POSTGRES_PASSWORD=//p')

/usr/local/sbin/amynest-pg-backup-verify.sh "$DUMP"

docker cp "$(readlink -f "$DUMP")" tcl9udyxcuq2zu598ebj0pfu:/tmp/drill.dump
docker exec -e PGPASSWORD="$PASS" tcl9udyxcuq2zu598ebj0pfu \
  psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS amynest_restore_drill WITH (FORCE);"
docker exec -e PGPASSWORD="$PASS" tcl9udyxcuq2zu598ebj0pfu \
  psql -U postgres -d postgres -c "CREATE DATABASE amynest_restore_drill;"
docker exec -e PGPASSWORD="$PASS" tcl9udyxcuq2zu598ebj0pfu \
  pg_restore -U postgres -d amynest_restore_drill --no-owner --no-acl /tmp/drill.dump
docker exec -e PGPASSWORD="$PASS" tcl9udyxcuq2zu598ebj0pfu \
  psql -U postgres -d amynest_restore_drill -c "SELECT COUNT(*) FROM subscriptions; SELECT COUNT(*) FROM children;"
# cleanup
docker exec -e PGPASSWORD="$PASS" tcl9udyxcuq2zu598ebj0pfu \
  psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS amynest_restore_drill WITH (FORCE);"
docker exec tcl9udyxcuq2zu598ebj0pfu rm -f /tmp/drill.dump
```

**Do not** restore into the live `postgres` database except during a declared incident.

---

## Production restore (incident only)

1. Freeze writes / announce maintenance.  
2. Prefer Coolify snapshot + `pg_restore` into a **new** volume, then swap Traefik/env `DATABASE_URL`.  
3. Legacy migration helper (destructive): `scripts/render-to-coolify/rollback-restore-coolify-backup.sh` — requires `COOLIFY_DATABASE_URL` + explicit confirm.  
4. Re-point API, run sequence fix `05-fix-sequences.sh` if used.  
5. Smoke: `/api/healthz`, sign-in, subscription entitlement, phonics load.

---

## Monitoring backups

```bash
# Last backup age
ls -lah /data/coolify/backups/postgres/latest.dump
tail -20 /var/log/amynest-pg-backup.log
# Alert if latest.dump mtime > 36h
```

Recommended alert: pager if no successful log line in 36 hours.
