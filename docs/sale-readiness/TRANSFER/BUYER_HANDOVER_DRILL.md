# BUYER HANDOVER DRILL (SIMULATED)

**Date:** 24 September 2026  
**No accounts were transferred.** Docs-only.

| # | Task | Result | Why |
|---|------|--------|-----|
| 1 | Clone repo | **PASS** | Public GitHub URL known |
| 2 | Configure environment | **PARTIAL** | Examples exist; production secret dump missing |
| 3 | Run locally | **PARTIAL** | `AGENTS.md` / README; not re-run this pass |
| 4 | Connect database | **PARTIAL** | Dev URL documented; prod host UNVERIFIED |
| 5 | Build web | **NOT TESTED** this pass | scripts exist |
| 6 | Deploy | **FAIL** | Coolify/CF credentials founder-only |
| 7 | Understand storage | **PARTIAL** | `handover/STORAGE.md` |
| 8 | Understand billing | **PARTIAL** | RC IDs known; Razorpay/store logins missing |
| 9 | Understand analytics | **PARTIAL** | Ads now explained; SSOT not queried |
| 10 | Release Android | **FAIL** | Play + keystore not escrowed |
| 11 | Release iOS | **FAIL** | Apple + certs not escrowed |
| 12 | Operate GCS | **FAIL** | No project IAM |
| 13 | Rotate credentials | **PARTIAL** | runbook names; no owner map |
| 14 | Recover database | **FAIL** | no backup evidence |
| 15 | Recover source | **PASS** | git |
| 16 | Recover signing keys | **FAIL** | not in repo (correct) and not escrowed |

**Overall: FAIL** for operate-after-close. Founder dependency **HIGH**. Hard cap 79 remains.

20-item ownership-pass drill (same FAIL): `BUYER_TRANSFER_DRILL.md`.
