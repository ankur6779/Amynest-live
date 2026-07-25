# Birth Sky ROLLBACK_RUNBOOK

**App Build:** birth_sky_rc3/1.0.0  
**Owner (primary):** Release Manager  
**Owner (backup):** Eng on-call

## Kill switch (minutes)

1. Set `VITE_FF_BIRTH_SKY=0` (and rebuild/redeploy web / Capacitor OTA as applicable).
2. Confirm hub tile gone (`VITE_FF_BIRTH_SKY_HUB_TILE` follows master).
3. Confirm deep links safe (`VITE_FF_BIRTH_SKY_DEEP_LINKS` off with master).
4. Verify `/birth-sky/*` does not expose Create/Dashboard testids (Playwright kill-switch suite).

## Comms template

> Birth Sky is temporarily unavailable while we investigate. Your existing sky data is retained. No action needed.

## Data safety

- Flag off does **not** purge profiles/snapshots.
- Offline encrypted cache remains on device; clearing site data drops device key (expected).
- Server sealed fields remain readable with `BIRTH_SKY_FIELD_ENCRYPTION_KEY`.

## Verify after rollback

- Hub tile absent
- Deep link to `/birth-sky` does not open module when flag off
- No Sev-1 analytics/PII regressions
