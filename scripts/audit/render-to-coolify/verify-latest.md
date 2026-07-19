# Render → Coolify PostgreSQL verification

Generated: 2026-07-12T07:59:35.585Z
Source: postgresql://amynest_db_jnen_user:***@dpg-d85k80jtqb8s7382m7lg-a.singapore-postgres.render.com/amynest_db_jnen
Target: postgresql://postgres:***@127.0.0.1:15432/postgres

## Result: PASS ✓

| Check | Source | Target | Delta |
|-------|-------:|-------:|------:|
| Tables | 137 | 137 | — |
| Total rows | 522,568 | 522,568 | 0 |
| Row mismatches | — | — | 0 |
| Indexes missing on target | — | — | 0 |
| Constraints missing on target | — | — | 0 |
| Sequence issues | — | — | 0 |
| Extension mismatches | — | — | 0 |

## Key production tables

| Table | Render | Coolify | Status |
|-------|-------:|--------:|--------|
| analytics_events | 497,834 | 497,834 | ok |
| billing_audit_events | 337 | 337 | ok |
| children | 99 | 99 | ok |
| notification_log | 4,253 | 4,253 | ok |
| onboarding_profiles | 92 | 92 | ok |
| parent_profiles | 93 | 93 | ok |
| push_tokens | 38 | 38 | ok |
| routines | 48 | 48 | ok |
| speech_coach_v2_sessions | 20 | 20 | ok |
| speech_coach_v2_turn_log | 63 | 63 | ok |
| subscriptions | 310 | 310 | ok |
| tts_cache | 6,468 | 6,468 | ok |
| user_devices | 284 | 284 | ok |
| user_identity_aliases | 185 | 185 | ok |
| worksheet_downloads | 0 | 0 | ok |

---
Re-run: `pnpm run migrate:render-to-coolify:verify`
