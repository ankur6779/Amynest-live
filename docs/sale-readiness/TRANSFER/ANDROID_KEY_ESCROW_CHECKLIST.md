# ANDROID KEY ESCROW CHECKLIST

**Date:** 2 October 2026  
**Status: ESCROWED (SB-H01 CLOSED)**  
Do **not** record passwords or private keys in this repo.

Companion: `ANDROID_RELEASE_HANDOVER.md`.  
Evidence: `../EVIDENCE/05-ANDROID/ANDROID_SIGNING_INVENTORY.md`.

| Item | Known | Owner records offline | Status |
|------|-------|----------------------|--------|
| Package / applicationId | `com.amynest.app` | Confirm Play listing matches | **DOCUMENTED** |
| Play App Signing | README says Play re-signs | Screenshot enrolled / not | **UNKNOWN** console — **not** this escrow |
| Upload key | PKCS12 `android/keystore/Amynest` (gitignored) | Encrypted copy in `AMYNEST-ANDROID-ESCROW-2026-10-02-15a19d9e` | **ESCROWED** |
| Keystore file | Working path category `keystore/Amynest`; 2722 bytes | Actual file inside ciphertext | **ESCROWED** |
| Alias | `amynest_key` | Alias name in inventory + pack MANIFEST | **ESCROWED** |
| Passwords (store + key) | Both SET; not in git | Inside encrypted `keystore.properties` only | **ESCROWED** |
| CI reference | No Actions AAB job | N/A | **DOCUMENTED absent** |
| Recovery | One owner-local encrypted copy + gitignored working copy | Second geographically separate copy **not** created this pass | **PRIMARY ESCROW EXISTS** |
| Escrow | `AMYNEST-ANDROID-ESCROW-2026-10-02-15a19d9e` | SHA-256 `53cc308f9c8b4c9f2b343eb5af6dbbb993e1c593d3f59fc2e2e68e9002c769f2` | **ESCROWED** / decrypt **PASS** |
| Buyer verification | After close: `aapt dump` package = `com.amynest.app` | Not performed (no AAB submitted) | **NOT DONE** (handover later) |

Do **not** submit an AAB. Do **not** start Play transfer.

Play App Signing key, Play Console title, and transfer eligibility remain **separate** from this escrow.
