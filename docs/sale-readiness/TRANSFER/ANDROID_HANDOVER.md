# ANDROID HANDOVER

**Date:** 24 September 2026  
**No keys rotated or moved.**

| Item | Value / state | Evidence type |
|------|---------------|---------------|
| Package / applicationId | `com.amynest.app` | **VERIFIED** `android/app/build.gradle.kts` |
| Shipped tree | `android/` WebView wrapper (not Capacitor Android) | **VERIFIED** workspace rules + `GOOGLE_PLAY_RELEASE.md` |
| Play Console account | AMYWORLD sole proprietorship; Ankur Raman proprietor | **SELLER-STATED — NOT INDEPENDENTLY VERIFIED** |
| Play App Signing | Documented as Google re-sign; Play SHA-1 must be registered | **INFERRED** from `android/README.md` — console state **UNKNOWN** |
| Upload / release keystore | Local PKCS12 `android/keystore/Amynest`; alias `amynest_key`; **not in git** | **VERIFIED** on disk; **ESCROWED** `AMYNEST-ANDROID-ESCROW-2026-10-02-15a19d9e` |
| Key recovery | Encrypted owner-local copy; decrypt PASS | **ESCROWED** (Play App Signing key still **not** in pack) |
| CI signing | No GitHub Action in this repo builds/signs the Play AAB | **VERIFIED** (deploy workflow is web/worker only) |
| Release workflow | Local Gradle → upload AAB in Play Console | **VERIFIED** as documented process |
| Testing tracks | Internal testing docs exist (`docs/android-internal-testing.md`) | Tracks’ **current** Play state **UNKNOWN** |
| Play service account (API) | Not evidenced as used for uploads | **UNKNOWN** if any exists |

## Transfer operations

1. **Account / app transfer:** Play Console → transfer `com.amynest.app` to a buyer Play developer account Google accepts. Multi-step; Google consent required. **Eligibility UNKNOWN** (not console-checked).
2. **Credential / key escrow:** Upload keystore + passwords **ESCROWED** outside Git (SB-H01). Confirm Play App Signing enrollment and whether the upload key can be reset (**still UNKNOWN** — SB-H02).
3. **Service migration:** Recreate Play API access / FCM SHA-1 / OAuth clients on buyer GCP if the Android app stays `com.amynest.app`.

These are not the same operation.

## Acceptance test

Buyer can build a release candidate and submit it through Play **without** Ankur’s personal Google/Play login.

**OPEN — OWNER ACTION REQUIRED**
