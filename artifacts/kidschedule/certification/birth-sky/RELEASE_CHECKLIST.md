# Birth Sky RELEASE_CHECKLIST

**App Build:** birth_sky_rc3/1.0.0  
**RC3:** Final release certification — PASS | FAIL | WAIVED | N/A | PENDING.  
**Do not deploy.**

| Item | Status | Evidence |
| --- | --- | --- |
| Conformance unknown=0 fail=0 | PASS | fail=0 unknown=0 |
| Release gate matrix complete | PASS | GA_READINESS_REPORT.md |
| Waivers documented | PASS | WAIVER_REGISTER.md |
| Canary plan complete | PASS | CANARY_PLAN.md |
| Rollback validated (procedure) | PASS | ROLLBACK_CHECKLIST.md + kill switch PASS |
| Deployment prerequisites documented | PASS | DEPLOYMENT_PREREQUISITES.md |
| Go / No-Go produced | PASS | overall=HOLD |
| Part 9 human sign-off | PENDING | WAIVER_REGISTER Part 9 table |
| Public canary entry criteria | PENDING | NO-GO |
| Production GA | PENDING | NO-GO |

## Feature flags

| Flag | Default | Role |
| --- | --- | --- |
| `VITE_FF_BIRTH_SKY` | off | Master kill |
| `VITE_FF_BIRTH_SKY_HUB_TILE` | follows master | Hub tile |
| `VITE_FF_BIRTH_SKY_DEEP_LINKS` | follows master | Deep links |
