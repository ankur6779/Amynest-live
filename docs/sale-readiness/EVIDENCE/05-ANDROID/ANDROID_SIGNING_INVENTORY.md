# ANDROID SIGNING INVENTORY (SB-H01)

**Date:** 2 October 2026  
**SB-H01:** CLOSED  
No keystore passwords, private keys, keystore bytes, or signing secrets are recorded here.

Shipped Play app tree: **`android/` WebView wrapper**. Capacitor Android is **not** the Play Store app.

## Signing model (verified locally)

| Fact | Value | Evidence type |
|------|-------|---------------|
| Package / applicationId | `com.amynest.app` | **VERIFIED** `android/app/build.gradle.kts` (`namespace` + `applicationId`) |
| Release signing config | `signingConfigs.release` loads gitignored `android/keystore.properties` | **VERIFIED** same file |
| Properties keys (names only) | `storeFile`, `storePassword`, `keyAlias`, `keyPassword` | **VERIFIED** local file exists; values **not recorded** |
| Store file category | `keystore/Amynest` relative to `android/` (gitignored `android/keystore/`) | **VERIFIED** present on owner disk; **absent from Git** |
| Keystore format | PKCS12 | **VERIFIED** (opens with store password; PKCS12 OIDs present) |
| Alias | `amynest_key` | **VERIFIED** properties + PKCS12 `friendlyName` |
| Store / key passwords | Both **SET** (nonempty) | **VERIFIED**; values **not recorded** |
| Upload-key certificate (public) | CN=Ankur Raman, OU=AmyNest, O=AmyWorld | **VERIFIED** from certificate only |
| Upload-key cert SHA-256 | `FE:49:49:EA:C0:2C:B4:79:EB:EF:39:4C:F7:B7:14:79:9A:57:53:65:34:E0:53:35:D6:31:62:8C:17:D2:77:45` | **VERIFIED** (certificate fingerprint, **not** a private key) |
| Upload-key cert SHA-1 | `91:50:85:54:F5:AB:1D:47:32:3F:3A:CD:37:04:73:0C:D3:E6:9A:F6` | **VERIFIED** (same; Firebase/Play registration use) |
| Cert validity | 28 Apr 2026 – 22 Apr 2051 (GMT) | **VERIFIED** |
| Inner keystore file SHA-256 | `87b87963ce9e99b4e393fff039e2d05ddcab88f15dc0469df22a252003a94c44` | **VERIFIED** (file integrity; **not** a password) |
| Keystore size | 2722 bytes | **VERIFIED** |
| Git tracking | `keystore.properties` and `keystore/` gitignored | **VERIFIED** `android/.gitignore` |
| CI signing | No GitHub Actions job builds/signs a Play AAB | **VERIFIED** (no `bundleRelease` / keystore in `.github/`) |
| Play App Signing (Google-held app-signing key) | **NOT this PKCS12.** README documents Play re-signs; **console enrollment UNKNOWN** | **INFERRED** docs / **UNKNOWN** console |
| Play Console account ownership | Separate from this file | **SELLER-STATED** (SB-H03) — not proven by this escrow |
| Play transfer eligibility | Separate from this file | **UNKNOWN** (SB-H02) |

This PKCS12 is the **local upload / release signing material** referenced by Gradle. It is **not** Google Play App Signing’s app-signing key. Escrow of this file does **not** prove ownership or control of the Google-held key, Play Console, or transfer eligibility.

## Inventory (no values)

| Material type | Filename / location category | Purpose | Current availability | Escrow required | Buyer handover requirement | Evidence status |
|---------------|------------------------------|---------|----------------------|-----------------|----------------------------|-----------------|
| Upload / release keystore (PKCS12) | Working copy: `android/keystore/Amynest` (gitignored). Escrow copy: encrypted pack outside Git | Sign local release APK/AAB that Play accepts as the **upload** key for `com.amynest.app` | **EXISTS** on owner disk | **YES** | Deliver ciphertext + key under SPA; buyer must be able to `bundleRelease` | **ESCROWED** |
| Keystore alias | Name `amynest_key` (also in this inventory) | Selects the private-key entry inside the PKCS12 | **EXISTS** | **YES** (inside properties + MANIFEST) | Same pack | **ESCROWED** |
| Store password | Field `storePassword` in `android/keystore.properties` (gitignored) | Opens the PKCS12 | **EXISTS** (nonempty) | **YES** — inside ciphertext only | Same pack; never Git | **ESCROWED** |
| Key password | Field `keyPassword` in `android/keystore.properties` (gitignored) | Unlocks the private key entry | **EXISTS** (nonempty) | **YES** — inside ciphertext only | Same pack; never Git | **ESCROWED** |
| Signing configuration metadata | `storeFile=keystore/Amynest`; Gradle `signingConfigs.release` | Tells Gradle which file/alias/passwords to use | **EXISTS** | **YES** for properties; Gradle source is already in Git (no secrets) | Properties in pack; Gradle stays in repo | **ESCROWED** (properties) / **DOCUMENTED** (Gradle) |
| Gradle signing configuration | `android/app/build.gradle.kts` | Production release build wiring | **EXISTS** in Git | **NO** (source, not a secret). Do **not** change this pass | Buyer clones repo | **DOCUMENTED** |
| Play App Signing information | Play Console → Setup → App signing | Google-held **app-signing** key that re-signs Play Store installs | **UNKNOWN** (no console screenshot this pass) | **NO key material to escrow** if Google holds it. Screenshot of enrollment **is** still required (SB-H02) | Screenshot + account transfer, not this PKCS12 | **UNKNOWN** — **not claimed escrowed** |
| Play Console account | Google Play developer account | Listing, AAB upload, transfer | Founder-operated; legal name **SELLER-STATED** | Account is not a keystore | Transfer eligibility (SB-H02) | **NOT this pack** |
| Play API / service-account upload credentials | If any Play Developer API SA exists | Automated AAB upload | **UNKNOWN** if any exists; not used in this repo’s CI | **If exists**, later; **not required** for local Gradle signing | Recreate on buyer Play/GCP if used | **UNKNOWN / NOT IN THIS PACK** |
| Firebase `google-services.json` | `android/app/google-services.json` (gitignored) | Firebase/FCM/Google Sign-In config — **not** APK signing | **EXISTS** locally; **not in Git** | **NO** for SB-H01 (not signing material) | Separate Firebase/GCP handover | **OUT OF SCOPE for H01** |
| Debug keystore | `~/.android/debug.keystore` (Android SDK default) | Debug SHA-1 only (`com.amynest.app.debug`) | Typical SDK file; **not** Play upload | **NO** | N/A for production updates | **NOT REQUIRED** |
| Capacitor Android signing | `artifacts/amynest-capacitor/android/` | Not the shipped Play app | N/A for Play updates | **NO** | N/A | **OUT OF SCOPE** |

## Escrow record (metadata only)

| Field | Value |
|-------|--------|
| Escrow identifier | `AMYNEST-ANDROID-ESCROW-2026-10-02-15a19d9e` |
| Encrypted artifact | `AMYNEST-ANDROID-ESCROW-2026-10-02-15a19d9e.enc` |
| Storage | Owner-local encrypted directory **outside Git** (matching `.key` alongside; path not recorded) |
| Encryption | OpenSSL AES-256-CBC, PBKDF2, 200000 iterations, SHA-256, salted |
| SHA-256 of ciphertext | `53cc308f9c8b4c9f2b343eb5af6dbbb993e1c593d3f59fc2e2e68e9002c769f2` |
| Material count | **2** files (`Amynest` PKCS12 + `keystore.properties`) |
| Verification timestamp (UTC) | 2026-10-02T16:45:42Z |
| Decrypt verification | **PASS** |
| Play App Signing key in pack | **NO** |

Companion: `ANDROID_SIGNING_ESCROW_EVIDENCE.md`.

## Explicit non-claims

- Escrow of this upload keystore does **not** prove control of the Google Play App Signing key.
- It does **not** prove Play Console legal title or transfer eligibility.
- Those remain **separate controls** (SB-H02 / SB-H03).
- No AAB was uploaded. No Play, Gradle, package ID, or production change was made this pass.
