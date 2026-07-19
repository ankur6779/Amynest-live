# Production backup report — Render PostgreSQL

**Generated:** 2026-07-11T18:51:06Z

## Backup

| Field | Value |
|-------|-------|
| Source | Render `amynest-db-dykj` (dpg-d85k80jtqb8s7382m7lg-a) |
| Format | PostgreSQL custom (`pg_dump -Fc`) |
| File | `/data/coolify/migration/dumps/render-prod-20260711T184856Z.dump` |
| Size (bytes) | 302645445 |
| SHA-256 | `03f0b4637354b7ae70fa0e0b1f7a3d99e38d294a55d8d78a2922179a90c1c050` |
| TABLE DATA entries in TOC | 0
0 |
| Render row estimate (pg_stat) | 453923 |

## Spot checks (Render)

- `parent_profiles`: 93
- `subscriptions`: 307
- `children`: 99
- `analytics_events`: 434307
- `notification_log`: 4116
- `user_devices`: 280
- `speech_coach_v2_sessions`: 20
- `billing_audit_events`: 329
- `tts_cache`: 6056
- `routines`: 48
