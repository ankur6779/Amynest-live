# Birth Sky OPERATIONAL_OWNERSHIP

**Build:** birth_sky_ops_verify/1.0.0  
**Infra:** Coolify + Hetzner + Cloudflare  
**Model:** Founder-operated production — single named owner for all release roles.

| Responsibility | Role | Assignee |
| --- | --- | --- |
| Release Manager | Release Manager (Part 9 + canary enablement) | Ankur Raman |
| Engineering Owner | Engineering | Ankur Raman |
| Rollback approval | Rollback Owner | Ankur Raman |
| Feature flag management | Feature Flag Owner | Ankur Raman |
| Incident response | Incident Commander | Ankur Raman |
| Database rollback | Database Owner (Coolify Postgres on Hetzner) | Ankur Raman |
| Encryption key rotation | Encryption Key Owner | Ankur Raman |
| Kill switch execution | Release Manager / Feature Flag Owner | Ankur Raman |

## Named roles (canonical)

| Role | Assignee |
| --- | --- |
| Release Manager | Ankur Raman |
| Engineering Owner | Ankur Raman |
| Rollback Owner | Ankur Raman |
| Incident Commander | Ankur Raman |
| Feature Flag Owner | Ankur Raman |
| Database Owner | Ankur Raman |
| Encryption Key Owner | Ankur Raman |

## Runbooks confirmed present

- ROLLBACK_CHECKLIST.md
- ROLLBACK_RUNBOOK.md
- CANARY_PLAN.md
- DEPLOYMENT_PREREQUISITES.md
