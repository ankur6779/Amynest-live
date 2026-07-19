# Scheduler Singleton Verification

**Generated:** 2026-07-13T02:04:33.213Z

## Result: **PASS**

Active owner: Render API

### Issues

- Coolify has schedulers enabled via SSH env (expected false/false during presync)

### Probes

| API | Owner | Mode | Active plane | Local plane | BG tasks | Notifications |
|-----|-------|------|--------------|-------------|----------|---------------|
| Render | true | single_active | render | render | true | true |
| Coolify | false | single_active | render | coolify | false | false |

Job catalog: **23** jobs across categories: notifications, billing, recap, cleanup, content, infra

### Duplicate prevention

- `SCHEDULER_ACTIVE_PLANE` ensures only one plane runs node-cron jobs
- Standby instances reject HTTP cron pings with `503 scheduler_standby`
- Advisory locks (`pg_try_advisory_lock`) prevent overlap on the **same** database only
- BullMQ has no repeat/cron jobs — worker consumes `ai-jobs` queue only
