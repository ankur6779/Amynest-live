# Birth Sky ROLLBACK_CHECKLIST

**App Build:** birth_sky_rc3/1.0.0  
**Owner:** Ankur Raman (Release Manager / Rollback Owner — founder-operated)

| Step | Action | Status template |
| --- | --- | --- |
| 1 | Set `VITE_FF_BIRTH_SKY=0` and redeploy/OTA | ☐ |
| 2 | Confirm hub tile absent | ☐ |
| 3 | Confirm deep links safe | ☐ |
| 4 | Confirm Playwright/manual: no Create/Dashboard chrome | ☐ |
| 5 | Send comms (see ROLLBACK_RUNBOOK.md) | ☐ |
| 6 | Verify no Sev-1 PII in logs/analytics | ☐ |
| 7 | Leave server data intact (no purge) | ☐ |
| 8 | File incident; do not rotate encryption key unless compromise | ☐ |

See also: ROLLBACK_RUNBOOK.md
