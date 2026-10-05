# STORE ACCOUNT OWNERSHIP (Play / App Store)

**Date:** 24 September 2026  
Separate three layers. Do not collapse them.

| Layer | Meaning | AmyNest state |
|-------|---------|---------------|
| **Account ownership** | Who is enrolled as the developer / legal entity on the console | **OWNER-CONFIRMED:** AmyWorld. **DOCUMENTARY EVIDENCE PENDING.** No Play/ASC enrollment PDF in the repo. |
| **App ownership** | Who the store lists as the app’s seller and who can transfer that listing | Package/bundle **VERIFIED** `com.amynest.app`. App Store ID **VERIFIED** `6767664343`. Listing seller string “Amyworld” (14 Sep). Transfer **not started**. |
| **Legal IP ownership** | Who owns copyright / patent / trademark | Source title **UNKNOWN**. Patent applicant **VERIFIED** Ankur Raman. TM **UNKNOWN**. Store account ≠ copyright. |

## Identifiers (no secrets)

| Item | Value | Evidence type |
|------|-------|---------------|
| Android applicationId / namespace | `com.amynest.app` | **VERIFIED** `android/app/build.gradle.kts` |
| iOS PRODUCT_BUNDLE_IDENTIFIER | `com.amynest.app` | **VERIFIED** Xcode / Capacitor |
| App Store ID | `6767664343` | **VERIFIED** `IOS_RELEASE.md` |
| RevenueCat Play app | `app7b7fc89f20` | **VERIFIED** billing docs |
| RevenueCat App Store app | `appa31011b39a` | **VERIFIED** billing docs |
| Play / ASC legal entity on enrollment | AmyWorld | **OWNER-CONFIRMED / EVIDENCE PENDING** |
| Proprietor | Ankur Raman | **OWNER-CONFIRMED** as proprietor (also **VERIFIED** as person on patent papers — different fact) |

## Transfer possibility (process, not a promise)

This pass did **not** log into Play Console or App Store Connect and did **not** confirm transfer eligibility (agreements, tax, pending releases, roles).

| Store | Typical mechanism (public vendor process) | Buyer-side action | This deal |
|-------|-------------------------------------------|-------------------|-----------|
| Google Play | Play Console app transfer to a buyer developer account Google accepts | Buyer must have a Play developer account; accept transfer; retain/replace upload key as Google requires | **TRANSFERABLE AFTER OWNER ACTION** + **VENDOR ACTION**. Not evidenced as eligible today. |
| Apple | App Store Connect app transfer; buyer must be enrolled | Buyer Apple Developer enrollment; accept; new certs/profiles | **TRANSFERABLE AFTER OWNER ACTION** + **VENDOR ACTION**. Not evidenced as eligible today. |

Distinguish: **OWNER CONFIRMED** vs **DOCUMENTARY EVIDENCE** vs **TRANSFER ELIGIBILITY** vs **TRANSFER COMPLETED**.  
Eligibility is **not VERIFIED**. Transfer is **not started**. Do **not** treat owner confirmation as console proof.

Signing: see `CREDENTIAL_ESCROW_STATUS.md`. **NOT ESCROWED / OWNER ACTION REQUIRED.**
