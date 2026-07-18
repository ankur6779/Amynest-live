# AmyNest v1.0 — 72-Hour Launch Watch Checklist

Print or copy into on-call notes. Tick each cell at the listed hour.

## Probes (reuse)

```bash
curl -sS -D- https://www.amynest.in/api/healthz | head -20
# expect: 200 + x-amynest-backend: coolify

# Stuck trials (Coolify host)
PASS=$(docker inspect tcl9udyxcuq2zu598ebj0pfu --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^POSTGRES_PASSWORD=//p')
docker exec -e PGPASSWORD="$PASS" tcl9udyxcuq2zu598ebj0pfu psql -U postgres -d postgres -c \
  "SELECT COUNT(*) AS stuck FROM subscriptions WHERE status='trialing' AND trial_ends_at < NOW() AND provider='none';"

# Backup freshness
ls -lah /data/coolify/backups/postgres/latest.dump
tail -3 /var/log/amynest-pg-backup.log
```

| Check | H1 | H6 | H12 | H24 | H48 | H72 |
|-------|----|----|-----|-----|-----|-----|
| API health 200 / Coolify | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Crash rate (Sentry) OK | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Purchase success rate | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Premium activation OK | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| API latency vs baseline | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Queue backlog OK | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Audio load failures OK | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Login failures OK | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Support tickets reviewed | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Sub mismatches = 0 | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Stuck trials = 0 | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Backup latest &lt; 36h | — | — | — | ☐ | ☐ | ☐ |

## Alert recommendations (configure if missing)

| Event | Severity |
|-------|----------|
| `/api/healthz` down 2 consecutive probes | P1 |
| RC webhook processing_status failed &gt; 0 in 1h | P1 |
| Stuck internal trials &gt; 0 | P2 |
| Postgres backup missing &gt; 36h | P2 |
| BullMQ failed jobs spike | P2 |
| Auth error rate spike | P2 |
| Client Sentry new issue flood | P2 |
