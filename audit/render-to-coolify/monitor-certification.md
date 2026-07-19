# Monitor Certification

**Generated:** 2026-07-12T18:08:52.509Z
**Verdict:** **MONITOR CERTIFIED**

## Configuration

| Setting | Value |
|---------|-------|
| Host | ubuntu-8gb-nbg1-1 |
| Interval | 30s |
| Duration | 60 min |
| Coolify URL | https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io |

## Results

| Metric | Value |
|--------|-------|
| Total cycles | 109 |
| Coolify unhealthy cycles | 0 |
| Render unhealthy cycles | 0 |
| Gap invalidations (>120s) | 0 |
| False failures | 0 |

## Policy

- Composite unhealthy only when **all** of /health, /api/healthz, /api/healthz/env fail (with retries)
- Gap >120s invalidates soak segment (no rollback)
- Certification requires **zero coolify unhealthy cycles** (composite gate)

## Verdict

```
MONITOR CERTIFIED
```

Raw cycles: `monitor-soak-cycles.json`
Probe log: `probe-log.jsonl`
