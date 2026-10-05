# CREDENTIAL / SIGNING-KEY ESCROW STATUS

**Date:** 24 September 2026  
**Do not print secrets.** This file lists whether escrow is **documented**, not values.

**Overall: MIXED** — Android upload keystore **ESCROWED** (SB-H01). iOS signing and remaining cloud/account titles still **OWNER ACTION REQUIRED**.

## Android

| Item | Documented in repo? | Escrowed? |
|------|---------------------|-----------|
| Package identity `com.amynest.app` | **YES** — `android/app/build.gradle.kts` | N/A (public ID) |
| Play App Signing (Google-held signing) | **Mentioned** — `android/README.md` says Play re-signs and Play SHA-1 must be added | **NOT IN ANDROID ESCROW** — no Play Console screenshot/export; Google-held key is a **separate** control |
| Upload / release keystore | **VERIFIED** local PKCS12 `android/keystore/Amynest`; **not in git** (correct) | **ESCROWED** — `AMYNEST-ANDROID-ESCROW-2026-10-02-15a19d9e` (SB-H01 CLOSED) |
| `keystore.properties` | Field names `storeFile` / `storePassword` / `keyAlias` / `keyPassword`; file not committed | **ESCROWED** (inside same ciphertext) |
| Keystore recovery / passwords | Inside encrypted pack; decrypt **PASS** 2 Oct 2026 | **ESCROWED** (passwords never in Git) |

Upload-key escrow does **not** prove Play App Signing control. Loss of the Google-held app-signing key / Play account remains a **separate** recovery path (**UNVERIFIED** / SB-H02).

## iOS

| Item | Documented? | Escrowed? |
|------|-------------|-----------|
| Bundle ID `com.amynest.app` | **YES** — Capacitor / Xcode | N/A |
| App Store ID `6767664343` | **YES** — `IOS_RELEASE.md` | N/A |
| App Store transfer playbook | High-level only | Transfer **not started** |
| Distribution certificates | Founder Keychain — 2 valid `Apple Distribution: Ankur Raman (FH3WT32854)` | **PARTIAL** — pack exists; PKCS12 passphrase / keychain export **MISSING** (SB-I01 OPEN) |
| Provisioning profiles | `AmyNest_Final_AppleSignIn` + others on disk | **ESCROWED** in `AMYNEST-IOS-ESCROW-2026-10-02-beeaa578` |
| APNs key | Four `.p8` files found in Downloads (live mapping UNKNOWN) | **ESCROWED** in same pack under `apple-keys/` (not IPA signing) |

## Cloud / production

| Item | Documented? | Escrowed? |
|------|-------------|-----------|
| Coolify env / `DATABASE_URL` | Names in examples | **NOT ESCROWED** |
| GCP / GCS service accounts | Names only | **NOT ESCROWED** |
| Firebase client + admin | Secret **names** in Actions | **NOT ESCROWED** (values in GH secrets on founder account) |
| Cloudflare API token | Secret name | **NOT ESCROWED** |
| Hetzner SSH private key | Secret name | **NOT ESCROWED** (lives in GH secrets) |
| RevenueCat secret keys | Not in repo | **NOT ESCROWED** |
| Birth Sky field encryption key | Named | **NOT ESCROWED** |
| Postgres backup | Runbook only | **NOT ESCROWED**; restore **FAIL** |

A buyer who receives only this repository **does not** receive credentials or signing material. That is correct for git hygiene and **fails** transfer readiness.

See `BACKUP_RESTORE_AND_KEY_HANDOVER.md` and `BACKUP_RESTORE_CERTIFICATION.md`.
